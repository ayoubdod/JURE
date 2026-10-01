"""Jurisdiction rule registry — no scattered country if/elif in application code."""

from __future__ import annotations

from typing import Callable

from privacy.jurisdictions import JurisdictionRules
from privacy.jurisdictions.base import base_rules
from privacy.jurisdictions.morocco import morocco_rules
from privacy.jurisdictions.qatar import qatar_rules

_REGISTRY: dict[str, Callable[[], JurisdictionRules]] = {
    "MA": morocco_rules,
    "QA": qatar_rules,
}


def register(code: str, factory) -> None:
    """Allow tests / future jurisdictions to register additional packs."""
    _REGISTRY[(code or "").strip().upper()] = factory


def get_rules(jurisdiction: str | None) -> JurisdictionRules:
    code = (jurisdiction or "").strip().upper() or "BASE"
    factory = _REGISTRY.get(code)
    if factory is None:
        # Unknown jurisdiction → shared international rules only
        rules = base_rules()
        return JurisdictionRules(
            code=code if code != "BASE" else "BASE",
            name=f"Fallback ({code})",
            patterns=list(rules.patterns),
            contextual_hooks=list(rules.contextual_hooks),
        )
    return factory()


def available_jurisdictions() -> list[str]:
    return sorted(_REGISTRY.keys())
