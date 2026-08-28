"""
Tenant-aware, transaction-safe case/consultation reference generation.

Formats:
  Consultations: C-{YEAR}-{NNNN}          e.g. C-2026-0001
  Follow-ups:    C-{YEAR}-{NNNN}-F{NN}    e.g. C-2026-0001-F01
  Litigation:    L-{YEAR}-{NNNN}
  Administrative: A-{YEAR}-{NNNN}
"""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from .models import Case, CaseReferenceSequence

KIND_BY_TYPE = {
    Case.CaseType.CONSULTATION: CaseReferenceSequence.KIND_CONSULTATION,
    Case.CaseType.LITIGATION: CaseReferenceSequence.KIND_LITIGATION,
    Case.CaseType.ADMINISTRATIVE: CaseReferenceSequence.KIND_ADMINISTRATIVE,
}


def allocate_typed_reference(cabinet, case_type: str, *, year: int | None = None) -> str:
    """
    Increment the cabinet+kind+year counter under SELECT FOR UPDATE and return the next reference.
    """
    if cabinet is None:
        raise ValueError("cabinet is required to allocate a reference")
    kind = KIND_BY_TYPE.get(case_type)
    if not kind:
        raise ValueError(f"Unsupported case_type for reference allocation: {case_type}")
    year = year or timezone.now().year
    with transaction.atomic():
        seq, _ = CaseReferenceSequence.objects.select_for_update().get_or_create(
            cabinet=cabinet,
            kind=kind,
            year=year,
            defaults={"last_number": 0},
        )
        seq.last_number += 1
        seq.save(update_fields=["last_number"])
        return f"{kind}-{year}-{seq.last_number:04d}"


def allocate_follow_up_reference(parent: Case) -> tuple[str, int]:
    """
    Allocate the next follow-up identifier under the parent consultation.
    Returns (reference, sequence_number).
    """
    if parent.case_type != Case.CaseType.CONSULTATION:
        raise ValueError("Follow-ups can only be created from a consultation")
    root = parent
    while root.parent_consultation_id:
        root = root.parent_consultation
    with transaction.atomic():
        locked = Case.objects.select_for_update().get(pk=root.pk)
        existing = list(
            Case.objects.select_for_update()
            .filter(parent_consultation=locked)
            .values_list("follow_up_sequence", flat=True)
        )
        next_n = (max(existing) if existing else 0) + 1
        return f"{locked.reference}-F{next_n:02d}", next_n
