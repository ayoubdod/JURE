"""
Authorized, relationship-aware conflict search across cabinet records.

Searches real JURE data only (clients + matter party fields). Never loads
cross-cabinet data. Returns *potential* matches for lawyer review — not
legal conflict determinations.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from django.db.models import Q

from cases.models import Case
from clients.models import Client
from users.models import User

from .matching import MatchResult, MatchType, broad_contains_filter, classify_match


# Closed-like statuses → Former Client when the match is via Case.client
_CLOSED_STATUSES = {
    Case.CaseStatus.CLOSED,
    Case.CaseStatus.CANCELLED,
    Case.CaseStatus.ARCHIVED,
    Case.CaseStatus.CONVERTED_TO_CASE,
}


@dataclass
class Hit:
    entity_type: str
    entity_id: int | None
    entity_name: str
    matter_id: int
    matter_reference: str
    matter_title: str
    matter_status: str
    role: str
    match_type: str
    confidence: float
    match_reason: str
    assigned_to_name: str | None = None
    matter_created: str | None = None

    def dedupe_key(self) -> tuple:
        return (
            self.matter_id,
            self.role,
            (self.entity_id or 0),
            self.entity_name.casefold(),
            self.match_type,
        )


@dataclass
class SearchOutcome:
    query: str
    hits: list[Hit] = field(default_factory=list)

    @property
    def exact_hits(self) -> list[Hit]:
        return [h for h in self.hits if h.match_type == MatchType.EXACT.value]

    @property
    def potential_hits(self) -> list[Hit]:
        return [h for h in self.hits if h.match_type != MatchType.EXACT.value]


def _client_display_name(user: User) -> str:
    parts = [p for p in (user.first_name or "", user.last_name or "") if p]
    return " ".join(parts).strip() or (user.email or f"Client #{user.id}")


def _assigned_name(case: Case) -> str | None:
    u = case.assigned_to
    if not u:
        return None
    parts = [p for p in (u.first_name or "", u.last_name or "") if p]
    return " ".join(parts).strip() or None


def _role_for_client(case: Case) -> str:
    if case.status in _CLOSED_STATUSES:
        return "FORMER_CLIENT"
    data = case.case_specific_data or {}
    client_role = (data.get("clientRole") or data.get("client_role") or "").upper()
    if client_role == "PLAINTIFF":
        return "PLAINTIFF"
    if client_role == "DEFENDANT":
        return "DEFENDANT"
    return "CLIENT"


def _maybe_hit(
    *,
    query: str,
    candidate: str,
    entity_type: str,
    entity_id: int | None,
    case: Case,
    role: str,
) -> Hit | None:
    result: MatchResult | None = classify_match(query, candidate)
    if not result:
        return None
    created = None
    if getattr(case, "created", None):
        created = case.created.date().isoformat()
    return Hit(
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=candidate.strip(),
        matter_id=case.id,
        matter_reference=case.reference or "",
        matter_title=case.title or "",
        matter_status=case.status,
        role=role,
        match_type=result.match_type.value,
        confidence=result.confidence,
        match_reason=result.reason,
        assigned_to_name=_assigned_name(case),
        matter_created=created,
    )


def _iter_party_strings(data: dict[str, Any]) -> list[tuple[str, str, str]]:
    """
    Yield (role, entity_type, name) from litigation/admin JSON party fields.
    Only uses fields that already exist in JURE case_specific_data.
    """
    out: list[tuple[str, str, str]] = []
    opposing = data.get("opposingParty") or data.get("opposing_party") or ""
    if isinstance(opposing, str) and opposing.strip():
        out.append(("OPPOSING_PARTY", "PARTY", opposing.strip()))

    counsel = data.get("opposingCounsel") or data.get("opposing_counsel") or ""
    if isinstance(counsel, str) and counsel.strip():
        out.append(("OPPOSING_COUNSEL", "COUNSEL", counsel.strip()))

    third = data.get("thirdParties") or data.get("third_parties") or []
    if isinstance(third, str) and third.strip():
        third = [third]
    if isinstance(third, list):
        for item in third:
            if isinstance(item, str) and item.strip():
                out.append(("THIRD_PARTY", "RELATED_PARTY", item.strip()))
            elif isinstance(item, dict):
                name = (item.get("name") or item.get("label") or "").strip()
                if name:
                    out.append(("THIRD_PARTY", "RELATED_PARTY", name))
    return out


def search_conflicts(*, cabinet, query: str, exclude_matter_id: int | None = None) -> SearchOutcome:
    """
    Search authorized cabinet data for potential conflict relationships.

    Cabinet scoping is mandatory — callers must pass the authenticated user's cabinet.
    """
    q = (query or "").strip()
    outcome = SearchOutcome(query=q)
    if not cabinet or len(q) < 2:
        return outcome

    prefilter = broad_contains_filter(q)
    hits_by_key: dict[tuple, Hit] = {}

    def add(hit: Hit | None) -> None:
        if not hit:
            return
        key = hit.dedupe_key()
        existing = hits_by_key.get(key)
        if existing is None or hit.confidence > existing.confidence:
            hits_by_key[key] = hit

    cases_qs = (
        Case.objects.filter(cabinet=cabinet)
        .select_related("client", "assigned_to")
        .order_by("-created")
    )
    if exclude_matter_id:
        cases_qs = cases_qs.exclude(pk=exclude_matter_id)

    # --- Clients (User profiles in this cabinet) ---
    client_users = (
        User.objects.filter(cabinet=cabinet, is_cabinet_member=False)
        .select_related("firm_client_profile")
        .filter(
            Q(first_name__icontains=prefilter)
            | Q(last_name__icontains=prefilter)
            | Q(email__icontains=prefilter)
            | Q(phone__icontains=prefilter)
            | Q(address__icontains=prefilter)
            | Q(firm_client_profile__ice__icontains=prefilter)
            | Q(firm_client_profile__if_number__icontains=prefilter)
        )
        .distinct()[:200]
    )

    matched_client_ids: set[int] = set()
    for user in client_users:
        display = _client_display_name(user)
        candidates = [display]
        if user.email:
            candidates.append(user.email)
        if user.phone:
            candidates.append(str(user.phone))
        profile: Client | None = getattr(user, "firm_client_profile", None)
        if profile:
            if profile.ice:
                candidates.append(profile.ice)
            if profile.if_number:
                candidates.append(profile.if_number)

        best: MatchResult | None = None
        best_name = display
        for cand in candidates:
            r = classify_match(q, cand)
            if r and (best is None or r.confidence > best.confidence):
                best = r
                best_name = display if cand in (display, user.email) else f"{display} ({cand})"

        # Also try "Last First" reorder using full name only
        if user.first_name and user.last_name:
            alt = f"{user.last_name} {user.first_name}"
            r = classify_match(q, alt)
            if r and (best is None or r.confidence > best.confidence):
                best = r
                best_name = display

        if best:
            matched_client_ids.add(user.id)
            # Attach each matter where this user is the client
            for case in cases_qs.filter(client_id=user.id)[:50]:
                created = case.created.date().isoformat() if case.created else None
                entity_type = "ORGANIZATION" if (
                    profile and profile.client_type == Client.ClientType.COMPANY
                ) else "CLIENT"
                add(
                    Hit(
                        entity_type=entity_type,
                        entity_id=user.id,
                        entity_name=best_name,
                        matter_id=case.id,
                        matter_reference=case.reference or "",
                        matter_title=case.title or "",
                        matter_status=case.status,
                        role=_role_for_client(case),
                        match_type=best.match_type.value,
                        confidence=best.confidence,
                        match_reason=best.reason,
                        assigned_to_name=_assigned_name(case),
                        matter_created=created,
                    )
                )
            # Client with no matters still surfaces as a cabinet relationship
            if not cases_qs.filter(client_id=user.id).exists():
                # Synthetic: no matter — skip matter-bound UI; only report if they have cases.
                # Product requirement is matter-relationship aware; orphan clients without
                # matters are omitted to avoid inventing matter IDs.
                pass

    # --- Matter party fields (JSON) — prefilter then score ---
    party_cases = cases_qs.filter(
        Q(case_specific_data__icontains=prefilter)
        | Q(client__first_name__icontains=prefilter)
        | Q(client__last_name__icontains=prefilter)
        | Q(client__email__icontains=prefilter)
    ).distinct()[:300]

    for case in party_cases:
        # Client FK path (covers clients missed by name prefilter when query matches via JSON)
        if case.client_id and case.client_id not in matched_client_ids:
            display = _client_display_name(case.client)
            add(
                _maybe_hit(
                    query=q,
                    candidate=display,
                    entity_type="CLIENT",
                    entity_id=case.client_id,
                    case=case,
                    role=_role_for_client(case),
                )
            )

        data = case.case_specific_data or {}
        if not isinstance(data, dict):
            continue
        for role, entity_type, name in _iter_party_strings(data):
            add(
                _maybe_hit(
                    query=q,
                    candidate=name,
                    entity_type=entity_type,
                    entity_id=None,
                    case=case,
                    role=role,
                )
            )

    # Stable order: EXACT first, then confidence desc
    order = {MatchType.EXACT.value: 0, MatchType.HIGH.value: 1, MatchType.POSSIBLE.value: 2}
    outcome.hits = sorted(
        hits_by_key.values(),
        key=lambda h: (order.get(h.match_type, 9), -h.confidence, h.entity_name.casefold()),
    )
    return outcome
