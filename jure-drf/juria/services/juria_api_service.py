"""
Secure proxy between the SaaS backend and the external Juria AI API.
The API key never leaves the server; all Juria calls go through this module.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _base_url() -> str:
    return getattr(settings, "JURIA_API_URL", "https://api.juria.ma/v1").rstrip("/")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.JURIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _parse_error_body(response: requests.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text


def send_chat_message(
    conversation_history: list[dict[str, str]],
    new_message: str,
    case_context: dict[str, Any] | None = None,
    mode: str = "CHAT",
) -> dict[str, Any]:
    """
    Sends a message to the Juria chat endpoint with prior turns for context.

    conversation_history: list of {role, content} with roles user/assistant (lowercase).
    """
    system_prompt = build_system_prompt(mode, case_context)
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            *conversation_history,
            {"role": "user", "content": new_message},
        ],
        "mode": mode,
        "max_tokens": settings.JURIA_MAX_TOKENS,
    }
    url = f"{_base_url()}/chat"
    try:
        response = requests.post(
            url,
            json=payload,
            headers=_headers(),
            timeout=settings.JURIA_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout as exc:
        raise JuriaTimeoutError("Juria chat request timed out") from exc

    if response.status_code != 200:
        raise JuriaAPIError(
            f"Juria API error: {response.status_code}",
            _parse_error_body(response),
        )
    return response.json()


def analyze_document(
    file_path: str,
    file_type: str,
    analysis_prompt: str,
    case_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Send a document (PDF/DOCX) to Juria for analysis; file is read server-side only."""
    with open(file_path, "rb") as f:
        file_b64 = base64.b64encode(f.read()).decode("utf-8")

    payload = {
        "file": file_b64,
        "file_type": file_type,
        "prompt": analysis_prompt,
        "context": build_system_prompt("CONTRACT_ANALYSIS", case_context),
    }
    url = f"{_base_url()}/analyze"
    try:
        response = requests.post(
            url,
            json=payload,
            headers=_headers(),
            timeout=settings.JURIA_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout as exc:
        raise JuriaTimeoutError("Juria analyze request timed out") from exc

    if response.status_code != 200:
        raise JuriaAPIError(
            f"Juria analyze error: {response.status_code}",
            _parse_error_body(response),
        )
    return response.json()


def draft_document(
    document_type: str,
    parameters: dict[str, Any],
    case_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a legal document via the Juria drafting API."""
    payload = {
        "document_type": document_type,
        "parameters": parameters,
        "jurisdiction": "MA",
        "language": "fr",
        "legal_system": "moroccan",
        "context": build_system_prompt("DOCUMENT_DRAFTING", case_context),
    }
    url = f"{_base_url()}/draft"
    try:
        response = requests.post(
            url,
            json=payload,
            headers=_headers(),
            timeout=settings.JURIA_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout as exc:
        raise JuriaTimeoutError("Juria draft request timed out") from exc

    if response.status_code != 200:
        raise JuriaAPIError(
            f"Juria draft error: {response.status_code}",
            _parse_error_body(response),
        )
    return response.json()


def build_system_prompt(mode: str, case_context: dict[str, Any] | None = None) -> str:
    """
    System prompt for Juria: Moroccan legal context and optional dossier background.
    """
    base = (
        "Tu es Juria, assistant juridique spécialisé pour le droit marocain. "
        "Réponds avec rigueur, en t'appuyant sur le système juridique marocain "
        "(droit marocain). Références utiles: Code Général des Impôts (CGI), "
        "Code de Commerce, Dahir des Obligations et Contrats (DOC), "
        "Code du Travail, Code de Procédure Civile. "
        "Langue principale: français; tu peux reconnaître des formulations en darija "
        "lorsque c'est pertinent. Juridiction: Royaume du Maroc.\n\n"
    )
    mode_bits = {
        "CHAT": (
            "Mode: discussion juridique générale. Réponds de façon claire et structurée, "
            "sans inventer de textes de loi: indique quand une vérification officielle est nécessaire."
        ),
        "CONTRACT_ANALYSIS": (
            "Mode: analyse contractuelle. Identifie les risques, clauses sensibles, "
            "incohérences et points de conformité au regard du droit marocain lorsque applicable."
        ),
        "LEGAL_RESEARCH": (
            "Mode: recherche juridique. Appuie-toi sur les cadres normatifs marocains; "
            "cite les sources de manière prudente et distingue doctrine / jurisprudence / texte."
        ),
        "DOCUMENT_DRAFTING": (
            "Mode: rédaction d'actes juridiques. Produis des formulations conformes aux usages "
            "marocains, terminologie juridique correcte, et structure professionnelle."
        ),
    }
    parts = [base, mode_bits.get(mode, mode_bits["CHAT"])]
    if case_context:
        parts.append("\n\nContexte du dossier (fourni par le cabinet) :\n")
        for key in (
            "reference",
            "title",
            "caseType",
            "status",
            "description",
            "legalArguments",
            "court",
            "jurisdiction",
        ):
            val = case_context.get(key)
            if val is not None and str(val).strip():
                parts.append(f"- {key}: {val}\n")
    return "".join(parts)


class JuriaAPIError(Exception):
    """Raised when Juria API returns a non-200 response."""

    def __init__(self, message: str, api_response: Any = None):
        self.api_response = api_response
        super().__init__(message)


class JuriaTimeoutError(Exception):
    """Raised when a Juria API request times out."""

    pass
