""" Execute this file to run frontend """
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import config
from core.logger import logger

from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request, HTTPException
from pathlib import Path
import webbrowser
import threading
import mimetypes
import uvicorn
import jinja2

import traceback
import sys


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

            return templates.TemplateResponse(template_file, {"request": request})

        registered_pages.append((route_path, filename))
        logger.debug(f"Route registered: {route_path} -> {filename}")

    logger.info("Scan results:")
    for route, template in registered_pages:
        logger.info(f"{route} -> {template}")

    return registered_pages


app = FastAPI()
pages_dir = Path("frontend/web/pages")
templates = Jinja2Templates(directory=pages_dir)
registered_pages = scan_and_register_pages()

STATIC_DIR = Path("static")


@app.get("/static/{path:path}")
def static_files(path: str):
    file_path = STATIC_DIR / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    def iterfile():
        with open(file_path, "rb") as f:
            yield from f

    mime_type, _ = mimetypes.guess_type(str(file_path))
    if mime_type is None:
        mime_type = "application/octet-stream"

    return StreamingResponse(iterfile(), media_type=mime_type)


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
    uvicorn.run("frontend_main:app", host=config.DOMAIN, port=int(config.FRONTEND_PORT), reload=False, loop="asyncio", http="h11")


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

    import mimetypes

    mimetypes.add_type('font/ttf', '.ttf')
    app.mount("/static", StaticFiles(directory="frontend/web/static"), name="static")
    app.mount("/pages/widgets", StaticFiles(directory="frontend/web/pages/widgets"), name="pages_widgets")

    # logger.info("Scanning for pages...")

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
