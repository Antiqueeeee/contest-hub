"""
Phone verification service.

Currently validates phone format only.
When SMS integration is needed:
  1. Implement SmsProvider.send_verification_code(phone) -> code
  2. Implement SmsProvider.verify_code(phone, code) -> bool
  3. Swap providers via config (e.g. AliyunSmsProvider, TencentSmsProvider)
"""

import re
from abc import ABC, abstractmethod


PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")


class PhoneVerificationProvider(ABC):
    """Abstract provider - swap implementations for SMS or other methods."""

    @abstractmethod
    async def validate(self, phone: str) -> bool:
        """Check if phone number is valid."""
        ...

    @abstractmethod
    async def send_code(self, phone: str) -> str | None:
        """Send verification code. Returns code or None if not supported."""
        ...

    @abstractmethod
    async def verify_code(self, phone: str, code: str) -> bool:
        """Verify a code sent to this phone."""
        ...


class FormatOnlyProvider(PhoneVerificationProvider):
    """MVP: only validate phone number format, no SMS."""

    async def validate(self, phone: str) -> bool:
        return bool(PHONE_PATTERN.match(phone))

    async def send_code(self, phone: str) -> str | None:
        return None  # Not supported in MVP

    async def verify_code(self, phone: str, code: str) -> bool:
        return True  # Skip verification in MVP


# Singleton - swap provider for SMS later
_provider: PhoneVerificationProvider = FormatOnlyProvider()


def get_phone_verifier() -> PhoneVerificationProvider:
    return _provider


def set_phone_verifier(provider: PhoneVerificationProvider):
    global _provider
    _provider = provider
