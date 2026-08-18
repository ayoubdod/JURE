# Email / SMTP configuration

Invitation emails (new team member, resend invitation) use Django's email backend. If SMTP credentials are set, emails are sent via SMTP; otherwise they are printed to the **console** (useful for local dev).

## Why the team member doesn't receive the email

### 1. **SMTP authentication failed (535)**

If the terminal shows:

```text
SMTPAuthenticationError: (535, b'5.7.8 Error: authentication failed: (reason unavailable)')
```

then the server is rejecting your SMTP login. Fix it as follows.

**Gmail**

- Do **not** use your normal Gmail password. Use an **App Password**:
  1. Google Account → Security → 2-Step Verification (must be ON).
  2. Security → App passwords → generate a new app password for “Mail”.
  3. In your `.env` set:
     - `SMTP_HOST=smtp.gmail.com`
     - `SMTP_PORT=587`
     - `SMTP_USER=your@gmail.com`
     - `SMTP_PASS=<the 16-character app password>`
- Use **port 587** with STARTTLS. If you use 465, set `EMAIL_USE_SSL=True` (already default in this project).

**Other providers (e.g. Hostinger, SendGrid, Mailgun)**

- Use the SMTP host, port, user and password they provide.
- Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (or `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`).

### 2. **Resend returns 200 but no email**

The backend was updated so that when sending fails (e.g. SMTP 535), the **resend-invitation** API returns **503** with `"Invitation could not be sent. Please try again later."` instead of 200. Fix SMTP as above; the frontend can show the 503 message to the user.

### 3. **Restart the server after changing .env**

Email settings are read when Django starts. After changing `EMAIL_*` or `SMTP_*` in `.env`, **restart** the process (e.g. stop and start `poetry run daphne` or `runserver`) so the new values are used.

### 4. **Test email from the command line**

Run:

```bash
poetry run python manage.py test_email someone@example.com
```

If this succeeds, SMTP is correct and the app just needs a restart. If it fails, the command prints the exact error (e.g. 535 auth).

### 5. **Local dev without SMTP**

If you do **not** set `SMTP_PASS` (or `EMAIL_HOST_PASSWORD` / `RESEND_API_KEY`), the **console** backend is used: emails are printed in the terminal where you run `manage.py` or Daphne. No real email is sent.

Landing-page contact and status-alert requests send two emails:

1. **To `contact@jure.ma`** — subject starts with `[JURE website]`, so it is easy to tell apart from invitations and password resets. Reply-To is the visitor.
2. **To the visitor** — a thank-you confirming the request was received.

Set `CONTACT_INBOX=contact@jure.ma` and a real `DEFAULT_FROM_EMAIL` (for example `JURE <contact@jure.ma>`). Restart Daphne after changing `.env`.
