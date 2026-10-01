"""Egress ticket context — transport layer asserts the Privacy Gateway ran."""

from __future__ import annotations

from contextvars import ContextVar

_egress_ticket: ContextVar[str | None] = ContextVar("privacy_egress_ticket", default=None)


def set_egress_ticket(ticket: str | None):
    return _egress_ticket.set(ticket)


def reset_egress_ticket(token) -> None:
    _egress_ticket.reset(token)


def get_egress_ticket() -> str | None:
    return _egress_ticket.get()


def clear_egress_ticket() -> None:
    _egress_ticket.set(None)
