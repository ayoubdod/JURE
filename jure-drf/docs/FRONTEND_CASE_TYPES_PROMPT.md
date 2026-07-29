# Frontend alignment prompt – Case management (3 case types)

**Copy the prompt below and paste it into Cursor (frontend project) or share with the frontend team.**

---

## Short copy-paste prompt (case type first)

```
Case creation: the FIRST step must be choosing the case type (CONSULTATION | LITIGATION | ADMINISTRATIVE). The selected type MUST be sent as caseType or case_type in the POST body when creating a case. If omitted, the backend stores LITIGATION and consultation/administrative cases show as litigation cards. POST /api/v1/cases/ with JSON body including caseType.
```

---

## Full copy-paste prompt

```
Case creation flow: the FIRST step is choosing the case type. Fix the frontend so case type is selected first and included in the API payload.

══════════════════════════════════════════════════════════════════
1. CASE CREATION FLOW (type selection first)
══════════════════════════════════════════════════════════════════
Step 1: User selects case type → CONSULTATION | LITIGATION | ADMINISTRATIVE
Step 2: Show type-specific form (fields change based on selection)
Step 3: On submit, ALWAYS include caseType (or case_type) in the POST body

CRITICAL: If caseType is omitted from the create payload, the backend stores LITIGATION by default. Consultation and administrative cases will then appear as litigation cards in the list.

══════════════════════════════════════════════════════════════════
2. API BASE & AUTH
══════════════════════════════════════════════════════════════════
- Base URL: `${API_BASE}/api/v1/cases/` (include /api/v1/)
- Auth: Bearer token in header: Authorization: Bearer <token>
- Content-Type: application/json for all POST/PUT/PATCH

══════════════════════════════════════════════════════════════════
3. ENDPOINTS (use these URLs exactly — no double "cases")
══════════════════════════════════════════════════════════════════
POST   /api/v1/cases/           Create case (NOT /api/v1/cases/cases/)
GET    /api/v1/cases/           List cases (supports filters)
GET    /api/v1/cases/:id/       Get single case with all sub-fields
PUT    /api/v1/cases/:id/       Full update
PATCH  /api/v1/cases/:id/       Partial update
DELETE /api/v1/cases/:id/       Delete case

══════════════════════════════════════════════════════════════════
4. LIST FILTERS (query params)
══════════════════════════════════════════════════════════════════
?caseType=LITIGATION        CONSULTATION | LITIGATION | ADMINISTRATIVE
?status=OPEN               OPEN | CLOSED | IN_PROGRESS | CANCELLED | PENDING | ARCHIVED
?assignedTo=42             User ID (or assigned_to)
?search=keyword            Searches title, description

Example: GET /api/v1/cases/?caseType=CONSULTATION&status=OPEN

══════════════════════════════════════════════════════════════════
5. RESPONSE STRUCTURE (list & detail)
══════════════════════════════════════════════════════════════════
Each case includes:
- id, reference, title, court, description, summary, status, category
- caseType: "CONSULTATION" | "LITIGATION" | "ADMINISTRATIVE"
- case_specific_data: { ... } (type-specific sub-fields)
- client: { id, email, first_name, last_name, ... } (relatedClient)
- assigned_to: { id, email, first_name, last_name, ... }
- assigned_to_id: (write-only, for create/update)
- created_by: { id, first_name, last_name, email, ... } (user who created the case)
- created: ISO 8601 datetime
- updated_at: ISO 8601 datetime (last modification)
- updated_by: { id, first_name, last_name, email, ... } (user who last saved)
- cabinet

══════════════════════════════════════════════════════════════════
6. CREATE CASE – Base fields (all types)
══════════════════════════════════════════════════════════════════
IMPORTANT: Always include caseType or case_type in the create payload.
If omitted, backend defaults to LITIGATION and the UI will show litigation cards.

{
  "title": "string (required)",
  "description": "string (required)",
  "court": "string (required)",
  "reference": "string (optional, auto-generated if empty)",
  "summary": "string (optional)",
  "status": "OPEN | CLOSED | IN_PROGRESS | CANCELLED | PENDING | ARCHIVED",
  "category": "CRIMINAL | CIVIL | ECONOMIC | ENVIRONMENTAL | SOCIAL | OTHER",
  "client": null,
  "assigned_to_id": null,
  "caseType": "CONSULTATION | LITIGATION | ADMINISTRATIVE",
  "case_specific_data": { ... }
}
Backend accepts both "caseType" (camelCase) and "case_type" (snake_case).

══════════════════════════════════════════════════════════════════
7. CONSULTATION – case_specific_data
══════════════════════════════════════════════════════════════════
When caseType = "CONSULTATION", send (all required except followUpDate):
{
  "consultationType": "INITIAL" | "FOLLOW_UP" | "URGENT",
  "legalDomain": "FAMILY" | "CRIMINAL" | "CORPORATE" | "LABOR" | "REAL_ESTATE" | "OTHER",
  "consultationDate": "2025-03-22T10:00:00Z",
  "duration": "30min",
  "format": "IN_PERSON" | "PHONE" | "VIDEO",
  "legalQuestion": "string",
  "adviceSummary": "string",
  "followUpRequired": true,
  "followUpDate": "2025-04-01T10:00:00Z",
  "outcome": "SCHEDULED" | "COMPLETED" | "NO_SHOW" | "CONVERTED_TO_CASE"
}

══════════════════════════════════════════════════════════════════
8. LITIGATION – case_specific_data
══════════════════════════════════════════════════════════════════
When caseType = "LITIGATION", send (required + optional):
{
  "litigationType": "CIVIL" | "CRIMINAL" | "COMMERCIAL" | "ADMINISTRATIVE" | "LABOR" | "FAMILY",
  "clientRole": "PLAINTIFF" | "DEFENDANT",
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
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT"
}
Date rule: filingDate ≤ firstHearingDate ≤ nextHearingDate

══════════════════════════════════════════════════════════════════
9. ADMINISTRATIVE – case_specific_data
══════════════════════════════════════════════════════════════════
When caseType = "ADMINISTRATIVE", send (required + optional):
{
  "dutyType": "CORPORATE_FILING" | "PROPERTY_REGISTRATION" | "NOTARIAL_ACT" | "PERMIT" | "COMPLIANCE" | "INHERITANCE" | "OTHER",
  "institution": "string",
  "institutionRefNumber": "string",
  "startDate": "2025-01-01",
  "dueDate": "2025-06-30",
  "completionDate": "2025-05-15",
  "requiredDocuments": [{"label": "ID", "completed": true}],
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT"
}
Date rule: startDate ≤ dueDate; completionDate ≥ startDate

══════════════════════════════════════════════════════════════════
10. UPDATE (PUT/PATCH)
══════════════════════════════════════════════════════════════════
- PUT: Send full object; PATCH: Send only changed fields
- Updating case_specific_data: send the full object (merges/replaces)
- Changing caseType: also send matching case_specific_data for new type
- assigned_to_id: set to user ID or null to unassign

══════════════════════════════════════════════════════════════════
11. VALIDATION ERRORS (400)
══════════════════════════════════════════════════════════════════
Backend returns 400 with body like:
{
  "caseType": ["caseType must be one of: ..."],
  "case_specific_data": ["CONSULTATION case requires: consultationType, legalDomain, ..."],
  "filingDate": ["..."]
}
Display field-level errors under each form field. Show case_specific_data errors at top of form or in sub-form.

══════════════════════════════════════════════════════════════════
12. BACKWARD COMPATIBILITY
══════════════════════════════════════════════════════════════════
- Old cases may have caseType "LITIGATION" with empty case_specific_data
- Create without caseType defaults to LITIGATION
- Empty case_specific_data is valid (no validation); full sub-fields required only when sending non-empty data
- reference must be unique; client and assigned_to are optional

══════════════════════════════════════════════════════════════════
13. EXAMPLE: Create CONSULTATION case
══════════════════════════════════════════════════════════════════
const res = await fetch(`${API_BASE}/api/v1/cases/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Initial family consultation',
    description: 'Client seeking divorce advice',
    court: 'N/A',
    caseType: 'CONSULTATION',
    case_specific_data: {
      consultationType: 'INITIAL',
      legalDomain: 'FAMILY',
      consultationDate: '2025-03-22T10:00:00Z',
      duration: '1h',
      format: 'IN_PERSON',
      legalQuestion: 'Divorce proceedings',
      adviceSummary: 'Explained options',
      followUpRequired: true,
      followUpDate: '2025-04-01T10:00:00Z',
      outcome: 'SCHEDULED'
    }
  })
});
const case = await res.json();

══════════════════════════════════════════════════════════════════
14. EXAMPLE: List with filters
══════════════════════════════════════════════════════════════════
const params = new URLSearchParams({ caseType: 'LITIGATION', status: 'OPEN' });
const res = await fetch(`${API_BASE}/api/v1/cases/?${params}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { results } = await res.json();  // paginated

══════════════════════════════════════════════════════════════════
15. FRONTEND CHECKLIST
══════════════════════════════════════════════════════════════════
- [ ] Case form: FIRST step = type selector (CONSULTATION | LITIGATION | ADMINISTRATIVE)
- [ ] Sub-form fields change based on caseType (conditionally render)
- [ ] Create/Update sends caseType + case_specific_data
- [ ] List supports filters: caseType, status, assignedTo
- [ ] Detail view displays case_specific_data
- [ ] Error responses (400) shown per field
- [ ] client and assigned_to populated in response (nested objects)
```
