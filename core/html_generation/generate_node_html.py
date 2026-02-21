from core.html_generation.ui_node import UINode, ElementType
from core.html_generation.node_registry import registry
from core.logger import logger

from dominate.tags import style, link, meta, script, form, div
from dominate import document
import os

# TODO: Add logging
# TODO: All directories move to configs

HTML_DIR = None
STATIC_DIR = None


def render_with_children(node: UINode):
    """
    Renders UINode with children nodes.
    """

    renderer = registry.get(node.type_)
    if not renderer:
        raise ValueError(f"No renderer for type '{node.type_}'")

    tag = renderer(node, node.props)

    input_children = any(
        child.type_ in {
            ElementType.TEXT_INPUT,
            ElementType.CHECKBOX,
            ElementType.RADIOBUTTON,
            ElementType.DROPDOWN,
            ElementType.IMG_INPUT,
        } for child in node.children
    )
    if input_children and node.type_ != ElementType.CONTAINER:
        f = form()
        f.add(tag)
        tag = f

    for child in node.children:
        tag.add(render_with_children(child))

    return tag


def generate_page_from_ui_tree(nodes: list[UINode], title: str = "Generated UI", output_path: str = None):
    """
    HTML page generation from a list of root UINode's.
    Automatically includes CSS files for element types if they exist.

    output_path: path where HTML will be saved. Используется для вычисления относительных путей.
    """

    global HTML_DIR, STATIC_DIR

    doc = document(title=title)

    if output_path:
        HTML_DIR = os.path.dirname(os.path.abspath(output_path))
    else:
        HTML_DIR = os.getcwd()

    STATIC_DIR = os.path.normpath(os.path.join(HTML_DIR, "..", "static"))

    def relative_static_path(filename: str) -> str:
        """ Returns path to static file relative to HTML_DIR """
        return os.path.relpath(os.path.join(STATIC_DIR, filename), HTML_DIR).replace("\\", "/")

    available_css_files = set(f for f in os.listdir(STATIC_DIR) if f.endswith(".css"))
    included_css = set()

    def scan_node_for_css(node: UINode):
        """
        Collects CSS files for:
        - base element class (node.type_.value)
        - extra classes from props.class
        """

        classes = set()
        # element base class
        classes.add(node.type_.value)

        # additional classes
        props = node.props or {}
        extra = props.get("class")
        if extra:
            for cls in extra.split():
                classes.add(cls)

        # check the existence of css files
        for cls in classes:
            css_name = f"{cls}.css"
            if css_name in available_css_files:
                included_css.add(css_name)

        # recursion
        for child in node.children:
            scan_node_for_css(child)

    for node in nodes:
        scan_node_for_css(node)

    logger.info(f"Generating HTML page '{title}'")
    logger.debug(f"Included CSS modules: {sorted(list(included_css))}")

    with doc.head:
        for f in included_css:
            link(rel="stylesheet", href=relative_static_path(f))

        link(rel="stylesheet", href=relative_static_path("style.css"))
        link(rel="stylesheet", href=relative_static_path("ui_error_toast.css"))

        meta(name="viewport", content="width=device-width, initial-scale=1.0")
        meta(charset="UTF-8")

        style("""
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
            }

            body {
                display: flex;
                justify-content: center;
                align-items: center;
            }
        """)

        script(type="module", src=relative_static_path("config.js"))
        script(src=relative_static_path("actions.js"))
        script(src=relative_static_path("runtime.js"))

    with doc:
        doc.add(div("", _class="ui-error-toast", **{"data-ui": "error-toast"}))

        for node in nodes:
            doc.add(render_with_children(node))

    html = doc.render()
    logger.info("HTML generation completed")
    return html


def save_html(path: str, html_text: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_text)
    logger.info(f"HTML saved: {path}")
