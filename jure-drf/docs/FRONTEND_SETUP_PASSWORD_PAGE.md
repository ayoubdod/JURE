# Frontend: Setup Password page (for Cursor / frontend team)

**Problem:** Users who receive the invitation email and click "Setup My Account" get **page not found** because the frontend has no route for `/setup-password`.

**Goal:** Add a **Setup Password** page so when a team member opens the link from the email they can set their password and then sign in.

---

## 1. Route

- **Path:** `/setup-password`
- **Full URL from email:** `http://localhost:3000/setup-password?token=XXXX` (token in query string)
- The page must be reachable without being logged in (public route).

**Router (example React Router v6):**
```jsx
<Route path="/setup-password" element={<SetupPasswordPage />} />
```

Ensure this route exists and is not behind auth. If the app uses a catch-all or 404 route, put `/setup-password` before it so it is matched.

---

## 2. Page behavior

1. **Read the token from the URL**
   - Query param: `token`  
   - Example: `?token=4dn6HumAk92QIuZM1oAV-ZNACrLev65BQyeFVIWCcSA`
   - If there is no `token`, show a message like: "Invalid or missing link. Please use the link from your invitation email."

2. **Show a form**
   - **New password** (required, type password, min length e.g. 8)
   - **Confirm password** (required, must match new password)
   - Submit button, e.g. "Set password" or "Create my password"

3. **On submit**
   - Call the backend API (POST) with the token and the chosen password.
   - On success: show a success message and redirect to the sign-in page (e.g. `/signin` or `/login`).
   - On error: show the error message from the API (e.g. "Invalid or expired token.").

4. **Loading and errors**
   - Disable the button (or show a spinner) while the request is in progress.
   - Display validation errors (e.g. password too short, passwords don’t match) and API errors (e.g. `response.data.detail` or `response.data.password`).

---

## 3. Backend API to call

- **URL:** `POST /api/v1/auth/setup-password/`
- **Base URL:** Same as your other API calls (e.g. `http://localhost:8000` or your `VITE_API_URL` / `REACT_APP_API_URL`).
- **Headers:** `Content-Type: application/json`. No auth header needed (endpoint is public).
- **Body (JSON):**
  ```json
  {
    "token": "<token from URL query param>",
    "password": "<user's new password>"
  }
  ```
- **Success:** `200 OK`  
  Body example: `{ "detail": "Password set successfully. You can now sign in." }`  
  → Show this message and redirect to sign-in.
- **Errors:**
  - `400` – e.g. missing token/password or invalid/expired token.  
    Body example: `{ "detail": "Invalid or expired token." }` or `{ "detail": "Token is required." }`  
    → Show `detail` to the user.

---

## 4. Example flow (pseudo-code)

```
1. User lands on /setup-password?token=XXXX
2. Page reads token from useSearchParams() (React Router) or window.location.search
3. If no token → show "Invalid or missing link..."
4. User fills password + confirm password
5. Client-side: check match and min length
6. POST /api/v1/auth/setup-password/ with { token, password }
7. If 200 → show "Password set successfully. Redirecting to sign in..." then navigate to /signin
8. If 400 → show response.data.detail (e.g. "Invalid or expired token.")
```

---

## 5. Checklist for the frontend

- [ ] Route `/setup-password` exists and is public (no login required).
- [ ] Token is read from the query string (`?token=...`).
- [ ] Form has password + confirm password and basic validation.
- [ ] Submit sends `POST /api/v1/auth/setup-password/` with `{ token, password }` (use the same API base URL as the rest of the app).
- [ ] Success: show message and redirect to sign-in.
- [ ] Error: show API `detail` (or other error message) to the user.
- [ ] Optional: match the rest of the app’s styling (e.g. Jure purple #6D54B5 for primary button).

---

## 6. Prompt you can paste into Cursor (frontend repo)

Copy the following into Cursor when working on the frontend:

```
Add a public "Setup Password" page for the Jure app.

- Route: /setup-password (must be public, no auth required).
- The page is opened from an email link: /setup-password?token=XXXX. Read the token from the query string.
- If there is no token, show: "Invalid or missing link. Please use the link from your invitation email."
- Form: "New password" and "Confirm password" (required, must match, min length 8). Submit button "Set password".
- On submit: POST to the backend at /api/v1/auth/setup-password/ with JSON body: { "token": "<from URL>", "password": "<new password>" }. Use the same API base URL as the rest of the app.
- Success (200): show "Password set successfully. You can now sign in." and redirect to the sign-in page (e.g. /signin or /login).
- Error (400): show the response body's "detail" message (e.g. "Invalid or expired token.").
- Style the main button with Jure purple #6D54B5 to match the invitation email. Keep layout simple and consistent with the rest of the app.
```

---

**Backend is already implemented.** The frontend only needs this page and the POST call; no backend changes are required.
