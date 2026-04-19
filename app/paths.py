from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path


def resolve_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        bundle_root = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
        return bundle_root / "app"
    return Path(__file__).resolve().parent


def resolve_runtime_dir(app_dir: Path) -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return app_dir.parent


APP_DIR = resolve_app_dir()
STANDALONE_DIR = resolve_runtime_dir(APP_DIR)
ASSETS_DIR = APP_DIR / "assets"

DATA_DIR = STANDALONE_DIR / "data"
LOG_DIR = STANDALONE_DIR / "logs"
STATIC_DIR = APP_DIR / "static"
UPLOAD_DIR = DATA_DIR / "library_previews"

SETTINGS_FILE = DATA_DIR / "settings.json"
LIBRARY_FILE = DATA_DIR / "prompt_library.json"
TAG_DB_FILE = DATA_DIR / "tags_cache.db"

BUNDLED_DEFAULT_LIBRARY = ASSETS_DIR / "default_prompt_library.json"
BUNDLED_TAG_DB_FILE = ASSETS_DIR / "tags_cache.db"
BUNDLED_ZH_CN_DIR = ASSETS_DIR / "zh_cn"


DEFAULT_SETTINGS = {
    "language": "zh",
    "blacklist": [],
    "filter_tags": [
        "watermark",
        "sample_watermark",
        "weibo_username",
        "weibo",
        "weibo_logo",
        "weibo_watermark",
        "censored",
        "mosaic_censoring",
        "artist_name",
        "twitter_username",
    ],
    "filter_enabled": True,
    "selected_categories": ["copyright", "character", "general"],
    "danbooru_username": "",
    "danbooru_api_key": "",
    "autocomplete_max_results": 20,
    "high_quality_previews": True,
}


def ensure_seed_data() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if BUNDLED_TAG_DB_FILE.exists() and not TAG_DB_FILE.exists():
        shutil.copy2(BUNDLED_TAG_DB_FILE, TAG_DB_FILE)

    if BUNDLED_DEFAULT_LIBRARY.exists() and not LIBRARY_FILE.exists():
        shutil.copy2(BUNDLED_DEFAULT_LIBRARY, LIBRARY_FILE)

    if not SETTINGS_FILE.exists():
        SETTINGS_FILE.write_text(
            json.dumps(DEFAULT_SETTINGS, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
