# Frontend: Forgot Password flow (sign-in page)

**Problem:** Users who click "Forgot password" on the sign-in page must receive an email with a link to reset their password.

**Goal:** Wire the sign-in page "Forgot password" to the backend API and add a **Password Reset Confirm** page so users can set a new password from the link in the email.

---

## 1. Forgot password (request reset email)

When the user enters their email and clicks "Send reset link":

- **API:** `POST /api/v1/dj-rest-auth/password/reset/`
- **Body (JSON):** `{ "email": "user@example.com" }`
- **Headers:** `Content-Type: application/json`. No auth required.
- **Success (200):** `{ "detail": "Password reset e-mail has been sent." }`
- **Note:** The API always returns 200 for valid JSON (security: don't reveal if the email exists).

The backend sends an email containing a link like:
`http://localhost:3000/password-reset-confirm/?uuid=1b&token=abc123...`

---

## 2. Password Reset Confirm page

- **Path:** `/password-reset-confirm`
- **Full URL from email:** `http://localhost:3000/password-reset-confirm?uuid=1b&token=abc123...`
- The page must be public (no login required).

### Page behavior

1. **Read `uuid` and `token` from the URL** (query params).
2. **Show a form:** New password, Confirm password, Submit button.
3. **On submit:** Call the backend to confirm the reset.
4. **Success:** Show message and redirect to sign-in.

### API to call

- **URL:** `POST /api/v1/dj-rest-auth/password/reset/confirm/`
- **Body (JSON):**
  ```json
  {
    "uid": "<uuid from URL>",
    "token": "<token from URL>",
    "new_password1": "<new password>",
    "new_password2": "<confirm password>"
  }
  ```
- **Success (200):** `{ "detail": "Password has been reset with the new password." }`
- **Error (400):** e.g. invalid/expired token, password validation failed.

**Important:** The API expects `uid` (not `uuid`). Map the `uuid` query param to `uid` in the request body.

---

## 3. Checklist for the frontend

- [ ] Sign-in page has "Forgot password?" link.
- [ ] Forgot password modal/page collects email and calls `POST /api/v1/dj-rest-auth/password/reset/` with `{ "email": "..." }`.
- [ ] Route `/password-reset-confirm` exists and is public.
- [ ] Page reads `uuid` and `token` from query string.
- [ ] Form submits to `POST /api/v1/dj-rest-auth/password/reset/confirm/` with `uid`, `token`, `new_password1`, `new_password2`.
- [ ] Success: redirect to sign-in.
- [ ] Error: show API error message.

---

## 4. Troubleshooting (backend verified working)

If "forgot password" still doesn't work, check:

### A. Verify backend sends the email

```bash
python manage.py test_password_reset YOUR_EMAIL --console
```

This prints the exact email content. If you see the link, the backend is fine.

### B. Verify the email exists in the database

The API returns 200 even when no user exists (security). If the email isn't in the system, no email is sent. Run the command above — it will say "No active user found" if the email doesn't exist.

### C. Check frontend calls the right API

- Forgot password must call: `POST /api/v1/dj-rest-auth/password/reset/` with `{ "email": "..." }`
- Confirm page must call: `POST /api/v1/dj-rest-auth/password/reset/confirm/` with `uid`, `token`, `new_password1`, `new_password2`

### D. Email delivery (SMTP)

If the backend sends but you never receive:
- Check spam folder
- Run `python manage.py test_email your@email.com` to verify SMTP works
- Ensure `EMAIL_HOST_PASSWORD` is set in `.env` (Gmail: use App Password)

---

## 5. Difference from Setup Password

| Flow | Use case | URL from email | API |
|------|----------|----------------|-----|
| **Setup Password** | New team member from invitation | `/setup-password?token=...` | `POST /api/v1/auth/setup-password/` |
| **Forgot Password** | Existing user forgot password | `/password-reset-confirm?uuid=...&token=...` | `POST /api/v1/dj-rest-auth/password/reset/confirm/` |
