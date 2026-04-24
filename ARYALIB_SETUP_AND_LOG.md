# AryaLib Setup And Log

## Purpose

This file is the single reference for the local-only `aryalib` clone.

It covers:
- what this clone is
- what was changed
- what to install
- how to run it
- where data is stored
- how to add new student data
- common errors and fixes

This clone is intended for a permanently installed Windows PC with all data saved locally in the project folder.

## Current Model

- Storage: local SQLite only
- Database file: `library_data.db`
- Visit log mirror: `visits.csv`
- Student source: all `.xlsx` student files in the `aryalib` folder
- Dashboard server: local Python web server
- No Supabase
- No Postgres

## Important Files

- `web_dashboard.py`: starts the local dashboard
- `library_app/web_server.py`: local HTTP server
- `library_app/database.py`: SQLite database logic
- `library_app/data_store.py`: student loading, scan workflow, summaries
- `library_data.db`: main local database
- `visits.csv`: visit export/log mirror
- `admin_config.json`: admin credentials config
- `email_config.json`: email config
- `requirements.txt`: Python dependencies
- `install_and_start.bat`: one-click setup and start
- `start_dashboard.bat`: starts dashboard
- `open_dashboard.bat`: starts dashboard

## Python Dependencies

Install with:

```powershell
py -3 -m pip install -r requirements.txt
```

Current `requirements.txt`:

- `flask`
- `openpyxl`
- `opencv-python`
- `pyzbar`

Notes:
- `openpyxl` is required because student master data is loaded from `.xlsx` files.
- `opencv-python` and `pyzbar` are only needed for the standalone desktop scanner flow.
- `pyzbar` may still require the Windows ZBar runtime if the desktop scanner is used.
- The normal browser dashboard does not need ZBar.

## Easy Startup

### Recommended

Double-click:

- `install_and_start.bat`

What it does:
- checks Python launcher `py`
- upgrades `pip`
- installs `requirements.txt`
- starts the dashboard
- opens the browser automatically

### Normal startup after setup

Double-click:

- `start_dashboard.bat`

or run:

```powershell
py -3 web_dashboard.py
```

Default URL:

- `http://127.0.0.1:8000`

## Data Storage

All local data stays inside the `aryalib` folder.

### Main database

- `library_data.db`

SQLite tables:
- `students`
- `visits`
- `sync_state`

### CSV log/export

- `visits.csv`

This is useful for opening in Excel and checking all visit rows quickly.

### Admin/email config

- `admin_config.json`
- `email_config.json`

## What Was Changed In This Clone

This clone was separated from the cloud-hosted version and converted back to a local install model.

### Storage changes

- Removed Supabase/Postgres usage
- Removed `DATABASE_URL` dependency
- Removed `psycopg[binary]`
- Kept everything local in SQLite and local files

### Performance changes

- Student lookup moved to file-backed in-memory cache
- Scan lookup no longer depends on remote student queries
- Dashboard reduced to one main payload load
- Browser session storage cache added for dashboard data

### Stability changes

- Duplicate scan future-timestamp bug fixed
- Export route fixed
- Local server export route fixed
- Explicit app timezone handling added

### Startup changes

- `start_dashboard.bat` changed to use `py -3`
- `install_and_start.bat` created for one-click setup
- Browser auto-open added in local server startup

## Timezone

App timezone is:

- `Asia/Kolkata`

Used for:
- visit timestamps
- session timing
- OTP timestamps
- daily/weekly summary boundaries

## Added Student Data Sources

The clone currently loads from these Excel files:

- `ACE DATA-2023-24.xlsx`
- `ACE DATA-2024-25. Librar.xlsx`
- `ACE DATA-2025-26.xlsx`
- `AIET DATA-2022-23.xlsx`
- `AIETM__DATA__2022-2026.xlsx`
- `AIETM__DATA__2023-2027.xlsx`

These are merged into the student master automatically when the app loads them.

## How To Add More Student Data Later

### Recommended method

1. Put the new student file in the `aryalib` folder
2. Use `.xlsx` format
3. Keep columns in this style:
   - `STUDENTE NAME`
   - `FATHER NAME`
   - `BRANCH`
   - `CODE`
4. Restart the app

That is enough.

### If your file is CSV

Open it in Excel and save it as `.xlsx`, then place it in the `aryalib` folder.

### Do not do this

- do not add student master data into `visits.csv`
- do not manually edit `library_data.db` unless you know SQLite

## How Librarian Can Check Data

### Dashboard

Use the dashboard for:
- total visits
- students inside
- recent visits
- weekly report

### CSV

Open:

- `visits.csv`

in Excel to inspect all visits.

### SQLite

Open:

- `library_data.db`

with DB Browser for SQLite or SQLiteStudio.

Useful query:

```sql
SELECT COUNT(*) FROM visits;
```

## Known Troubleshooting Cases

### Dashboard says "Dashboard load failed. Please restart the web server."

Common causes:
- missing Python dependency in the interpreter actually being used
- old server still running on port `8000`
- starting multiple copies of the app

Fix:

```powershell
py -3 -m pip install -r requirements.txt
```

Then stop old copies and start one clean instance.

### `web_dashboard.py` opens and closes instantly

Do not double-click the `.py` file directly.

Use:
- `install_and_start.bat`
- or `start_dashboard.bat`

If needed, run:

```powershell
py -3 web_dashboard.py
```

from a terminal so the error remains visible.

### Port already in use

This usually means another copy is already running.

Check browser first:
- if `http://127.0.0.1:8000` already works, do not start another copy

### Scanner dependencies

If standalone scanner fails, browser dashboard may still work fine.

Desktop scanner may need:
- `opencv-python`
- `pyzbar`
- ZBar runtime on Windows

## Recommended Install Steps For Other PC

1. Install Python 3
2. Make sure `py` works in Command Prompt
3. Copy the full `aryalib` folder to the other PC
4. Double-click `install_and_start.bat`
5. Log in to the dashboard

## Operational Notes

- Data is local and stays in the folder
- Student files are loaded from local Excel files
- Visit history accumulates in SQLite
- `visits.csv` mirrors visit records for easier manual checking
- This clone is meant for local permanent use, not cloud hosting

## Short Summary

This clone is the local-install edition.

Use:
- `.xlsx` files for new student data
- `library_data.db` for real stored data
- `visits.csv` for easy manual checking
- `install_and_start.bat` for simple setup on new systems

