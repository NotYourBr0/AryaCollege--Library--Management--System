SESSION LOG
===========
ID:          SESSION-2026-04-23-001
Date:        2026-04-23
Time:        Asia/Calcutta
Duration:    Long (~2h+)
Project:     Arya Library Management System - aryalib clone

SUMMARY
-------
This session split the local-install clone `aryalib` away from the deployed Supabase version and restored it to a fully local SQLite setup intended for permanent use on a single machine. The work also covered startup/install automation, student master expansion through additional Excel files, local runtime troubleshooting, export/download fixes, and operational documentation so a new chat or a new PC setup can resume without reconstructing the entire mess from memory.

KEY TOPICS
----------
- Local-only SQLite architecture for `aryalib`
- Removal of Supabase/Postgres dependency from clone
- Faster local student lookup and Excel-backed student master loading
- Windows install/start automation
- Local dashboard/runtime troubleshooting
- Additional department student data integration
- Session handoff and local documentation

ACTIONS PERFORMED
-----------------
- Converted `aryalib` to SQLite-only storage and removed hosted DB logic from the clone.
- Updated `aryalib/library_app/config.py` to use local files in the clone folder for DB/config/storage.
- Reworked `aryalib/library_app/database.py` to SQLite-only initialization and CRUD flow.
- Updated `aryalib/library_app/data_store.py` so the clone loads student master data from local Excel files and uses local visits persistence.
- Removed Postgres dependency from clone code paths and tests.
- Expanded `aryalib/requirements.txt` to cover local dashboard plus optional scanner Python packages.
- Created `aryalib/install_and_start.bat` to install dependencies and launch the dashboard.
- Simplified `aryalib/start_dashboard.bat` / `aryalib/open_dashboard.bat` for local Windows startup.
- Added browser auto-open and better error trapping in `aryalib/library_app/web_server.py`.
- Fixed broken export/download routes in both API/server paths so visit CSV export works.
- Added AIET/AIETM student datasets into the clone as Excel sources:
  - `AIET DATA-2022-23.xlsx`
  - `AIETM__DATA__2022-2026.xlsx`
  - `AIETM__DATA__2023-2027.xlsx`
- Verified the clone sees the combined student master, with the count reaching 3236 students after dataset additions.
- Investigated local dashboard crash after login and identified the real cause: `openpyxl` missing from the Python interpreter selected by `py -3`.
- Installed clone requirements into the same interpreter used by the launcher.
- Created `aryalib/ARYALIB_SETUP_AND_LOG.md` as an operational reference file.

DECISIONS & CONCLUSIONS
-----------------------
- `aryalib` is now the local-install variant and should remain SQLite-only.
- No Supabase/Postgres should be used in `aryalib`.
- Student master data for `aryalib` should be maintained by dropping `.xlsx` files into the `aryalib` folder and restarting the app.
- Future department additions do not require code changes if the incoming data is in compatible Excel format.
- The correct launcher on a fresh Windows machine is the batch file, not double-clicking `web_dashboard.py`.
- If the app closes instantly on another PC, the correct diagnosis path is to run `py -3 web_dashboard.py` in a terminal and inspect the actual error instead of guessing.

ARTIFACTS PRODUCED
------------------
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\install_and_start.bat`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\ARYALIB_SETUP_AND_LOG.md`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\AIETM__DATA__2022-2026.xlsx`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\AIETM__DATA__2023-2027.xlsx`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\SESSION_HANDOFF_2026-04-23.md`

FILES OF PRIMARY INTEREST
-------------------------
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\library_app\config.py`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\library_app\database.py`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\library_app\data_store.py`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\library_app\web_server.py`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\requirements.txt`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\start_dashboard.bat`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\install_and_start.bat`
- `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib\ARYALIB_SETUP_AND_LOG.md`

CURRENT OPERATING MODEL
-----------------------
- Storage is local:
  - `library_data.db`
  - `visits.csv`
  - `admin_config.json`
  - `email_config.json`
- Student lookup is local and file-backed from `.xlsx` files in the clone folder.
- App start path on Windows:
  1. Install Python 3
  2. Run `install_and_start.bat`
  3. For normal reuse, run `start_dashboard.bat`
- To add new student data later:
  1. Put a compatible `.xlsx` file into `aryalib`
  2. Restart the app

TROUBLESHOOTING NOTES
---------------------
- If dashboard login succeeds but dashboard load fails, check the terminal first.
- A confirmed failure in this session was missing `openpyxl` in the `py -3` interpreter, despite other Python installs existing on the machine.
- If port 8000 is already in use, an old Python process is probably still running.
- Do not start multiple copies of the dashboard at once.
- If scanner support is needed beyond browser/manual entry, `pyzbar` may still require the Windows ZBar runtime.

OPEN THREADS
------------
- A final clean verification on the target machine is still required after copying `aryalib` there.
- If the other PC still closes instantly after install, run `py -3 web_dashboard.py` in a terminal and capture the real traceback.
- If needed later, a single-instance launcher guard can be added to avoid duplicate-start confusion on Windows.

RELATED SESSIONS
----------------
- None recorded in persistent memory. This file acts as the local handoff record for the next chat.

RESUME NOTES FOR NEXT CHAT
--------------------------
- Work only inside `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib` unless the user explicitly reopens the original project.
- Treat `aryalib` as the permanent local-install build.
- If asked how to add more student data, the answer is: add compatible `.xlsx` files to the clone folder and restart the app.
- If the user says the dashboard fails after login again, inspect terminal output first; do not speculate.
