from datetime import datetime, timezone, timedelta

# Server timezone — all naive datetimes from user input are assumed to be in this zone
LOCAL_TZ = timezone(timedelta(hours=8))  # CST / UTC+08:00


def to_aware(dt: datetime) -> datetime:
    """Convert a naive datetime to timezone-aware.

    If the datetime already has tzinfo, return it unchanged.
    If naive, interpret it as LOCAL_TZ (CST).
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=LOCAL_TZ)
    return dt
