"""
Deterministic legal deadline calculation engine.

Same inputs + same rule version ⇒ same result.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Iterable, Sequence

from dateutil.relativedelta import relativedelta

from .models import DeadlineRule, LegalHoliday


class CalculationError(ValueError):
    """Raised when a deadline cannot be calculated from the given inputs."""


@dataclass(frozen=True)
class CalculationResult:
    calculated_deadline: date
    explanation: dict[str, Any] = field(default_factory=dict)


def _default_weekend_days(rule: DeadlineRule) -> list[int]:
    weekends = rule.weekend_days
    if weekends is None or weekends == []:
        return [5, 6]  # Saturday, Sunday
    return list(weekends)


def holiday_dates(
    jurisdiction: str,
    date_from: date,
    date_to: date,
    *,
    holidays: Iterable[LegalHoliday] | None = None,
) -> set[date]:
    """Return legally relevant holiday dates in [date_from, date_to]."""
    if holidays is not None:
        return {
            h.date
            for h in holidays
            if h.is_legally_relevant
            and h.jurisdiction == jurisdiction
            and date_from <= h.date <= date_to
        }
    qs = LegalHoliday.objects.filter(
        jurisdiction=jurisdiction,
        is_legally_relevant=True,
        date__gte=date_from,
        date__lte=date_to,
    )
    return set(qs.values_list("date", flat=True))


def is_non_working_day(
    d: date,
    *,
    weekend_days: Sequence[int],
    holidays: set[date],
) -> bool:
    return d.weekday() in weekend_days or d in holidays


def next_working_day(
    d: date,
    *,
    weekend_days: Sequence[int],
    holidays: set[date],
    max_lookahead: int = 366,
) -> date:
    cursor = d
    for _ in range(max_lookahead):
        if not is_non_working_day(cursor, weekend_days=weekend_days, holidays=holidays):
            return cursor
        cursor += timedelta(days=1)
    raise CalculationError("Unable to find a working day within the lookahead window.")


def add_duration(base: date, value: int, unit: str) -> date:
    if value < 0:
        raise CalculationError("Duration must be non-negative.")
    if unit == DeadlineRule.DurationUnit.DAYS:
        return base + timedelta(days=value)
    if unit == DeadlineRule.DurationUnit.WEEKS:
        return base + timedelta(weeks=value)
    if unit == DeadlineRule.DurationUnit.MONTHS:
        return base + relativedelta(months=value)
    if unit == DeadlineRule.DurationUnit.YEARS:
        return base + relativedelta(years=value)
    raise CalculationError(f"Unsupported duration unit: {unit}")


def calculate_deadline(
    event_date: date,
    rule: DeadlineRule,
    *,
    contextual_parameters: dict[str, Any] | None = None,
    holidays: Iterable[LegalHoliday] | None = None,
) -> CalculationResult:
    """
    Compute a legal deadline from a triggering event date and a DeadlineRule.

    Computation methods:
    - DELAI_FRANC: exclude triggering day; count N full days; act due on the day
      after the Nth counted day (classic Moroccan/French délai franc). Then, if
      configured, prorogate when that day is a weekend/holiday.
    - CALENDAR_DAYS: event_date + duration (optionally excluding triggering day).
    - BUSINESS_DAYS: count only working days.
    """
    if not isinstance(event_date, date):
        raise CalculationError("event_date must be a date.")
    if rule.duration_value <= 0:
        raise CalculationError("Duration must be positive.")
    if rule.verification_status == DeadlineRule.VerificationStatus.INACTIVE:
        raise CalculationError("No verified rule is currently available for this procedure.")
    if rule.verification_status == DeadlineRule.VerificationStatus.REQUIRES_VERIFICATION:
        # Still allow calculation but flag uncertainty in explanation.
        uncertainty = True
    else:
        uncertainty = False

    if not rule.is_effective_on(event_date):
        raise CalculationError(
            "The selected legal rule is not effective on the triggering event date."
        )

    ctx = contextual_parameters or {}
    weekend_days = _default_weekend_days(rule)
    method = rule.computation_method
    steps: list[dict[str, Any]] = []

    # Broad holiday window for prorogation / business-day walks.
    window_end = add_duration(event_date, rule.duration_value + 60, DeadlineRule.DurationUnit.DAYS)
    holiday_set = holiday_dates(
        rule.jurisdiction,
        event_date,
        window_end,
        holidays=holidays,
    )

    if method == DeadlineRule.ComputationMethod.DELAI_FRANC:
        # Example (ADALA / Art. 602 doctrine): notification 1 Mar, 30 days → due 1 Apr.
        # Count starts the day after notification; after N counted days, deadline is next day.
        start = event_date + timedelta(days=1) if rule.exclude_triggering_day else event_date
        steps.append(
            {
                "step": "exclude_triggering_day" if rule.exclude_triggering_day else "include_triggering_day",
                "detail": f"Counting starts on {start.isoformat()}.",
            }
        )
        nth_day = add_duration(start, rule.duration_value - 1, rule.duration_unit)
        # Last counted day does not expire the right; party has until end of the following day.
        provisional = nth_day + timedelta(days=1)
        steps.append(
            {
                "step": "apply_delai_franc_duration",
                "detail": (
                    f"Counted {rule.duration_value} {rule.duration_unit} "
                    f"(nth day {nth_day.isoformat()}); délai franc expires on {provisional.isoformat()}."
                ),
            }
        )
    elif method == DeadlineRule.ComputationMethod.CALENDAR_DAYS:
        if rule.exclude_triggering_day:
            start = event_date + timedelta(days=1)
            provisional = add_duration(start, rule.duration_value, rule.duration_unit)
        else:
            provisional = add_duration(event_date, rule.duration_value, rule.duration_unit)
        steps.append(
            {
                "step": "apply_calendar_duration",
                "detail": f"Provisional deadline {provisional.isoformat()}.",
            }
        )
    elif method == DeadlineRule.ComputationMethod.BUSINESS_DAYS:
        if rule.duration_unit != DeadlineRule.DurationUnit.DAYS:
            raise CalculationError("Business-day computation currently supports days only.")
        counted = 0
        cursor = event_date
        guard = 0
        # Always advance at least one calendar day when excluding the triggering day.
        while counted < rule.duration_value:
            cursor += timedelta(days=1)
            guard += 1
            if guard > 2000:
                raise CalculationError("Business-day walk exceeded safety limit.")
            if not is_non_working_day(cursor, weekend_days=weekend_days, holidays=holiday_set):
                counted += 1
        if not rule.exclude_triggering_day:
            # Include triggering day if it is a working day by recounting from event_date inclusive.
            counted = 0
            cursor = event_date - timedelta(days=1)
            guard = 0
            while counted < rule.duration_value:
                cursor += timedelta(days=1)
                guard += 1
                if guard > 2000:
                    raise CalculationError("Business-day walk exceeded safety limit.")
                if not is_non_working_day(cursor, weekend_days=weekend_days, holidays=holiday_set):
                    counted += 1
        provisional = cursor
        steps.append(
            {
                "step": "apply_business_days",
                "detail": f"Counted {rule.duration_value} business days → {provisional.isoformat()}.",
            }
        )
    else:
        raise CalculationError(f"Unsupported computation method: {method}")

    final = provisional
    non_working_adjustment = None
    if rule.adjust_non_working_final_day and is_non_working_day(
        provisional, weekend_days=weekend_days, holidays=holiday_set
    ):
        final = next_working_day(
            provisional + timedelta(days=1),
            weekend_days=weekend_days,
            holidays=holiday_set,
        )
        # If provisional itself is non-working, move to next working day (inclusive start).
        final = next_working_day(
            provisional,
            weekend_days=weekend_days,
            holidays=holiday_set,
        )
        non_working_adjustment = {
            "original": provisional.isoformat(),
            "adjusted_to": final.isoformat(),
            "reason": "Final day fell on a weekend or legally relevant holiday; prorogated to next working day.",
        }
        steps.append({"step": "non_working_day_adjustment", "detail": non_working_adjustment["reason"]})

    source_label = None
    if rule.source_id:
        source_label = (
            f"{rule.source.law_number}"
            + (f", {rule.article_reference}" if rule.article_reference else "")
        )
    elif rule.article_reference:
        source_label = rule.article_reference

    explanation = {
        "starting_event_date": event_date.isoformat(),
        "starting_event_type": rule.event_type,
        "applicable_rule": rule.name,
        "rule_code": rule.code,
        "rule_version": rule.version,
        "legal_duration": f"{rule.duration_value} {rule.duration_unit}",
        "duration_value": rule.duration_value,
        "duration_unit": rule.duration_unit,
        "computation_method": method,
        "computation_method_label": rule.get_computation_method_display(),
        "non_working_day_adjustment": non_working_adjustment,
        "final_deadline": final.isoformat(),
        "legal_source": source_label,
        "article_reference": rule.article_reference,
        "jurisdiction": rule.jurisdiction,
        "legal_domain": rule.legal_domain,
        "special_conditions": rule.special_conditions or None,
        "uncertainty": uncertainty,
        "uncertainty_message": (
            "Additional legal verification may be required."
            if uncertainty
            else None
        ),
        "steps": steps,
        "contextual_parameters": ctx,
        "disclaimer": (
            "JURE calculates deadlines based on the selected legal rule and information "
            "provided. The result should be verified against the applicable legislation "
            "and the specific circumstances of the matter."
        ),
    }
    return CalculationResult(calculated_deadline=final, explanation=explanation)


def resolve_active_rule(
    *,
    jurisdiction: str = "MA",
    legal_domain: str,
    procedure_type: str,
    event_type: str | None = None,
    as_of: date,
    require_verified: bool = True,
) -> DeadlineRule:
    """
    Pick the DeadlineRule effective on `as_of` for the given procedure.
    Prefer VERIFIED rules; fall back to REQUIRES_VERIFICATION only if allowed.
    """
    qs = DeadlineRule.objects.filter(
        jurisdiction=jurisdiction,
        legal_domain=legal_domain,
        procedure_type=procedure_type,
        active=True,
        effective_from__lte=as_of,
    ).filter(
        models_q_effective_until(as_of)
    ).select_related("source").order_by("-effective_from", "-id")

    if event_type:
        qs = qs.filter(event_type=event_type)

    rules = list(qs)
    if not rules:
        raise CalculationError("No verified rule is currently available for this procedure.")

    verified = [r for r in rules if r.verification_status == DeadlineRule.VerificationStatus.VERIFIED]
    if verified:
        return verified[0]
    if require_verified:
        raise CalculationError("No verified rule is currently available for this procedure.")
    pending = [
        r
        for r in rules
        if r.verification_status == DeadlineRule.VerificationStatus.REQUIRES_VERIFICATION
    ]
    if pending:
        return pending[0]
    raise CalculationError("No verified rule is currently available for this procedure.")


def models_q_effective_until(as_of: date):
    from django.db.models import Q

    return Q(effective_until__isnull=True) | Q(effective_until__gte=as_of)
