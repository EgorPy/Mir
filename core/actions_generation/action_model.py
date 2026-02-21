from typing import List


class ActionModel:
    """
    Action model used by runtime.
    Connects UI bind/action with specific service and FastAPI route.
    """

    def __init__(
            self,
            id_: str,
            service_id: str,
            url: str,
            method: str,
            payload: List[str],
            encoding: str = "form",
            redirect_on_success: str = "self",
            pydantic_model=None
    ):
        self.id = id_
        self.service_id = service_id
        self.url = url
        self.method = method
        self.payload = payload
        self.encoding = encoding
        self.redirect_on_success = redirect_on_success or "self"
        self.pydantic_model = pydantic_model

    def to_dict(self):
        return {
            "id": self.id,
            "service_id": self.service_id,
            "url": self.url,
            "method": self.method,
            "payload": self.payload,
            "encoding": self.encoding,
            "redirectOnSuccess": self.redirect_on_success
        }
