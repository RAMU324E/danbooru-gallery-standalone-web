@echo off
setlocal
cd /d %~dp0

set DANBOORU_STANDALONE_PORT=36741

if not exist .venv (
    py -3 -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
echo.
echo Danbooru Gallery Standalone preferred port: %DANBOORU_STANDALONE_PORT%
python run.py
if errorlevel 1 (
    echo.
    echo Startup failed. Press any key to close.
    pause >nul
)
