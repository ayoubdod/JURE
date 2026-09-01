from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display

from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin
from users.models import PasswordSetupToken, User, UserAddress


@admin.register(User)
class UserAdmin(JureModelAdmin):
    list_display = (
        "user_header",
        "phone",
        "cabinet",
        "role",
        "status_badge",
        "staff_badge",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "role", "is_cabinet_member")
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering = ("-date_joined",)
    list_select_related = ("cabinet",)
    raw_id_fields = ("cabinet", "cabinet_creator", "affiliated_by")
    filter_horizontal = ("groups", "user_permissions")
    readonly_fields = ("date_joined", "last_login", "affiliation_code")
    fieldsets = (
        (_("General information"), {
            "fields": (
                "first_name",
                "last_name",
                "email",
                "phone",
                "phone_verified",
                "country",
                "image",
                "bio",
                "address",
            ),
        }),
        (_("Cabinet"), {
            "fields": (
                "cabinet",
                "cabinet_creator",
                "role",
                "is_cabinet_member",
                "hourly_rate",
            ),
        }),
        (_("Professional"), {
            "classes": ("collapse",),
            "fields": (
                "professional_card_number",
                "bar_association",
                "bar_inscription_year",
                "national_id",
                "bar_attestation",
                "professional_card",
            ),
        }),
        (_("Access"), {
            "fields": (
                "password",
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            ),
        }),
        (_("Meta"), {
            "classes": ("collapse",),
            "fields": (
                "affiliation_code",
                "affiliated_by",
                "accept_terms",
                "accept_data_processing",
                "date_joined",
                "last_login",
                "session_version",
            ),
        }),
    )

    @display(description=_("User"), header=True)
    def user_header(self, obj):
        name = obj.get_full_name() or obj.email
        initials = f"{(obj.first_name or '')[:1]}{(obj.last_name or '')[:1]}".upper()
        if not initials:
            initials = (obj.email or "U")[:1].upper()
        image = None
        if obj.image:
            try:
                image = {"path": obj.image.url}
            except (ValueError, OSError):
                image = None
        if image:
            return [name, obj.email, None, image]
        return [name, obj.email, initials]

    @display(description=_("Status"), ordering="is_active", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.is_active, _("Active") if obj.is_active else _("Inactive"))

    @display(description=_("Staff"), ordering="is_staff", label=STATUS_LABELS)
    def staff_badge(self, obj):
        if obj.is_superuser:
            return "superuser", _("Superuser")
        if obj.is_staff:
            return "staff", _("Staff")
        return "member", _("Member")


@admin.register(UserAddress)
class UserAddressAdmin(JureModelAdmin):
    list_display = ("user", "type", "is_default", "created")
    list_filter = ("type", "is_default")
    search_fields = ("user__email", "address")
    raw_id_fields = ("user",)


@admin.register(PasswordSetupToken)
class PasswordSetupTokenAdmin(JureModelAdmin):
    list_display = ("user", "expires_at", "used_at", "is_valid")
    list_filter = ("used_at",)
    search_fields = ("user__email", "token")
    readonly_fields = ("token",)
