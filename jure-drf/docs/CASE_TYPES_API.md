# Case Types API Reference

The case management backend supports three distinct case types with specialized sub-fields stored in `case_specific_data`.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/cases/` | Create case (accepts `caseType` + matching `case_specific_data`) |
| GET | `/api/v1/cases/` | List cases (filter by `caseType`, `status`, `assignedTo`) |
| GET | `/api/v1/cases/:id/` | Get single case with all sub-fields |
| PUT/PATCH | `/api/v1/cases/:id/` | Update any field including sub-fields |
| DELETE | `/api/v1/cases/:id/` | Delete case |
| POST | `/api/v1/cases/:id/convert/` | Convert CONSULTATION to LITIGATION or ADMINISTRATIVE case |

### Query Parameters (List)

- `caseType` — CONSULTATION | LITIGATION | ADMINISTRATIVE
- `status` — OPEN | CLOSED | IN_PROGRESS | CANCELLED | PENDING | ARCHIVED | CONVERTED_TO_CASE
- `assignedTo` — User ID (or `assigned_to`)

## Case Type: CONSULTATION

```json
{
  "caseType": "CONSULTATION",
  "case_specific_data": {
    "consultationType": "INITIAL | FOLLOW_UP | URGENT",
    "legalDomain": "FAMILY | CRIMINAL | CORPORATE | LABOR | REAL_ESTATE | OTHER",
    "consultationDate": "2025-03-22T10:00:00Z",
    "duration": "30min",
    "format": "IN_PERSON | PHONE | VIDEO",
    "legalQuestion": "string",
    "adviceSummary": "string",
    "followUpRequired": true,
    "followUpDate": "2025-04-01T10:00:00Z",
    "outcome": "SCHEDULED | COMPLETED | NO_SHOW | CONVERTED_TO_CASE"
  }
}
```

Required: `consultationType`, `legalDomain`, `consultationDate`, `duration`, `format`, `legalQuestion`, `adviceSummary`, `followUpRequired`, `outcome`  
Optional: `followUpDate`

## Case Type: LITIGATION

```json
{
  "caseType": "LITIGATION",
  "case_specific_data": {
    "litigationType": "CIVIL | CRIMINAL | COMMERCIAL | ADMINISTRATIVE | LABOR | FAMILY",
    "clientRole": "PLAINTIFF | DEFENDANT",
    "opposingParty": "string",
    "opposingCounsel": "string",
    "thirdParties": ["witness1", "expert1"],
    "courtName": "string",
    "jurisdiction": "string",
    "chamber": "string",
    "judgeName": "string",
    "courtCaseNumber": "string",
    "coCounsel": ["counsel1"],
    "filingDate": "2025-01-15",
    "firstHearingDate": "2025-02-20",
    "nextHearingDate": "2025-04-10",
    "statuteOfLimitationsDate": "2026-01-15",
    "keyDeadlines": [{"label": "Discovery", "date": "2025-03-01"}],
    "legalArguments": "string",
    "priority": "LOW | MEDIUM | HIGH | URGENT"
  }
}
```

Required: `litigationType`, `clientRole`, `opposingParty`, `courtName`, `jurisdiction`, `courtCaseNumber`, `filingDate`, `firstHearingDate`, `nextHearingDate`, `statuteOfLimitationsDate`, `legalArguments`, `priority`  
Date rule: `filingDate` ≤ `firstHearingDate` ≤ `nextHearingDate`

## Case Type: ADMINISTRATIVE

```json
{
  "caseType": "ADMINISTRATIVE",
  "case_specific_data": {
    "dutyType": "CORPORATE_FILING | PROPERTY_REGISTRATION | NOTARIAL_ACT | PERMIT | COMPLIANCE | INHERITANCE | OTHER",
    "institution": "string",
    "institutionRefNumber": "string",
    "startDate": "2025-01-01",
    "dueDate": "2025-06-30",
    "completionDate": "2025-05-15",
    "requiredDocuments": [{"label": "ID", "completed": true}],
    "priority": "LOW | MEDIUM | HIGH | URGENT"
  }
}
```

Required: `dutyType`, `institution`, `startDate`, `dueDate`, `priority`  
Optional: `institutionRefNumber`, `completionDate`, `requiredDocuments`  
Date rule: `startDate` ≤ `dueDate`; `completionDate` ≥ `startDate`

## Consultation Conversion

**Endpoint:** `POST /api/v1/cases/:id/convert/`  
**Purpose:** Convert a CONSULTATION case that is "ready to convert" into a new LITIGATION or ADMINISTRATIVE case.

### Ready-to-convert (single source of truth)

A consultation is considered ready to convert when **any** of the following is true:

- `Case.status` == `"CONVERTED_TO_CASE"`
- `case_specific_data.outcome` == `"CONVERTED_TO_CASE"` (supports `outcome` or `Outcome`)
- `case_specific_data.status` == `"CONVERTED_TO_CASE"` (supports `status` or `Status`)

**Legacy compatibility:** Older clients may store `outcome: CONVERTED_TO_CASE` in `case_specific_data` while leaving `Case.status` as `IN_PROGRESS`. The backend accepts both. We recommend persisting `CONVERTED_TO_CASE` on `Case.status` when the user sets "convert to case" and keeping nested fields in sync for consistency.

### Request body

```json
{
  "targetType": "LITIGATION | ADMINISTRATIVE",
  "litigationType": "...",
  "clientRole": "..."
}
```

### Response

**201:** `{ "success": true, "newCase": {...}, "originalConsultation": {...} }`

### Error responses

| Code | `code` | Description |
|------|--------|-------------|
| 400 | `wrong_case_type` | Source is not a CONSULTATION |
| 400 | `not_ready_to_convert` | None of status/outcome/case_specific_data.status is CONVERTED_TO_CASE. Response includes `fields_checked`, `status`, `case_specific_data` for debugging |
| 400 | `target_type_required` | Missing `targetType` |
| 400 | `invalid_target_type` | `targetType` is not LITIGATION or ADMINISTRATIVE |
| 404 | — | Case not found or not in user's cabinet |
| 409 | `already_converted` | `convertedToCase` is already set. Includes `converted_to_case_id`, `converted_to_case_reference` |

---

## Backward Compatibility

- Existing cases default to `caseType: LITIGATION` with empty `case_specific_data`.
- Create requests without `caseType` default to LITIGATION.
- Empty `case_specific_data` skips validation; full sub-fields are required only when sending non-empty data.
