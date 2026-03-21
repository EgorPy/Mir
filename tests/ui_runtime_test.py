from fastapi import FastAPI
from backend.services.auth.api import auth
from core.actions_generation.api_inspector import inspect_app
from core.actions_generation.generate_actions_js import generate_actions_js
from core.logger import logger

logger.info("=== Generating actions.js for frontend ===")

app = FastAPI()
app.include_router(auth.app, prefix="/auth")

actions = inspect_app(app, service_id="auth")

generate_actions_js(actions, output_path="frontend/web/static/actions.js")

logger.info("=== Generated actions.js ===")
