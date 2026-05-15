from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.paths import DEFAULT_SETTINGS
from app.services.danbooru_service import DanbooruService
from app.services.prompt_library_service import PromptLibraryService
from app.services.settings_service import SettingsService


class SettingsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.settings_file = Path(self.temp_dir.name) / "settings.json"
        self.service = SettingsService(settings_file=self.settings_file)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_load_returns_defaults_when_file_missing(self) -> None:
        data = self.service.load()
        self.assertEqual(data["language"], DEFAULT_SETTINGS["language"])
        self.assertEqual(data["selected_categories"], DEFAULT_SETTINGS["selected_categories"])
        self.assertEqual(data["high_quality_previews"], DEFAULT_SETTINGS["high_quality_previews"])

    def test_save_persists_known_fields_and_ignores_unknown_or_none(self) -> None:
        saved = self.service.save(
            {
                "danbooru_username": "alice",
                "selected_categories": ["artist", "general"],
                "high_quality_previews": False,
                "autocomplete_max_results": 12,
                "unknown_key": "ignored",
                "danbooru_api_key": None,
            }
        )

        self.assertEqual(saved["danbooru_username"], "alice")
        self.assertEqual(saved["selected_categories"], ["artist", "general"])
        self.assertFalse(saved["high_quality_previews"])
        self.assertEqual(saved["autocomplete_max_results"], 12)
        self.assertNotIn("unknown_key", saved)
        self.assertEqual(saved["danbooru_api_key"], DEFAULT_SETTINGS["danbooru_api_key"])

        reloaded = self.service.load()
        self.assertEqual(reloaded, saved)


class PromptLibraryServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.library_file = Path(self.temp_dir.name) / "prompt_library.json"
        self.service = PromptLibraryService(library_file=self.library_file)
        self.service.save(
            {
                "version": "1.6",
                "categories": [],
                "settings": {"language": "zh-CN", "separator": ", ", "save_selection": True},
            }
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_category_and_prompt_crud_roundtrip(self) -> None:
        self.service.create_category("Category A")
        self.service.create_category("Category B")
        self.service.rename_category("Category A", "Category Alpha")

        data = self.service.add_prompt(
            {
                "category": "Category Alpha",
                "alias": "Starter",
                "prompt": "1girl, solo",
                "description": "base prompt",
                "tags": ["portrait", "solo"],
            }
        )
        category_alpha = next(category for category in data["categories"] if category["name"] == "Category Alpha")
        prompt = category_alpha["prompts"][0]
        prompt_id = prompt["id"]

        updated = self.service.update_prompt(
            prompt_id,
            {
                "category": "Category B",
                "alias": "Starter v2",
                "prompt": "1girl, solo, masterpiece",
                "description": "updated",
                "tags": ["portrait", "solo", "masterpiece"],
            },
        )
        category_b = next(category for category in updated["categories"] if category["name"] == "Category B")
        moved_prompt = next(item for item in category_b["prompts"] if item["id"] == prompt_id)
        self.assertEqual(moved_prompt["alias"], "Starter v2")
        self.assertEqual(moved_prompt["prompt"], "1girl, solo, masterpiece")
        self.assertEqual(moved_prompt["description"], "updated")
        self.assertEqual(moved_prompt["tags"], ["portrait", "solo", "masterpiece"])

        favorited = self.service.toggle_favorite(prompt_id)
        category_b = next(category for category in favorited["categories"] if category["name"] == "Category B")
        toggled_prompt = next(item for item in category_b["prompts"] if item["id"] == prompt_id)
        self.assertTrue(toggled_prompt["favorite"])

        deleted_prompt = self.service.delete_prompt(prompt_id)
        category_b = next(category for category in deleted_prompt["categories"] if category["name"] == "Category B")
        self.assertEqual(category_b["prompts"], [])

        deleted_category = self.service.delete_category("Category Alpha")
        self.assertFalse(any(category["name"] == "Category Alpha" for category in deleted_category["categories"]))


class DanbooruServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.settings_file = Path(self.temp_dir.name) / "settings.json"
        self.settings_service = SettingsService(settings_file=self.settings_file)
        self.db_manager = Mock()
        self.service = DanbooruService(db_manager=self.db_manager, settings_service=self.settings_service)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_search_posts_uses_descriptive_user_agent_and_multi_rating_or_syntax(self) -> None:
        response = Mock()
        response.status_code = 200
        response.headers = {}
        response.json.return_value = [
            {
                "id": 123,
                "rating": "g",
                "score": 10,
                "fav_count": 2,
                "file_ext": "jpg",
                "image_width": 1000,
                "image_height": 1400,
                "created_at": "2026-05-15T00:00:00.000-04:00",
                "preview_file_url": "/preview.jpg",
                "large_file_url": "/large.jpg",
                "file_url": "/full.jpg",
                "tag_string": "artist_tag copyright_tag general_tag",
                "tag_string_artist": "artist_tag",
                "tag_string_copyright": "copyright_tag",
                "tag_string_character": "",
                "tag_string_general": "general_tag",
                "tag_string_meta": "",
            }
        ]

        with (
            patch("app.services.danbooru_service._donmai_throttle.wait", return_value=None),
            patch("app.services.danbooru_service.requests.request", return_value=response) as request_mock,
        ):
            results = self.service.search_posts("1girl order:rank", limit=20, page=1, rating="general,sensitive")

        self.assertEqual(results[0]["id"], 123)
        _, called_url = request_mock.call_args.args[:2]
        self.assertEqual(called_url, "https://danbooru.donmai.us/posts.json")
        self.assertEqual(
            request_mock.call_args.kwargs["headers"]["User-Agent"],
            "Danbooru-Gallery/1.0",
        )
        self.assertEqual(request_mock.call_args.kwargs["params"]["limit"], 20)
        self.assertEqual(request_mock.call_args.kwargs["params"]["page"], 1)
        self.assertEqual(
            request_mock.call_args.kwargs["params"]["tags"],
            "1girl order:rank ~rating:general ~rating:sensitive",
        )


if __name__ == "__main__":
    unittest.main()
