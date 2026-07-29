# Prompt to Paste in Backend Cursor Window

Copy and paste this entire prompt into Cursor in your backend project window:

---

Fix the Client serializer validation issue: When updating a client's email or phone number, the backend is incorrectly flagging the client's own information as a duplicate, showing an error like "this information is already related to a client" even though we're just updating the same client. 

The problem is that the uniqueness validation for email and phone fields is not excluding the current client instance when checking for duplicates during an update operation.

Please:
1. Find the ClientSerializer in the backend codebase
2. Update the email and phone validation to exclude the current instance (self.instance) when checking for duplicates during updates
3. Ensure that when self.instance exists (update operation), the validation excludes that instance's pk from the uniqueness check
4. Keep the validation for create operations (when self.instance is None) working as before

The fix should use validate_email() and validate_phone() methods that check if self.instance exists, and if it does, exclude it from the queryset using .exclude(pk=instance.pk) before checking for duplicates.

---








