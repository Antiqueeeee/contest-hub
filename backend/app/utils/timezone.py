from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# 备选时区列表，供前端下拉框使用
TZ_OPTIONS: list[dict] = [
    {"value": "Asia/Shanghai", "label": "北京时间 (UTC+8)"},
    {"value": "Asia/Tokyo", "label": "东京时间 (UTC+9)"},
    {"value": "Asia/Seoul", "label": "首尔时间 (UTC+9)"},
    {"value": "Asia/Singapore", "label": "新加坡时间 (UTC+8)"},
    {"value": "Asia/Kolkata", "label": "印度时间 (UTC+5:30)"},
    {"value": "Asia/Bangkok", "label": "曼谷时间 (UTC+7)"},
    {"value": "Europe/London", "label": "伦敦时间 (UTC+0)"},
    {"value": "Europe/Berlin", "label": "柏林时间 (UTC+1)"},
    {"value": "America/New_York", "label": "美东时间 (UTC-5)"},
    {"value": "America/Chicago", "label": "美中时间 (UTC-6)"},
    {"value": "America/Los_Angeles", "label": "美西时间 (UTC-8)"},
    {"value": "Australia/Sydney", "label": "悉尼时间 (UTC+10)"},
    {"value": "Pacific/Auckland", "label": "奥克兰时间 (UTC+12)"},
    {"value": "UTC", "label": "协调世界时 (UTC+0)"},
]

# 默认时区 — 国内场景固定为北京时间
DEFAULT_TZ = "Asia/Shanghai"


def to_aware(dt: datetime, tz_name: str) -> datetime:
    """Convert a naive datetime to timezone-aware using the given IANA timezone name.

    If the datetime already has tzinfo, return it unchanged.
    If naive, interpret it as being in the given timezone.

    tz_name is required — callers must explicitly decide which timezone to use.
    """
    if dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=ZoneInfo(tz_name))
