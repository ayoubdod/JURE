"""Litigation case_specific_data validation: court hierarchy and legacy compatibility."""
from django.core.exceptions import ValidationError
from django.test import TestCase

from cases.validators import validate_litigation_data


def _base_litigation(**overrides):
    data = {
        "litigationType": "CIVIL",
        "clientRole": "PLAINTIFF",
        "opposingParty": "Acme",
        "courtName": "Tribunal de première instance",
        "jurisdiction": "FIRST_INSTANCE",
        "courtCaseNumber": "2026/1234",
        "filingDate": "2026-01-10",
        "firstHearingDate": "2026-02-10",
        "nextHearingDate": "2026-03-10",
        "statuteOfLimitationsDate": "2027-01-10",
        "legalArguments": "Art. 1",
        "priority": "MEDIUM",
        "courtSpecialty": "NORMAL",
        "chamber": "CIVIL",
        "city": "Casablanca",
    }
    data.update(overrides)
    return data


class LitigationCourtValidationTest(TestCase):
    def test_valid_first_instance_payload(self):
        cleaned = validate_litigation_data(_base_litigation())
        self.assertEqual(cleaned["jurisdiction"], "FIRST_INSTANCE")
        self.assertEqual(cleaned["chamber"], "CIVIL")
        self.assertEqual(cleaned["courtSpecialty"], "NORMAL")
        self.assertEqual(cleaned["city"], "Casablanca")

    def test_new_style_requires_court_specialty(self):
        data = _base_litigation()
        data.pop("courtSpecialty")
        with self.assertRaises(ValidationError) as ctx:
            validate_litigation_data(data)
        self.assertIn("courtSpecialty", ctx.exception.message_dict)

    def test_invalid_chamber_for_jurisdiction_is_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_litigation_data(
                _base_litigation(jurisdiction="CASSATION", chamber="LOCAL_JUSTICE")
            )
        self.assertIn("chamber", ctx.exception.message_dict)

    def test_appeal_chamber_accepted(self):
        cleaned = validate_litigation_data(
            _base_litigation(jurisdiction="APPEAL", chamber="CRIMINAL_SERIOUS")
        )
        self.assertEqual(cleaned["chamber"], "CRIMINAL_SERIOUS")

    def test_legacy_city_jurisdiction_still_accepted(self):
        cleaned = validate_litigation_data(
            _base_litigation(
                jurisdiction="Casablanca",
                chamber="غرفة مدنية",
                courtSpecialty="",
            )
        )
        self.assertEqual(cleaned["jurisdiction"], "Casablanca")
        self.assertEqual(cleaned["chamber"], "غرفة مدنية")

    def test_legacy_free_text_chamber_with_new_jurisdiction_allowed(self):
        cleaned = validate_litigation_data(
            _base_litigation(jurisdiction="FIRST_INSTANCE", chamber="غرفة عقارية")
        )
        self.assertEqual(cleaned["chamber"], "غرفة عقارية")

    def test_court_name_is_optional(self):
        data = _base_litigation()
        data.pop("courtName")
        cleaned = validate_litigation_data(data)
        self.assertEqual(cleaned["courtSpecialty"], "NORMAL")

    def test_invalid_court_specialty_rejected(self):
        with self.assertRaises(ValidationError):
            validate_litigation_data(_base_litigation(courtSpecialty="CRIMINAL"))
