@echo off
setlocal
cd /d %~dp0

if exist dist\DanbooruGalleryStandalone.exe (
    start "" "%~dp0dist\DanbooruGalleryStandalone.exe"
    exit /b 0
)

call start_web.bat
