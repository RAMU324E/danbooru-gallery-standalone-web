from __future__ import annotations

import os
import socket
import threading
import time
import webbrowser

import uvicorn

from app.main import app

DEFAULT_PORT = 36741
HOST = "127.0.0.1"


def get_requested_port() -> int:
    return int(os.environ.get("DANBOORU_STANDALONE_PORT", str(DEFAULT_PORT)))


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def pick_port(host: str, requested_port: int) -> int:
    if is_port_available(host, requested_port):
        return requested_port

    for port in range(requested_port + 1, requested_port + 50):
        if is_port_available(host, port):
            print(
                f"Requested port {requested_port} is busy, falling back to http://{host}:{port}"
            )
            return port

    raise RuntimeError(f"No free port found near {requested_port}")


def wait_until_ready(host: str, port: int, timeout: float = 20.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1.0):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def open_browser(port: int) -> None:
    if wait_until_ready(HOST, port):
        webbrowser.open(f"http://{HOST}:{port}")


if __name__ == "__main__":
    requested_port = get_requested_port()
    port = pick_port(HOST, requested_port)
    print(f"Danbooru Gallery Standalone starting on http://{HOST}:{port}")
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    config = uvicorn.Config(
        app,
        host=HOST,
        port=port,
        reload=False,
        log_config=None,
    )
    server = uvicorn.Server(config)
    app.state.shutdown_handler = lambda: setattr(server, "should_exit", True)
    server.run()
