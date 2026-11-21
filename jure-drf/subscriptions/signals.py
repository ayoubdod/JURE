from allauth.account.signals import email_confirmed
from django.dispatch import receiver

from subscriptions.services.lifecycle import mark_verified


@receiver(email_confirmed)
def start_trial_after_email_verification(request, email_address, **kwargs):
    user = getattr(email_address, "user", None)
    if user is not None:
        mark_verified(user)
