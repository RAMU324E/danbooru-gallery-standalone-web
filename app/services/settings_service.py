from __future__ import annotations

import json
from copy import deepcopy

from ..paths import DEFAULT_SETTINGS, SETTINGS_FILE


class SettingsService:
    def __init__(self, settings_file=SETTINGS_FILE):
        self.settings_file = settings_file

    def load(self) -> dict:
        data = deepcopy(DEFAULT_SETTINGS)
        if self.settings_file.exists():
            loaded = json.loads(self.settings_file.read_text(encoding="utf-8"))
            data.update(loaded)
        return data

    def save(self, patch: dict) -> dict:
        data = self.load()
        for key, value in patch.items():
            if value is not None and key in data:
                data[key] = value
        self.settings_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return data
