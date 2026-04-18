from __future__ import annotations

from ..core.prompt_cleaning_maid import PromptCleaningMaid
from ..schemas import PromptCleanRequest


class PromptCleanService:
    @staticmethod
    def clean(request: PromptCleanRequest) -> str:
        cleaned, = PromptCleaningMaid.process(
            request.prompt,
            **{
                "清理逗号 (cleanup_commas)": request.cleanup_commas,
                "清理空白 (cleanup_whitespace)": request.cleanup_whitespace,
                "移除LoRA标签 (remove_lora_tags)": request.remove_lora_tags,
                "清理换行 (cleanup_newlines)": {
                    "false": "否 (false)",
                    "space": "空格 (space)",
                    "comma": "逗号 (comma)",
                }[request.cleanup_newlines],
                "修复括号 (fix_brackets)": {
                    "false": "否 (false)",
                    "parenthesis": "圆括号 (parenthesis)",
                    "brackets": "方括号 (brackets)",
                    "both": "两者 (both)",
                }[request.fix_brackets],
                "提示词格式化 (prompt_formatting)": request.prompt_formatting,
                "下划线转空格 (underscore_to_space)": request.underscore_to_space,
                "权重语法补全 (complete_weight_syntax)": request.complete_weight_syntax,
                "智能括号转义 (smart_bracket_escaping)": request.smart_bracket_escaping,
                "标准化逗号 (standardize_commas)": request.standardize_commas,
                "修复分区语法 (fix_region_syntax)": request.fix_region_syntax,
            },
        )
        return cleaned
