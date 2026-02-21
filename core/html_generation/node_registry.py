from core.html_generation.ui_enums import ElementType, Justify, Layout, Align
from core.html_generation.ui_node import UINode
from dominate import tags

registry = {}


def register(element_type: ElementType):
    """ Decorator registry for HTML element generator. """

    def decorator(func):
        registry[element_type] = func
        return func

    return decorator


def layout_to_css(node: UINode) -> dict:
    if node.layout == Layout.NONE:
        return {}

    css = {
        "display": "flex",
        "flex-direction": "column" if node.layout == Layout.VERTICAL else "row"
    }

    if node.gap is not None:
        css["gap"] = f"{node.gap}px"

    if node.align:
        css["align-items"] = {
            Align.START: "flex-start",
            Align.CENTER: "center",
            Align.END: "flex-end",
            Align.STRETCH: "stretch",
        }[node.align]

    if node.justify:
        css["justify-content"] = {
            Justify.START: "flex-start",
            Justify.CENTER: "center",
            Justify.END: "flex-end",
            Justify.SPACE_BETWEEN: "space-between",
            Justify.SPACE_AROUND: "space-around",
        }[node.justify]

    return css


def apply_class_and_style(node, default_class: str):
    """
    Returns attributes for dominate tags:
    - merges default class with optional extra class from props
    - applies inline styles from props['style']
    - applies width / height from node if not overridden
    - applies any other props as attributes
    """

    props = node.props or {}

    # style
    style = dict(props.get("style", {}))
    if getattr(node, "width", None) is not None:
        style.setdefault("width", f"{node.width}px")
    if getattr(node, "height", None) is not None:
        style.setdefault("height", f"{node.height}px")

    # class
    extra_class = props.get("class")
    classes = default_class
    if extra_class:
        classes = f"{default_class} {extra_class}"

    # build attributes
    attrs = {
        "_class": classes,
        "style": "; ".join(f"{k}:{v}" for k, v in style.items())
    }

    # add any other props as attributes (excluding style/class)
    for k, v in props.items():
        if k not in ("style", "class"):
            # convert underscore-prefixed keys for dominate if needed
            attrs[k.replace("_", "-")] = v

    return attrs


def apply_runtime_attrs(node: UINode, attrs: dict) -> dict:
    if node.bind:
        attrs["data-bind"] = node.bind

    if node.action:
        attrs["data-action"] = node.action

    if node.endpoint:
        attrs["data-endpoint"] = node.endpoint

    return attrs


@register(ElementType.TEXT_INPUT)
def render_text_input(node, props):
    attrs = apply_class_and_style(node, "text-input")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.input_(_type="text", **attrs)


@register(ElementType.CHECKBOX)
def render_checkbox(node, props):
    attrs = apply_class_and_style(node, "checkbox")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.input_(**attrs)


@register(ElementType.RADIOBUTTON)
def render_radiobutton(node, props):
    attrs = apply_class_and_style(node, "radiobutton")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.input_(**attrs)


@register(ElementType.DROPDOWN)
def render_dropdown(node, props):
    attrs = apply_class_and_style(node, "dropdown")
    attrs = apply_runtime_attrs(node, attrs)
    s = tags.select(**attrs)
    for opt in (props or {}).get("options", []):
        s.add(tags.option(opt))
    return s


@register(ElementType.BUTTON)
def render_button(node, props):
    attrs = apply_class_and_style(node, "button")
    attrs = apply_runtime_attrs(node, attrs)
    attrs.setdefault("type", "button")
    text = (props or {}).get("text", "Submit")
    return tags.button(text, **attrs)


@register(ElementType.H1)
def render_h1(node, props):
    attrs = apply_class_and_style(node, "h1")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.h1((props or {}).get("text", ""), **attrs)


@register(ElementType.H2)
def render_h2(node, props):
    attrs = apply_class_and_style(node, "h2")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.h2((props or {}).get("text", ""), **attrs)


@register(ElementType.H3)
def render_h3(node, props):
    attrs = apply_class_and_style(node, "h3")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.h3((props or {}).get("text", ""), **attrs)


@register(ElementType.A)
def render_a(node, props):
    href = (props or {}).get("href", "#")
    text = (props or {}).get("text", "")
    attrs = apply_class_and_style(node, "a")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.a(text, **attrs)


@register(ElementType.IMG_INPUT)
def render_img_input(node, props):
    attrs = apply_class_and_style(node, "img-input")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.input_(_type="file", accept="image/*", **(props or {}), **attrs)


@register(ElementType.IMG_OUTPUT)
def render_img_output(node, props):
    attrs = apply_class_and_style(node, "img-output")
    attrs = apply_runtime_attrs(node, attrs)
    return tags.img(**attrs)


@register(ElementType.CONTAINER)
def render_container(node, props):
    style = layout_to_css(node)

    if props and "style" in props:
        style.update(props["style"])

    attrs = {
        "_class": "container",
        "style": "; ".join(f"{k}:{v}" for k, v in style.items())
    }

    attrs = apply_runtime_attrs(node, attrs)
    return tags.div(**attrs)
