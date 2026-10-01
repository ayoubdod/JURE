"""Resolve effective privacy mode: project → case → cabinet → default."""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from privacy.constants import PrivacyMode
from privacy.models import CabinetPrivacyPolicy
from privacy.services.crypto import mapping_key_configured


@dataclass
class ResolvedPrivacyPolicy:
    mode: str
    require_pseudonymization_for_documents: bool
    reidentification_requires_authorization: bool
    source: str  # project | case | cabinet | default
    cabinet_id: int | None


def get_or_create_cabinet_policy(cabinet) -> CabinetPrivacyPolicy:
    default_mode = (
        getattr(settings, "PRIVACY_DEFAULT_MODE", PrivacyMode.PSEUDONYMIZED)
        or PrivacyMode.PSEUDONYMIZED
    )
    if default_mode not in PrivacyMode.values:
        default_mode = PrivacyMode.PSEUDONYMIZED
    policy, _ = CabinetPrivacyPolicy.objects.get_or_create(
        cabinet=cabinet,
        defaults={
            "default_mode": default_mode,
            "require_pseudonymization_for_documents": True,
            "reidentification_requires_authorization": True,
        },
    )
    return policy


def resolve_privacy_mode(
    *,
    cabinet,
    project=None,
    case=None,
    has_documents: bool = False,
    has_retrieved_context: bool = False,
    has_case_narrative: bool = False,
) -> ResolvedPrivacyPolicy:
    """
    Most specific override wins. Document/context-bearing requests may force
    Pseudonymized when cabinet policy requires it.
    """
    if cabinet is None:
        default = getattr(settings, "PRIVACY_DEFAULT_MODE", PrivacyMode.PSEUDONYMIZED)
        return ResolvedPrivacyPolicy(
            mode=default if default in PrivacyMode.values else PrivacyMode.PSEUDONYMIZED,
            require_pseudonymization_for_documents=True,
            reidentification_requires_authorization=True,
            source="default",
            cabinet_id=None,
        )

    cab_policy = get_or_create_cabinet_policy(cabinet)
    mode = cab_policy.default_mode
    source = "cabinet"

    case_obj = case
    if case_obj is None and project is not None:
        case_obj = getattr(project, "linked_case", None)

    if case_obj is not None:
        case_mode = (getattr(case_obj, "privacy_mode", None) or "").strip().upper()
        if case_mode in PrivacyMode.values:
            mode = case_mode
            source = "case"

    if project is not None:
        project_mode = (getattr(project, "privacy_mode", None) or "").strip().upper()
        if project_mode in PrivacyMode.values:
            mode = project_mode
            source = "project"

    sensitive_payload = bool(has_documents or has_retrieved_context or has_case_narrative)
    if (
        sensitive_payload
        and cab_policy.require_pseudonymization_for_documents
        and mode == PrivacyMode.STANDARD
    ):
        mode = PrivacyMode.PSEUDONYMIZED
        source = f"{source}+document_force"

    return ResolvedPrivacyPolicy(
        mode=mode,
        require_pseudonymization_for_documents=cab_policy.require_pseudonymization_for_documents,
        reidentification_requires_authorization=cab_policy.reidentification_requires_authorization,
        source=source,
        cabinet_id=cabinet.id,
    )


def assert_mode_operable(mode: str) -> None:
    """Failure-closed checks before AI egress."""
    from privacy.services.gateway import PrivacyGatewayError

    if mode == PrivacyMode.PRIVATE:
        private_ok = bool(getattr(settings, "PRIVACY_PRIVATE_AI_CONFIGURED", False))
        if not private_ok:
            raise PrivacyGatewayError(
                "Private AI mode is selected but private AI infrastructure is not configured. "
                "Use Pseudonymized mode, or contact your administrator."
            )
    if mode == PrivacyMode.PSEUDONYMIZED and not mapping_key_configured():
        raise PrivacyGatewayError(
            "Pseudonymized mode requires PRIVACY_MAPPING_KEY to be configured. "
            "Raw content will not be sent to the AI provider."
        )
