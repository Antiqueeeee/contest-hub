"""SQLAlchemy TypeDecorator that transparently encrypts/decrypts string columns."""

from sqlalchemy import String
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator

from app.utils.crypto import encrypt_value, decrypt_value


class EncryptedString(TypeDecorator):
    """A SQLAlchemy type that stores strings encrypted at rest.

    Usage in a model:
        id_number: Mapped[str] = mapped_column(EncryptedString(512))
    """

    impl = String
    cache_ok = True

    def __init__(self, length: int = 512, **kwargs):
        super().__init__(length=length, **kwargs)

    def process_bind_param(self, value: str | None, dialect: Dialect) -> str | None:
        if value is None:
            return None
        return encrypt_value(value)

    def process_result_value(self, value: str | None, dialect: Dialect) -> str | None:
        if value is None:
            return None
        return decrypt_value(value)
