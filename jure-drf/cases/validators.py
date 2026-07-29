"""
Validators for case management: reference uniqueness, case type sub-fields,
and date ordering. Used by serializers for server-side validation.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from datetime import datetime
from typing import Any


# ---------------------------------------------------------------------------
# Case type constants (must match models.Case.CaseType)
# ---------------------------------------------------------------------------
CASE_TYPES = {'CONSULTATION', 'LITIGATION', 'ADMINISTRATIVE'}


# ---------------------------------------------------------------------------
# Required sub-fields per case type (legal purpose noted in comments)
# ---------------------------------------------------------------------------
CONSULTATION_REQUIRED = {
    'consultationType', 'legalDomain', 'consultationDate', 'duration', 'format',
    'legalQuestion', 'adviceSummary', 'followUpRequired', 'outcome',
}
CONSULTATION_OPTIONAL = {
    'followUpDate',
}
CONSULTATION_ENUMS = {
    'consultationType': {'INITIAL', 'FOLLOW_UP', 'URGENT'},
    'legalDomain': {'FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'},
    'format': {'IN_PERSON', 'PHONE', 'VIDEO'},
    'outcome': {'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE'},
}

LITIGATION_REQUIRED = {
    'litigationType', 'clientRole', 'opposingParty', 'courtName', 'jurisdiction',
    'courtCaseNumber', 'filingDate', 'firstHearingDate', 'nextHearingDate',
    'statuteOfLimitationsDate', 'legalArguments', 'priority',
}
LITIGATION_OPTIONAL = {
    'opposingCounsel', 'thirdParties', 'chamber', 'judgeName', 'coCounsel', 'keyDeadlines',
}
LITIGATION_ENUMS = {
    'litigationType': {'CIVIL', 'CRIMINAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'LABOR', 'FAMILY'},
    'clientRole': {'PLAINTIFF', 'DEFENDANT'},
    'priority': {'LOW', 'MEDIUM', 'HIGH', 'URGENT'},
}

ADMINISTRATIVE_REQUIRED = {
    'dutyType', 'institution', 'startDate', 'dueDate', 'priority',
}
ADMINISTRATIVE_OPTIONAL = {
    'institutionRefNumber', 'completionDate', 'requiredDocuments',
}
ADMINISTRATIVE_ENUMS = {
    'dutyType': {
        'CORPORATE_FILING', 'PROPERTY_REGISTRATION', 'NOTARIAL_ACT',
        'PERMIT', 'COMPLIANCE', 'INHERITANCE', 'OTHER',
    },
    'priority': {'LOW', 'MEDIUM', 'HIGH', 'URGENT'},
}


def _parse_datetime(val: Any) -> datetime | None:
    """Parse ISO datetime string or datetime object. Uses stdlib only."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        s = val.replace('Z', '').strip().split('+')[0]
        try:
            return datetime.fromisoformat(s)
        except (ValueError, TypeError):
            pass
        pairs = [
            (s[:26], '%Y-%m-%dT%H:%M:%S.%f'),
            (s[:19], '%Y-%m-%dT%H:%M:%S'),
            (s[:19], '%Y-%m-%d %H:%M:%S'),
            (s[:10], '%Y-%m-%d'),
        ]
        for part, fmt in pairs:
            try:
                return datetime.strptime(part, fmt)
            except ValueError:
                continue
    return None


def _validate_enum(value: Any, allowed: set[str], field_name: str) -> None:
    if value is None or value == '':
        return
    if value not in allowed:
        raise ValidationError(
            _('%(field)s must be one of: %(choices)s') % {
                'field': field_name,
                'choices': ', '.join(sorted(allowed)),
            }
        )


def validate_consultation_data(data: dict) -> dict:
    """Validate CONSULTATION case_specific_data. Returns cleaned data."""
    if not isinstance(data, dict):
        raise ValidationError(_('case_specific_data must be an object for CONSULTATION cases.'))
    missing = CONSULTATION_REQUIRED - set(data.keys())
    if missing:
        raise ValidationError(
            _('CONSULTATION case requires: %(fields)s') % {'fields': ', '.join(sorted(missing))}
        )
    for field, allowed in CONSULTATION_ENUMS.items():
        if field in data and data[field] is not None:
            _validate_enum(data[field], allowed, field)
    return data


def validate_litigation_data(data: dict) -> dict:
    """Validate LITIGATION case_specific_data. Returns cleaned data."""
    if not isinstance(data, dict):
        raise ValidationError(_('case_specific_data must be an object for LITIGATION cases.'))
    missing = LITIGATION_REQUIRED - set(data.keys())
    if missing:
        raise ValidationError(
            _('LITIGATION case requires: %(fields)s') % {'fields': ', '.join(sorted(missing))}
        )
    for field, allowed in LITIGATION_ENUMS.items():
        if field in data and data[field] is not None:
            _validate_enum(data[field], allowed, field)
    # Validate date ordering: filingDate <= firstHearingDate <= nextHearingDate
    filing = _parse_datetime(data.get('filingDate'))
    first = _parse_datetime(data.get('firstHearingDate'))
    next_ = _parse_datetime(data.get('nextHearingDate'))
    if filing and first and filing > first:
        raise ValidationError(_('filingDate must be before or equal to firstHearingDate.'))
    if first and next_ and first > next_:
        raise ValidationError(_('firstHearingDate must be before or equal to nextHearingDate.'))
    return data


def validate_administrative_data(data: dict) -> dict:
    """Validate ADMINISTRATIVE case_specific_data. Returns cleaned data."""
    if not isinstance(data, dict):
        raise ValidationError(_('case_specific_data must be an object for ADMINISTRATIVE cases.'))
    missing = ADMINISTRATIVE_REQUIRED - set(data.keys())
    if missing:
        raise ValidationError(
            _('ADMINISTRATIVE case requires: %(fields)s') % {'fields': ', '.join(sorted(missing))}
        )
    for field, allowed in ADMINISTRATIVE_ENUMS.items():
        if field in data and data[field] is not None:
            _validate_enum(data[field], allowed, field)
    # startDate <= dueDate; completionDate if present >= startDate
    start = _parse_datetime(data.get('startDate'))
    due = _parse_datetime(data.get('dueDate'))
    completion = _parse_datetime(data.get('completionDate'))
    if start and due and start > due:
        raise ValidationError(_('startDate must be before or equal to dueDate.'))
    if completion and start and completion < start:
        raise ValidationError(_('completionDate must be on or after startDate.'))
    return data


def validate_case_specific_data(case_type: str, data: dict) -> dict:
    """Route validation to the correct validator based on case_type."""
    if case_type not in CASE_TYPES:
        raise ValidationError(_('caseType must be one of: CONSULTATION, LITIGATION, ADMINISTRATIVE.'))
    if case_type == 'CONSULTATION':
        return validate_consultation_data(data or {})
    if case_type == 'LITIGATION':
        return validate_litigation_data(data or {})
    if case_type == 'ADMINISTRATIVE':
        return validate_administrative_data(data or {})
    return data or {}
