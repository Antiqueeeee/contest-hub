"""Shared field validators for compliance requirements (等保 2.0 / 个保法)."""

import re

# ── Password strength (等保 2.0 身份鉴别 b: 口令复杂度) ──────────
#
# Rules: 8-64 chars, containing at least two of:
# lowercase / uppercase / digit / special character.

_PASSWORD_MIN_LEN = 8
_PASSWORD_MAX_LEN = 64
_PASSWORD_CATEGORIES = [
    re.compile(r"[a-z]"),
    re.compile(r"[A-Z]"),
    re.compile(r"\d"),
    re.compile(r"[^a-zA-Z0-9\s]"),
]

PASSWORD_RULE_HINT = "密码需 8-64 位，且包含大写字母、小写字母、数字、特殊符号中的至少两种"


def validate_password_strength(password: str) -> str:
    """Validate password complexity.  Returns the password unchanged if valid.

    Raises ValueError with a user-facing Chinese message otherwise.
    Suitable for use as a pydantic field_validator.
    """
    if not (_PASSWORD_MIN_LEN <= len(password) <= _PASSWORD_MAX_LEN):
        raise ValueError(PASSWORD_RULE_HINT)
    categories = sum(1 for pattern in _PASSWORD_CATEGORIES if pattern.search(password))
    if categories < 2:
        raise ValueError(PASSWORD_RULE_HINT)
    return password


# ── Chinese mainland ID number (18-digit, GB 11643 checksum) ─────

_ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
_ID_CHECK_CODES = "10X98765432"


def validate_id_number(id_number: str) -> str:
    """Validate an 18-digit Chinese ID number incl. checksum.

    Returns the normalized value (uppercase X) if valid, else raises ValueError.
    """
    value = (id_number or "").strip().upper()
    if not re.fullmatch(r"\d{17}[\dX]", value):
        raise ValueError("身份证号格式不正确")
    checksum = sum(int(value[i]) * _ID_WEIGHTS[i] for i in range(17)) % 11
    if _ID_CHECK_CODES[checksum] != value[17]:
        raise ValueError("身份证号校验位不正确")
    return value
