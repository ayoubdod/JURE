"""Normalize AI draft text into act-ready content (no meta notes, no raw markdown)."""

from __future__ import annotations

import re

DRAFT_TYPE_TITLES = {
    "fr": {
        "CONTRAT_BAIL": "Contrat de bail",
        "MISE_EN_DEMEURE": "Mise en demeure",
        "STATUTS_SARL": "Statuts SARL",
        "PROCURATION": "Procuration",
        "REQUETE": "Requête",
        "CONTRAT_TRAVAIL": "Contrat de travail",
        "CONCLUSIONS": "Conclusions",
        "AUTRE": "Acte juridique",
    },
    "en": {
        "CONTRAT_BAIL": "Lease agreement",
        "MISE_EN_DEMEURE": "Formal notice",
        "STATUTS_SARL": "SARL bylaws",
        "PROCURATION": "Power of attorney",
        "REQUETE": "Court petition",
        "CONTRAT_TRAVAIL": "Employment contract",
        "CONCLUSIONS": "Pleadings",
        "AUTRE": "Legal act",
    },
    "ar": {
        "CONTRAT_BAIL": "عقد كراء",
        "MISE_EN_DEMEURE": "إنذار رسمي",
        "STATUTS_SARL": "النظام الأساسي لشركة ذات مسؤولية محدودة",
        "PROCURATION": "توكيل",
        "REQUETE": "طلب قضائي",
        "CONTRAT_TRAVAIL": "عقد شغل",
        "CONCLUSIONS": "مذكرات",
        "AUTRE": "وثيقة قانونية",
    },
}

_ADVISORY_LINE = re.compile(
    r"(?im)^\s*(?:\*{0,2})?(?:تنبيه|ملاحظة|avertissement|note|disclaimer|warning)\s*[:：]"
)

_META_TAIL = re.compile(
    r"(?is)\n+(?:-{3,}\s*\n+)?(?:\*{0,2})?"
    r"(?:ملاحظة(?:\s+للمحامي)?(?:\s+المراجع)?|"
    r"note\s+(?:pour\s+l['’]?avocat|to\s+(?:the\s+)?reviewing\s+(?:lawyer|counsel)|for\s+(?:the\s+)?reviewing\s+(?:lawyer|counsel))|"
    r"avertissement(?:\s+à\s+l['’]?avocat)?)"
    r"(?:\*{0,2})?\s*[:：]?.*\Z"
)

_HR = re.compile(r"(?m)^\s*-{3,}\s*$")


def draft_type_title(document_type: str, language: str | None = None) -> str:
    lang = (language or "fr").lower()
    if lang == "darija":
        lang = "ar"
    table = DRAFT_TYPE_TITLES.get(lang) or DRAFT_TYPE_TITLES["fr"]
    key = (document_type or "AUTRE").upper()
    return table.get(key) or key.replace("_", " ").title()


def extract_advisory_note(text: str) -> tuple[str, str]:
    """Split trailing/leading advisory تنبيه lines from body. Returns (body, note)."""
    lines = (text or "").splitlines()
    note_lines: list[str] = []
    body_lines: list[str] = []
    for line in lines:
        if _ADVISORY_LINE.search(line) and (
            "استرشادي" in line
            or "advisory" in line.lower()
            or "indicatif" in line.lower()
            or "ne remplace" in line.lower()
            or "does not replace" in line.lower()
            or "لا يغني" in line
            or "sources" in line.lower()
            or "مصادر" in line
        ):
            note_lines.append(re.sub(r"^\s*\*{0,2}|\*{0,2}\s*$", "", line).strip())
        else:
            body_lines.append(line)
    body = "\n".join(body_lines).strip()
    note = " ".join(note_lines).strip()
    return body, note


def clean_draft_content(text: str) -> str:
    """Remove AI meta sections and normalize horizontal rules for a legal act."""
    body, _note = extract_advisory_note(text or "")
    body = _META_TAIL.sub("", body).strip()
    body = _HR.sub("", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body


def infer_document_title(content: str, document_type: str, language: str | None = None) -> str:
    """Prefer the act's first real heading; fall back to localized type label."""
    for raw in (content or "").splitlines():
        line = raw.strip()
        if not line or line.startswith("---"):
            continue
        line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"^\*{1,2}|\*{1,2}$", "", line).strip(" *_")
        if len(line) < 4 or line.startswith("["):
            continue
        if _ADVISORY_LINE.search(line):
            continue
        return line[:120]
    return draft_type_title(document_type, language)


def ungrounded_advisory(language: str | None = None) -> str:
    lang = (language or "fr").lower()
    if lang in ("ar", "darija"):
        return (
            "تنبيه: هذا التحليل استرشادي فقط ولا يغني عن استشارة محامٍ مختص. "
            "لم تتوفر مصادر موثقة من قاعدة المشروع لدعم هذا التحليل، "
            "وقد تم الاعتماد على النصوص القانونية المغربية العامة."
        )
    if lang == "en":
        return (
            "Notice: this analysis is advisory only and does not replace advice from a qualified lawyer. "
            "No verified sources from the project knowledge base were available, "
            "so the answer relies on general Moroccan legal texts."
        )
    return (
        "Avertissement : cette analyse est indicative uniquement et ne remplace pas "
        "l'avis d'un avocat compétent. Aucune source vérifiée de la base du projet "
        "n'était disponible ; la réponse s'appuie sur les textes juridiques marocains généraux."
    )
