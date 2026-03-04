# Mir

Mir is a Python full-stack project with a FastAPI backend, an HTML/CSS/JS frontend, and a separate `core` engine for UI artifact generation.

## Current Status

- Backend is operational: authentication, sessions, chats, and messages.
- Frontend is operational in manual mode: pages are in `frontend/web/pages`, client logic is in `frontend/web/static`.
- Core is useful as generation infrastructure, but auto-generation is disabled by default.
- The project does not rely on npm/webpack/vite right now: frontend is served as static assets and Jinja2 templates.

## Tech Stack

- Python 3.9+
- FastAPI
- Uvicorn
- SQLite
- Pydantic
- Passlib (bcrypt)
- Jinja2

Dependencies are listed in `requirements.txt`.

## Project Structure

```text
backend/
  backend_main.py
  phone_mode.py
  services/
    auth/
      api/auth.py
      logic/auth_logic.py
      logic/security.py
      service.py
    chats/
      service.py

core/
  main.py
  core_main.py
  build_site.py
  config.py
  config.ini
  method_generator.py
  registry.py
  service_loader.py
  actions_generation/
  html_generation/
  yaml_generation/

frontend/
  frontend_main.py
  ui_yaml/
  web/
    pages/
    static/

tests/
```

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure

By default, configuration is loaded from `core/config.ini`:

- `DOMAIN` (typically `0.0.0.0`)
- `BACKEND_PORT` (typically `8000`)
- `FRONTEND_PORT` (typically `3000`)
- `SESSION_DURATION`

### 3. Run the full project

```bash
python core/main.py
```

On Windows, this launcher opens separate consoles for:

- `core/core_main.py`
- `backend/backend_main.py`
- `frontend/frontend_main.py`

### Alternative: run components separately

```bash
python backend/backend_main.py
python frontend/frontend_main.py
python core/core_main.py
```

## How Frontend Routing Works

- `frontend/frontend_main.py` scans `frontend/web/pages/*.html` and registers routes automatically.
- `index.html` is served at `/`, other pages are served by file name (`/login`, `/register`, `/chat`, ...).
- Static files are served from `frontend/web/static`.

## Main API Routes

### Auth

- `POST /auth/login/`
- `POST /auth/register/`
- `GET /auth/logout/`
- `GET /auth/me`

### Chats

- `GET /chats/list`
- `GET /chats/search/{public_id}`
- `POST /chats/create`
- `POST /chats/delete`
- `GET /chats/{chat_id}/info`
- `GET /chats/{chat_id}/join/`
- `GET /chats/{chat_id}/leave`
- `GET /chats/{chat_id}/member/`
- `GET /chats/{chat_id}/messages`
- `POST /chats/{chat_id}/messages/send`

## Core and UI Generation

`core` can run the following pipeline:

1. API inspection,
2. `actions.js` generation,
3. YAML generation,
4. HTML generation.

Important: auto mode is currently disabled (`AUTO_GENERATION_ENABLED = False` in `core/build_site.py`), and `core/core_main.py` calls `build_site(manual=False)`, so generation is skipped by default.

This is the intentional current setup: the project runs with a manual frontend, while the generator remains available as an engine and foundation for further development.

## Tests

`tests/` contains helper and integration scripts. It is not yet a fully standardized unit/integration test suite with guaranteed green runs in a single command.

## Local-Only Files

- `database.db` and local certificates (`*.pem`) may exist in the workspace for local runtime needs.
- These files are listed in `.gitignore` and are not intended to be committed.

## Docs Directory

Files in `docs/` contain ideas and work notes related to the generator (`extra_ui`, `widgets_and_pages`, `yaml_value_sources`, etc.).
Treat them as engineering notes; this `README.md` is the source of truth for the current project state.
