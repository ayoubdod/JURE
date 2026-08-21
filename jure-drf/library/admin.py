import os

from django import forms
from django.contrib import admin, messages
from django.db import models, transaction
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from unfold.widgets import UnfoldAdminFileFieldWidget

from commons.models import Tag
from core.utils import is_valid_slug

from .models import Document


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
    is_shared: bool,
    description: str,
    tag_slugs: list[str],
    created_by,
) -> list[Document]:
    tags = resolve_tags(tag_slugs)
    created: list[Document] = []
    with transaction.atomic():
        for uploaded in files:
            doc = Document(
                title=title_from_filename(getattr(uploaded, "name", "")),
                category=category,
                description=description or "",
                is_shared=bool(is_shared),
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
        exclude = ("tags",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields["tags_input"].initial = ", ".join(
                self.instance.tags.order_by("slug").values_list("slug", flat=True)
            )

    def clean_tags_input(self):
        return parse_tag_slugs(self.cleaned_data.get("tags_input") or "")


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

    def clean_tags_input(self):
        return parse_tag_slugs(self.cleaned_data.get("tags_input") or "")


@admin.register(Document)
class DocumentAdmin(ModelAdmin):
    form = DocumentAdminForm
    change_list_template = "admin/library/document/change_list.html"
    formfield_overrides = {
        models.FileField: {"widget": UnfoldAdminFileFieldWidget},
    }
    list_display = ["title", "category", "is_shared", "cabinet", "created", "modified"]
    list_filter = ["is_shared", "category", "tags", "created"]
    search_fields = ["title", "description"]
    readonly_fields = ["created", "modified"]
    raw_id_fields = ["cabinet", "created_by"]
    fieldsets = (
        (None, {
            "fields": (
                "title",
                "category",
                "description",
                "file",
                "tags_input",
                "is_shared",
            ),
            "description": (
                "To publish for every cabinet, tick “Add to public library”. "
                "Those files appear only in Public library, not in a cabinet’s own collections. "
                "Tags are optional — type them here, they are created if missing. "
                "To upload several files at once, use “Upload multiple”."
            ),
        }),
        ("Ownership", {
            "fields": ("cabinet", "created_by", "created", "modified"),
            "classes": ("collapse",),
            "description": (
                "Leave cabinet empty for public library documents. "
                "Cabinet is cleared automatically when a document is in the public library."
            ),
        }),
    )

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
                    is_shared=form.cleaned_data["is_shared"],
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
            form = DocumentBulkUploadForm(initial={"is_shared": True})

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
        if obj.is_shared:
            obj.cabinet = None
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        slugs = form.cleaned_data.get("tags_input") or []
        form.instance.tags.set(resolve_tags(slugs))
