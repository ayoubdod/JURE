# Frontend: Cabinet logo update (for Cursor / frontend team)

**Context:** The backend now supports updating the cabinet logo. Previously, the logo could only be set at registration and never changed.

**Goal:** Ensure the frontend can update and display the cabinet logo correctly.

---

## 1. API endpoints to use

### Option A – Cabinet endpoint (recommended)

- **GET** `PATCH /api/v1/cabinets/me/` – Update cabinet (including logo)
- **GET** `GET /api/v1/cabinets/me/` – Fetch cabinet profile (logo URL, trade_name, etc.)

**Update logo:**
```
PATCH /api/v1/cabinets/me/
Content-Type: multipart/form-data
Authorization: Bearer <token>

logo: <File>
```

**Response:** `{ "logo": "http://localhost:8000/media/cabinet_logos/...", ... }`

### Option B – User profile endpoint

- **PATCH** `PATCH /api/v1/dj-rest-auth/user/` – User profile update (logo is synced to cabinet)

```
PATCH /api/v1/dj-rest-auth/user/
Content-Type: multipart/form-data
Authorization: Bearer <token>

logo: <File>
```

---

## 2. Frontend checklist

- [ ] **Settings / profile page** – Where users edit cabinet info (logo, trade name, etc.)
- [ ] **Logo upload** – Use `multipart/form-data` when sending the file (not JSON).
- [ ] **Form field name** – The field must be named `logo`.
- [ ] **After update** – Refresh the displayed logo (or refetch user/cabinet data).
- [ ] **Cache busting** – If the logo URL is the same path, the browser may cache the old image. Add `?t=${Date.now()}` or similar to the logo URL when displaying it after an update.
- [ ] **Error handling** – Handle 403 (only cabinet owner can update) and 404 (no cabinet).

---

## 3. Example (React + fetch)

```javascript
// Update cabinet logo
const formData = new FormData();
formData.append('logo', file); // file from <input type="file" />

const res = await fetch('/api/v1/cabinets/me/', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    // Do NOT set Content-Type – browser sets it with boundary for multipart
  },
  body: formData,
});

if (res.ok) {
  const data = await res.json();
  // data.logo is the new absolute URL
  setLogoUrl(data.logo + '?t=' + Date.now()); // cache bust
}
```

---

## 4. Displaying the logo after update

If the logo URL path does not change (e.g. same filename), the browser may show the old image. Use a cache-busting query param:

```javascript
const logoUrl = cabinet.logo || user.logo;
const displayUrl = logoUrl ? `${logoUrl}?t=${Date.now()}` : defaultLogo;
```

Or refetch the user/cabinet data after a successful update so the UI shows the new logo.
