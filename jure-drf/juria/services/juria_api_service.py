"""
Secure proxy between the SaaS backend and the configured LLM provider.
API keys never leave the server; the frontend only talks to Django.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import requests
from django.conf import settings

from juria.services.document_text import (
    DocumentTextError,
    extract_document_text,
    text_to_docx_base64,
)

logger = logging.getLogger(__name__)

DRAFT_TYPE_LABELS = {
    "CONTRAT_BAIL": "contrat de bail",
    "MISE_EN_DEMEURE": "mise en demeure",
    "STATUTS_SARL": "statuts de SARL",
    "PROCURATION": "procuration",
    "REQUETE": "requête judiciaire",
    "CONTRAT_TRAVAIL": "contrat de travail",
    "CONCLUSIONS": "conclusions",
    "AUTRE": "acte juridique",
}


def provider_name() -> str:
    return (getattr(settings, "JURIA_PROVIDER", "deepseek") or "deepseek").strip().lower()


def provider_configured() -> bool:
    if provider_name() == "deepseek":
        return bool((getattr(settings, "DEEPSEEK_API_KEY", "") or "").strip())
    return bool((getattr(settings, "JURIA_API_KEY", "") or "").strip())


def send_chat_message(
    conversation_history: list[dict[str, str]],
    new_message: str,
    case_context: dict[str, Any] | None = None,
    mode: str = "CHAT",
) -> dict[str, Any]:
    """
    Send a message with prior turns for context.

    conversation_history: list of {role, content} with roles user/assistant (lowercase).
    """
    system_prompt = build_system_prompt(mode, case_context)
    messages = [
        {"role": "system", "content": system_prompt},
        *conversation_history,
        {"role": "user", "content": new_message},
    ]
    if provider_name() == "deepseek":
        result = _deepseek_chat(messages)
        return {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "message_id": result["message_id"],
            "suggestions": [],
        }
    return _juria_post(
        "/chat",
        {
            "messages": messages,
            "mode": mode,
            "max_tokens": settings.JURIA_MAX_TOKENS,
        },
        "chat",
    )


def analyze_document(
    file_path: str,
    file_type: str,
    analysis_prompt: str,
    case_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Analyze a PDF/DOCX. DeepSeek receives extracted text; legacy Juria gets the file."""
    if provider_name() == "deepseek":
        try:
            extracted = extract_document_text(file_path, file_type)
        except DocumentTextError as exc:
            raise JuriaDocumentError(str(exc)) from exc
        user_content = (
            f"{analysis_prompt.strip()}\n\n"
            "--- Début du document ---\n"
            f"{extracted}\n"
            "--- Fin du document ---\n\n"
            "Fournis une analyse structurée: synthèse, points clés, clauses sensibles, "
            "risques, et points à vérifier en droit marocain. N'invente pas de clauses absentes."
        )
        result = _deepseek_chat(
            [
                {
                    "role": "system",
                    "content": build_system_prompt("CONTRACT_ANALYSIS", case_context),
                },
                {"role": "user", "content": user_content},
            ]
        )
        return {
            "analysis": result["content"],
            "key_points": [],
            "risks": [],
            "tokens_used": result["tokens_used"],
            "message_id": result["message_id"],
        }

    with open(file_path, "rb") as f:
        file_b64 = base64.b64encode(f.read()).decode("utf-8")
    return _juria_post(
        "/analyze",
        {
            "file": file_b64,
            "file_type": file_type,
            "prompt": analysis_prompt,
            "context": build_system_prompt("CONTRACT_ANALYSIS", case_context),
        },
        "analyze",
    )


def draft_document(
    document_type: str,
    parameters: dict[str, Any],
    case_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a legal document via the configured provider."""
    if provider_name() == "deepseek":
        label = DRAFT_TYPE_LABELS.get(document_type, document_type.replace("_", " ").lower())
        param_lines = []
        for key, value in (parameters or {}).items():
            if value is None or str(value).strip() == "":
                continue
            param_lines.append(f"- {key}: {value}")
        params_block = "\n".join(param_lines) or "- (aucun paramètre fourni)"
        user_content = (
            f"Rédige un {label} conforme aux usages marocains, en français juridique.\n"
            "Utilise uniquement les informations fournies. Pour toute donnée manquante, "
            "insère un placeholder [À COMPLÉTER] — n'invente pas d'identité, de montant "
            "ou de date.\n\n"
            f"Type d'acte: {document_type}\n"
            f"Paramètres:\n{params_block}\n\n"
            "Produis le texte complet de l'acte, prêt à être relu par un avocat."
        )
        result = _deepseek_chat(
            [
                {
                    "role": "system",
                    "content": build_system_prompt("DOCUMENT_DRAFTING", case_context),
                },
                {"role": "user", "content": user_content},
            ]
        )
        return {
            "content": result["content"],
            "docx_base64": text_to_docx_base64(result["content"]),
            "tokens_used": result["tokens_used"],
            "message_id": result["message_id"],
        }

    return _juria_post(
        "/draft",
        {
            "document_type": document_type,
            "parameters": parameters,
            "jurisdiction": "MA",
            "language": "fr",
            "legal_system": "moroccan",
            "context": build_system_prompt("DOCUMENT_DRAFTING", case_context),
        },
        "draft",
    )


def build_system_prompt(mode: str, case_context: dict[str, Any] | None = None) -> str:
    """System prompt for Juria: Moroccan legal context and optional dossier background."""
    base = (
        "Tu es Juria, assistant juridique spécialisé pour le droit marocain. "
        "Réponds avec rigueur, en t'appuyant sur le système juridique marocain "
        "(droit marocain). Références utiles: Code Général des Impôts (CGI), "
        "Code de Commerce, Dahir des Obligations et Contrats (DOC), "
        "Code du Travail, Code de Procédure Civile. "
        "Langue principale: français; tu peux reconnaître des formulations en darija "
        "lorsque c'est pertinent. Juridiction: Royaume du Maroc. "
        "Tes réponses sont une aide; un avocat doit relire avant tout usage.\n\n"
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


def _deepseek_chat(messages: list[dict[str, str]]) -> dict[str, Any]:
    api_key = (getattr(settings, "DEEPSEEK_API_KEY", "") or "").strip()
    if not api_key:
        raise JuriaAPIError("DeepSeek API key is not configured.")

    base = (getattr(settings, "DEEPSEEK_API_URL", "") or "https://api.deepseek.com").rstrip("/")
    url = f"{base}/chat/completions"
    model = getattr(settings, "DEEPSEEK_MODEL", "deepseek-chat") or "deepseek-chat"
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": settings.JURIA_MAX_TOKENS,
        "stream": False,
    }
    if "reasoner" not in model.lower():
        payload["temperature"] = 0.3

    try:
        response = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=settings.JURIA_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout as exc:
        raise JuriaTimeoutError("Juria chat request timed out") from exc
    except requests.exceptions.RequestException as exc:
        logger.warning("DeepSeek connection failed: %s", exc)
        raise JuriaAPIError("DeepSeek is unreachable. Please retry.") from exc

    if response.status_code != 200:
        body = _parse_error_body(response)
        logger.warning("DeepSeek HTTP %s: %s", response.status_code, body)
        raise JuriaAPIError(
            _user_message_for_http_error(response.status_code, body),
            body,
            status_code=response.status_code,
        )

    data = response.json()
    try:
        content = data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        raise JuriaAPIError("DeepSeek returned an unexpected response.", data) from exc

    usage = data.get("usage") or {}
    tokens = int(usage.get("total_tokens") or 0)
    return {
        "content": content,
        "tokens_used": tokens,
        "message_id": str(data.get("id") or ""),
    }


def _juria_post(path: str, payload: dict[str, Any], label: str) -> dict[str, Any]:
    url = f"{_juria_base_url()}{path}"
    try:
        response = requests.post(
            url,
            json=payload,
            headers=_juria_headers(),
            timeout=settings.JURIA_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout as exc:
        raise JuriaTimeoutError(f"Juria {label} request timed out") from exc
    except requests.exceptions.RequestException as exc:
        logger.warning("Juria connection failed: %s", exc)
        raise JuriaAPIError("Juria API is unreachable. Please retry.") from exc

    if response.status_code != 200:
        body = _parse_error_body(response)
        raise JuriaAPIError(
            _user_message_for_http_error(response.status_code, body),
            body,
            status_code=response.status_code,
        )
    return response.json()


def _juria_base_url() -> str:
    return getattr(settings, "JURIA_API_URL", "https://api.juria.ma/v1").rstrip("/")


def _juria_headers() -> dict[str, str]:
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


def _provider_error_text(body: Any) -> str:
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or "").strip()
        if isinstance(err, str):
            return err.strip()
        if body.get("message"):
            return str(body["message"]).strip()
    if isinstance(body, str):
        return body.strip()
    return ""


def _user_message_for_http_error(status_code: int, body: Any) -> str:
    provider_msg = _provider_error_text(body).lower()
    if status_code == 402 or "insufficient balance" in provider_msg:
        return (
            "Le compte DeepSeek n'a plus de crédit. "
            "Ajoutez du solde sur platform.deepseek.com puis réessayez."
        )
    if status_code == 401:
        return "Clé API DeepSeek invalide. Vérifiez DEEPSEEK_API_KEY dans le fichier .env."
    if status_code == 429:
        return "DeepSeek est saturé pour le moment. Réessayez dans un instant."
    text = _provider_error_text(body)
    if text:
        return f"DeepSeek: {text}"
    return "Juria API unavailable. Please try again."


class JuriaAPIError(Exception):
    """Raised when the LLM provider returns a non-200 response."""

    def __init__(self, message: str, api_response: Any = None, status_code: int = 502):
        self.api_response = api_response
        self.status_code = status_code
        super().__init__(message)


class JuriaTimeoutError(Exception):
    """Raised when a provider request times out."""


class JuriaDocumentError(Exception):
    """Raised when a document cannot be prepared for analysis."""
