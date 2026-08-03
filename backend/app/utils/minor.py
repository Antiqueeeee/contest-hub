"""未成年人保护模块：年龄计算与分支判定。

仅当系统开关开启且赛事声明面向未成年人时由报名流程调用；
普通赛事流程完全不经过本模块。

阈值依据《儿童个人信息网络保护规定》：14 周岁以下为儿童，
收集其个人信息须取得监护人同意；14-18 周岁为未成年人，
需本人「已满 14 周岁」声明。
"""

from datetime import date, datetime

BIRTH_DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"

GUARDIAN_AGE_LIMIT = 14  # < 14 需监护人同意
ADULT_AGE_LIMIT = 18     # < 18 需本人声明


def parse_birth_date(value: str) -> date | None:
    """Parse 'YYYY-MM-DD' into a date; None on empty or invalid input."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def age_at(birth: date, at: date) -> int:
    """Full years between birth date and target date."""
    return at.year - birth.year - ((at.month, at.day) < (birth.month, birth.day))


def age_at_str(birth_str: str, at: date) -> int | None:
    """age_at for a 'YYYY-MM-DD' string; None if unparseable."""
    birth = parse_birth_date(birth_str)
    if birth is None:
        return None
    return age_at(birth, at)


def requirement_for_age(age: int) -> str:
    """Map an age to the consent requirement branch.

    Returns one of 'guardian' / 'statement' / 'adult'.
    """
    if age < GUARDIAN_AGE_LIMIT:
        return "guardian"
    if age < ADULT_AGE_LIMIT:
        return "statement"
    return "adult"


def mask_birth_date(value: str) -> str:
    """Mask a birth date for display: 2012-**-** (keep year only)."""
    if not value:
        return ""
    parts = value.split("-")
    if len(parts) != 3:
        return value
    return f"{parts[0]}-**-**"


def mask_name(value: str) -> str:
    """Mask a name for display: 张**"""
    if not value:
        return ""
    if len(value) <= 1:
        return value + "**"
    return value[0] + "**"


def mask_contact(value: str) -> str:
    """Mask a guardian contact (phone or email) for display."""
    if not value:
        return ""
    if "@" in value:
        from app.utils.crypto import mask_email
        return mask_email(value)
    if value.isdigit() and len(value) >= 7:
        from app.utils.crypto import mask_phone
        return mask_phone(value)
    return value[:1] + "***"
