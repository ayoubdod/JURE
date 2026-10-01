"""Privacy mode and entity-type constants."""

from __future__ import annotations

from django.db import models
from django.utils.translation import gettext_lazy as _


class PrivacyMode(models.TextChoices):
    STANDARD = "STANDARD", _("Standard")
    PSEUDONYMIZED = "PSEUDONYMIZED", _("Pseudonymized")
    PRIVATE = "PRIVATE", _("Private")


class EntityType(models.TextChoices):
    PERSON = "PERSON", _("Person")
    ORGANIZATION = "ORGANIZATION", _("Organization")
    COMPANY = "COMPANY", _("Company")
    LOCATION = "LOCATION", _("Location")
    ADDRESS = "ADDRESS", _("Address")
    DATE = "DATE", _("Date")
    PHONE = "PHONE", _("Phone")
    EMAIL = "EMAIL", _("Email")
    IDENTIFIER = "IDENTIFIER", _("Identifier")
    FINANCIAL = "FINANCIAL", _("Financial information")
    URL = "URL", _("URL")


# Token prefixes emitted to the AI plane (semantic, opaque).
TOKEN_PREFIX = {
    EntityType.PERSON: "PERSON",
    EntityType.ORGANIZATION: "COMPANY",
    EntityType.COMPANY: "COMPANY",
    EntityType.LOCATION: "LOCATION",
    EntityType.ADDRESS: "ADDRESS",
    EntityType.DATE: "DATE",
    EntityType.PHONE: "PHONE",
    EntityType.EMAIL: "EMAIL",
    EntityType.IDENTIFIER: "ID",
    EntityType.FINANCIAL: "FINANCIAL",
    EntityType.URL: "URL",
}


class PrivacyAuditAction:
    PRIVACY_SCAN_STARTED = "PRIVACY_SCAN_STARTED"
    PII_DETECTED = "PII_DETECTED"
    DOCUMENT_PSEUDONYMIZED = "DOCUMENT_PSEUDONYMIZED"
    AI_REQUEST_SANITIZED = "AI_REQUEST_SANITIZED"
    AI_REQUEST_SENT = "AI_REQUEST_SENT"
    AI_RESPONSE_RECEIVED = "AI_RESPONSE_RECEIVED"
    REIDENTIFICATION_REQUESTED = "REIDENTIFICATION_REQUESTED"
    REIDENTIFICATION_COMPLETED = "REIDENTIFICATION_COMPLETED"
    PRIVACY_GATEWAY_BLOCKED = "PRIVACY_GATEWAY_BLOCKED"
