""" actions.js to YAML parser """

from typing import Dict, Optional
from core.logger import logger

import yaml
import json
import os

BASE_YAML_DIR = os.path.abspath("frontend/ui_yaml")


def infer_input_props(field: str) -> Dict:
    props = {"placeholder": field}

    if "password" in field.lower():
        props["type"] = "password"

    return props


def action_to_yaml(action_id: str, action: Dict) -> Dict:
    children = []

    for field in action.get("payload", []):
        children.append({
            "type": "text_input",
            "bind": field,
            "props": infer_input_props(field)
        })

    children.append({
        "type": "button",
        "action": "submit",
        "endpoint": action_id,
        "props": {"text": "Submit"}
    })

    return {
        "type": "container",
        "layout": "vertical",
        "children": children
    }


def generate_yaml_from_actions(actions_js_path: str, output_dir: Optional[str] = None):
    if output_dir is None:
        output_dir = BASE_YAML_DIR

    with open(actions_js_path, "r", encoding="utf-8") as f:
        text = f.read()

    start = text.find("{")
    end = text.rfind("}") + 1
    actions_dict = json.loads(text[start:end])

    os.makedirs(output_dir, exist_ok=True)

    for action_id, action in actions_dict.items():
        yaml_dict = action_to_yaml(action_id, action)
        yaml_file = os.path.join(output_dir, f"{action_id.replace('.', '_')}.yaml")

        with open(yaml_file, "w", encoding="utf-8") as f:
            yaml.safe_dump(yaml_dict, f, sort_keys=False, allow_unicode=True)

        logger.info(f"Generated YAML: {yaml_file}")


if __name__ == "__main__":
    generate_yaml_from_actions("../../frontend/web/static/actions.js")
