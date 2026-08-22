from django.db import models
from django.utils.translation import gettext_lazy as _


class VisibilityScope(models.TextChoices):
    """Content scope. GLOBAL is a scope, not a jurisdiction."""

    GLOBAL = "GLOBAL", _("Global")
    JURISDICTION = "JURISDICTION", _("Jurisdiction")
    CABINET = "CABINET", _("Cabinet")
