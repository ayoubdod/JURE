from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from consultations.models import ConsultationReferenceSequence


def next_consultation_reference(cabinet) -> str:
    year = timezone.now().year
    with transaction.atomic():
        seq, _ = ConsultationReferenceSequence.objects.select_for_update().get_or_create(
            cabinet=cabinet,
            year=year,
            defaults={"last_number": 0},
        )
        seq.last_number += 1
        seq.save(update_fields=["last_number"])
        return f"CR-{year}-{seq.last_number:04d}"
