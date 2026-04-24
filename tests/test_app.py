import http.client
import json
import tempfile
import threading
import time
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import library_app.auth as auth
import library_app.config as config
import library_app.data_store as data_store
import library_app.database as database
import library_app.time_utils as time_utils
import library_app.web_server as web_server
from http.server import ThreadingHTTPServer


class LibraryAppTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.admin_config = self.root / "admin_config.json"
        self.email_config = self.root / "email_config.json"
        self.students_file = self.root / "students.csv"
        self.visits_file = self.root / "visits.csv"
        self.db_file = self.root / "library_data.db"
        self.excel_file = self.root / "students.xlsx"
        self.library_csv = self.root / "library_data.csv"

        self.students_file.write_text(
            "student_id,name,father_name,course,phone,valid_until\n"
            "LIB001,Test Student,Test Father,BCA,9999999999,\n",
            encoding="utf-8",
        )
        self.visits_file.write_text(
            "visit_id,student_id,name,father_name,date,entry_time,exit_time\n",
            encoding="utf-8",
        )
        self.admin_config.write_text(
            json.dumps(
                {
                    "username": "adminuser",
                    "password": "Secret123",
                    "email": "admin@example.com",
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        self.email_config.write_text(
            json.dumps(
                {
                    "smtp_host": "smtp.gmail.com",
                    "smtp_port": 587,
                    "sender_email": "",
                    "sender_name": "Arya Library Dashboard",
                    "sender_password": "",
                    "use_tls": True,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        self.patches = [
            patch.object(auth, "ADMIN_CONFIG_FILE", self.admin_config),
            patch.object(config, "ADMIN_CONFIG_FILE", self.admin_config),
            patch.object(config, "EMAIL_CONFIG_FILE", self.email_config),
            patch.object(config, "VISITS_FILE", self.visits_file),
            patch.object(config, "LIBRARY_DB_FILE", self.db_file),
            patch.object(database, "BASE_DIR", self.root),
            patch.object(database, "DEFAULT_STUDENTS_FILE", self.students_file),
            patch.object(database, "EXCEL_STUDENTS_FILE", self.excel_file),
            patch.object(database, "LIBRARY_DATA_FILE", self.library_csv),
            patch.object(database, "LIBRARY_DB_FILE", self.db_file),
            patch.object(database, "VISITS_FILE", self.visits_file),
            patch.object(data_store, "DEFAULT_STUDENTS_FILE", self.students_file),
            patch.object(data_store, "EXCEL_STUDENTS_FILE", self.excel_file),
            patch.object(data_store, "LIBRARY_DATA_FILE", self.library_csv),
            patch.object(data_store, "LIBRARY_DB_FILE", self.db_file),
            patch.object(data_store, "VISITS_FILE", self.visits_file),
        ]

        for active_patch in self.patches:
            active_patch.start()
            self.addCleanup(active_patch.stop)

        database._DATABASE_READY = False
        data_store._STUDENT_CACHE = {}
        data_store._STUDENT_CACHE_SIGNATURE = ""
        data_store._ANALYTICS_CACHE = {"signature": "", "token": "", "visits": []}
        auth.PASSWORD_RESET_OTP.clear()

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), web_server.LibraryDashboardHandler)
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.server_thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request_json(self, method, path, payload=None, cookie=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=5)
        headers = {}
        body = None
        if payload is not None:
            body = json.dumps(payload)
            headers["Content-Type"] = "application/json"
        if cookie:
            headers["Cookie"] = cookie
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        raw = response.read().decode("utf-8")
        data = json.loads(raw) if raw else None
        set_cookie = response.getheader("Set-Cookie", "")
        conn.close()
        return response.status, data, set_cookie

    def request_text(self, method, path, cookie=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=5)
        headers = {"Cookie": cookie} if cookie else {}
        conn.request(method, path, headers=headers)
        response = conn.getresponse()
        raw = response.read().decode("utf-8")
        conn.close()
        return response.status, raw, response.getheader("Content-Type", "")

    def login(self):
        status, payload, set_cookie = self.request_json(
            "POST",
            "/api/login",
            {"username": "adminuser", "password": "Secret123"},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        cookie_value = set_cookie.split(";", 1)[0]
        return cookie_value

    def test_plaintext_admin_password_is_migrated(self):
        credentials = auth.load_admin_credentials()

        self.assertIn("password_hash", credentials)
        self.assertTrue(auth.verify_admin_password("Secret123", credentials))

        saved = json.loads(self.admin_config.read_text(encoding="utf-8"))
        self.assertIn("password_hash", saved)
        self.assertNotIn("password", saved)

    def test_scan_flow_records_entry_duplicate_then_exit(self):
        cookie = self.login()

        with patch.object(data_store, "DUPLICATE_SCAN_GAP_SECONDS", 3):
            first_status, first_payload, _ = self.request_json("POST", "/api/scan", {"student_id": "LIB001"}, cookie=cookie)
            second_status, second_payload, _ = self.request_json("POST", "/api/scan", {"student_id": "LIB001"}, cookie=cookie)
            time.sleep(3.1)
            third_status, third_payload, _ = self.request_json("POST", "/api/scan", {"student_id": "LIB001"}, cookie=cookie)

        self.assertEqual(first_status, 200)
        self.assertEqual(second_status, 200)
        self.assertEqual(third_status, 200)
        self.assertEqual(first_payload["action"], "entry")
        self.assertEqual(second_payload["action"], "duplicate")
        self.assertEqual(third_payload["action"], "exit")

        visits = self.visits_file.read_text(encoding="utf-8").strip().splitlines()
        self.assertEqual(len(visits), 2)
        self.assertIn("LIB001", visits[1])

    def test_public_analytics_stays_masked_but_admin_can_unlock_full_view(self):
        cookie = self.login()
        status, _, _ = self.request_json("POST", "/api/scan", {"student_id": "LIB001"}, cookie=cookie)
        self.assertEqual(status, 200)

        masked_status, masked_payload, _ = self.request_json("GET", "/api/analytics?view=full")
        self.assertEqual(masked_status, 200)
        self.assertEqual(masked_payload["view"]["applied"], "masked")
        self.assertFalse(masked_payload["view"]["authenticated"])
        self.assertEqual(masked_payload["summary"]["total_visits"], 1)
        self.assertNotEqual(masked_payload["table"]["rows"][0]["student_id"], "LIB001")
        self.assertNotEqual(masked_payload["table"]["rows"][0]["name"], "Test Student")

        full_status, full_payload, _ = self.request_json("GET", "/api/analytics?view=full", cookie=cookie)
        self.assertEqual(full_status, 200)
        self.assertEqual(full_payload["view"]["applied"], "full")
        self.assertTrue(full_payload["view"]["authenticated"])
        self.assertEqual(full_payload["table"]["rows"][0]["student_id"], "LIB001")
        self.assertEqual(full_payload["table"]["rows"][0]["name"], "Test Student")

    def test_analytics_export_respects_masked_and_full_modes(self):
        cookie = self.login()
        status, _, _ = self.request_json("POST", "/api/scan", {"student_id": "LIB001"}, cookie=cookie)
        self.assertEqual(status, 200)

        masked_status, masked_csv, masked_type = self.request_text("GET", "/api/analytics-export")
        self.assertEqual(masked_status, 200)
        self.assertEqual(masked_type, "text/csv; charset=utf-8")
        self.assertIn("visit_id,student_id,name,father_name,branch,date,entry_time,exit_time,status,duration", masked_csv)
        self.assertNotIn("LIB001", masked_csv)

        full_status, full_csv, _ = self.request_text("GET", "/api/analytics-export?view=full", cookie=cookie)
        self.assertEqual(full_status, 200)
        self.assertIn("LIB001", full_csv)
        self.assertIn("Test Student", full_csv)

    def test_future_last_scan_timestamp_does_not_trigger_broken_duplicate_message(self):
        future_timestamp = data_store.datetime.now() + timedelta(hours=5, minutes=7)

        with (
            patch.object(
                data_store,
                "load_students",
                return_value={
                    "LIB001": {
                        "student_id": "LIB001",
                        "name": "Test Student",
                        "father_name": "Test Father",
                        "course": "BCA",
                        "phone": "",
                        "valid_until": "",
                    }
                },
            ),
            patch.object(data_store, "load_visits", return_value=[]),
            patch.object(data_store, "fetch_latest_visit_for_student", return_value={"date": "2099-01-01", "entry_time": "09:00:00", "exit_time": ""}),
            patch.object(
                data_store,
                "create_visit",
                return_value={
                    "visit_id": "00001",
                    "student_id": "LIB001",
                    "name": "Test Student",
                    "father_name": "Test Father",
                    "date": "2026-04-06",
                    "entry_time": "10:00:00",
                    "exit_time": "",
                },
            ),
            patch.object(data_store, "parse_timestamp", side_effect=[future_timestamp, None]),
            patch.object(data_store, "fetch_open_visit", return_value=None),
            patch.object(data_store, "save_visits"),
        ):
            result = data_store.process_scan_result("LIB001")

        self.assertTrue(result["ok"])
        self.assertEqual(result["action"], "entry")

    def test_auth_state_reflects_login_and_logout(self):
        status, payload, _ = self.request_json("GET", "/api/auth-state")
        self.assertEqual(status, 200)
        self.assertFalse(payload["authenticated"])

        cookie = self.login()
        status, payload, _ = self.request_json("GET", "/api/auth-state", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertTrue(payload["authenticated"])
        self.assertEqual(payload["username"], "adminuser")

        status, payload, _ = self.request_json("POST", "/api/logout", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])

        status, payload, _ = self.request_json("GET", "/api/auth-state")
        self.assertEqual(status, 200)
        self.assertFalse(payload["authenticated"])
        self.assertEqual(time_utils.current_date_text(), time_utils.today_local().isoformat())


if __name__ == "__main__":
    unittest.main()
