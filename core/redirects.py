from functools import wraps


def redirect_on_success(path: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        setattr(wrapper, "__redirect_on_success__", path)
        return wrapper

    return decorator
