""" YAML to HTML parser with decoration support (position-aware) """

from core.html_generation.generate_node_html import generate_page_from_ui_tree, save_html
from core.html_generation.ui_enums import ElementType, Layout, Align, Justify
from core.html_generation.ui_node import UINode
from typing import Any, Callable, List, Optional, Dict
import yaml
import os


def load_yaml(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_enum(enum_cls, value: Optional[str]):
    if value is None:
        return None
    try:
        return enum_cls(value)
    except ValueError:
        raise ValueError(f"Invalid value '{value}' for enum {enum_cls.__name__}")


class ValidationError(Exception):
    pass


class ValidatorRegistry:
    def __init__(self):
        self.validators: List[Callable[[UINode], None]] = []

    def register(self, func: Callable[[UINode], None]):
        self.validators.append(func)
        return func

    def validate_node(self, node: UINode):
        for v in self.validators:
            v(node)
        for child in node.children:
            self.validate_node(child)


validator_registry = ValidatorRegistry()


@validator_registry.register
def bind_only_for_inputs(node: UINode):
    input_types = {ElementType.TEXT_INPUT, ElementType.CHECKBOX, ElementType.RADIOBUTTON,
                   ElementType.DROPDOWN, ElementType.IMG_INPUT}
    if node.bind is not None and node.type_ not in input_types:
        raise ValidationError(f"'bind' cannot be used for type {node.type_}")


@validator_registry.register
def action_only_for_buttons(node: UINode):
    if node.action is not None and node.type_ not in {ElementType.BUTTON, ElementType.CONTAINER}:
        raise ValidationError(f"'action' can be used only for button or container, but found {node.type_}")


@validator_registry.register
def children_only_for_containers(node: UINode):
    if node.children and node.type_ != ElementType.CONTAINER:
        raise ValidationError(f"Only container can have children, but {node.type_} have children")


def parse_ui_node(data: Dict[str, Any]) -> UINode:
    if not isinstance(data, dict):
        raise TypeError("Every node must be a dict")
    if "type" not in data:
        raise ValueError("A node must have key 'type'")

    node = UINode(
        type_=parse_enum(ElementType, data["type"]),
        props=data.get("props"),
        layout=parse_enum(Layout, data.get("layout")) or Layout.NONE,
        gap=data.get("gap"),
        align=parse_enum(Align, data.get("align")),
        justify=parse_enum(Justify, data.get("justify")),
        grow=data.get("grow"),
        shrink=data.get("shrink"),
        basis=data.get("basis"),
        max_width=data.get("max_width"),
        min_width=data.get("min_width"),
        width=data.get("width"),
        height=data.get("height"),
        bind=data.get("bind"),
        action=data.get("action"),
        endpoint=data.get("endpoint"),
    )

    children = data.get("children", [])
    if not isinstance(children, list):
        raise TypeError("'children' must be a list")

    for child_data in children:
        node.add(parse_ui_node(child_data))

    return node


def parse_ui_yaml(path: str, validate: bool = True) -> UINode:
    data = load_yaml(path)
    root = parse_ui_node(data)
    if validate:
        validator_registry.validate_node(root)
    return root


def find_node_by_position(root: UINode, position: str) -> Optional[UINode]:
    """ Находит первый контейнер с props.position == position """
    if root.type_ == ElementType.CONTAINER and root.props:
        if root.props.get("position") == position:
            return root
    for child in root.children:
        found = find_node_by_position(child, position)
        if found:
            return found
    return None


def merge_ui_nodes(base_node: UINode, decoration_node: UINode) -> UINode:
    """
    Inserts base_node inside decoration_node according to props.position.
    If position is not found, inserts into the end of the root.
    """

    position = getattr(base_node.props, "position", None) or "form-top"

    target_node = find_node_by_position(decoration_node, position)
    if target_node:
        target_node.children.append(base_node)
    else:
        decoration_node.children.append(base_node)

    return decoration_node


def generate_html_from_yaml(base_yaml: str, html_path: str, decoration_yaml: str = None, validate: bool = True):
    """
    Loads YAML → parses → validates → generates HTML and saves it.
    Automatically computes correct paths for CSS/JS.
    Merges YAML files from frontend/ui_yaml and frontend/ui_yaml/extra_ui if there are files in extra_ui
    """

    base_node = parse_ui_yaml(base_yaml, validate)

    if decoration_yaml:
        decoration_node = parse_ui_yaml(decoration_yaml, validate)
        merged_node = merge_ui_nodes(base_node, decoration_node)
    else:
        merged_node = base_node

    html_path = os.path.abspath(html_path)
    html_text = generate_page_from_ui_tree([merged_node], output_path=html_path)

    os.makedirs(os.path.dirname(html_path), exist_ok=True)
    save_html(html_path, html_text)
    print(f"HTML successfully created: {html_path}")


if __name__ == "__main__":
    base_yaml_file = "../../frontend/ui_yaml/auth_login.yaml"
    decoration_yaml_file = "../../frontend/ui_yaml/extra_ui/login_decoration.yaml"
    output_html_file = "../../frontend/web/pages/auth_login.html"

    generate_html_from_yaml(base_yaml_file, decoration_yaml_file, output_html_file)
