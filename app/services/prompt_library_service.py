from __future__ import annotations

import io
import json
import shutil
import tempfile
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile

from ..paths import BUNDLED_DEFAULT_LIBRARY, LIBRARY_FILE, UPLOAD_DIR


def utc_now() -> str:
    return datetime.utcnow().isoformat()


class PromptLibraryService:
    def __init__(self, library_file=LIBRARY_FILE):
        self.library_file = Path(library_file)

    def _ensure_compatibility(self, data: dict) -> dict:
        if "version" not in data:
            data["version"] = "1.6"
        if "settings" not in data:
            data["settings"] = {"language": "zh-CN", "separator": ", ", "save_selection": True}
        if "categories" not in data:
            data["categories"] = []
        if "last_modified" not in data:
            data["last_modified"] = utc_now()

        for category in data["categories"]:
            if "updated_at" not in category:
                category["updated_at"] = utc_now()
            if "prompts" not in category:
                category["prompts"] = []
            for prompt in category["prompts"]:
                if not prompt.get("id"):
                    prompt["id"] = str(uuid.uuid4())
                if "description" not in prompt:
                    prompt["description"] = ""
                if "tags" not in prompt:
                    prompt["tags"] = []
                if "image" not in prompt:
                    prompt["image"] = ""
                if "favorite" not in prompt:
                    prompt["favorite"] = False
                if "template" not in prompt:
                    prompt["template"] = False
                if "created_at" not in prompt:
                    prompt["created_at"] = utc_now()
                if "updated_at" not in prompt:
                    prompt["updated_at"] = prompt["created_at"]
                if "usage_count" not in prompt:
                    prompt["usage_count"] = 0
                if "last_used" not in prompt:
                    prompt["last_used"] = None
        return data

    def initialize(self) -> None:
        if not self.library_file.exists():
            if BUNDLED_DEFAULT_LIBRARY.exists():
                shutil.copy2(BUNDLED_DEFAULT_LIBRARY, self.library_file)
            else:
                self.save(
                    {
                        "version": "1.6",
                        "last_modified": utc_now(),
                        "categories": [],
                        "settings": {"language": "zh-CN", "separator": ", ", "save_selection": True},
                    }
                )
        else:
            self.save(self.load())

    def load(self) -> dict:
        if not self.library_file.exists():
            return self._ensure_compatibility({})
        data = json.loads(self.library_file.read_text(encoding="utf-8"))
        return self._ensure_compatibility(data)

    def save(self, data: dict) -> dict:
        data = self._ensure_compatibility(data)
        data["last_modified"] = utc_now()

        with tempfile.NamedTemporaryFile(
            "w",
            delete=False,
            dir=self.library_file.parent,
            encoding="utf-8",
            suffix=".json",
        ) as temp_file:
            json.dump(data, temp_file, ensure_ascii=False, indent=2)
            temp_path = Path(temp_file.name)

        temp_path.replace(self.library_file)
        return data

    def metadata(self) -> dict:
        data = self.load()
        return {
            "last_modified": data.get("last_modified"),
            "version": data.get("version"),
            "categories_count": len(data.get("categories", [])),
            "total_prompts": sum(len(category.get("prompts", [])) for category in data.get("categories", [])),
        }

    def _get_category(self, data: dict, name: str) -> dict:
        for category in data["categories"]:
            if category["name"] == name:
                return category
        raise HTTPException(status_code=404, detail=f"分类不存在: {name}")

    def create_category(self, name: str) -> dict:
        data = self.load()
        if any(category["name"] == name for category in data["categories"]):
            raise HTTPException(status_code=400, detail="分类已存在")
        data["categories"].append({"name": name, "updated_at": utc_now(), "prompts": []})
        return self.save(data)

    def rename_category(self, old_name: str, new_name: str) -> dict:
        data = self.load()
        category = self._get_category(data, old_name)
        if any(item["name"] == new_name for item in data["categories"] if item["name"] != old_name):
            raise HTTPException(status_code=400, detail="新分类名已存在")
        category["name"] = new_name
        category["updated_at"] = utc_now()
        return self.save(data)

    def delete_category(self, name: str) -> dict:
        data = self.load()
        data["categories"] = [category for category in data["categories"] if category["name"] != name]
        return self.save(data)

    def add_prompt(self, payload: dict) -> dict:
        data = self.load()
        category = self._get_category(data, payload["category"])
        now = utc_now()
        category["prompts"].append(
            {
                "id": str(uuid.uuid4()),
                "alias": payload.get("alias", ""),
                "prompt": payload.get("prompt", ""),
                "description": payload.get("description", ""),
                "tags": payload.get("tags", []),
                "image": payload.get("image", ""),
                "favorite": payload.get("favorite", False),
                "template": payload.get("template", False),
                "created_at": now,
                "updated_at": now,
                "usage_count": 0,
                "last_used": None,
            }
        )
        category["updated_at"] = now
        return self.save(data)

    def update_prompt(self, prompt_id: str, payload: dict) -> dict:
        data = self.load()
        now = utc_now()

        prompt_to_move = None
        source_category = None
        target_category_name = payload.get("category")

        for category in data["categories"]:
            for prompt in category["prompts"]:
                if prompt["id"] == prompt_id:
                    prompt_to_move = prompt
                    source_category = category
                    break
            if prompt_to_move:
                break

        if prompt_to_move is None or source_category is None:
            raise HTTPException(status_code=404, detail="提示词不存在")

        for field in ["alias", "prompt", "description", "tags", "image", "favorite", "template"]:
            if field in payload and payload[field] is not None:
                prompt_to_move[field] = payload[field]

        prompt_to_move["updated_at"] = now
        source_category["updated_at"] = now

        if target_category_name and target_category_name != source_category["name"]:
            target_category = self._get_category(data, target_category_name)
            source_category["prompts"] = [item for item in source_category["prompts"] if item["id"] != prompt_id]
            target_category["prompts"].append(prompt_to_move)
            target_category["updated_at"] = now

        return self.save(data)

    def delete_prompt(self, prompt_id: str) -> dict:
        data = self.load()
        now = utc_now()
        for category in data["categories"]:
            before = len(category["prompts"])
            category["prompts"] = [prompt for prompt in category["prompts"] if prompt["id"] != prompt_id]
            if len(category["prompts"]) != before:
                category["updated_at"] = now
                return self.save(data)
        raise HTTPException(status_code=404, detail="提示词不存在")

    def toggle_favorite(self, prompt_id: str) -> dict:
        data = self.load()
        now = utc_now()
        for category in data["categories"]:
            for prompt in category["prompts"]:
                if prompt["id"] == prompt_id:
                    prompt["favorite"] = not prompt.get("favorite", False)
                    prompt["updated_at"] = now
                    category["updated_at"] = now
                    return self.save(data)
        raise HTTPException(status_code=404, detail="提示词不存在")

    def export_zip_bytes(self) -> bytes:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.write(self.library_file, arcname="prompt_library.json")
            if UPLOAD_DIR.exists():
                for file in UPLOAD_DIR.iterdir():
                    if file.is_file():
                        zip_file.write(file, arcname=f"preview/{file.name}")
        memory_file.seek(0)
        return memory_file.read()

    def import_zip(self, file_bytes: bytes) -> dict:
        with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zip_file:
            source_name = "prompt_library.json" if "prompt_library.json" in zip_file.namelist() else "data.json"
            if source_name not in zip_file.namelist():
                raise HTTPException(status_code=400, detail="ZIP 中缺少 prompt_library.json 或 data.json")

            imported_data = json.loads(zip_file.read(source_name).decode("utf-8"))
            imported_data = self._ensure_compatibility(imported_data)
            self.save(imported_data)

            for file_name in zip_file.namelist():
                if file_name.startswith("preview/") and not file_name.endswith("/"):
                    target_path = UPLOAD_DIR / Path(file_name).name
                    with zip_file.open(file_name) as source, open(target_path, "wb") as target:
                        shutil.copyfileobj(source, target)

        return self.load()

    async def save_preview_image(self, upload_file: UploadFile, alias: str) -> str:
        suffix = Path(upload_file.filename or "preview.png").suffix or ".png"
        safe_alias = "".join(char for char in alias if char.isalnum() or char in ("_", "-", " ")).strip() or "preview"
        file_name = f"{safe_alias}_{uuid.uuid4().hex[:8]}{suffix}"
        target_path = UPLOAD_DIR / file_name

        with open(target_path, "wb") as target:
            while chunk := await upload_file.read(1024 * 1024):
                target.write(chunk)

        return file_name
