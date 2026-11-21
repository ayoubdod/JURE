"""Commercial catalogue data. Database rows are the runtime source of truth.

The seed command and the data migration both read this module. It must not
import Django models.
"""

from __future__ import annotations

TRIAL_DAYS = 14
TRIAL_CREDITS = 100
TRIAL_MAX_USERS = 2
VAT_RATE = "0.20"
CURRENCY = "MAD"

GB = 1024 ** 3

SHARED_FEATURES = [
    "workspace.cases",
    "workspace.clients",
    "workspace.tasks",
    "workspace.calendar",
    "workspace.documents",
    "workspace.notifications",
    "workspace.basic_finance",
    "juria.chat",
    "juria.research",
    "juria.drafting",
]

PLANS = [
    {
        "code": "solo",
        "name": "Solo",
        "description": "Independent lawyers and small practices.",
        "monthly_price": "399.00",
        "annual_price": "4068.00",
        "currency": CURRENCY,
        "maximum_users": 2,
        "storage_bytes": 2 * GB,
        "monthly_juria_credits": 100,
        "is_active": True,
        "is_public": True,
        "is_self_serve": True,
        "is_recommended": False,
        "display_order": 10,
        "feature_entitlements": SHARED_FEATURES,
    },
    {
        "code": "cabinet",
        "name": "Cabinet",
        "description": "Small and medium law firms.",
        "monthly_price": "999.00",
        "annual_price": "10188.00",
        "currency": CURRENCY,
        "maximum_users": 5,
        "storage_bytes": 10 * GB,
        "monthly_juria_credits": 500,
        "is_active": True,
        "is_public": True,
        "is_self_serve": True,
        "is_recommended": True,
        "display_order": 20,
        "feature_entitlements": SHARED_FEATURES
        + [
            "workspace.team",
            "workspace.rbac",
            "workspace.advanced_finance",
        ],
    },
    {
        "code": "business",
        "name": "Business",
        "description": "Established law firms and corporate legal departments.",
        "monthly_price": "1999.00",
        "annual_price": "20388.00",
        "currency": CURRENCY,
        "maximum_users": 15,
        "storage_bytes": 50 * GB,
        "monthly_juria_credits": 1500,
        "is_active": True,
        "is_public": True,
        "is_self_serve": True,
        "is_recommended": False,
        "display_order": 30,
        "feature_entitlements": SHARED_FEATURES
        + [
            "workspace.team",
            "workspace.rbac",
            "workspace.advanced_finance",
            "workspace.advanced_reporting",
        ],
    },
    {
        "code": "enterprise",
        "name": "Enterprise",
        "description": "Large firms, groups and institutions. Priced on quotation.",
        "monthly_price": None,
        "annual_price": None,
        "currency": CURRENCY,
        "maximum_users": None,
        "storage_bytes": None,
        "monthly_juria_credits": None,
        "is_active": True,
        "is_public": True,
        "is_self_serve": False,
        "is_recommended": False,
        "display_order": 40,
        "feature_entitlements": ["enterprise.custom"],
    },
]

# Adjustable operation weights. These are metering units, not token prices.
TARIFFS = [
    {"operation": "legal_question", "credits": 1},
    {"operation": "legal_research", "credits": 3},
    {"operation": "legal_drafting", "credits": 5},
    {"operation": "document_summary", "credits": 3},
    {"operation": "document_analysis", "credits": 5},
    {"operation": "contract_analysis", "credits": 8},
    {"operation": "complex_analysis", "credits": 15},
]

MODE_TO_OPERATION = {
    "CHAT": "legal_question",
    "LEGAL_RESEARCH": "legal_research",
    "DOCUMENT_DRAFTING": "legal_drafting",
    "CONTRACT_ANALYSIS": "contract_analysis",
}
