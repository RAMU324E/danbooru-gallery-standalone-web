# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_submodules


hiddenimports = collect_submodules("uvicorn")

a = Analysis(
    ["run.py"],
    pathex=["."],
    binaries=[],
    datas=[
        ("app/static", "app/static"),
        ("app/assets", "app/assets"),
    ],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="DanbooruGalleryStandalone",
    icon="icon.ico",
    version="version_info.txt",
    debug=False,
    bootloader_ignore_signals=False,
    disable_windowed_traceback=True,
    strip=False,
    upx=False,
    console=False,
)
