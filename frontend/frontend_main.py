""" Frontend API """

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # do not move down

from backend.services.chats.websockets_nonce import create_nonce

from core.method_generator import AutoDB, ConnectionManager, cm
from core.config import config
from core.logger import logger

from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request
from datetime import datetime
from pathlib import Path
import webbrowser
import threading
import traceback
import uvicorn
import jinja2

app = FastAPI()


async def validate_session(session_id: str, connection_manager: ConnectionManager):
    db = AutoDB(connection_manager)

    result = await db.execute_async(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?",
        (session_id, datetime.utcnow())
    )

    if not result:
        return None

    user_id = result[0]['user_id']

    return str(user_id)


def scan_and_register_pages():
    """ Scans pages directory and registers HTML pages """

    if not pages_dir.exists():
        logger.error(f"Directory '{pages_dir}' not found")
        return []

    html_files = list(pages_dir.glob("*.html"))

    logger.info(f"Scanning '{pages_dir}': found {len(html_files)} HTML-files")

    registered_pages = []

    for html_file in html_files:
        filename = html_file.name
        route_path = f"/{html_file.stem}"

        if filename == "index.html":
            route_path = "/"

        @app.get(route_path, response_class=HTMLResponse)
        async def page_handler(request: Request, template_file=filename):
            """ Generic page """

            session_id = request.cookies.get("session_id")
            user_id = await validate_session(session_id, cm)

            nonce = create_nonce(user_id)

            return templates.TemplateResponse(
                template_file,
                {
                    "request": request,
                    "ws_nonce": nonce
                }
            )

        registered_pages.append((route_path, filename))
        logger.debug(f"Route registered: {route_path} -> {filename}")

    logger.info("Scan results:")
    for route, template in registered_pages:
        logger.info(f"{route} -> {template}")

    return registered_pages


@app.exception_handler(404)
async def page_404(request, __):
    """ Pretty error 404 page """

    logger.info(f"404 status for: {request.url.path}")
    try:
        return templates.TemplateResponse("page404.html", {"request": request})
    except jinja2.exceptions.TemplateNotFound:
        return PlainTextResponse("404 Not found", status_code=404)


def start_server():
    """ Starts the server """

    logger.info(f"FRONTEND server started at http://{config.DOMAIN}:{config.FRONTEND_PORT}")
    uvicorn.run(app, host=config.DOMAIN, port=int(config.FRONTEND_PORT), reload=False)


@app.get("/test-widgets-deep")
async def test_widgets_deep():
    import os
    from pathlib import Path

    widgets_path = Path("frontend/web/widgets")
    result = {
        "path": str(widgets_path.absolute()),
        "exists": widgets_path.exists(),
        "is_dir": widgets_path.is_dir() if widgets_path.exists() else False,
        "files": []
    }

    if widgets_path.exists() and widgets_path.is_dir():
        # Рекурсивно собираем все файлы
        for root, dirs, files in os.walk(widgets_path):
            rel_path = Path(root).relative_to(widgets_path)
            for file in files:
                result["files"].append(str(rel_path / file) if str(rel_path) != '.' else file)

    return result


@app.get("/debug-chat-js")
async def debug_chat_js():
    import os
    from pathlib import Path

    chat_js_path = Path("frontend/web/pages/widgets/chat.js")

    # Пробуем разными способами прочитать файл
    result = {
        "path": str(chat_js_path.absolute()),
        "exists": chat_js_path.exists(),
        "is_file": chat_js_path.is_file() if chat_js_path.exists() else False,
    }

    if chat_js_path.exists():
        # Права доступа
        result["readable"] = os.access(chat_js_path, os.R_OK)
        result["writable"] = os.access(chat_js_path, os.W_OK)

        # Размер и содержимое
        try:
            result["size"] = chat_js_path.stat().st_size
            # Пробуем прочитать первые 100 символов
            with open(chat_js_path, 'r', encoding='utf-8') as f:
                result["content_preview"] = f.read(100)
        except Exception as e:
            result["read_error"] = str(e)

    return result


def run():
    """ Starts the server """

    global app, pages_dir, templates

    app.mount("/static", StaticFiles(directory="frontend/web/static"), name="static")
    app.mount("/pages/widgets", StaticFiles(directory="frontend/web/pages/widgets"), name="pages_widgets")
    pages_dir = Path("frontend/web/pages")
    templates = Jinja2Templates(directory=pages_dir)

    # logger.info("Scanning for pages...")
    registered_pages = scan_and_register_pages()

    if not registered_pages:
        logger.warning("No pages registered")
    else:
        logger.info(f"Pages registered: {len(registered_pages)}")

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    url = f"http://{config.DOMAIN}:{config.FRONTEND_PORT}"
    # logger.info(f"Opening browser: {url}")
    # webbrowser.open(url)

    server_thread.join()


if __name__ == "__main__":
    try:
        run()
    except Exception:
        logger.error("Unhandled exception in core system:")
        traceback.print_exc()
        print("\nPress Enter to exit...")
        input()
        sys.exit(1)
