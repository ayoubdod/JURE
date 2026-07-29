# Backend Issue: Document Update Endpoint

## Problem Description
The document update endpoint (`PATCH /library/documents/{id}/`) is failing when updating document information. The frontend is experiencing errors during the update process.

## Current Frontend Implementation

### Request Details
- **Method**: `PATCH`
- **Endpoint**: `/library/documents/{id}/`
- **Content-Type**: 
  - `application/json` when updating without a file
  - `multipart/form-data` when updating with a file

### Payload Structure

**When updating WITHOUT a file (JSON):**
```json
{
  "id": 1,
  "title": "Updated Document Title",
  "category": "law",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Updated description or null"
}
```

**When updating WITH a file (FormData):**
```
id: 1
title: "Updated Document Title"
category: "law"
tags[0]: "tag1"
tags[1]: "tag2"
tags[2]: "tag3"
description: "Updated description or null"
file: [File object]
```

## Issues Identified

### 1. **Mixed Content-Type Handling**
The frontend conditionally sends either JSON or FormData based on whether a file is included:
```typescript
// Frontend code
return axiosInstance.patch(
  `/library/documents/${data.id}/`, 
  data.file ? getFormDataFromObject(data) : data
);
```

**Problem**: The backend might not be properly handling both content types for the same endpoint.

**Expected Behavior**: 
- Accept `application/json` for updates without files
- Accept `multipart/form-data` for updates with files
- Properly parse both request types

### 2. **Tags Array Format in FormData**
When using FormData, tags are sent as indexed array fields:
- `tags[0]`, `tags[1]`, `tags[2]`, etc.

**Problem**: The backend might not be parsing this array format correctly from FormData.

**Expected Behavior**: 
- Parse `tags[0]`, `tags[1]`, etc. into an array
- Or accept tags as a JSON-encoded string in FormData
- Handle empty tags array `[]`

### 3. **PATCH Method with FormData**
Some Django REST Framework configurations have issues with PATCH requests using multipart/form-data.

**Problem**: The backend might require PUT instead of PATCH, or might need special configuration.

**Expected Behavior**: 
- Support PATCH with multipart/form-data
- Or provide clear documentation if PUT is required instead

### 4. **Partial Updates (PATCH Semantics)**
The frontend currently sends ALL fields, even if unchanged.

**Problem**: The backend might be validating all fields as required, or might have issues with partial updates.

**Expected Behavior**: 
- Accept partial updates (only changed fields)
- Make all fields optional for PATCH
- Validate only the fields that are provided

### 5. **Null Description Handling**
The description field can be `null`.

**Problem**: The backend might not accept `null` values or might require empty string `""`.

**Expected Behavior**: 
- Accept `null` for description field
- Or convert `null` to empty string `""` automatically

### 6. **File Update Handling**
When a file is NOT provided, the frontend doesn't include the `file` field in the request.

**Problem**: The backend might be trying to process a missing file field incorrectly.

**Expected Behavior**: 
- If `file` is not in the request, keep the existing file
- Only update the file if a new one is provided
- Don't require file field for updates

## Request Examples

### Example 1: Update without file (JSON)
```http
PATCH /library/documents/1/ HTTP/1.1
Content-Type: application/json

{
  "id": 1,
  "title": "New Title",
  "category": "contracts",
  "tags": ["legal", "important"],
  "description": "Updated description"
}
```

### Example 2: Update with file (FormData)
```http
PATCH /library/documents/1/ HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="id"

1
------WebKitFormBoundary
Content-Disposition: form-data; name="title"

New Title
------WebKitFormBoundary
Content-Disposition: form-data; name="category"

contracts
------WebKitFormBoundary
Content-Disposition: form-data; name="tags[0]"

legal
------WebKitFormBoundary
Content-Disposition: form-data; name="tags[1]"

important
------WebKitFormBoundary
Content-Disposition: form-data; name="description"

Updated description
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: application/pdf

[file content]
------WebKitFormBoundary--
```

## Expected Response

### Success Response (200 OK)
```json
{
  "id": 1,
  "title": "New Title",
  "category": "contracts",
  "tags": ["legal", "important"],
  "description": "Updated description",
  "file": "https://example.com/files/document.pdf",
  "size": 1024000,
  "created": "2024-01-01T00:00:00Z",
  "modified": "2024-01-02T00:00:00Z"
}
```

### Error Response Format
```json
{
  "detail": "Error message here",
  // OR field-specific errors:
  "title": ["This field is required."],
  "category": ["Invalid category."],
  "tags": ["Invalid tag format."]
}
```

## Questions for Backend Team

1. **Does the endpoint support both JSON and FormData?**
   - If not, should we always use FormData even without files?
   - Or should we use separate endpoints?

2. **How should tags be sent in FormData?**
   - Current: `tags[0]`, `tags[1]`, etc.
   - Alternative: JSON-encoded string?
   - Alternative: Comma-separated string?

3. **Is PATCH the correct method, or should we use PUT?**
   - Some backends prefer PUT for updates with files

4. **Are all fields optional for PATCH?**
   - Should we only send changed fields?
   - Or should we always send all fields?

5. **How should null description be handled?**
   - Accept `null`?
   - Convert to empty string `""`?

6. **What's the exact error being returned?**
   - Status code?
   - Error message?
   - Validation errors?

## Testing Checklist

Please verify the following scenarios:

- [ ] Update document title only (no file)
- [ ] Update document category only (no file)
- [ ] Update document tags only (no file)
- [ ] Update document description only (no file)
- [ ] Update document with new file
- [ ] Update document with all fields (no file)
- [ ] Update document with all fields (with file)
- [ ] Update document with null description
- [ ] Update document with empty tags array
- [ ] Update document with empty string description

## Additional Notes

- The frontend is using React Hook Form with Yup validation
- The frontend uses Axios for HTTP requests
- The frontend properly handles FileList from file inputs
- Error handling is in place but needs proper backend error responses

## Contact

If you need more information or have questions about the frontend implementation, please let us know. We can provide:
- Network request logs
- Exact error responses
- Frontend code snippets
- Test cases








