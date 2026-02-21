from core.actions_generation.generate_actions_js import generate_actions_js
from core.yaml_generation.generate_yaml import generate_yaml_from_actions
from core.html_generation.generate_html import generate_html_from_yaml
from core.registry import get_registered_services
from core.logger import logger

import os

FRONTEND_STATIC = os.path.abspath("frontend/web/static")

YAML_DIR = os.path.abspath("frontend/ui_yaml")
YAML_WIDGETS_DIR = os.path.join(YAML_DIR, "widgets")
YAML_PAGES_DIR = os.path.join(YAML_DIR, "pages")
YAML_EXTRA_UI_DIR = os.path.join(YAML_DIR, "extra_ui")

HTML_DIR = os.path.abspath("frontend/web")
HTML_WIDGETS_DIR = os.path.join(HTML_DIR, "widgets")
HTML_PAGES_DIR = os.path.join(HTML_DIR, "pages")

AUTO_GENERATION_ENABLED = False


def _ensure_dirs():
    os.makedirs(FRONTEND_STATIC, exist_ok=True)

    os.makedirs(YAML_DIR, exist_ok=True)
    os.makedirs(YAML_WIDGETS_DIR, exist_ok=True)
    os.makedirs(YAML_PAGES_DIR, exist_ok=True)
    os.makedirs(YAML_EXTRA_UI_DIR, exist_ok=True)

    os.makedirs(HTML_DIR, exist_ok=True)
    os.makedirs(HTML_WIDGETS_DIR, exist_ok=True)
    os.makedirs(HTML_PAGES_DIR, exist_ok=True)


def _has_any_widget_generated_files() -> bool:
    actions_js_path = os.path.join(FRONTEND_STATIC, "actions.js")
    if os.path.exists(actions_js_path):
        return True

    if os.path.exists(YAML_WIDGETS_DIR):
        for name in os.listdir(YAML_WIDGETS_DIR):
            if name.endswith(".yaml"):
                return True

    if os.path.exists(HTML_WIDGETS_DIR):
        for name in os.listdir(HTML_WIDGETS_DIR):
            if name.endswith(".html"):
                return True

    return False


def _collect_all_actions():
    all_actions = []
    services = get_registered_services()

    for service_id, service in services.items():
        try:
            logger.info(f"Inspecting service '{service_id}'")
            from core.actions_generation.api_inspector import inspect_app
            service_actions = inspect_app(service.app, service_id)
            all_actions.extend(service_actions)
        except Exception as e:
            logger.error(f"Failed to inspect service '{service_id}': {e}")

    return all_actions


def build_widgets(all_actions):
    actions_js_path = os.path.join(FRONTEND_STATIC, "actions.js")
    generate_actions_js(all_actions, actions_js_path)
    logger.info(f"actions.js generated: {actions_js_path}")

    generate_yaml_from_actions(actions_js_path, output_dir=YAML_WIDGETS_DIR)
    logger.info(f"Widget YAML files generated in {YAML_WIDGETS_DIR}")

    for yaml_file in os.listdir(YAML_WIDGETS_DIR):
        if not yaml_file.endswith(".yaml"):
            continue

        yaml_path = os.path.join(YAML_WIDGETS_DIR, yaml_file)
        html_name = yaml_file.replace(".yaml", ".html")
        html_path = os.path.join(HTML_WIDGETS_DIR, html_name)

        base_name = yaml_file.replace(".yaml", "")
        decoration_name = f"{base_name}_decoration.yaml"
        decoration_yaml_path = os.path.join(YAML_EXTRA_UI_DIR, decoration_name)
        if not os.path.exists(decoration_yaml_path):
            decoration_yaml_path = None

        try:
            generate_html_from_yaml(yaml_path, html_path, decoration_yaml=decoration_yaml_path)
            logger.info(f"Widget HTML generated: {html_path}")
        except Exception as e:
            logger.error(f"Failed to generate widget HTML from {yaml_path}: {e}")


def build_pages():
    if not os.path.exists(YAML_PAGES_DIR):
        return

    for yaml_file in os.listdir(YAML_PAGES_DIR):
        if not yaml_file.endswith(".yaml"):
            continue

        yaml_path = os.path.join(YAML_PAGES_DIR, yaml_file)
        html_name = yaml_file.replace(".yaml", ".html")
        html_path = os.path.join(HTML_PAGES_DIR, html_name)

        base_name = yaml_file.replace(".yaml", "")
        decoration_name = f"{base_name}_decoration.yaml"
        decoration_yaml_path = os.path.join(YAML_EXTRA_UI_DIR, decoration_name)
        if not os.path.exists(decoration_yaml_path):
            decoration_yaml_path = None

        try:
            generate_html_from_yaml(yaml_path, html_path, decoration_yaml=decoration_yaml_path)
            logger.info(f"Page HTML generated: {html_path}")
        except Exception as e:
            logger.error(f"Failed to generate page HTML from {yaml_path}: {e}")


def build_site(manual: bool = False):
    logger.info("Starting site build...")

    _ensure_dirs()

    if manual:
        logger.info("Manual build enabled. Forcing generation.")
        all_actions = _collect_all_actions()
        logger.info(f"Total actions collected: {len(all_actions)}")
        build_widgets(all_actions)
        build_pages()
        logger.info("Site build completed.")
        return

    if not AUTO_GENERATION_ENABLED:
        logger.info("Auto-generation disabled. Skipping generation.")
        return

    if _has_any_widget_generated_files():
        logger.info("Generated widget files already exist. Skipping auto-generation.")
        logger.info("Site build completed.")
        return

    all_actions = _collect_all_actions()
    logger.info(f"Total actions collected: {len(all_actions)}")

    build_widgets(all_actions)
    build_pages()

    logger.info("Site build completed.")


if __name__ == "__main__":
    build_site(manual=False)
