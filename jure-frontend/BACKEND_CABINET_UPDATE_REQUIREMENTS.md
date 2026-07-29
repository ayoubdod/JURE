# Backend Requirements: Cabinet Information Update

## Overview
The frontend now allows users to update their cabinet/organization information through the Settings page. This document outlines what the backend needs to support.

## Endpoint
**PATCH** `/dj-rest-auth/user/`

## Current Frontend Implementation

### 1. Update Cabinet Information (without logo)
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "trade_name": "Cabinet Name",
  "firm_name": "Firm Name",
  "structure_type": "LLC",
  "business_address": "123 Main St, City, Country",
  "team_size": "1-10",
  "website": "https://example.com"
}
```

**Note:** All fields are optional. The frontend only sends fields that have values.

### 2. Update Cabinet Logo
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
logo: [File object]
```

### 3. Update Cabinet Information (with logo)
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
trade_name: "Cabinet Name"
firm_name: "Firm Name"
structure_type: "LLC"
business_address: "123 Main St, City, Country"
team_size: "1-10"
website: "https://example.com"
logo: [File object]
```

## Backend Requirements

### 1. Accept Cabinet Fields in User Update Endpoint
The backend should accept the following fields in the PATCH `/dj-rest-auth/user/` endpoint:

- `trade_name` (string, optional)
- `firm_name` (string, optional)
- `logo` (File/Image, optional)
- `structure_type` (string, optional)
- `business_address` (string, optional)
- `team_size` (string, optional)
- `website` (string, optional, should be a valid URL or empty)

### 2. Support Both Content Types
The endpoint must handle:
- **JSON requests** (`application/json`) when updating text fields only
- **FormData requests** (`multipart/form-data`) when updating with a logo file

### 3. Logo File Handling
- Accept image files (JPG, PNG, GIF, WebP)
- Maximum file size: 2MB (as validated by frontend)
- Store the logo file and return the URL/path in the response
- If logo is not provided, keep the existing logo unchanged
- Logo field should be optional

### 4. Partial Updates (PATCH Semantics)
- All fields should be optional
- Only update fields that are provided in the request
- Don't require fields that aren't in the request
- Validate only the fields that are provided

### 5. Website URL Validation
- If provided, validate that it's a valid URL format
- Allow empty string or null for website field
- Frontend validation allows empty strings, so backend should too

### 6. Response Format
The endpoint should return the updated user object with all fields, including:
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "bio": "...",
  "image": "https://...",
  "trade_name": "Cabinet Name",
  "firm_name": "Firm Name",
  "logo": "https://.../logo.png",
  "structure_type": "LLC",
  "business_address": "123 Main St",
  "team_size": "1-10",
  "website": "https://example.com"
}
```

## Current Frontend Code Reference

### API Function
```typescript
// src/services/auth/api.ts
export const apiUpdateCabinet = (data: API.CabinetUpdateForm) => {
    const formData = getFormDataFromObject(data);
    return axiosInstance.patch<API.User>('/dj-rest-auth/user/', formData)
}
```

### Type Definition
```typescript
// src/services/auth/typing.d.ts
type CabinetUpdateForm = {
    trade_name?: string
    firm_name?: string
    logo?: File
    structure_type?: string
    business_address?: string
    team_size?: string
    website?: string
}
```

## Testing Checklist

- [ ] PATCH `/dj-rest-auth/user/` accepts `trade_name` field
- [ ] PATCH `/dj-rest-auth/user/` accepts `firm_name` field
- [ ] PATCH `/dj-rest-auth/user/` accepts `logo` file upload
- [ ] PATCH `/dj-rest-auth/user/` accepts `structure_type` field
- [ ] PATCH `/dj-rest-auth/user/` accepts `business_address` field
- [ ] PATCH `/dj-rest-auth/user/` accepts `team_size` field
- [ ] PATCH `/dj-rest-auth/user/` accepts `website` field
- [ ] Endpoint handles JSON requests (text fields only)
- [ ] Endpoint handles FormData requests (with logo file)
- [ ] Logo file upload works correctly
- [ ] Logo URL is returned in response
- [ ] Partial updates work (only provided fields are updated)
- [ ] Website URL validation works (validates URL if provided, allows empty)
- [ ] All fields are optional
- [ ] Response includes updated user with all cabinet fields

## Notes

1. The frontend already uses the same endpoint (`/dj-rest-auth/user/`) for updating user profile information (first_name, last_name, phone, bio, image).

2. The registration endpoint already accepts these fields during signup, so the backend likely already has the model fields. The update endpoint just needs to accept them.

3. The frontend uses `getFormDataFromObject` utility which properly formats FormData, including handling File objects.

4. If the backend already supports these fields during registration, you may just need to add them to the serializer's `fields` or `Meta.fields` list for the update endpoint.

