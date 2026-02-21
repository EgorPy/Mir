""" Utilities """

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """ Hashes password """

    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    """ Verifies password """

    return pwd_context.verify(plain_password, hashed_password)
