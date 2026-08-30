from __future__ import annotations

from juria.constants import ActivityAction
from juria.models import JuriaActivity


def log_activity(project, actor, action: str, **metadata) -> JuriaActivity:
    return JuriaActivity.objects.create(
        project=project,
        actor=actor,
        action=action,
        metadata=metadata or {},
    )
