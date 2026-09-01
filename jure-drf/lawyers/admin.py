from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.unfold_admin import JureModelAdmin
from .models import LawyerProfile


@admin.register(LawyerProfile)
class LawyerProfileAdmin(JureModelAdmin):
    list_display = ("lawyer_header", "user", "specialization", "years_of_experience", "created")
    list_filter = ("specialization",)
    search_fields = ("name", "user__email", "user__first_name", "user__last_name")
    list_select_related = ("user", "specialization")
    raw_id_fields = ("user",)
    fieldsets = (
        (_("General information"), {
            "fields": ("user", "name", "specialization", "years_of_experience", "profile_image", "bio"),
        }),
    )

    @display(description=_("Lawyer"), header=True)
    def lawyer_header(self, obj):
        name = obj.name or (str(obj.user) if obj.user_id else "")
        email = obj.user.email if obj.user_id else ""
        initials = "".join(part[:1] for part in name.split()[:2]).upper() or "L"
        image = None
        if obj.profile_image:
            try:
                image = {"path": obj.profile_image.url}
            except (ValueError, OSError):
                image = None
        if image:
            return [name, email, None, image]
        return [name, email, initials]
