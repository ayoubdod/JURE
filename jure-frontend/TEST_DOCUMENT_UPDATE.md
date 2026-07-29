# Testing Document Update

## Steps to Test and Debug

1. **Open Browser Console (F12)**
2. **Try to update a document** (change title only, no file)
3. **Check the console logs** - You should see:
   - "Updating document with data:" - Shows what we're sending
   - "API Update Document Request:" - Shows the API call details
   - "API Update Document Response:" - Shows the response
   - OR "API Update Document Error:" - Shows any errors

4. **Check Network Tab**:
   - Find the PATCH request
   - Check Request Payload
   - Check Response

## What to Look For

### If you see "API Update Document Response" with status 200:
- The request succeeded
- Check if `response.data` contains the updated document
- The list should refresh automatically

### If you see "API Update Document Error":
- Copy the full error details
- Check the status code
- Check the error message

### If the request succeeds but document doesn't update:
- Check if `response.data` has the updated values
- Check if the list is refreshing (look for "fetchDocuments" in console)
- The backend might be returning success but not actually updating

## Common Issues

1. **Backend returns 200 but doesn't update**: Backend issue - needs fixing
2. **Request fails with 400**: Validation error - check error message
3. **Request fails with 500**: Backend server error
4. **Request hangs**: Network or CORS issue

## Next Steps

After testing, share:
1. Console logs (all of them)
2. Network request details (status, payload, response)
3. What you're trying to update (title, category, etc.)
4. Whether you see a success toast or error toast

