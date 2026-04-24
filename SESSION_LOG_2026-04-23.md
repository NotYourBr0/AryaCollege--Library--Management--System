# Session Log - 2026-04-23

## Purpose

This file is the session handoff for the `aryalib` clone so a new chat can resume work without rebuilding context from scratch.

It is not a literal export of the UI chat thread. It is the practical record of what was done, what changed, what was verified, and what remains relevant.

## Project

- Project: `aryalib`
- Location: `C:\Users\Dell\Desktop\All Projects\Arya Library Management System\aryalib`
- Model: local-only install
- Storage: SQLite + local files only

## High-Level Outcome

The `aryalib` clone was converted into a local-install version of the library entry system:

- no Supabase
- no Postgres
- no cloud database dependency
- all data saved locally in the folder

The clone now:

- uses SQLite in `library_data.db`
- mirrors visit rows into `visits.csv`
- reads student master data from local `.xlsx` files in the folder
- supports browser/dashboard usage locally
- includes a one-click installer/launcher batch file

## Major Changes Made

### 1. Local-only architecture

The clone was stripped back to a permanent local setup:

- removed hosted DB path
- removed `DATABASE_URL` dependency
- removed `psycopg[binary]`
- removed mixed Postgres/SQLite logic
- kept only SQLite/local-file behavior

Main files changed:

- `library_app/config.py`
- `library_app/database.py`
- `library_app/data_store.py`
- `tests/test_app.py`
- `requirements.txt`

### 2. Student master now comes from local Excel files

The clone uses local student source files in `.xlsx` format.

Current recognized Excel sources in the folder:

- `ACE DATA-2023-24.xlsx`
- `ACE DATA-2024-25. Librar.xlsx`
- `ACE DATA-2025-26.xlsx`
- `AIET DATA-2022-23.xlsx`
- `AIETM__DATA__2022-2026.xlsx`
- `AIETM__DATA__2023-2027.xlsx`

Additional department CSV files were converted into `.xlsx` so they fit the clone’s import behavior.

### 3. Speed and behavior improvements inherited into clone

The clone kept the useful local improvements:

- file-backed in-memory student cache
- faster scan path
- dashboard payload consolidation
- dashboard client cache in browser session storage
- duplicate-scan timestamp fix
- export route fixes
- timezone consistency with `Asia/Kolkata`

### 4. Startup automation

Created or adjusted startup helpers:

- `start_dashboard.bat`
- `open_dashboard.bat`
- `install_and_start.bat`

Important detail:

- launcher uses `py -3`
- browser auto-open is supported through app startup

### 5. Documentation created

Created:

- `ARYALIB_SETUP_AND_LOG.md`

This is the main operations/install document for the clone.

## Dependencies

Current `requirements.txt` in `aryalib` contains:

- `flask`
- `openpyxl`
- `opencv-python`
- `pyzbar`

Important note:

- `openpyxl` is required because student files are `.xlsx`
- `pyzbar` may still require ZBar on Windows if the standalone scanner is used

## Important Runtime Discovery

One major issue found during testing:

- the clone was being launched with Python 3.13 through `py -3`
- that interpreter did not initially have `openpyxl`
- result: login page loaded, but dashboard crashed after login when it tried to read Excel student files

Fix that was applied in the current environment:

```powershell
py -3 -m pip install -r requirements.txt
```

That installed `openpyxl` into the same interpreter used by the launcher.

## Data Behavior

### Local files

- `library_data.db` = main database
- `visits.csv` = visit mirror/export source
- `admin_config.json` = admin credentials file
- `email_config.json` = email config

### What to add for new student data

No code changes are needed for new department/session student data.

The rule is:

1. add a new `.xlsx` file into the `aryalib` folder
2. keep the expected student columns
3. restart the app

That is enough.

## What Was Verified

At various points, the following were verified for the clone:

- tests passed locally
- compile checks passed
- local root route `/` responded with `200`
- export route responded correctly once fixed
- data loading recognized all intended `.xlsx` files
- student count after adding the new department files became `3236`

Sample IDs confirmed present after load:

- `4221050001`
- `6221020001`
- `6231020001`
- `4231020001`

## Common Failure Modes Identified

### 1. Dashboard loads login page but fails after login

Likely cause:

- required dependency missing in the Python interpreter actually used by `py -3`

Typical fix:

```powershell
py -3 -m pip install -r requirements.txt
```

### 2. App window opens and closes immediately

Likely causes:

- dependency missing
- direct `.py` launch instead of batch launcher
- stale server process

Preferred launchers:

- `install_and_start.bat`
- `start_dashboard.bat`

### 3. Port 8000 confusion

During debugging, there were cases with multiple Python processes bound to `127.0.0.1:8000`.

Effect:

- one copy of the app looked broken because another stale copy was actually serving the port

Rule:

- start one copy only
- if behavior is inconsistent, kill old Python processes using port `8000` and restart once

## Practical Install Steps For Another PC

1. Install Python 3
2. Verify `py` works
3. Copy the full `aryalib` folder
4. Double-click `install_and_start.bat`
5. If dashboard fails after login, run:

```powershell
py -3 -m pip install -r requirements.txt
py -3 web_dashboard.py
```

from a terminal and read the visible error

## Files Added Or Changed During This Session

Not exhaustive across all earlier work, but important clone-specific outputs include:

- `ARYALIB_SETUP_AND_LOG.md`
- `SESSION_LOG_2026-04-23.md`
- `install_and_start.bat`
- `AIETM__DATA__2022-2026.xlsx`
- `AIETM__DATA__2023-2027.xlsx`

Plus updates in:

- `requirements.txt`
- `library_app/config.py`
- `library_app/database.py`
- `library_app/data_store.py`
- `library_app/web_server.py`
- `tests/test_app.py`
- `start_dashboard.bat`
- `open_dashboard.bat`

## Recommended Next-Step Context For A New Chat

If a new chat starts, the useful opening context is:

- work only inside `aryalib`
- it is the local-only clone
- storage is SQLite/local files only
- student master comes from all `.xlsx` files in the folder
- main setup document is `ARYALIB_SETUP_AND_LOG.md`
- if there is a runtime failure, verify the same interpreter used by `py -3` has `openpyxl`

## One-Line Handoff

`aryalib` is now the local-install edition of the project, using SQLite and local Excel student files, with one-click setup via `install_and_start.bat`; if the other PC fails after login, check the Python environment used by `py -3` and reinstall `requirements.txt`.

