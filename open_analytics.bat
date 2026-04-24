@echo off
cd /d "%~dp0"
echo Starting Arya Library server...
start "" py -3 web_dashboard.py
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000/analytics"
