"""Conversation / thread title helpers for Juria."""

from __future__ import annotations

import re

UNTITLED_BY_LANGUAGE = {
    "fr": "Nouveau chat",
    "en": "New chat",
    "ar": "محادثة جديدة",
    "darija": "Nouveau chat",
}

_PLACEHOLDERS = {
    "",
    "nouveau fil",
    "discussion générale",
    "nouveau chat",
    "new chat",
    "new thread",
    "nouveau projet",
    "new project",
    "chat rapide",
    "quick chat",
    "محادثة جديدة",
    "محادثة سريعة",
    "chat darija",
    "conversation juria",
}

_PREFIXES = (
    "chat rapide —",
    "chat rapide -",
    "quick chat —",
    "quick chat -",
    "محادثة سريعة —",
    "محادثة سريعة -",
    "chat darija —",
    "chat darija -",
)


def untitled_chat_name(language: str = "fr") -> str:
    return UNTITLED_BY_LANGUAGE.get((language or "fr").lower(), UNTITLED_BY_LANGUAGE["fr"])


def is_auto_title(title: str | None) -> bool:
    text = (title or "").strip()
    if text.lower() in _PLACEHOLDERS:
        return True
    low = text.lower()
    return any(low.startswith(prefix) for prefix in _PREFIXES)


def fallback_title_from_message(text: str, language: str = "fr") -> str:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return untitled_chat_name(language)
    if len(cleaned) > 56:
        cleaned = cleaned[:53].rstrip(" ,.;:-") + "…"
    return cleaned


def sanitize_generated_title(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        return ""
    text = text.splitlines()[0].strip()
    text = re.sub(r"^[#>*\-\s]+", "", text)
    text = re.sub(r"^(title|titre|اسم)\s*:\s*", "", text, flags=re.IGNORECASE)
    text = text.strip(" \"'`“”«».,;:").strip()
    text = " ".join(text.split())
    if len(text) < 2:
        return ""
    if len(text) > 80:
        text = text[:77].rstrip() + "…"
    return text[:200]
