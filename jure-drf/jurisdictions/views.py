from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Jurisdiction
from .serializers import JurisdictionSerializer


class JurisdictionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/jurisdictions/ — active jurisdictions for onboarding and admin pickers.

    Unauthenticated clients may list active jurisdictions (signup).
    Staff may pass ?all=true to include inactive rows.
    """

    serializer_class = JurisdictionSerializer
    permission_classes = [AllowAny]
    lookup_field = "code"
    lookup_value_regex = r"[A-Za-z0-9]+"
    pagination_class = None

    def get_queryset(self):
        qs = Jurisdiction.objects.all().order_by("code")
        user = self.request.user
        include_all = (self.request.query_params.get("all") or "").lower() == "true"
        if include_all and user.is_authenticated and (user.is_staff or user.is_superuser):
            return qs
        return qs.filter(status=Jurisdiction.Status.ACTIVE)
