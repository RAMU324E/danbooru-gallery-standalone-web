from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps


ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    root = Path(__file__).resolve().parent
    source = root / "icon.png"
    target = root / "icon.ico"

    with Image.open(source).convert("RGBA") as original:
        # Keep the original artwork centered and ensure the ICO contains
        # the standard Windows icon sizes for Explorer/taskbar rendering.
        canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        fitted = ImageOps.contain(original, canvas.size, Image.Resampling.LANCZOS)
        offset = ((canvas.width - fitted.width) // 2, (canvas.height - fitted.height) // 2)
        canvas.paste(fitted, offset, fitted)
        canvas.save(target, format="ICO", sizes=ICON_SIZES)


if __name__ == "__main__":
    main()
