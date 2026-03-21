import secrets

WS_PENDING_NONCES: dict[str, int] = {}


def create_nonce(user_id: int):
    nonce = secrets.token_hex(16)
    WS_PENDING_NONCES[nonce] = user_id
    return nonce


def validate_nonce(nonce: str):
    return WS_PENDING_NONCES.pop(nonce, None)
