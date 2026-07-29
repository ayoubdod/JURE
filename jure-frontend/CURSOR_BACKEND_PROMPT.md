# Prompt for Cursor Backend AI

Copy and paste this prompt into Cursor to fix the document update endpoint:

---

## Fix Document Update Endpoint - PATCH /library/documents/{id}/

The document update endpoint is failing when the frontend tries to update documents. Please fix the backend endpoint to properly handle document updates.

### Current Frontend Behavior:

1. **Updates WITHOUT file**: Sends `PATCH /library/documents/{id}/` with `Content-Type: application/json`
   ```json
   {
     "id": 1,
     "title": "Updated Title",
     "category": "law",
     "tags": ["tag1", "tag2", "tag3"],
     "description": "Description text or null"
   }
   ```

2. **Updates WITH file**: Sends `PATCH /library/documents/{id}/` with `Content-Type: multipart/form-data`
   - Fields sent as FormData: `id`, `title`, `category`, `description`, `file`
   - Tags sent as indexed array: `tags[0]`, `tags[1]`, `tags[2]`, etc.

### Requirements:

1. **Support both content types**: The endpoint must accept both `application/json` and `multipart/form-data` for the same PATCH request.

2. **Handle tags array in FormData**: When tags are sent as `tags[0]`, `tags[1]`, etc. in FormData, parse them into an array. Alternatively, accept tags as a JSON-encoded string if that's easier.

3. **PATCH semantics**: All fields should be optional for PATCH requests. Only validate and update fields that are provided. Don't require fields that aren't in the request.

4. **File handling**: 
   - If `file` is NOT in the request, keep the existing file unchanged
   - If `file` IS in the request, replace the existing file with the new one
   - File field should be optional for updates

5. **Null description**: Accept `null` values for the description field, or automatically convert them to empty string `""`.

6. **Error responses**: Return proper error responses with:
   - Status code (400 for validation errors, 404 for not found, etc.)
   - Field-specific validation errors in format: `{"field_name": ["Error message"]}`
   - Or general error: `{"detail": "Error message"}`

### Expected Response Format:

**Success (200 OK):**
```json
{
  "id": 1,
  "title": "Updated Title",
  "category": "law",
  "tags": ["tag1", "tag2"],
  "description": "Updated description",
  "file": "https://example.com/files/document.pdf",
  "size": 1024000,
  "created": "2024-01-01T00:00:00Z",
  "modified": "2024-01-02T00:00:00Z"
}
```

**Error (400 Bad Request):**
```json
{
  "title": ["This field is required."],
  "category": ["Invalid category value."]
}
```

### Test Cases to Verify:

- [ ] Update title only (no file, JSON)
- [ ] Update category only (no file, JSON)
- [ ] Update tags only (no file, JSON)
- [ ] Update description only (no file, JSON)
- [ ] Update with new file (FormData)
- [ ] Update all fields without file (JSON)
- [ ] Update all fields with file (FormData)
- [ ] Update with null description
- [ ] Update with empty tags array
- [ ] Update with empty string description

### Current Issues:

The endpoint is currently returning errors or not processing the requests correctly. Please:
1. Review the current implementation
2. Fix any parsing issues with FormData
3. Ensure proper handling of optional fields
4. Add proper error handling and validation
5. Test all the scenarios above

Fix the endpoint so it works correctly with the frontend implementation.

---

