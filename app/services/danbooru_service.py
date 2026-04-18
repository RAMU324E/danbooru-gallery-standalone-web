from __future__ import annotations

import json
from typing import Iterable
from urllib.parse import urljoin

import requests
from requests.auth import HTTPBasicAuth

from ..paths import BUNDLED_ZH_CN_DIR
from ..shared.db.db_manager import TagDatabaseManager
from ..shared.translation.translation_loader import TranslationLoader
from ..utils.logger import get_logger
from .settings_service import SettingsService


logger = get_logger(__name__)

BASE_URL = "https://danbooru.donmai.us"

CATEGORY_FIELDS = [
    ("artist", "tag_string_artist"),
    ("copyright", "tag_string_copyright"),
    ("character", "tag_string_character"),
    ("general", "tag_string_general"),
    ("meta", "tag_string_meta"),
]


class DanbooruFavoriteError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class DanbooruService:
    def __init__(self, db_manager: TagDatabaseManager, settings_service: SettingsService):
        self.db_manager = db_manager
        self.settings_service = settings_service
        self.translation_loader = TranslationLoader(str(BUNDLED_ZH_CN_DIR))
        self.translation_loader.load_all()

    def _credentials(self) -> tuple[str, str]:
        settings = self.settings_service.load()
        username = settings.get("danbooru_username", "")
        api_key = settings.get("danbooru_api_key", "")
        return username, api_key

    def _auth(self):
        username, api_key = self._credentials()
        if username and api_key:
            return HTTPBasicAuth(username, api_key)
        return None

    def auth_status(self) -> dict[str, str | bool]:
        username, api_key = self._credentials()
        return {
            "has_auth": bool(username and api_key),
            "username": username,
        }

    @staticmethod
    def _normalize_asset_url(url: str | None) -> str | None:
        if not url:
            return None
        return url if url.startswith("http") else urljoin(BASE_URL, url)

    @staticmethod
    def _extract_error_message(response: requests.Response) -> str:
        try:
            data = response.json()
            return data.get("message") or data.get("reason") or response.text
        except (json.JSONDecodeError, ValueError):
            return response.text

    def _require_auth(self) -> tuple[str, HTTPBasicAuth]:
        username, api_key = self._credentials()
        if not username or not api_key:
            raise DanbooruFavoriteError("请先在设置中配置 Danbooru 用户名和 API Key", status_code=401)
        return username, HTTPBasicAuth(username, api_key)

    def _select_prompt_tags(self, post: dict) -> list[str]:
        settings = self.settings_service.load()
        selected_categories = settings.get("selected_categories", ["copyright", "character", "general"])
        blacklist = set(settings.get("blacklist", []))
        filter_enabled = settings.get("filter_enabled", True)
        filter_tags = set(settings.get("filter_tags", [])) if filter_enabled else set()

        selected = []
        for category_name, field_name in CATEGORY_FIELDS:
            if category_name not in selected_categories:
                continue
            tags = [tag for tag in (post.get(field_name) or "").split(" ") if tag]
            for tag in tags:
                if tag in blacklist or tag in filter_tags:
                    continue
                selected.append(tag)
        return selected

    def search_posts(self, tags: str, limit: int, page: int, rating: str | None) -> list[dict]:
        search_tags: list[str] = []
        date_tag = None
        for raw_tag in tags.split():
            if raw_tag.startswith("date:"):
                date_tag = raw_tag
            else:
                search_tags.append(raw_tag)

        if date_tag:
            search_tags.append(date_tag)
        if rating and rating.lower() != "all":
            search_tags.append(f"rating:{rating.lower()}")

        response = requests.get(
            f"{BASE_URL}/posts.json",
            params={"tags": " ".join(search_tags), "limit": limit, "page": page},
            auth=self._auth(),
            timeout=20,
        )
        response.raise_for_status()

        results = []
        for post in response.json():
            prompt_tags = self._select_prompt_tags(post)
            results.append(
                {
                    "id": post["id"],
                    "rating": post.get("rating"),
                    "score": post.get("score", 0),
                    "fav_count": post.get("fav_count", 0),
                    "file_ext": post.get("file_ext"),
                    "image_width": post.get("image_width"),
                    "image_height": post.get("image_height"),
                    "created_at": post.get("created_at"),
                    "preview_url": self._normalize_asset_url(post.get("preview_file_url")),
                    "sample_url": self._normalize_asset_url(post.get("large_file_url") or post.get("sample_file_url")),
                    "file_url": self._normalize_asset_url(post.get("file_url")),
                    "post_url": f"{BASE_URL}/posts/{post['id']}",
                    "tag_string": post.get("tag_string", ""),
                    "tag_string_artist": post.get("tag_string_artist", ""),
                    "tag_string_copyright": post.get("tag_string_copyright", ""),
                    "tag_string_character": post.get("tag_string_character", ""),
                    "tag_string_general": post.get("tag_string_general", ""),
                    "tag_string_meta": post.get("tag_string_meta", ""),
                    "gallery_prompt": ", ".join(prompt_tags),
                }
            )
        return results

    def add_favorite(self, post_id: int) -> dict:
        _, auth = self._require_auth()
        response = requests.post(
            f"{BASE_URL}/favorites.json",
            auth=auth,
            data={"post_id": post_id},
            timeout=15,
        )
        if response.status_code in {200, 201}:
            return {"success": True, "post_id": post_id, "message": "收藏成功"}

        message = self._extract_error_message(response)
        if response.status_code == 422 and "already favorited" in message.lower():
            return {"success": True, "post_id": post_id, "message": "已收藏，无需重复操作"}

        error_map = {
            401: "认证失败，请检查 Danbooru 用户名和 API Key",
            403: "权限不足，无法收藏该图片",
            404: "图片不存在",
            429: "请求过于频繁，请稍后重试",
        }
        raise DanbooruFavoriteError(
            error_map.get(response.status_code, f"收藏失败: {message or response.status_code}"),
            status_code=response.status_code or 502,
        )

    def remove_favorite(self, post_id: int) -> dict:
        _, auth = self._require_auth()
        response = requests.delete(
            f"{BASE_URL}/favorites/{post_id}.json",
            auth=auth,
            timeout=15,
        )
        if response.status_code in {200, 204, 404}:
            return {"success": True, "post_id": post_id, "message": "取消收藏成功"}

        message = self._extract_error_message(response)
        error_map = {
            401: "认证失败，请检查 Danbooru 用户名和 API Key",
            403: "权限不足，无法取消收藏该图片",
            429: "请求过于频繁，请稍后重试",
        }
        raise DanbooruFavoriteError(
            error_map.get(response.status_code, f"取消收藏失败: {message or response.status_code}"),
            status_code=response.status_code or 502,
        )

    def sync_favorite_ids(self, *, page_limit: int = 200, max_pages: int = 10) -> dict:
        username, auth = self._require_auth()
        favorite_ids: list[str] = []
        truncated = False

        for page in range(1, max_pages + 1):
            response = requests.get(
                f"{BASE_URL}/posts.json",
                params={"tags": f"ordfav:{username}", "limit": page_limit, "page": page},
                auth=auth,
                timeout=20,
            )
            if response.status_code != 200:
                message = self._extract_error_message(response)
                error_map = {
                    401: "认证失败，请检查 Danbooru 用户名和 API Key",
                    403: "权限不足，无法同步收藏夹",
                    429: "请求过于频繁，请稍后重试",
                }
                raise DanbooruFavoriteError(
                    error_map.get(response.status_code, f"同步收藏夹失败: {message or response.status_code}"),
                    status_code=response.status_code or 502,
                )

            posts = response.json()
            favorite_ids.extend(str(post["id"]) for post in posts if post.get("id") is not None)
            if len(posts) < page_limit:
                break
        else:
            truncated = True

        return {
            "success": True,
            "username": username,
            "favorites": favorite_ids,
            "count": len(favorite_ids),
            "truncated": truncated,
        }

    async def autocomplete(self, query: str, limit: int, include_translation: bool = True) -> list[dict]:
        if not query:
            return []

        try:
            db_results = await self.db_manager.search_tags_by_prefix(query, limit)
            if db_results:
                return [
                    {
                        "name": item["tag"],
                        "category": item["category"],
                        "post_count": item["post_count"],
                        "translation": item.get("translation_cn") if include_translation else None,
                        "aliases": item.get("aliases", []),
                    }
                    for item in db_results
                ]
        except Exception as exc:
            logger.warning(f"[Autocomplete] 数据库查询失败: {exc}")

        response = requests.get(
            f"{BASE_URL}/tags.json",
            params={
                "search[name_or_alias_matches]": f"{query}*",
                "search[order]": "count",
                "limit": limit,
            },
            auth=self._auth(),
            timeout=8,
        )
        response.raise_for_status()
        results = []
        for item in response.json():
            results.append(
                {
                    "name": item.get("name", ""),
                    "category": item.get("category", 0),
                    "post_count": item.get("post_count", 0),
                    "translation": self.translation_loader.get_chinese(item.get("name", "")) if include_translation else None,
                    "aliases": item.get("words", []),
                }
            )
        return results

    async def search_chinese(self, query: str, limit: int) -> list[dict]:
        if not query:
            return []
        db_results = await self.db_manager.search_tags_optimized(query, limit, search_type="chinese")
        if not db_results:
            fallback_results = []
            for english_tag, chinese_translation in self.translation_loader.search_chinese(query, limit):
                tag_info = await self.db_manager.get_tag(english_tag)
                fallback_results.append(
                    {
                        "tag": english_tag,
                        "translation_cn": chinese_translation,
                        "category": tag_info["category"] if tag_info else 0,
                        "post_count": tag_info["post_count"] if tag_info else 0,
                        "match_score": 3,
                    }
                )
            return fallback_results
        return [
            {
                "tag": item["tag"],
                "translation_cn": item.get("translation_cn"),
                "category": item["category"],
                "post_count": item["post_count"],
                "match_score": item.get("match_score", 0),
            }
            for item in db_results
        ]

    def translate_tags_batch(self, tags: Iterable[str]) -> dict[str, str]:
        return {
            tag: self.translation_loader.get_chinese(tag)
            for tag in tags
            if tag and self.translation_loader.get_chinese(tag)
        }
