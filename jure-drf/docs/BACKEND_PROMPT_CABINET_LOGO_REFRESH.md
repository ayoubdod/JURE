# Backend: Cabinet logo refresh (verification & frontend prompt)

**Problem:** User uploads a new logo. Backend returns success, but the frontend still shows the old logo.

**Backend changes made to fix this:**

---

## 1. PATCH response includes the updated logo URL

- **Verified:** The `my_cabinet` view (PATCH `/api/v1/cabinets/me/`) does:
  1. `serializer.save()` – persists the new logo to DB and disk
  2. `data = serializer.data` – gets the fresh serialized cabinet (including new logo path)
  3. Builds absolute URL for `logo` and returns it

- **Response:** `{ "logo": "http://localhost:8000/media/cabinet_logos/123_abc123def456.png", ... }`

---

## 2. Media files are not cached with long-lived headers

- **Change:** Media files are now served with `Cache-Control: no-cache` via `never_cache()` on the media serve view.
- **Location:** `core/urls.py` – media URL pattern uses `never_cache(static_serve)`.
- **Effect:** Browsers revalidate media files instead of serving from cache.

---

## 3. Unique URL per upload (file on disk)

- **Change:** Cabinet logo uses a custom `upload_to` that generates a **unique path per upload**:
  - Format: `cabinet_logos/{cabinet_id}_{uuid}.{ext}`
  - Example: `cabinet_logos/5_a1b2c3d4e5f6.png`
- **Effect:** Each upload gets a new URL. Even if the browser cached the old one, the new URL is different, so the new image is fetched.
- **Location:** `cabinets/models.py` – `cabinet_logo_upload_to` function.

---

## Frontend checklist

When updating the cabinet logo:

1. **Use the logo URL from the PATCH response** – Do not keep using the old URL. Update state with `response.data.logo`.
2. **Use multipart/form-data** – Send the file as `logo` in a FormData body.
3. **Optional cache bust:** If you still see stale images, append `?t=${Date.now()}` to the logo URL when displaying.

Example:

```javascript
const res = await fetch('/api/v1/cabinets/me/', {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: formData, // FormData with logo file
});
const data = await res.json();
// Use data.logo – it is the new URL
setLogoUrl(data.logo);
```

---

## Summary

| Item | Status |
|------|--------|
| PATCH returns updated logo URL | Yes |
| Media served with no-cache | Yes |
| Unique URL per upload | Yes (new path each time) |

---

## Frontend prompt (copy for Cursor / frontend)

```
Cabinet logo not refreshing after update – verify frontend:

1. After PATCH /api/v1/cabinets/me/ with a new logo, use the logo URL from the response (response.data.logo). Do not keep the old URL in state.

2. Update the displayed logo immediately with the new URL from the response.

3. Ensure the request uses multipart/form-data with the file field named "logo".

See docs/BACKEND_PROMPT_CABINET_LOGO_REFRESH.md for full details.
```
