# Resend invitation link (team member card) – Frontend prompt

Use this from the **team member card** so an admin can resend the “set password” / invitation email to a member who forgot their credentials.

---

## API

**Endpoint:** `POST /api/v1/cabinets/members/{memberId}/resend-invitation/`

- **Auth:** Required. Same as other cabinet endpoints (e.g. Bearer token).
- **Path param:** `memberId` = user ID of the team member (same ID as in the member list/card).
- **Body:** None.
- **Success:** `200 OK`  
  Body: `{ "detail": "Invitation link has been sent to the member's email." }`
- **Errors:**
  - `400` – e.g. resending to yourself: `{ "detail": "You cannot resend an invitation to yourself." }`
  - `403` – no permission: `{ "detail": "You do not have permission to resend invitations." }`
  - `404` – member not found or not in your cabinet (use same handling as other member actions).
  - `503` – email could not be sent: `{ "detail": "Invitation could not be sent. Please try again later." }`

---

## UX on the team member card

1. **Button / action**
   - Label: e.g. “Resend invitation”, “Send setup link again”, “Email setup link”.
   - Place: on the team member card (e.g. in a menu or next to other member actions).
   - Show only for users who can manage members (same permission as “Change role” / manage roles). If the current user cannot manage roles, do not show the action.

2. **When to show**
   - Option A: Show for **all** cabinet members (except the current user).  
     Resend sends a new link; any previous link is invalidated.
   - Option B: Show only for members who “haven’t set a password yet” if you have that state (e.g. from a backend flag or separate endpoint).  
     If you don’t have that state, use Option A.

3. **Flow**
   - User clicks “Resend invitation”.
   - Optional: confirm dialog (“Send a new setup link to {email}? The previous link will stop working.”).
   - Call `POST …/members/{memberId}/resend-invitation/`.
   - On **200:** show success message (e.g. “Setup link sent to {email}” or use `detail` from the response).
   - On **400/403/404:** show the `detail` message (or a short fallback).
   - On **503:** show a “Could not send email, please try again later” style message and optionally a retry button.

4. **Loading and errors**
   - Disable the button (or show a spinner) while the request is in progress.
   - Use the response `detail` for toast/snackbar or inline error message.

---

## Example request (fetch)

```js
const memberId = 42; // from the team member card
const response = await fetch(
  `${API_BASE}/api/v1/cabinets/members/${memberId}/resend-invitation/`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);
const data = await response.json().catch(() => ({}));
if (!response.ok) {
  // Show data.detail or a fallback message
  throw new Error(data.detail || 'Failed to resend invitation');
}
// Success: show data.detail or "Invitation link sent to member's email"
```

---

## Summary

- **Method/URL:** `POST /api/v1/cabinets/members/{memberId}/resend-invitation/`
- **Permission:** Same as “manage roles” for cabinet members.
- **Behavior:** New one-time link is generated, old link invalidated; same welcome email with “Setup My Account” is sent to the member’s email.
- **Link in email:** `{FRONTEND_BASE_URL}/setup-password?token={TOKEN}` (e.g. `http://localhost:3000/setup-password?token=...`).
