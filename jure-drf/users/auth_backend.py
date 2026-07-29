# users/auth_backend.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class MultiFieldModelBackend(ModelBackend):
    def authenticate(self, request, username=None, email=None, password=None, **kwargs):
        """
        Authenticate user by email or phone number.
        Email lookup is case-insensitive.
        """
        # Return None if no password provided
        if not password:
            return None
        
        # Get identifier from email, username, or kwargs
        identifier = str(email or username or kwargs.get('email') or kwargs.get('username') or '').strip()
        
        if not identifier:
            return None
        
        user = None
        
        # Try email first (case-insensitive lookup)
        # Check if identifier looks like an email
        is_email_like = '@' in identifier
        
        if is_email_like:
            # Email lookup - case insensitive
            users = User.objects.filter(email__iexact=identifier.lower())
            if users.exists():
                # Prefer active users, but return first if none are active
                user = users.filter(is_active=True).first() or users.first()
        
        # Try phone if email lookup didn't find a user
        if not user:
            # Try exact phone match
            try:
                user = User.objects.get(phone=identifier)
            except User.DoesNotExist:
                pass
            except User.MultipleObjectsReturned:
                # Handle phone duplicates
                users = User.objects.filter(phone=identifier)
                user = users.filter(is_active=True).first() or users.first()
        
        # If still no user found and identifier doesn't contain @, try email lookup anyway
        # (in case user entered email without @ or with typo, or phone format mismatch)
        if not user and not is_email_like:
            users = User.objects.filter(email__iexact=identifier.lower())
            if users.exists():
                user = users.filter(is_active=True).first() or users.first()
        
        # Verify password if user was found
        if user:
            # Check password
            if user.check_password(password):
                return user
            # Password incorrect - return None to prevent timing attacks
            return None

        return None
