# cases/constants.py
"""Request keys and field sets for case conversion and related APIs."""

# Optional body keys merged into case_specific_data when converting a consultation.
LITIGATION_CONVERSION_FIELD_KEYS = frozenset(
    {
        "litigationType",
        "clientRole",
        "opposingParty",
        "opposingCounsel",
        "thirdParties",
        "courtName",
        "jurisdiction",
        "chamber",
        "judgeName",
        "courtCaseNumber",
        "coCounsel",
        "filingDate",
        "firstHearingDate",
        "nextHearingDate",
        "statuteOfLimitationsDate",
        "keyDeadlines",
        "legalArguments",
        "priority",
    }
)

ADMINISTRATIVE_CONVERSION_FIELD_KEYS = frozenset(
    {
        "dutyType",
        "institution",
        "institutionRefNumber",
        "startDate",
        "dueDate",
        "completionDate",
        "requiredDocuments",
        "priority",
    }
)
