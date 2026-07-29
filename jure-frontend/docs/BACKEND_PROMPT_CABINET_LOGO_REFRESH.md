# Backend Prompt: Cabinet Logo Not Refreshing After Update

## Problem
User uploads a new cabinet logo. The backend confirms the update (success response), but the frontend still shows the old logo. The image appears unchanged even though the file was updated on the server.

## Frontend Behavior (Current)
- **Endpoint:** `PATCH /api/v1/dj-rest-auth/user/` with `multipart/form-data`
- **Logo field name:** `logo`
- **Expected response:** User object with updated `logo` URL
- **Cache-busting:** Frontend appends `?t=<timestamp>` to the logo URL to force browser re-fetch

## Backend Checklist – Please Verify

### 1. Response returns the updated logo URL
- After saving the new logo file, does the PATCH response include the **new** logo URL?
- If the backend overwrites the file in place (same path, e.g. `/media/cabinets/logo.png`), the URL stays the same. That is fine – the frontend uses `?t=timestamp` to bust cache.
- If the backend generates a new path per upload (e.g. `/media/cabinets/logo_abc123.png`), ensure the response returns that new path, not the old one.

### 2. Cache headers on logo/media files
- Check `Cache-Control` headers for media files (e.g. `/media/`).
- Avoid `Cache-Control: max-age=31536000` or similar long-lived caching for cabinet logos.
- Prefer `Cache-Control: no-cache` or `max-age=0` for logo files, or at least short `max-age` so updates are visible quickly.

### 3. Logo URL format
- Prefer returning a **full URL** (e.g. `http://localhost:8000/media/cabinets/logo.png`) so it works across environments.
- If returning a relative URL (e.g. `/media/cabinets/logo.png`), ensure it resolves correctly from the frontend origin.

### 4. File overwrite vs new file
- If overwriting the same file path: ensure the file is actually replaced on disk before sending the response.
- If creating a new file: ensure the response uses the new path, not a cached or old path.

### 5. Optional: versioned logo URL
- Consider appending a version or timestamp to the logo URL in the response, e.g. `/media/cabinets/logo.png?v=1734567890`.
- This makes cache-busting more reliable and reduces reliance on frontend `?t=` handling.

## Quick Test
1. Upload logo A → note the returned `logo` URL.
2. Upload logo B (different image) → note the returned `logo` URL.
3. Confirm the second response uses a different URL or that the file at the same URL has actually changed.
4. Check media response headers: `curl -I <logo_url>` and inspect `Cache-Control`.
