"""Field-level encryption and PII masking utilities.

Uses Fernet (AES-128-CBC + HMAC-SHA256) for reversible encryption of
sensitive fields (id_number, phone).  Masking functions produce
display-safe versions for API responses and exports.
"""

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


# ── Fernet ───────────────────────────────────────────────────────


def _get_fernet() -> Fernet:
    """Return a Fernet instance keyed from the application encryption key."""
    settings = get_settings()
    return Fernet(settings.encryption_key.encode("utf-8"))


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string.  Returns a base64-encoded Fernet token."""
    if not plaintext:
        return ""
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_value(token: str) -> str:
    """Decrypt a Fernet token back to the original plaintext string.

    If the value is not a valid Fernet token (e.g. legacy plaintext data
    stored before encryption was enabled), it is returned unchanged.

    Returns the empty string unchanged (allows nullable / empty fields).
    """
    if not token:
        return ""
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Plaintext value stored before encryption rollout — return as-is
        return token


# ── PII masking (display-safe representations) ───────────────────


def mask_id_number(value: str) -> str:
    """Mask an 18-digit Chinese ID number for display: 320102****1234"""
    if not value or len(value) < 8:
        return value
    return value[:4] + "****" + value[-4:]


def mask_phone(value: str) -> str:
    """Mask a phone number for display: 138****5678"""
    if not value or len(value) < 7:
        return value
    return value[:3] + "****" + value[-4:]


def mask_email(value: str) -> str:
    """Mask an email address for display: a***@example.com"""
    if not value or "@" not in value:
        return value
    local, domain = value.split("@", 1)
    if len(local) <= 1:
        masked_local = local + "***"
    else:
        masked_local = local[0] + "***"
    return f"{masked_local}@{domain}"
