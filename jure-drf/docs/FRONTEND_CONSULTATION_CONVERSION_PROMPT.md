# Frontend alignment prompt – Consultation conversion to case

**Copy the prompt below and paste it into Cursor (frontend project) or share with the frontend team.**

---

## Short copy-paste prompt

```
Consultation conversion: When a CONSULTATION case has status CONVERTED_TO_CASE, allow the user to convert it to a LITIGATION or ADMINISTRATIVE case via POST /api/v1/cases/:id/convert with body { targetType: "LITIGATION" | "ADMINISTRATIVE", ...optional type-specific fields }. Display conversion links: convertedToCase and convertedFromCase on case detail.
```

---

## Full copy-paste prompt

```
Accept and implement the consultation-to-case conversion feature. The backend now supports converting a CONSULTATION case into a new LITIGATION or ADMINISTRATIVE case when the consultation is marked as converted.

══════════════════════════════════════════════════════════════════
1. NEW STATUS VALUE / READY-TO-CONVERT
══════════════════════════════════════════════════════════════════
Add CONVERTED_TO_CASE to the case status options. Valid statuses are now:
  OPEN | CLOSED | IN_PROGRESS | CANCELLED | PENDING | ARCHIVED | CONVERTED_TO_CASE

A consultation is "ready to convert" when ANY of these is true:
  - Case.status == CONVERTED_TO_CASE
  - case_specific_data.outcome == CONVERTED_TO_CASE (legacy: some clients use this)
  - case_specific_data.status == CONVERTED_TO_CASE

Legacy: If you stored outcome: CONVERTED_TO_CASE in case_specific_data and kept status
as IN_PROGRESS, the backend now accepts that. Consider syncing Case.status when user
marks "convert to case" for consistency.

══════════════════════════════════════════════════════════════════
2. NEW GET RESPONSE FIELDS (conversion links)
══════════════════════════════════════════════════════════════════
Every case from GET /api/v1/cases/:id/ now includes:

  convertedToCase: { id, reference, title, caseType, status } | null
    → On CONSULTATION: the derived case if this consultation was converted. Null if not yet converted.

  convertedFromCase: { id, reference, title, caseType, status } | null
    → On LITIGATION/ADMINISTRATIVE: the original consultation if this case was created from one. Null otherwise.

Both are fully populated — no extra fetch needed. Use them to:
  - Show a "Converted to case [reference]" link on consultation detail when convertedToCase exists
  - Show an "Originated from consultation [reference]" link on litigation/administrative detail when convertedFromCase exists

══════════════════════════════════════════════════════════════════
3. NEW ENDPOINT: Convert consultation to case
══════════════════════════════════════════════════════════════════
POST /api/v1/cases/:id/convert

Where :id is the ID of the CONSULTATION case.

PREREQUISITES (backend enforces):
  - Source case must be type CONSULTATION
  - Source case status must be CONVERTED_TO_CASE
  - convertedToCase must be null (not already converted)

REQUEST BODY:
{
  "targetType": "LITIGATION" | "ADMINISTRATIVE",
  // Optional: type-specific fields (all optional at this stage)
  // For LITIGATION:
  "litigationType", "clientRole", "opposingParty", "opposingCounsel",
  "thirdParties", "courtName", "jurisdiction", "chamber", "judgeName",
  "courtCaseNumber", "coCounsel", "filingDate", "firstHearingDate",
  "nextHearingDate", "statuteOfLimitationsDate", "keyDeadlines",
  "legalArguments", "priority"
  // For ADMINISTRATIVE:
  "dutyType", "institution", "institutionRefNumber", "startDate",
  "dueDate", "completionDate", "requiredDocuments", "priority"
}

SUCCESS RESPONSE (201):
{
  "success": true,
  "newCase": { ...full case object with convertedFromCase populated... },
  "originalConsultation": {
    "id": 123,
    "reference": "ABC12345",
    "convertedToCase": { "id": 456, "reference": "XYZ98765" }
  }
}

══════════════════════════════════════════════════════════════════
4. ERROR RESPONSES
══════════════════════════════════════════════════════════════════
404 — Source case not found (or not in user's cabinet)

400 — Structured errors with `code` field:
  - wrong_case_type: Source is not CONSULTATION (includes case_type)
  - not_ready_to_convert: None of status/outcome/case_specific_data.status is CONVERTED_TO_CASE
    (includes fields_checked, status, case_specific_data for debugging)
  - target_type_required: Missing targetType
  - invalid_target_type: targetType is not LITIGATION or ADMINISTRATIVE (includes target_type)

409 — already_converted: "This consultation has already been converted to case [reference]."
  (includes converted_to_case_id, converted_to_case_reference — use to link to existing case)

══════════════════════════════════════════════════════════════════
5. USER FLOW
══════════════════════════════════════════════════════════════════
1. User has a CONSULTATION case.
2. User marks it as "Converted to case" (set status to CONVERTED_TO_CASE via PATCH).
3. UI shows a "Convert to case" button (or similar CTA).
4. User selects target type: LITIGATION or ADMINISTRATIVE.
5. Optionally, user fills in type-specific fields (can be minimal or empty).
6. On submit: POST /api/v1/cases/:id/convert with { targetType, ... }
7. On success: redirect to the new case detail, or show success + link to new case.
8. Consultation detail should show "Converted to [reference]" linking to the new case.
   Derived case detail should show "Originated from consultation [reference]".

══════════════════════════════════════════════════════════════════
6. EXAMPLE: Convert to litigation
══════════════════════════════════════════════════════════════════
// Step 1: Set consultation status to CONVERTED_TO_CASE (if not already)
await fetch(`${API_BASE}/api/v1/cases/${consultationId}/`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'CONVERTED_TO_CASE' })
});

// Step 2: Convert to litigation
const res = await fetch(`${API_BASE}/api/v1/cases/${consultationId}/convert/`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetType: 'LITIGATION',
    litigationType: 'CIVIL',
    clientRole: 'PLAINTIFF',
    opposingParty: 'Acme Corp',
    courtName: 'District Court',
    jurisdiction: 'Local',
    courtCaseNumber: 'TBD',
    filingDate: '2025-04-01',
    firstHearingDate: '2025-05-01',
    nextHearingDate: '2025-06-01',
    statuteOfLimitationsDate: '2026-04-01',
    legalArguments: 'Breach of contract',
    priority: 'MEDIUM'
  })
});
const { newCase, originalConsultation } = await res.json();
// Navigate to newCase or show success + link

══════════════════════════════════════════════════════════════════
7. FRONTEND CHECKLIST
══════════════════════════════════════════════════════════════════
- [ ] Add CONVERTED_TO_CASE to status dropdown/options
- [ ] On consultation detail: show "Convert to case" button when status is CONVERTED_TO_CASE and convertedToCase is null
- [ ] Convert flow: modal or page to pick targetType (LITIGATION | ADMINISTRATIVE) and optionally type-specific fields
- [ ] POST /api/v1/cases/:id/convert/ on submit
- [ ] Handle 400, 404, 409 with user-friendly messages
- [ ] Display convertedToCase link on consultation: "Converted to case [reference]"
- [ ] Display convertedFromCase link on derived case: "Originated from consultation [reference]"
- [ ] Hide/disable convert button if convertedToCase is already set
- [ ] On success: navigate to new case or show toast + link to new case
```
