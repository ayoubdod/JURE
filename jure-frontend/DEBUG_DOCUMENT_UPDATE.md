# Debugging Document Update Issue

## Steps to Debug

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab** - Look for error logs
3. **Go to Network tab** - Filter by "documents" or "PATCH"
4. **Try to update a document**
5. **Check the following:**

### In Console:
- Look for logs starting with "Updating document with data:"
- Look for "API Update Document:" logs
- Look for "Error updating document:" logs
- Look for "Error details:" logs

### In Network Tab:
1. Find the PATCH request to `/library/documents/{id}/`
2. Click on it
3. Check:
   - **Request Headers**: What Content-Type is being sent?
   - **Request Payload**: What data is being sent?
   - **Response**: What status code and error message?

## What to Look For

### If you see a 400 Bad Request:
- Check the response body for validation errors
- Look for which field is causing the issue

### If you see a 500 Internal Server Error:
- This is a backend issue
- Check backend logs

### If you see a 404 Not Found:
- The document ID might be wrong
- Check if the endpoint URL is correct

### If you see a 415 Unsupported Media Type:
- The backend doesn't accept the Content-Type
- Might need to always use FormData or always use JSON

### If the request hangs/never completes:
- Check if there's a CORS issue
- Check if the backend is responding
- Check network connectivity

## Common Issues and Solutions

### Issue 1: Tags not being parsed
**Symptom**: Backend returns error about tags format
**Solution**: Backend needs to parse `tags[0]`, `tags[1]` format, or we need to send tags as JSON string

### Issue 2: File not being accepted
**Symptom**: Error when trying to update with file
**Solution**: Check if backend accepts multipart/form-data for PATCH

### Issue 3: All fields required
**Symptom**: Backend says fields are required even though we're sending them
**Solution**: Backend might need all fields, or might need fields in different format

### Issue 4: Description null not accepted
**Symptom**: Error about description field
**Solution**: Backend might need empty string `""` instead of `null`

## Information to Collect

When reporting the issue, provide:

1. **Browser Console Logs** (copy all logs related to the update)
2. **Network Request Details**:
   - Request URL
   - Request Method
   - Request Headers (especially Content-Type)
   - Request Payload
   - Response Status Code
   - Response Body
3. **What you're trying to update**:
   - Title only?
   - Category only?
   - With file?
   - Without file?
4. **Exact error message** shown in the toast notification

## Quick Test

Try updating a document with just the title changed (no file). Check:
- Does it work?
- What error do you get?
- What's in the console?
- What's in the network tab?

This will help narrow down the issue.








