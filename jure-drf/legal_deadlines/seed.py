"""
Seed Morocco — Civil Procedure legal sources, verified rules, and holidays.

Legal governance notes
----------------------
- Dahir 1-74-447 (CPC 1974) remains applicable until 23 August 2026.
- Loi 58.25 (nouveau CPC), BO n° 7485 of 23 February 2026, enters into force
  on 24 August 2026 (art. 643).
- Only VERIFIED civil-procedure rules are activated for calculation.
- Rules that could not be confidently verified are seeded as inactive /
  requires_verification and are refused by the engine when require_verified=True.

Primary references used for MVP seeding (secondary commentary; verify against
official Bulletin Officiel text before production legal advice):
- CPC 1974 arts. 130 (opposition), 134 (appel), 358 (cassation)
- Loi 58.25 art. 602 (jours francs / délai franc computation)
- Harmonised appeal / opposition / cassation delays under Loi 58.25 as reported
  in professional doctrine (30 / 10 / 30 days from notification)
"""
from __future__ import annotations

from datetime import date

from .models import DeadlineRule, LegalHoliday, LegalSource

# Fixed Moroccan national holidays (Gregorian). Islamic/movable holidays must
# be updated annually — architecture supports them via LegalHoliday rows.
FIXED_HOLIDAYS = [
    (1, 1, "Nouvel An"),
    (1, 11, "Manifeste de l'Indépendance"),
    (5, 1, "Fête du Travail"),
    (7, 30, "Fête du Trône"),
    (8, 14, "Anniversaire de la Récupération de Oued Ed-Dahab"),
    (8, 20, "Révolution du Roi et du Peuple"),
    (8, 21, "Fête de la Jeunesse"),
    (11, 6, "Anniversaire de la Marche Verte"),
    (11, 18, "Fête de l'Indépendance"),
]


def seed_legal_sources() -> dict[str, LegalSource]:
    cpc_1974, _ = LegalSource.objects.update_or_create(
        jurisdiction="MA",
        law_number="1-74-447",
        defaults={
            "code_name": "Code de procédure civile",
            "title": "Dahir portant loi n° 1-74-447 du 28 septembre 1974 formant Code de procédure civile",
            "publication_date": date(1974, 9, 30),
            "effective_from": date(1974, 10, 1),
            "effective_until": date(2026, 8, 23),
            "official_reference": "Dahir 1-74-447",
            "status": LegalSource.Status.IN_FORCE,  # until 23 Aug 2026
            "notes": (
                "Legacy CPC. Remains applicable until the day before Loi 58.25 "
                "enters into force (24 August 2026)."
            ),
        },
    )
    # After 24 Aug 2026 this source is repealed — status is date-dependent in queries.
    loi_58_25, _ = LegalSource.objects.update_or_create(
        jurisdiction="MA",
        law_number="58.25",
        defaults={
            "code_name": "Code de procédure civile",
            "title": "Loi n° 58.25 relative au Code de procédure civile",
            "publication_date": date(2026, 2, 23),
            "effective_from": date(2026, 8, 24),
            "effective_until": None,
            "official_reference": "Bulletin Officiel n° 7485 du 23 février 2026",
            "status": LegalSource.Status.PENDING,
            "notes": (
                "Nouveau CPC. Entrée en vigueur le 24 août 2026 (art. 643). "
                "Article 602: délais en jours francs (أيام كاملة)."
            ),
        },
    )
    today = date.today()
    if loi_58_25.is_effective_on(today):
        loi_58_25.status = LegalSource.Status.IN_FORCE
        loi_58_25.save(update_fields=["status"])
        cpc_1974.status = LegalSource.Status.REPEALED
        cpc_1974.save(update_fields=["status"])
    return {"cpc_1974": cpc_1974, "loi_58_25": loi_58_25}


def _rule_defaults(**extra):
    base = {
        "jurisdiction": "MA",
        "legal_domain": DeadlineRule.LegalDomain.CIVIL_PROCEDURE,
        "event_type": DeadlineRule.EventType.NOTIFICATION,
        "duration_unit": DeadlineRule.DurationUnit.DAYS,
        "computation_method": DeadlineRule.ComputationMethod.DELAI_FRANC,
        "exclude_triggering_day": True,
        "adjust_non_working_final_day": True,
        "weekend_days": [5, 6],
        "active": True,
        "verification_status": DeadlineRule.VerificationStatus.VERIFIED,
    }
    base.update(extra)
    return base


def seed_civil_procedure_rules(sources: dict[str, LegalSource] | None = None) -> list[DeadlineRule]:
    sources = sources or seed_legal_sources()
    cpc = sources["cpc_1974"]
    loi = sources["loi_58_25"]
    created: list[DeadlineRule] = []

    specs = [
        # --- CPC 1974 (effective until 2026-08-23) ---
        _rule_defaults(
            code="MA_CIVIL_APPEAL",
            name="Appel — procédure civile (CPC 1974)",
            procedure_type=DeadlineRule.ProcedureType.APPEAL,
            duration_value=30,
            source=cpc,
            article_reference="Art. 134 CPC",
            version="1974.1",
            effective_from=date(1974, 10, 1),
            effective_until=date(2026, 8, 23),
            notes="Délai d'appel de 30 jours à compter de la notification du jugement (matière civile).",
            special_conditions=(
                "Ne couvre pas les délais spéciaux (ex. affaires familiales 15 jours). "
                "Vérifier le régime applicable au litige."
            ),
        ),
        _rule_defaults(
            code="MA_CIVIL_OPPOSITION",
            name="Opposition — jugement par défaut (CPC 1974)",
            procedure_type=DeadlineRule.ProcedureType.OPPOSITION,
            duration_value=10,
            source=cpc,
            article_reference="Art. 130 CPC",
            version="1974.1",
            effective_from=date(1974, 10, 1),
            effective_until=date(2026, 8, 23),
            notes="Opposition contre jugement rendu par défaut: 10 jours à compter de la notification.",
        ),
        _rule_defaults(
            code="MA_CIVIL_CASSATION",
            name="Pourvoi en cassation (CPC 1974)",
            procedure_type=DeadlineRule.ProcedureType.CASSATION,
            duration_value=30,
            source=cpc,
            article_reference="Art. 358 CPC",
            version="1974.1",
            effective_from=date(1974, 10, 1),
            effective_until=date(2026, 8, 23),
            notes="Pourvoi en cassation: 30 jours à compter de la notification de la décision en dernier ressort.",
        ),
        # --- Loi 58.25 (effective from 2026-08-24) ---
        _rule_defaults(
            code="MA_CIVIL_APPEAL",
            name="Appel — procédure civile (Loi 58.25)",
            procedure_type=DeadlineRule.ProcedureType.APPEAL,
            duration_value=30,
            source=loi,
            article_reference="Art. 604 Loi 58.25 (délai unifié); calcul Art. 602",
            version="2026.1",
            effective_from=date(2026, 8, 24),
            effective_until=None,
            notes=(
                "Délai d'appel unifié de 30 jours à compter de la notification. "
                "Calcul en jours francs (Art. 602)."
            ),
            special_conditions=(
                "Exceptions possibles (ex. ordonnances de référé / régimes spéciaux). "
                "Vérifier le texte officiel et le type de décision."
            ),
        ),
        _rule_defaults(
            code="MA_CIVIL_OPPOSITION",
            name="Opposition — jugement par défaut (Loi 58.25)",
            procedure_type=DeadlineRule.ProcedureType.OPPOSITION,
            duration_value=10,
            source=loi,
            article_reference="Loi 58.25 — opposition; calcul Art. 602",
            version="2026.1",
            effective_from=date(2026, 8, 24),
            effective_until=None,
            notes="Opposition: 10 jours à compter de la notification du jugement par défaut.",
        ),
        _rule_defaults(
            code="MA_CIVIL_CASSATION",
            name="Pourvoi en cassation (Loi 58.25)",
            procedure_type=DeadlineRule.ProcedureType.CASSATION,
            duration_value=30,
            source=loi,
            article_reference="Loi 58.25 — pourvoi; calcul Art. 602",
            version="2026.1",
            effective_from=date(2026, 8, 24),
            effective_until=None,
            notes="Pourvoi en cassation: 30 jours à compter de la notification de la décision en dernier ressort.",
        ),
        # --- Not confidently verified for MVP: seeded inactive ---
        _rule_defaults(
            code="MA_CIVIL_REFERE_APPEAL",
            name="Appel d'ordonnance de référé (requires verification)",
            procedure_type=DeadlineRule.ProcedureType.REFERE,
            duration_value=15,
            source=loi,
            article_reference="Requires verification against official text",
            version="2026.1-unverified",
            effective_from=date(2026, 8, 24),
            effective_until=None,
            active=False,
            verification_status=DeadlineRule.VerificationStatus.REQUIRES_VERIFICATION,
            notes="Requires legal verification — not activated for MVP calculations.",
        ),
    ]

    for spec in specs:
        obj, _ = DeadlineRule.objects.update_or_create(
            code=spec["code"],
            version=spec["version"],
            jurisdiction=spec["jurisdiction"],
            defaults={k: v for k, v in spec.items() if k not in ("code", "version", "jurisdiction")},
        )
        created.append(obj)
    return created


def seed_morocco_holidays(years: list[int] | None = None) -> list[LegalHoliday]:
    years = years or [2025, 2026, 2027]
    created: list[LegalHoliday] = []
    for year in years:
        for month, day, name in FIXED_HOLIDAYS:
            obj, _ = LegalHoliday.objects.update_or_create(
                jurisdiction="MA",
                date=date(year, month, day),
                name=name,
                defaults={
                    "year": year,
                    "holiday_type": LegalHoliday.HolidayType.FIXED,
                    "is_legally_relevant": True,
                    "notes": "Fixed Gregorian national holiday.",
                },
            )
            created.append(obj)
        # Placeholder note for movable religious holidays (annual update required).
        note_name = "Jours fériés religieux (Aïd / Mawlid) — mise à jour annuelle requise"
        # Do not invent specific Islamic dates; store a marker row on Jan 2 as documentation only,
        # marked not legally relevant so it never affects computation.
        obj, _ = LegalHoliday.objects.update_or_create(
            jurisdiction="MA",
            date=date(year, 1, 2),
            name=note_name,
            defaults={
                "year": year,
                "holiday_type": LegalHoliday.HolidayType.MOVABLE_RELIGIOUS,
                "is_legally_relevant": False,
                "notes": (
                    "Architecture placeholder. Insert actual Aïd al-Fitr, Aïd al-Adha, "
                    "1er Moharram, Mawlid dates each year when officially published."
                ),
            },
        )
        created.append(obj)
    return created


def seed_all() -> dict:
    sources = seed_legal_sources()
    rules = seed_civil_procedure_rules(sources)
    holidays = seed_morocco_holidays()
    return {"sources": sources, "rules": rules, "holidays": holidays}
