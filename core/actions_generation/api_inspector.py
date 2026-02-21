from .action_model import ActionModel
from fastapi.routing import APIRoute
from fastapi import FastAPI, params
from core.logger import logger
import inspect


def is_form_param(p):
    return isinstance(p.field_info, params.Form)


def inspect_app(app: FastAPI, service_id: str) -> list[ActionModel]:
    """
    Inspection of FastAPI app.
    Returns a list of ActionModel for every POST/GET route with Form/Body parameters.
    """

    actions = []

    logger.info(f"Starting FastAPI app inspection for service '{service_id}'")

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue

        method = list(route.methods)[0] if route.methods else "GET"
        url = route.path
        func_name = route.endpoint.__name__
        action_id = f"{service_id}.{func_name}"

        # print(inspect.signature(route.endpoint))
        # print(inspect.signature(route.endpoint).parameters)
        # print(inspect.signature(route.endpoint).parameters.get("data", []))
        # if hasattr(inspect.signature(route.endpoint).parameters.get("data", []), "annotation"):
        #     print(inspect.signature(route.endpoint).parameters.get("data", []).annotation.model_fields)

        if hasattr(inspect.signature(route.endpoint).parameters.get("data", []), "annotation"):
            payload = list(inspect.signature(route.endpoint).parameters.get("data", []).annotation.model_fields.keys())
        else:
            payload = []
        encoding = "form" if any(is_form_param(p) for p in route.dependant.body_params) else "json"

        redirect_on_success = getattr(route.endpoint, "__redirect_on_success__", "self")

        action = ActionModel(
            id_=action_id,
            service_id=service_id,
            url=url,
            method=method,
            payload=payload,
            encoding=encoding,
            redirect_on_success=redirect_on_success
        )

        actions.append(action)
        logger.debug(f"Added Action: {action_id}: {method} {url} with payload {payload}")

    logger.info(f"Inspection complete: found {len(actions)} actions for service '{service_id}'")
    return actions
