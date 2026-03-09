WS_PENDING_NONCES: dict[str, str] = {}


def create_nonce(user_id: str):
    import secrets
    nonce = secrets.token_hex(16)
    WS_PENDING_NONCES[nonce] = user_id
    return nonce


def validate_nonce(nonce: str):
    return WS_PENDING_NONCES.pop(nonce, None)
