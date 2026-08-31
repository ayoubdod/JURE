"""
Secure proxy between the SaaS backend and the configured LLM provider.
API keys never leave the server; the frontend only talks to Django.
"""

from __future__ import annotations

import base64
import logging
import re
from typing import Any

import requests
from django.conf import settings

from juria.services.document_text import (
    DocumentTextError,
    extract_document_text,
    text_to_docx_base64,
)
from juria.services.titles import sanitize_generated_title

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


_TITLE_LANG = {
    "fr": "French",
    "en": "English",
    "ar": "Arabic",
    "darija": "Moroccan Darija in Latin script",
}


def generate_conversation_title(user_message: str, *, language: str = "fr") -> str:
    """Ask the LLM for a short sidebar title. Returns '' on failure."""
    excerpt = " ".join((user_message or "").split())[:500]
    if not excerpt:
        return ""
    lang_hint = _TITLE_LANG.get((language or "fr").lower(), "French")
    messages = [
        {
            "role": "system",
            "content": (
                "You name chat conversations for a legal AI assistant. "
                "Reply with ONLY a short title (3 to 7 words). "
                "No quotes, no trailing punctuation, no markdown, no explanation. "
                f"Write the title in {lang_hint}."
            ),
        },
        {"role": "user", "content": excerpt},
    ]
    try:
        if provider_name() == "deepseek":
            raw = _deepseek_chat(messages, max_tokens=32).get("content") or ""
        else:
            raw = str(
                _juria_post(
                    "/chat",
                    {"messages": messages, "mode": "CHAT", "max_tokens": 32},
                    "title",
                ).get("content")
                or ""
            )
    except Exception as exc:
        logger.warning("Juria title generation failed: %s", exc)
        return ""
    return sanitize_generated_title(raw)


def send_chat_message(
    conversation_history: list[dict[str, str]],
    new_message: str,
    case_context: dict[str, Any] | None = None,
    mode: str = "CHAT",
    *,
    language: str | None = None,
    jurisdiction_code: str | None = None,
    legal_domain: str | None = None,
    instructions: str | None = None,
    retrieved_block: str | None = None,
    json_mode: bool = False,
) -> dict[str, Any]:
    """
    Send a message with prior turns for context.

    conversation_history: list of {role, content} with roles user/assistant (lowercase).
    """
    system_prompt = build_system_prompt(
        mode,
        case_context,
        language=language,
        jurisdiction_code=jurisdiction_code,
        legal_domain=legal_domain,
        instructions=instructions,
        retrieved_block=retrieved_block,
    )
    messages = [
        {"role": "system", "content": system_prompt},
        *conversation_history,
        {"role": "user", "content": new_message},
    ]
    if provider_name() == "deepseek":
        result = _deepseek_chat(messages, json_mode=json_mode)
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
    *,
    language: str | None = None,
    jurisdiction_code: str | None = None,
    legal_domain: str | None = None,
    instructions: str | None = None,
    retrieved_block: str | None = None,
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
            "Retourne un JSON unique (aucun markdown) avec exactement cette structure:\n"
            "{"
            '"analysis":"synthèse en prose",'
            '"risk_score":0,'
            '"risks":{"high":[],"medium":[],"low":[]},'
            '"missing_clauses":[],'
            '"unusual_clauses":[],'
            '"extracted":{"parties":[],"obligations":[],"dates":[],"payment":[],'
            '"termination":[],"penalties":[],"confidentiality":[],"non_compete":[],'
            '"liability":[],"governing_law":[],"dispute_resolution":[]}'
            "}\n"
            "risk_score est un entier 0-100 fondé uniquement sur le texte. "
            "N'invente pas de clauses absentes. Si une catégorie est vide, utilise []."
        )
        result = _deepseek_chat(
            [
                {
                    "role": "system",
                    "content": build_system_prompt(
                        "CONTRACT_ANALYSIS",
                        case_context,
                        language=language,
                        jurisdiction_code=jurisdiction_code,
                        legal_domain=legal_domain,
                        instructions=instructions,
                        retrieved_block=retrieved_block,
                    ),
                },
                {"role": "user", "content": user_content},
            ],
            json_mode=True,
        )
        parsed = parse_contract_analysis(result["content"])
        return {
            "analysis": parsed.get("analysis") or result["content"],
            "structured": parsed,
            "key_points": parsed.get("key_points") or [],
            "risks": parsed.get("risks") or {},
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
    *,
    jurisdiction_code: str | None = None,
    legal_system: str | None = None,
    language: str | None = None,
    legal_domain: str | None = None,
    instructions: str | None = None,
) -> dict[str, Any]:
    """Generate a legal document via the configured provider."""
    code = (jurisdiction_code or "MA").upper()
    system = legal_system or ""
    lang = language or "fr"
    if provider_name() == "deepseek":
        label = DRAFT_TYPE_LABELS.get(document_type, document_type.replace("_", " ").lower())
        param_lines = []
        for key, value in (parameters or {}).items():
            if value is None or str(value).strip() == "":
                continue
            param_lines.append(f"- {key}: {value}")
        params_block = "\n".join(param_lines) or "- (aucun paramètre fourni)"
        lang_hint = language or lang or "fr"
        user_content = (
            f"Rédige un {label}.\n"
            "Utilise uniquement les informations fournies. Pour toute donnée manquante, "
            "insère un placeholder [À COMPLÉTER] — n'invente pas d'identité, de montant "
            "ou de date.\n\n"
            f"Type d'acte: {document_type}\n"
            f"Langue: {lang_hint}\n"
            f"Paramètres:\n{params_block}\n\n"
            "Produis le texte complet de l'acte, prêt à être relu par un avocat. "
            "Utilise des titres, listes et paragraphes clairs."
        )
        result = _deepseek_chat(
            [
                {
                    "role": "system",
                    "content": build_system_prompt(
                        "DOCUMENT_DRAFTING",
                        case_context,
                        language=language or lang,
                        jurisdiction_code=jurisdiction_code or code,
                        legal_domain=legal_domain,
                        instructions=instructions,
                    ),
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
            "jurisdiction": code,
            "language": lang,
            "legal_system": system or "moroccan",
            "context": build_system_prompt("DOCUMENT_DRAFTING", case_context),
        },
        "draft",
    )


def parse_contract_analysis(raw: str) -> dict[str, Any]:
    import json

    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return {"analysis": raw or "", "parse_error": True}
    if not isinstance(data, dict):
        return {"analysis": raw or "", "parse_error": True}
    return data


def _language_rules(lang: str, lang_label: str) -> str:
    """Hard language enforcement so the model does not default to French."""
    if lang == "en":
        return (
            f"RESPONSE LANGUAGE (mandatory): English ({lang_label}). "
            "Write the entire answer in English: explanations, headings, and legal phrasing. "
            "Do not reply in French unless the user explicitly asks to switch language. "
            "You may quote statutes or case names in their original language when citing."
        )
    if lang == "ar":
        return (
            f"لغة الرد (إلزامية): العربية الفصحى القانونية ({lang_label}). "
            "أجب بالعربية الفصحى طوال الرد: الشرح والعناوين والصياغة القانونية. "
            "لا تجب بالفرنسية أو الإنجليزية إلا إذا طلب المستخدم صراحةً تغيير اللغة. "
            "يجوز اقتباس النصوص الرسمية بلغتها الأصلية عند الاستشهاد."
        )
    if lang == "darija":
        return (
            f"RESPONSE LANGUAGE (mandatory): Darija / Moroccan Arabic ({lang_label}). "
            "Reply in clear Moroccan Darija (دارجة مغربية) for explanations, while keeping "
            "precise legal terms when needed (Arabic fusḥā or French loanwords as lawyers use them). "
            "Do not answer in French or English unless the user explicitly switches language."
        )
    # French (default)
    return (
        f"LANGUE DE RÉPONSE (obligatoire): français ({lang_label}). "
        "Rédige toute la réponse en français: explications, titres et formulations juridiques. "
        "Ne réponds pas en anglais ou en arabe sauf si l'utilisateur demande explicitement de changer de langue. "
        "Tu peux citer des textes officiels dans leur langue d'origine."
    )


def _mode_instructions(mode: str, lang: str) -> str:
    if lang == "en":
        bits = {
            "CHAT": (
                "Mode: legal discussion. Answer clearly and structured. "
                "You may combine analysis, research and drafting in the same thread when asked."
            ),
            "CONTRACT_ANALYSIS": (
                "Mode: contract analysis. Identify risks, sensitive clauses, inconsistencies "
                "and compliance points under the project jurisdiction."
            ),
            "LEGAL_RESEARCH": (
                "Mode: legal research. Cite only sources provided in the project context. "
                "Distinguish doctrine / case law / statute."
            ),
            "DOCUMENT_DRAFTING": (
                "Mode: legal drafting. Produce professional wording, correct legal terminology, clear structure."
            ),
        }
    elif lang in ("ar", "darija"):
        bits = {
            "CHAT": (
                "الوضع: نقاش قانوني. أجب بوضوح وبهيكلة جيدة. "
                "يمكنك الجمع بين التحليل والبحث والصياغة في نفس المحادثة عند الطلب."
            ),
            "CONTRACT_ANALYSIS": (
                "الوضع: تحليل عقد. حدّد المخاطر والبنود الحساسة والتناقضات "
                "ونقاط الامتثال وفق ولاية المشروع."
            ),
            "LEGAL_RESEARCH": (
                "الوضع: بحث قانوني. استشهد فقط بالمصادر الواردة في سياق المشروع. "
                "ميّز بين الفقه / الاجتهاد / النص التشريعي."
            ),
            "DOCUMENT_DRAFTING": (
                "الوضع: صياغة قانونية. أنتج صياغة مهنية ومصطلحات قانونية صحيحة وهيكلة واضحة."
            ),
        }
    else:
        bits = {
            "CHAT": (
                "Mode: discussion juridique. Réponds de façon claire et structurée. "
                "Tu peux combiner analyse, recherche et rédaction dans le même fil si on te le demande."
            ),
            "CONTRACT_ANALYSIS": (
                "Mode: analyse contractuelle. Identifie les risques, clauses sensibles, "
                "incohérences et points de conformité au regard de la juridiction du projet."
            ),
            "LEGAL_RESEARCH": (
                "Mode: recherche juridique. Cite uniquement les sources fournies dans le contexte "
                "du projet. Distingue doctrine / jurisprudence / texte."
            ),
            "DOCUMENT_DRAFTING": (
                "Mode: rédaction d'actes juridiques. Produis des formulations professionnelles, "
                "terminologie juridique correcte, structure claire."
            ),
        }
    return bits.get(mode, bits["CHAT"])


def build_system_prompt(
    mode: str,
    case_context: dict[str, Any] | None = None,
    *,
    language: str | None = None,
    jurisdiction_code: str | None = None,
    legal_domain: str | None = None,
    instructions: str | None = None,
    retrieved_block: str | None = None,
) -> str:
    """System prompt for Juria: jurisdiction, language, project instructions, authorized context."""
    from juria.constants import JURISDICTION_LABELS, LANGUAGE_LABELS

    code = (jurisdiction_code or "MA").upper()
    jur_label = JURISDICTION_LABELS.get(code, code)
    lang = (language or "fr").lower()
    lang_label = LANGUAGE_LABELS.get(lang, lang)
    domain = (legal_domain or "").strip()

    # Identity + common rules in English so language choice is not biased by a French-only base.
    base = (
        "You are Juria, a professional legal assistant built into JURE. "
        f"Jurisdiction: {jur_label} ({code}). "
        "Never hardcode a national legal system other than the project jurisdiction. "
        "Your answers are assistance only; a lawyer must review before any use. "
        "Never invent a source, article, case, or document. "
        "If you lack support in the provided sources, say so explicitly. "
        "Distinguish established facts from hypotheses.\n\n"
        f"{_language_rules(lang, lang_label)}\n\n"
    )
    if domain:
        base += f"Legal domain: {domain}.\n\n"
    parts = [base, _mode_instructions(mode, lang)]
    if instructions and instructions.strip():
        parts.append("\n\nProject instructions (priority):\n")
        parts.append(instructions.strip())
        parts.append("\n")
    if case_context:
        parts.append("\n\nMatter context (authorized fields only):\n")
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
    if retrieved_block:
        parts.append("\n\n")
        parts.append(retrieved_block)
        parts.append("\n")
        parts.append(
            "When you rely on a source above, mention its number [n] in the text. "
            "Do not invent a source list — real citations are handled by the system.\n"
        )
    return "".join(parts)


def _deepseek_chat(
    messages: list[dict[str, str]],
    *,
    json_mode: bool = False,
    stream: bool = False,
    max_tokens: int | None = None,
) -> dict[str, Any]:
    api_key = (getattr(settings, "DEEPSEEK_API_KEY", "") or "").strip()
    if not api_key:
        raise JuriaAPIError("DeepSeek API key is not configured.")

    base = (getattr(settings, "DEEPSEEK_API_URL", "") or "https://api.deepseek.com").rstrip("/")
    url = f"{base}/chat/completions"
    model = getattr(settings, "DEEPSEEK_MODEL", "deepseek-chat") or "deepseek-chat"
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": int(max_tokens) if max_tokens else settings.JURIA_MAX_TOKENS,
        # Streaming is prepared (stream kwarg) but disabled until the SSE endpoint ships.
        "stream": bool(stream),
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
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
