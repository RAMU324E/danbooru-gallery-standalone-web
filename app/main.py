from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import urlparse

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from .paths import STATIC_DIR, TAG_DB_FILE, UPLOAD_DIR, ensure_seed_data
from .schemas import (
    CategoryCreateRequest,
    CategoryRenameRequest,
    FavoriteActionRequest,
    PromptCleanRequest,
    PromptCreateRequest,
    PromptUpdateRequest,
    SettingsUpdateRequest,
    TranslateBatchRequest,
)
from .services.danbooru_service import DanbooruFavoriteError, DanbooruService
from .services.prompt_clean_service import PromptCleanService
from .services.prompt_library_service import PromptLibraryService
from .services.settings_service import SettingsService
from .shared.db.db_manager import TagDatabaseManager
from .utils.logger import get_logger


logger = get_logger(__name__)
ensure_seed_data()

ALLOWED_DANBOORU_IMAGE_HOSTS = {"cdn.donmai.us", "danbooru.donmai.us"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings_service = SettingsService()
    library_service = PromptLibraryService()
    library_service.initialize()

    db_manager = TagDatabaseManager(str(TAG_DB_FILE))
    await db_manager.initialize_database()
    danbooru_service = DanbooruService(db_manager=db_manager, settings_service=settings_service)

    app.state.settings_service = settings_service
    app.state.library_service = library_service
    app.state.db_manager = db_manager
    app.state.danbooru_service = danbooru_service

    logger.info("Standalone 服务已初始化")
    try:
        yield
    finally:
        await db_manager.close()


app = FastAPI(title="Danbooru Gallery Standalone", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/preview", StaticFiles(directory=UPLOAD_DIR), name="preview")


def settings_service(request_app: FastAPI) -> SettingsService:
    return request_app.state.settings_service


def library_service(request_app: FastAPI) -> PromptLibraryService:
    return request_app.state.library_service


def danbooru_service(request_app: FastAPI) -> DanbooruService:
    return request_app.state.danbooru_service


def _fetch_remote_image(image_url: str) -> tuple[bytes, str, str]:
    response = requests.get(
        image_url,
        headers={"User-Agent": "DanbooruGalleryStandalone/1.0"},
        timeout=20,
    )
    response.raise_for_status()
    return (
        response.content,
        response.headers.get("content-type", "application/octet-stream"),
        response.headers.get("cache-control", "public, max-age=3600"),
    )


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"ok": True}


@app.get("/api/settings")
async def get_settings() -> dict:
    return app.state.settings_service.load()


@app.post("/api/settings")
async def update_settings(payload: SettingsUpdateRequest) -> dict:
    return app.state.settings_service.save(payload.model_dump())


@app.get("/api/danbooru/posts")
async def get_posts(tags: str = "", limit: int = 20, page: int = 1, rating: str = "all") -> list[dict]:
    return app.state.danbooru_service.search_posts(tags=tags, limit=min(limit, 100), page=page, rating=rating)


@app.get("/api/danbooru/auth")
async def get_danbooru_auth_status() -> dict:
    return app.state.danbooru_service.auth_status()


@app.get("/api/danbooru/favorites/sync")
async def sync_danbooru_favorites() -> dict:
    try:
        return app.state.danbooru_service.sync_favorite_ids()
    except DanbooruFavoriteError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"同步收藏夹失败: {exc}") from exc


@app.post("/api/danbooru/favorites/add")
async def add_danbooru_favorite(payload: FavoriteActionRequest) -> dict:
    try:
        return app.state.danbooru_service.add_favorite(payload.post_id)
    except DanbooruFavoriteError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"收藏失败: {exc}") from exc


@app.post("/api/danbooru/favorites/remove")
async def remove_danbooru_favorite(payload: FavoriteActionRequest) -> dict:
    try:
        return app.state.danbooru_service.remove_favorite(payload.post_id)
    except DanbooruFavoriteError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"取消收藏失败: {exc}") from exc


@app.get("/api/danbooru/image")
async def proxy_danbooru_image(url: str = "") -> Response:
    if not url:
        raise HTTPException(status_code=400, detail="缺少图片地址")

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="图片地址协议不合法")
    if parsed.netloc not in ALLOWED_DANBOORU_IMAGE_HOSTS and not parsed.netloc.endswith(".donmai.us"):
        raise HTTPException(status_code=400, detail="图片来源不受支持")

    try:
        content, media_type, cache_control = await asyncio.to_thread(_fetch_remote_image, url)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"图片获取失败: {exc}") from exc

    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": cache_control},
    )


@app.get("/api/tags/autocomplete")
async def autocomplete(query: str = "", limit: int = 20) -> list[dict]:
    return await app.state.danbooru_service.autocomplete(query=query, limit=limit, include_translation=True)


@app.get("/api/tags/search-chinese")
async def search_chinese(query: str = "", limit: int = 10) -> dict:
    return {"query": query, "results": await app.state.danbooru_service.search_chinese(query=query, limit=limit)}


@app.post("/api/tags/translate-batch")
async def translate_batch(payload: TranslateBatchRequest) -> dict:
    return {"translations": app.state.danbooru_service.translate_tags_batch(payload.tags)}


@app.post("/api/prompts/clean")
async def clean_prompt(payload: PromptCleanRequest) -> dict:
    return {"prompt": PromptCleanService.clean(payload)}


@app.get("/api/library")
async def get_library() -> dict:
    return app.state.library_service.load()


@app.get("/api/library/metadata")
async def get_library_metadata() -> dict:
    return app.state.library_service.metadata()


@app.put("/api/library")
async def save_library(payload: dict) -> dict:
    return app.state.library_service.save(payload)


@app.post("/api/library/categories")
async def create_category(payload: CategoryCreateRequest) -> dict:
    return app.state.library_service.create_category(payload.name)


@app.patch("/api/library/categories")
async def rename_category(payload: CategoryRenameRequest) -> dict:
    return app.state.library_service.rename_category(payload.old_name, payload.new_name)


@app.delete("/api/library/categories")
async def delete_category(name: str) -> dict:
    return app.state.library_service.delete_category(name)


@app.post("/api/library/prompts")
async def create_prompt(payload: PromptCreateRequest) -> dict:
    return app.state.library_service.add_prompt(payload.model_dump())


@app.patch("/api/library/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, payload: PromptUpdateRequest) -> dict:
    return app.state.library_service.update_prompt(prompt_id, payload.model_dump())


@app.delete("/api/library/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str) -> dict:
    return app.state.library_service.delete_prompt(prompt_id)


@app.post("/api/library/prompts/{prompt_id}/toggle-favorite")
async def toggle_favorite(prompt_id: str) -> dict:
    return app.state.library_service.toggle_favorite(prompt_id)


@app.post("/api/library/upload-image")
async def upload_library_image(image: UploadFile = File(...), alias: str = "") -> dict:
    filename = await app.state.library_service.save_preview_image(image, alias=alias)
    return {"filename": filename, "url": f"/preview/{filename}"}


@app.get("/api/library/export")
async def export_library() -> Response:
    content = app.state.library_service.export_zip_bytes()
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="prompt_library.zip"'},
    )


@app.post("/api/library/import")
async def import_library(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    return app.state.library_service.import_zip(content)


@app.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))
