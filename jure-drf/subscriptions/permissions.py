from django.utils.translation import gettext_lazy as _
from rest_framework.permissions import BasePermission

from subscriptions.services.lifecycle import is_billing_admin


class IsBillingAdmin(BasePermission):
    message = _("Only the organisation owner or a billing administrator can do this.")

    def has_permission(self, request, view) -> bool:
        return is_billing_admin(request.user)
