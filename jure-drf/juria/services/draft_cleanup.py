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

_PREAMBLE_HEADING = re.compile(
    r"(?im)^\s*(?:\*{0,2}|#{1,6}\s*)?(?:"
    r"avertissement(?:\s+pr[ée]alable)?|"
    r"disclaimer|"
    r"important(?:\s+notice)?|"
    r"note(?:\s+importante)?|"
    r"تنبيه|"
    r"ملاحظة(?:\s+للمحامي)?(?:\s+المراجع)?"
    r")\b"
)

_ACT_START = re.compile(
    r"(?im)^\s*(?:#{1,6}\s*|\*{0,2})(?:"
    r"contrat\s+de\s+bail|"
    r"contrat\s+de\s+location|"
    r"contrat\s+de\s+travail|"
    r"mise\s+en\s+demeure|"
    r"statuts|"
    r"procuration|"
    r"requ[êe]te|"
    r"conclusions|"
    r"acte|"
    r"lease|"
    r"formal\s+notice|"
    r"power\s+of\s+attorney|"
    r"employment\s+contract|"
    r"إنذار|"
    r"عقد\s+كراء|"
    r"عقد\s+شغل|"
    r"توكيل|"
    r"النظام\s+الأساسي|"
    r"مذكرات|"
    r"طلب"
    r")"
)

_META_TAIL = re.compile(
    r"(?is)\n+(?:-{3,}\s*\n+)?(?:\*{0,2}|#{1,6}\s*)?"
    r"(?:ملاحظة(?:\s+للمحامي)?(?:\s+المراجع)?|"
    r"note\s+(?:pour\s+l['’]?avocat|to\s+(?:the\s+)?reviewing\s+(?:lawyer|counsel)|for\s+(?:the\s+)?reviewing\s+(?:lawyer|counsel))|"
    r"avertissement(?:\s+(?:à\s+l['’]?avocat|pr[ée]alable))?)"
    r"(?:\*{0,2})?\s*[:：]?.*\Z"
)

_HR = re.compile(r"(?m)^\s*-{3,}\s*$")
# ATX headings with or without space after hashes
_MD_HEADING = re.compile(r"(?m)^[ \t]*#{1,6}[ \t]*")
_MD_BOLD_ITALIC = re.compile(r"\*\*\*(.+?)\*\*\*", re.DOTALL)
_MD_BOLD = re.compile(r"\*\*(.+?)\*\*|__(.+?)__", re.DOTALL)
_MD_ITALIC = re.compile(
    r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)",
    re.DOTALL,
)
_MD_STRIKE = re.compile(r"~~(.+?)~~", re.DOTALL)
_MD_INLINE_CODE = re.compile(r"`([^`]+)`")
_MD_BLOCKQUOTE = re.compile(r"(?m)^[ \t]*>[ \t]?")


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
            or "modèle générique" in line.lower()
            or "generic template" in line.lower()
            or "ne constitue pas" in line.lower()
        ):
            note_lines.append(re.sub(r"^\s*\*{0,2}|\*{0,2}\s*$", "", line).strip())
        else:
            body_lines.append(line)
    body = "\n".join(body_lines).strip()
    note = " ".join(note_lines).strip()
    return body, note


def _strip_leading_preamble(text: str) -> str:
    """Drop AI disclaimers before the real act title."""
    lines = (text or "").splitlines()
    if not lines:
        return ""

    # If a clear act heading exists later, drop everything before it
    for i, line in enumerate(lines):
        if _ACT_START.search(line.strip()):
            return "\n".join(lines[i:]).strip()

    # Otherwise drop a leading avertissement block until first HR or blank gap after it
    if _PREAMBLE_HEADING.search(lines[0].strip()):
        out: list[str] = []
        skipping = True
        for line in lines[1:]:
            if skipping:
                if _HR.match(line) or _ACT_START.search(line.strip()):
                    skipping = False
                    if _ACT_START.search(line.strip()):
                        out.append(line)
                    continue
                continue
            out.append(line)
        return "\n".join(out).strip()
    return text.strip()


def _strip_markdown(text: str) -> str:
    """Remove markdown so the stored act is plain lawyer-ready text (no * or # left)."""
    text = _HR.sub("", text or "")
    text = _MD_HEADING.sub("", text)
    text = _MD_BLOCKQUOTE.sub("", text)
    text = _MD_INLINE_CODE.sub(r"\1", text)
    text = _MD_STRIKE.sub(r"\1", text)

    # Unwrap paired emphasis (including broken multiline from the model)
    for _ in range(6):
        prev = text
        text = _MD_BOLD_ITALIC.sub(r"\1", text)
        text = _MD_BOLD.sub(lambda m: m.group(1) or m.group(2) or "", text)
        text = _MD_ITALIC.sub(lambda m: m.group(1) or m.group(2) or "", text)
        if text == prev:
            break

    # Nuke leftover markers the model left unpaired (**, *, #, `, ~)
    text = text.replace("**", "").replace("__", "").replace("~~", "")
    text = _MD_HEADING.sub("", text)
    text = re.sub(r"[*#`~]+", "", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_draft_content(text: str) -> str:
    """Remove AI meta sections and markdown so the act looks lawyer-ready."""
    body, _note = extract_advisory_note(text or "")
    body = _strip_leading_preamble(body)
    body = _META_TAIL.sub("", body).strip()
    body = _strip_markdown(body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body


def infer_document_title(content: str, document_type: str, language: str | None = None) -> str:
    """Prefer the act's first real heading; fall back to localized type label."""
    for raw in (content or "").splitlines():
        line = raw.strip()
        if not line or line.startswith("---"):
            continue
        line = re.sub(r"^#{1,6}\s*", "", line)
        line = re.sub(r"^\*{1,2}|\*{1,2}$", "", line).strip(" *_#")
        if len(line) < 4 or line.startswith("["):
            continue
        if _ADVISORY_LINE.search(line) or _PREAMBLE_HEADING.search(line):
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
