# Danbooru Gallery Standalone

Standalone web version of the Danbooru Gallery workflow, extracted from a ComfyUI plugin and rebuilt as a one-click local app.

Original project:
- https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery

This repository focuses on the standalone part only:
- Danbooru image search
- tag autocomplete and Chinese translation
- prompt editing and cleaning
- copy to clipboard
- prompt library
- optional Danbooru account favorite sync

## Notes

- This project is derived from the original MIT-licensed repository above.
- Runtime data such as settings, local favorites, logs, and preview caches are generated under `data/` and `logs/`.
- No personal account settings are committed in this public version.

## Quick Start

### Windows one-click start

```bat
start_web.bat
```

The script will:
- create `.venv` if missing
- install dependencies from `requirements.txt`
- start the local web app

Default address:

```text
http://127.0.0.1:36741
```

If the port is occupied, the app automatically falls back to a nearby free high port and prints the actual URL in the console.

### Manual start

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

## Project Layout

- `app/` FastAPI backend, static frontend, and bundled translation/tag assets
- `run.py` local server launcher
- `start_web.bat` Windows one-click launcher

## Deployment

For simple local deployment:

1. Install Python 3.11+.
2. Clone this repository.
3. Run `start_web.bat`.

For packaging later:

- the current entrypoint is already separated enough for future `PyInstaller` wrapping

## Attribution

This standalone app is based on and inspired by:

- `Aaalice233/ComfyUI-Danbooru-Gallery`
- `Aaalice233/ShiQi_Workflow`

## License

MIT. See [LICENSE](LICENSE).
