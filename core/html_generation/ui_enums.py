from enum import Enum
import yaml
import os

# TODO: Add logging, validation and exception handling

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "element_types.yaml")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)["elements"]
ElementType = Enum(
    "ElementType",
    {key.upper(): key for key in data.keys()},
    type=str
)


class Layout(str, Enum):
    NONE = "none"
    VERTICAL = "vertical"
    HORIZONTAL = "horizontal"
    CENTER = "center"
    GRID = "grid"


class Align(str, Enum):
    START = "start"
    CENTER = "center"
    END = "end"
    STRETCH = "stretch"


class Justify(str, Enum):
    START = "start"
    CENTER = "center"
    END = "end"
    SPACE_BETWEEN = "space-between"
    SPACE_AROUND = "space-around"


class Action(str, Enum):
    SUBMIT = "submit"
    CLICK = "click"
    CHANGE = "change"
