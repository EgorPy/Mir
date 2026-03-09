from core.html_generation.ui_enums import ElementType, Layout, Align, Justify

from typing import Optional, List


class UINode:
    def __init__(
            self,
            type_: ElementType,
            *,
            width: int = None,
            height: int = None,
            props: Optional[dict] = None,
            children: Optional[List["UINode"]] = None,

            layout: Layout = Layout.NONE,  # vertical | horizontal | center | grid | None
            gap: Optional[int] = None,

            align: Optional[Align] = None,  # start | center | end | stretch
            justify: Optional[Justify] = None,  # start | center | end | space-between

            grow: Optional[int] = None,  # flex-grow
            shrink: Optional[int] = None,  # flex-shrink
            basis: Optional[str] = None,  # flex-basis

            max_width: Optional[int] = None,
            min_width: Optional[int] = None,

            bind: Optional[str] = None,  # input/output binding
            action: Optional[str] = None,  # submit / click / etc.
            endpoint: Optional[str] = None,  # API endpoint
    ):
        self.type_ = type_
        self.width = width
        self.height = height
        self.props = props or {}
        self.children = children or []

        self.layout = layout
        self.gap = gap

        self.align = align
        self.justify = justify

        self.grow = grow
        self.shrink = shrink
        self.basis = basis

        self.max_width = max_width
        self.min_width = min_width

        self.bind = bind
        self.action = action
        self.endpoint = endpoint

    def add(self, child: "UINode"):
        self.children.append(child)
        return child
