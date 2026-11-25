"""Cookie consent vocabulary.

Marketing is intentionally absent: JURE does not run an advertising or
tracking pixel. Do not add a marketing grant until such a tool exists.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class ConsentAction(models.TextChoices):
    ACCEPT_ALL = "accept_all", _("Accept all")
    REJECT_NON_ESSENTIAL = "reject_non_essential", _("Reject non-essential")
    CUSTOM = "custom", _("Custom")
    WITHDRAW = "withdraw", _("Withdraw")


OPTIONAL_OFF_ACTIONS = (
    ConsentAction.REJECT_NON_ESSENTIAL,
    ConsentAction.WITHDRAW,
)
