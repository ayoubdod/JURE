import os

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from unfold.decorators import display
from unfold.widgets import UnfoldAdminFileFieldWidget

from commons.models import Tag
from core.admin_display import STATUS_LABELS, status_pair
from core.unfold_admin import JureModelAdmin
from core.utils import is_valid_slug
from jurisdictions.constants import VisibilityScope
from jurisdictions.models import Jurisdiction
from jurisdictions.scoping import validate_visibility_scope

from .models import Document, LibraryFavorite, LibrarySave


def parse_tag_slugs(raw: str) -> list[str]:
    slugs: list[str] = []
    for part in (raw or "").split(","):
        label = part.strip()
        if not label:
            continue
        slug = slugify(label)
        if not slug or not is_valid_slug(slug):
            raise forms.ValidationError(
                _('Invalid tag: "%(tag)s". Use letters, numbers, and hyphens.')
                % {"tag": label}
            )
        if slug not in slugs:
            slugs.append(slug)
    return slugs


def title_from_filename(name: str) -> str:
    base = os.path.splitext(os.path.basename(name or ""))[0]
    cleaned = " ".join(base.replace("_", " ").replace("-", " ").split())
    return (cleaned or "Untitled")[:255]


def resolve_tags(slugs: list[str]) -> list[Tag]:
    return [Tag.objects.get_or_create(slug=slug)[0] for slug in slugs]


def create_documents_from_uploads(
    *,
    files,
    category: str,
    is_shared: bool = None,
    visibility_scope: str = None,
    jurisdiction=None,
    description: str,
    tag_slugs: list[str],
    created_by,
) -> list[Document]:
    tags = resolve_tags(tag_slugs)
    if visibility_scope is None:
        visibility_scope = VisibilityScope.GLOBAL if is_shared else VisibilityScope.CABINET
    if visibility_scope == VisibilityScope.GLOBAL:
        jurisdiction = None
    created: list[Document] = []
    with transaction.atomic():
        for uploaded in files:
            doc = Document(
                title=title_from_filename(getattr(uploaded, "name", "")),
                category=category,
                description=description or "",
                visibility_scope=visibility_scope,
                jurisdiction=jurisdiction,
                is_shared=visibility_scope != VisibilityScope.CABINET,
                created_by=created_by,
            )
            doc.file = uploaded
            doc.save()
            if tags:
                doc.tags.set(tags)
            created.append(doc)
    return created


class DocumentAdminForm(forms.ModelForm):
    tags_input = forms.CharField(
        required=False,
        label=_("Tags"),
        help_text=_(
            "Optional. Comma-separated, for example: contrat, modele, formation. "
            "New tags are created automatically."
        ),
        widget=forms.TextInput(
            attrs={"placeholder": "contrat, modele, formation"}
        ),
    )

    class Meta:
        model = Document
        exclude = ("tags", "is_shared")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields["tags_input"].initial = ", ".join(
                self.instance.tags.order_by("slug").values_list("slug", flat=True)
            )
        if "status" in self.fields:
            self.fields["status"].required = False
            self.fields["status"].initial = self.fields["status"].initial or Document.DocumentStatus.PUBLISHED
        if "visibility_scope" in self.fields:
            self.fields["visibility_scope"].widget = forms.RadioSelect()
            self.fields["visibility_scope"].choices = [
                (VisibilityScope.GLOBAL, _("Global")),
                (VisibilityScope.JURISDICTION, _("Jurisdiction")),
                (VisibilityScope.CABINET, _("Cabinet")),
            ]
        if "jurisdiction" in self.fields:
            self.fields["jurisdiction"].queryset = Jurisdiction.objects.order_by("code")
            self.fields["jurisdiction"].required = False
        if "resource_type" in self.fields:
            self.fields["resource_type"].required = False
            self.fields["resource_type"].initial = self.fields["resource_type"].initial or Document.ResourceType.OTHER
        if "file" in self.fields:
            self.fields["file"].required = False
        if "external_url" in self.fields:
            self.fields["external_url"].required = False

    def clean_tags_input(self):
        return parse_tag_slugs(self.cleaned_data.get("tags_input") or "")

    def clean(self):
        cleaned = super().clean()
        scope = cleaned.get("visibility_scope") or VisibilityScope.GLOBAL
        if scope == VisibilityScope.GLOBAL:
            cleaned["jurisdiction"] = None
            cleaned["cabinet"] = None
        elif scope == VisibilityScope.JURISDICTION:
            if not cleaned.get("jurisdiction"):
                self.add_error("jurisdiction", _("Select a jurisdiction for jurisdiction-specific content."))
            cleaned["cabinet"] = None
        elif scope == VisibilityScope.CABINET and not cleaned.get("cabinet"):
            self.add_error("cabinet", _("Cabinet content requires a cabinet."))
        else:
            try:
                validate_visibility_scope(
                    visibility_scope=scope,
                    jurisdiction=cleaned.get("jurisdiction"),
                    cabinet=cleaned.get("cabinet"),
                    require_cabinet=scope == VisibilityScope.CABINET,
                )
            except ValidationError as exc:
                self.add_error(None, exc)
        uploaded = cleaned.get("file") or (self.instance.file if self.instance and self.instance.pk else None)
        url = (cleaned.get("external_url") or "").strip()
        if not uploaded and not url:
            self.add_error("file", _("Upload a document or provide an external URL."))
        return cleaned


class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleFileInput(attrs={"multiple": True}))
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_clean = super().clean
        if not data:
            raise forms.ValidationError(self.error_messages["required"], code="required")
        if not isinstance(data, (list, tuple)):
            data = [data]
        result = [single_clean(item, initial) for item in data]
        if not result:
            raise forms.ValidationError(self.error_messages["required"], code="required")
        return result


class DocumentBulkUploadForm(forms.Form):
    files = MultipleFileField(
        label=_("Files"),
        help_text=_("Hold Ctrl (Windows) or Cmd (Mac) to select several files."),
    )
    category = forms.ChoiceField(
        label=_("Category"),
        choices=Document.DocumentCategory.choices,
    )
    is_shared = forms.BooleanField(
        required=False,
        initial=True,
        label=_("Add to public library"),
        help_text=_("If checked, every cabinet sees these files in Library → Public library, not in their own collections."),
    )
    visibility_scope = forms.ChoiceField(
        label=_("Content scope"),
        choices=(
            (VisibilityScope.GLOBAL, _("Global")),
            (VisibilityScope.JURISDICTION, _("Jurisdiction")),
        ),
        initial=VisibilityScope.GLOBAL,
        required=False,
        widget=forms.RadioSelect,
        help_text=_("Global is visible to every jurisdiction. Jurisdiction-specific content is visible only in that market."),
    )
    jurisdiction = forms.ModelChoiceField(
        label=_("Jurisdiction"),
        queryset=Jurisdiction.objects.filter(status="ACTIVE").order_by("code"),
        required=False,
        help_text=_("Required when scope is Jurisdiction. Hidden when Global."),
    )
    tags_input = forms.CharField(
        required=False,
        label=_("Tags"),
        help_text=_("Optional. Applied to every uploaded file. Example: contrat, modele"),
        widget=forms.TextInput(attrs={"placeholder": "contrat, modele, formation"}),
    )
    description = forms.CharField(
        required=False,
        label=_("Description"),
        widget=forms.Textarea(attrs={"rows": 3}),
    )

    class Media:
        js = ("jurisdictions/js/scope_widget.js",)

    def clean_tags_input(self):
        return parse_tag_slugs(self.cleaned_data.get("tags_input") or "")

    def clean(self):
        cleaned = super().clean()
        scope = cleaned.get("visibility_scope") or VisibilityScope.GLOBAL
        if scope == VisibilityScope.GLOBAL:
            cleaned["jurisdiction"] = None
        elif scope == VisibilityScope.JURISDICTION and not cleaned.get("jurisdiction"):
            self.add_error(
                "jurisdiction",
                _("Select a jurisdiction for jurisdiction-specific content."),
            )
        return cleaned


@admin.register(Document)
class DocumentAdmin(JureModelAdmin):
    form = DocumentAdminForm
    change_list_template = "admin/library/document/change_list.html"
    formfield_overrides = {
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }
    list_display = [
        "document_name",
        "category",
        "jurisdiction",
        "scope_badge",
        "file_type",
        "status_badge",
        "created_by",
        "created",
    ]
    list_filter = [
        "status",
        "visibility_scope",
        "jurisdiction",
        "resource_type",
        "is_shared",
        "category",
        "language",
        "tags",
        "created",
    ]
    search_fields = ["title", "description", "author", "source", "keywords", "reference_number"]
    readonly_fields = ["created", "modified", "updated_by"]
    raw_id_fields = ["cabinet", "created_by", "updated_by"]
    actions = ("archive_documents", "restore_documents")
    class Media:
        js = ("jurisdictions/js/scope_widget.js",)

    fieldsets = (
        (_("General information"), {
            "fields": (
                "title",
                "category",
                "resource_type",
                "legal_area",
                "description",
                "file",
                "external_url",
                "language",
                "country",
                "author",
                "issuing_authority",
                "source",
                "reference_number",
                "publication_date",
                "effective_date",
                "keywords",
                "tags_input",
            ),
            "description": (
                "Global documents are visible in every jurisdiction. "
                "Jurisdiction documents are visible only to cabinets in that market. "
                "Cabinet documents are private. "
                "To upload several files at once, use “Upload library files”."
            ),
        }),
        (_("Scope and status"), {
            "fields": (
                "visibility_scope",
                "jurisdiction",
                "cabinet",
                "status",
            ),
        }),
        (_("Ownership"), {
            "fields": ("created_by", "updated_by", "created", "modified"),
            "classes": ("collapse",),
            "description": (
                "Leave cabinet empty for Global or Jurisdiction library documents."
            ),
        }),
    )

    @display(description=_("Document name"), ordering="title", header=True)
    def document_name(self, obj):
        subtitle = obj.get_resource_type_display() if obj.resource_type else ""
        return [obj.title, subtitle]

    @display(description=_("Scope"), ordering="visibility_scope", label=STATUS_LABELS)
    def scope_badge(self, obj):
        label = obj.get_visibility_scope_display()
        if obj.cabinet_id:
            label = f"{label} · {obj.cabinet}"
        return obj.visibility_scope, label

    @display(description=_("File type"))
    def file_type(self, obj):
        name = getattr(obj.file, "name", "") or ""
        ext = os.path.splitext(name)[1].lstrip(".").upper()
        if ext:
            return ext
        if obj.external_url:
            return _("URL")
        return "—"

    @display(description=_("Status"), ordering="status", label=STATUS_LABELS)
    def status_badge(self, obj):
        return status_pair(obj.status, obj.get_status_display())

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "bulk-upload/",
                self.admin_site.admin_view(self.bulk_upload_view),
                name="library_document_bulk_upload",
            ),
        ]
        return custom + urls

    def bulk_upload_view(self, request):
        if not self.has_add_permission(request):
            from django.core.exceptions import PermissionDenied

            raise PermissionDenied

        if request.method == "POST":
            form = DocumentBulkUploadForm(request.POST, request.FILES)
            if form.is_valid():
                files = form.cleaned_data["files"]
                created = create_documents_from_uploads(
                    files=files,
                    category=form.cleaned_data["category"],
                    visibility_scope=form.cleaned_data["visibility_scope"],
                    jurisdiction=form.cleaned_data.get("jurisdiction"),
                    description=form.cleaned_data.get("description") or "",
                    tag_slugs=form.cleaned_data.get("tags_input") or [],
                    created_by=request.user,
                )
                messages.success(
                    request,
                    _("Uploaded %(count)s document(s).") % {"count": len(created)},
                )
                return HttpResponseRedirect(
                    reverse("admin:library_document_changelist")
                )
        else:
            form = DocumentBulkUploadForm(initial={"visibility_scope": VisibilityScope.GLOBAL})

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "form": form,
            "title": _("Upload multiple documents"),
            "has_view_permission": self.has_view_permission(request),
        }
        return TemplateResponse(
            request,
            "admin/library/document/bulk_upload.html",
            context,
        )

    def save_model(self, request, obj, form, change):
        obj.sync_visibility_fields()
        if not obj.created_by_id:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description=_("Archive selected documents"))
    def archive_documents(self, request, queryset):
        updated = queryset.update(status=Document.DocumentStatus.ARCHIVED)
        self.message_user(
            request,
            _("Archived %(count)s document(s). They no longer appear in the JURE library.")
            % {"count": updated},
            messages.WARNING,
        )

    @admin.action(description=_("Restore selected documents to published"))
    def restore_documents(self, request, queryset):
        updated = queryset.update(status=Document.DocumentStatus.PUBLISHED)
        self.message_user(
            request,
            _("Restored %(count)s document(s) to the library.") % {"count": updated},
            messages.SUCCESS,
        )

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        slugs = form.cleaned_data.get("tags_input") or []
        form.instance.tags.set(resolve_tags(slugs))


@admin.register(LibraryFavorite)
class LibraryFavoriteAdmin(JureModelAdmin):
    list_display = ["user", "document", "created"]
    search_fields = ["user__email", "document__title"]
    raw_id_fields = ["user", "document"]


@admin.register(LibrarySave)
class LibrarySaveAdmin(JureModelAdmin):
    list_display = ["cabinet", "document", "added_by", "created"]
    search_fields = ["cabinet__trade_name", "document__title"]
    raw_id_fields = ["cabinet", "document", "added_by"]
