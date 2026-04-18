from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PromptCleanRequest(BaseModel):
    prompt: str = ""
    cleanup_commas: bool = True
    cleanup_whitespace: bool = True
    remove_lora_tags: bool = False
    cleanup_newlines: Literal["false", "space", "comma"] = "false"
    fix_brackets: Literal["false", "parenthesis", "brackets", "both"] = "both"
    prompt_formatting: bool = True
    underscore_to_space: bool = True
    complete_weight_syntax: bool = True
    smart_bracket_escaping: bool = True
    standardize_commas: bool = True
    fix_region_syntax: bool = True


class TranslateBatchRequest(BaseModel):
    tags: list[str] = Field(default_factory=list)


class FavoriteActionRequest(BaseModel):
    post_id: int


class SettingsUpdateRequest(BaseModel):
    language: str | None = None
    blacklist: list[str] | None = None
    filter_tags: list[str] | None = None
    filter_enabled: bool | None = None
    selected_categories: list[str] | None = None
    danbooru_username: str | None = None
    danbooru_api_key: str | None = None
    autocomplete_max_results: int | None = None
    high_quality_previews: bool | None = None


class CategoryCreateRequest(BaseModel):
    name: str


class CategoryRenameRequest(BaseModel):
    old_name: str
    new_name: str


class PromptCreateRequest(BaseModel):
    category: str
    alias: str = ""
    prompt: str = ""
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    image: str = ""
    favorite: bool = False
    template: bool = False


class PromptUpdateRequest(BaseModel):
    category: str | None = None
    alias: str | None = None
    prompt: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    image: str | None = None
    favorite: bool | None = None
    template: bool | None = None
