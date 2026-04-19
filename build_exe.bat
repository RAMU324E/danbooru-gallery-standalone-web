@echo off
setlocal
cd /d %~dp0

if not exist .venv (
    py -3 -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install "pyinstaller>=6.0"
pip install Pillow

if exist build rmdir /s /q build
if exist dist\DanbooruGalleryStandalone.exe del /q dist\DanbooruGalleryStandalone.exe

python build_icon.py
python -m PyInstaller danbooru_gallery_standalone.spec --noconfirm

echo.
echo Build complete:
echo %~dp0dist\DanbooruGalleryStandalone.exe
pause
