"""Auth endpoint rate limits."""

from rest_framework.throttling import AnonRateThrottle


class AuthBurstThrottle(AnonRateThrottle):
    """Limit credential stuffing / invite password guessing."""

    scope = "auth_burst"
