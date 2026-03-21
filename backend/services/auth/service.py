"""
Service object for Core API inspection.
Contains router from auth.py for Core to scan actions.
"""

from backend.services.auth.api.auth import app
from types import SimpleNamespace

SERVICE = SimpleNamespace(
    name="auth",
    app=app  # router is used by API inspector from core/actions_generation/api_inspector.py
)
