import difflib
import re

from django.http import HttpResponse
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from juria.constants import ActivityAction, ArtifactType
from juria.models import JuriaArtifact, JuriaArtifactVersion
from juria.serializers.artifact_serializer import (
    JuriaArtifactSerializer,
    JuriaArtifactWriteSerializer,
)
from juria.services.activity import log_activity
from juria.services.export import export_bytes
from juria.services.permissions import get_project_for_user, require_write
from juria.views.mixins import JuriaEnabledMixin


def _html_from_markdown(text: str) -> str:
    import markdown as md

    return md.markdown(text or "", extensions=["extra"])


def _plain_lines(value: str) -> list[str]:
    """Turn HTML/markdown into comparable plain-text lines."""
    text = value or ""
    if "<" in text and ">" in text:
        text = re.sub(r"(?i)<br\s*/?>", "\n", text)
        text = re.sub(r"(?i)</p\s*>", "\n", text)
        text = re.sub(r"(?i)</div\s*>", "\n", text)
        text = re.sub(r"(?i)</h[1-6]\s*>", "\n", text)
        text = re.sub(r"(?i)</li\s*>", "\n", text)
        text = re.sub(r"(?i)<li[^>]*>", "• ", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = (
            text.replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
        )
    lines = [ln.rstrip() for ln in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    # Drop trailing empties but keep interior blank lines for structure
    while lines and not lines[-1].strip():
        lines.pop()
    return lines or [""]


def _version_plain_lines(version) -> list[str]:
    """Prefer HTML (what the editor saves) over stale markdown snapshots."""
    html = (getattr(version, "content_html", None) or "").strip()
    md = (getattr(version, "content_markdown", None) or "").strip()
    if html:
        return _plain_lines(html)
    return _plain_lines(md)


def _compare_version_texts(va, vb) -> tuple[list[str], list[str]]:
    """
    Build the most informative plain-text pair for diffing.

    Prefer HTML (editor canvas). If HTML plain texts match but raw HTML differs,
    fall back to a lightly normalized HTML comparison. If markdown differs while
    HTML plain does not (legacy stale-md snapshots), use markdown.
    """
    ha = (getattr(va, "content_html", None) or "").strip()
    hb = (getattr(vb, "content_html", None) or "").strip()
    ma = (getattr(va, "content_markdown", None) or "").strip()
    mb = (getattr(vb, "content_markdown", None) or "").strip()

    html_old = _plain_lines(ha) if ha else None
    html_new = _plain_lines(hb) if hb else None
    md_old = _plain_lines(ma) if ma else None
    md_new = _plain_lines(mb) if mb else None

    # 1) HTML plain differs → best signal
    if html_old is not None and html_new is not None and html_old != html_new:
        return html_old, html_new

    # 2) Markdown plain differs (covers old saves that only updated HTML later)
    if md_old is not None and md_new is not None and md_old != md_new:
        return md_old, md_new

    # 3) Raw HTML differs but stripped text matched (formatting-only) — still show
    if ha and hb and ha != hb:
        # Keep tags stripped but preserve more whitespace structure
        return _plain_lines(ha), _plain_lines(hb)

    # 4) Fallbacks
    if html_old is not None and html_new is not None:
        return html_old, html_new
    if md_old is not None and md_new is not None:
        return md_old, md_new
    if html_old is not None:
        return html_old, html_new or [""]
    if html_new is not None:
        return html_old or [""], html_new
    return md_old or [""], md_new or [""]


def _plain_text_from_html(html: str) -> str:
    return "\n".join(_plain_lines(html or ""))


def _tokenize_words(text: str) -> list[str]:
    """Keep words and whitespace as separate tokens."""
    return re.findall(r"\S+|\s+", text or "") or [""]


def _char_ops(old: str, new: str) -> list[dict]:
    out: list[dict] = []
    sm = difflib.SequenceMatcher(None, old, new, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            out.append({"op": "equal", "text": old[i1:i2]})
        elif tag == "delete":
            out.append({"op": "delete", "text": old[i1:i2]})
        elif tag == "insert":
            out.append({"op": "insert", "text": new[j1:j2]})
        else:
            out.append({"op": "delete", "text": old[i1:i2]})
            out.append({"op": "insert", "text": new[j1:j2]})
    return out


def _word_ops(old: str, new: str) -> list[dict]:
    a = _tokenize_words(old)
    b = _tokenize_words(new)
    out: list[dict] = []
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            out.append({"op": "equal", "text": "".join(a[i1:i2])})
        elif tag == "delete":
            out.append({"op": "delete", "text": "".join(a[i1:i2])})
        elif tag == "insert":
            out.append({"op": "insert", "text": "".join(b[j1:j2])})
        else:
            old_t = "".join(a[i1:i2])
            new_t = "".join(b[j1:j2])
            if len(old_t) <= 64 and len(new_t) <= 64:
                out.extend(_char_ops(old_t, new_t))
            else:
                out.append({"op": "delete", "text": old_t})
                out.append({"op": "insert", "text": new_t})
    return out


def _touched_hunks(old_lines: list[str], new_lines: list[str]) -> list[dict]:
    """Only changed lines, with word/letter segments for precise highlights."""
    hunks: list[dict] = []
    sm = difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag == "delete":
            for line in old_lines[i1:i2]:
                hunks.append({"kind": "delete", "segments": [{"op": "delete", "text": line}]})
        elif tag == "insert":
            for line in new_lines[j1:j2]:
                hunks.append({"kind": "insert", "segments": [{"op": "insert", "text": line}]})
        else:
            old_block = old_lines[i1:i2]
            new_block = new_lines[j1:j2]
            if len(old_block) == len(new_block):
                for ol, nl in zip(old_block, new_block):
                    segs = _word_ops(ol, nl)
                    if any(s["op"] != "equal" for s in segs):
                        hunks.append({"kind": "modify", "segments": segs})
            else:
                segs = _word_ops("\n".join(old_block), "\n".join(new_block))
                if any(s["op"] != "equal" for s in segs):
                    hunks.append({"kind": "modify", "segments": segs})
    return hunks


def _touched_scraps(hunks: list[dict]) -> list[dict]:
    """Only inserted/deleted fragments (no equal context)."""
    scraps: list[dict] = []
    for h in hunks:
        for seg in h.get("segments") or []:
            text = seg.get("text") or ""
            if seg.get("op") in ("insert", "delete") and text.strip() != "":
                scraps.append({"op": seg["op"], "text": text})
    return scraps


def _snapshot(artifact, user, note=""):
    return JuriaArtifactVersion.objects.create(
        artifact=artifact,
        version_number=artifact.current_version,
        content_html=artifact.content_html,
        content_markdown=artifact.content_markdown,
        created_by=user,
        note=note or "",
    )


class JuriaProjectArtifactListCreateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        arts = access.project.artifacts.filter(is_deleted=False).prefetch_related("versions").select_related("created_by")
        return Response(JuriaArtifactSerializer(arts, many=True, context={"request": request}).data)

    def post(self, request, pk):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        ser = JuriaArtifactWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        md = data.get("content_markdown") or ""
        html = data.get("content_html") or (_html_from_markdown(md) if md else "")
        art = JuriaArtifact.objects.create(
            project=access.project,
            thread_id=data.get("thread_id"),
            title=(data.get("title") or "Document").strip(),
            artifact_type=data.get("artifact_type") or ArtifactType.AUTRE,
            content_html=html,
            content_markdown=md,
            created_by=request.user,
            current_version=1,
        )
        _snapshot(art, request.user, note="Création")
        log_activity(access.project, request.user, ActivityAction.ARTIFACT_CREATED, artifact_id=str(art.id))
        return Response(
            JuriaArtifactSerializer(art, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaArtifactDetailView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        art = (
            access.project.artifacts.filter(pk=artifact_id, is_deleted=False)
            .prefetch_related("versions__created_by")
            .select_related("created_by")
            .first()
        )
        if art is None:
            return Response(status=404)
        return Response(JuriaArtifactSerializer(art, context={"request": request}).data)

    def patch(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        ser = JuriaArtifactWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        content_changed = False
        if "title" in data:
            art.title = data["title"]
        if "artifact_type" in data:
            art.artifact_type = data["artifact_type"]
        if "content_html" in data or "content_markdown" in data:
            if "content_markdown" in data:
                art.content_markdown = data["content_markdown"]
                if "content_html" not in data:
                    art.content_html = _html_from_markdown(art.content_markdown)
            if "content_html" in data:
                art.content_html = data["content_html"]
                # Keep markdown in sync with the canvas — otherwise compare preferred
                # stale markdown and reported "no differences" after HTML-only saves.
                if "content_markdown" not in data:
                    art.content_markdown = _plain_text_from_html(art.content_html)
            art.current_version += 1
            _snapshot(art, request.user, note=data.get("note") or "")
            content_changed = True
        art.save()
        if content_changed:
            log_activity(access.project, request.user, ActivityAction.ARTIFACT_MODIFIED, artifact_id=str(art.id), version=art.current_version)
        art = (
            access.project.artifacts.filter(pk=art.pk)
            .prefetch_related("versions__created_by")
            .select_related("created_by")
            .first()
        )
        return Response(JuriaArtifactSerializer(art, context={"request": request}).data)

    def delete(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        art.is_deleted = True
        art.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class JuriaArtifactDuplicateView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        clone = JuriaArtifact.objects.create(
            project=access.project,
            thread=art.thread,
            title=_("%(title)s (copy)") % {"title": art.title},
            artifact_type=art.artifact_type,
            content_html=art.content_html,
            content_markdown=art.content_markdown,
            created_by=request.user,
            current_version=1,
        )
        _snapshot(clone, request.user, note=_("Duplication"))
        log_activity(access.project, request.user, ActivityAction.ARTIFACT_CREATED, artifact_id=str(clone.id), duplicated_from=str(art.id))
        return Response(
            JuriaArtifactSerializer(clone, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class JuriaArtifactExportView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        fmt = (request.query_params.get("export_format") or request.query_params.get("fmt") or "docx").lower()
        # Note: do not use ?format= — DRF reserves it for renderer suffixes and returns 404.
        content, content_type, filename = export_bytes(art, fmt)
        log_activity(
            access.project,
            request.user,
            ActivityAction.ARTIFACT_EXPORTED,
            artifact_id=str(art.id),
            format=fmt,
        )
        resp = HttpResponse(content, content_type=content_type)
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


class JuriaArtifactRestoreView(JuriaEnabledMixin, APIView):
    """Restore artifact content from a prior version (creates a new version snapshot)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk)
        require_write(access.member)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        if art.current_version < 2:
            return Response({"detail": _("No previous version to restore.")}, status=400)
        try:
            target = int(
                request.data.get("version")
                or request.query_params.get("version")
                or (art.current_version - 1)
            )
        except (TypeError, ValueError):
            return Response({"detail": _("Invalid version number.")}, status=400)
        if target < 1 or target >= art.current_version:
            return Response(
                {"detail": _("Version must be between 1 and the previous version.")},
                status=400,
            )
        source = art.versions.filter(version_number=target).first()
        if source is None:
            return Response({"detail": _("Version not found.")}, status=404)

        art.content_html = source.content_html or ""
        art.content_markdown = source.content_markdown or _plain_text_from_html(art.content_html)
        art.current_version += 1
        art.save()
        _snapshot(
            art,
            request.user,
            note=_("Restored from v%(version)s") % {"version": target},
        )
        log_activity(
            access.project,
            request.user,
            ActivityAction.ARTIFACT_MODIFIED,
            artifact_id=str(art.id),
            version=art.current_version,
            restored_from=target,
        )
        art = (
            access.project.artifacts.filter(pk=art.pk)
            .prefetch_related("versions__created_by")
            .select_related("created_by")
            .first()
        )
        return Response(JuriaArtifactSerializer(art, context={"request": request}).data)


class JuriaArtifactCompareView(JuriaEnabledMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, artifact_id):
        access = get_project_for_user(request.user, pk, allow_archived=True)
        art = access.project.artifacts.filter(pk=artifact_id, is_deleted=False).first()
        if art is None:
            return Response(status=404)
        try:
            a = int(request.query_params.get("from") or 1)
            b = int(request.query_params.get("to") or art.current_version)
        except (TypeError, ValueError):
            return Response({"detail": _("Invalid version numbers.")}, status=400)
        va = art.versions.filter(version_number=a).first()
        vb = art.versions.filter(version_number=b).first()
        if va is None or vb is None:
            return Response({"detail": _("Version not found.")}, status=404)
        old, new = _compare_version_texts(va, vb)
        ha = (va.content_html or "").strip()
        hb = (vb.content_html or "").strip()
        identical = old == new and ha == hb
        if old == new and ha and hb and ha != hb:
            old = old + [f"[html v{a}]"]
            new = new + [_("[html v%(version)s changed]") % {"version": b}]
            identical = False

        hunks = [] if identical else _touched_hunks(old, new)
        scraps = [] if identical else _touched_scraps(hunks)
        diff = [] if identical else list(
            difflib.unified_diff(old, new, fromfile=f"v{a}", tofile=f"v{b}", lineterm="")
        )
        change_lines = [
            ln
            for ln in diff
            if ln.startswith("@@")
            or (ln[:1] in "+- " and not ln.startswith("--- ") and not ln.startswith("+++ "))
        ]
        return Response(
            {
                "from": a,
                "to": b,
                "old": "\n".join(old),
                "new": "\n".join(new),
                "diff": [] if identical else (change_lines or diff),
                "hunks": hunks,
                "scraps": scraps,
                "identical": identical,
            }
        )
