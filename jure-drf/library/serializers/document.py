import json
import logging
import os
from rest_framework import serializers
from django.http import QueryDict

from commons.models import Tag
from core.utils import is_valid_slug
from jurisdictions.constants import VisibilityScope
from jurisdictions.models import Jurisdiction
from jurisdictions.scoping import serialize_jurisdiction
from ..constants import (
    LAST_ADDED_DAYS,
    LIBRARY_SCOPE_INTERNATIONAL,
    LIBRARY_SCOPE_LOCAL,
    LIBRARY_SCOPE_PERSONAL,
    VISIBILITY_TO_LIBRARY_SCOPE,
    days_remaining_as_new,
    days_since_added,
    is_recent_timestamp,
)
from ..models import Document, LibraryFavorite, LibrarySave, normalize_document_category
from .fields import (
    ALLOWED_DOCUMENT_EXTENSIONS,
    MAX_DOCUMENT_BYTES,
    SafeFileURLField,
    _source_library_label,
    _user_display_name,
)

logger = logging.getLogger(__name__)


class DocumentSerializer(serializers.ModelSerializer):

    size = serializers.SerializerMethodField()
    file = SafeFileURLField(required=False, allow_null=True, allow_empty_file=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    jurisdiction_code = serializers.SerializerMethodField()
    jurisdiction_name = serializers.SerializerMethodField()
    jurisdiction_detail = serializers.SerializerMethodField()
    scope = serializers.SerializerMethodField()
    is_recent = serializers.SerializerMethodField()
    days_since_added = serializers.SerializerMethodField()
    days_remaining_as_new = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    is_in_my_library = serializers.SerializerMethodField()
    is_owned = serializers.SerializerMethodField()
    source_library = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    jurisdiction = serializers.PrimaryKeyRelatedField(
        queryset=Jurisdiction.objects.all(),
        required=False,
        allow_null=True,
    )
    visibility_scope = serializers.ChoiceField(
        choices=VisibilityScope.choices,
        required=False,
    )
    external_url = serializers.URLField(required=False, allow_blank=True)
    keywords = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Document
        fields = [
            'id', 'resource_uid', 'title', 'category', 'resource_type', 'legal_area',
            'description', 'file', 'external_url', 'size', 'is_shared',
            'visibility_scope', 'scope', 'jurisdiction', 'jurisdiction_code',
            'jurisdiction_name', 'jurisdiction_detail', 'country', 'language',
            'source', 'author', 'issuing_authority', 'publication_date',
            'effective_date', 'reference_number', 'keywords',
            'status', 'created', 'modified', 'created_at', 'updated_at',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'is_recent', 'days_since_added', 'days_remaining_as_new',
            'is_favorited', 'is_in_my_library', 'is_owned', 'source_library',
        ]
        read_only_fields = [
            'resource_uid', 'is_shared',
            'created', 'modified', 'created_by', 'updated_by',
        ]
        extra_kwargs = {
            'title': {'required': False},
            'category': {'required': False},
            'resource_type': {'required': False},
            'legal_area': {'required': False, 'allow_blank': True},
            'country': {'required': False, 'allow_blank': True},
            'language': {'required': False, 'allow_blank': True},
            'source': {'required': False, 'allow_blank': True},
            'author': {'required': False, 'allow_blank': True},
            'issuing_authority': {'required': False, 'allow_blank': True},
            'reference_number': {'required': False, 'allow_blank': True},
            'publication_date': {'required': False, 'allow_null': True},
            'effective_date': {'required': False, 'allow_null': True},
        }

    def __init__(self, *args, **kwargs):
        context = kwargs.get('context', {})
        request = context.get('request') if context else None

        super().__init__(*args, **kwargs)

        if request and request.method in ('POST', 'PATCH', 'PUT'):
            self.fields['tags'] = serializers.ListField(
                child=serializers.CharField(),
                required=False,
                write_only=True,
                allow_null=True,
            )
        else:
            self.fields['tags'] = serializers.SerializerMethodField()

        if self.instance is None:
            self.fields['file'].required = False
            self.fields['file'].allow_null = True
            self.fields['title'].required = True
            self.fields['category'].required = True
        else:
            self.fields['file'].required = False
            self.fields['file'].allow_null = True

        if not context.get('allow_scope_write'):
            self.fields['jurisdiction'].read_only = True
            self.fields['visibility_scope'].read_only = True

    def to_internal_value(self, data):
        if isinstance(data, QueryDict):
            tags_list = []
            i = 0
            while f'tags[{i}]' in data:
                tag_value = data.get(f'tags[{i}]')
                if tag_value:
                    tags_list.append(tag_value)
                i += 1

            if not tags_list:
                if hasattr(data, 'getlist') and 'tags' in data:
                    tags_list = data.getlist('tags')
                elif 'tags' in data:
                    tags_value = data.get('tags')
                    if tags_value:
                        if isinstance(tags_value, str):
                            try:
                                tags_list = json.loads(tags_value)
                            except (json.JSONDecodeError, ValueError):
                                tags_list = [tags_value] if tags_value else []
                        elif isinstance(tags_value, list):
                            tags_list = tags_value

            data_dict = {}
            for key in data.keys():
                if not (key.startswith('tags[') or key == 'tags'):
                    if key == 'file':
                        file_value = data.get(key)
                        if file_value:
                            data_dict[key] = file_value
                    else:
                        if hasattr(data, 'getlist'):
                            values = data.getlist(key)
                            data_dict[key] = values[0] if len(values) == 1 else values
                        else:
                            data_dict[key] = data.get(key)

            if tags_list or 'tags' in data:
                data_dict['tags'] = tags_list

            data = data_dict

        elif isinstance(data, dict):
            if 'tags' in data:
                tags_value = data.get('tags')
                if tags_value is not None:
                    if isinstance(tags_value, str):
                        try:
                            data['tags'] = json.loads(tags_value)
                        except (json.JSONDecodeError, ValueError):
                            data['tags'] = [tags_value] if tags_value else []
                    elif not isinstance(tags_value, list):
                        data['tags'] = [tags_value] if tags_value else []

        if isinstance(data, dict) and data.get('category'):
            data = dict(data)
            data['category'] = normalize_document_category(data.get('category'))

        return super().to_internal_value(data)

    def validate_tags(self, value: list[str] | None):
        if value is None:
            return None
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list.")
        value = [tag for tag in value if tag and isinstance(tag, str) and tag.strip()]
        if value:
            for tag in value:
                if not is_valid_slug(tag):
                    raise serializers.ValidationError(f"Invalid tag: {tag}")
        return value

    def validate_file(self, value):
        if not value:
            return value
        name = getattr(value, "name", "") or ""
        ext = os.path.splitext(name)[1].lower()
        if ext and ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file type ({ext}). Allowed: "
                + ", ".join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))
            )
        size = getattr(value, "size", None)
        if size is not None and size > MAX_DOCUMENT_BYTES:
            raise serializers.ValidationError("File is too large (max 25 MB).")
        if size == 0:
            raise serializers.ValidationError("The uploaded file is empty.")
        return value

    def validate_status(self, value):
        if not value:
            return value
        valid = [choice[0] for choice in Document.DocumentStatus.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid)}"
            )
        return value

    def validate_category(self, value):
        if not value:
            return value
        value = normalize_document_category(value)
        valid_categories = [choice[0] for choice in Document.DocumentCategory.choices]
        if value in valid_categories:
            return value
        if self.instance and getattr(self.instance, 'category', None) == value:
            return value
        raise serializers.ValidationError(
            f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )

    def validate_resource_type(self, value):
        if not value:
            return value
        valid = [choice[0] for choice in Document.ResourceType.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid resource type. Must be one of: {', '.join(valid)}"
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        file_value = attrs.get('file', serializers.empty)
        url_value = attrs.get('external_url', serializers.empty)

        if self.instance is None:
            has_file = bool(file_value and file_value is not serializers.empty)
            has_url = bool(url_value and str(url_value).strip())
            if not has_file and not has_url:
                raise serializers.ValidationError(
                    {"file": "Upload a document or provide an external URL."}
                )
        else:
            incoming_file = file_value if file_value is not serializers.empty else None
            if 'external_url' in attrs:
                next_url = (attrs.get('external_url') or '').strip()
            else:
                next_url = (self.instance.external_url or '').strip()
            next_file = incoming_file or getattr(getattr(self.instance, 'file', None), 'name', '')
            if not next_file and not next_url:
                raise serializers.ValidationError(
                    {"file": "Upload a document or provide an external URL."}
                )

        if self.context.get('allow_scope_write'):
            scope = attrs.get('visibility_scope', getattr(self.instance, 'visibility_scope', None))
            jurisdiction = attrs.get(
                'jurisdiction',
                getattr(self.instance, 'jurisdiction', None) if self.instance else None,
            )
            if scope == VisibilityScope.JURISDICTION and jurisdiction is None:
                raise serializers.ValidationError(
                    {"jurisdiction": "Select a jurisdiction for the Local Library."}
                )
            if scope == VisibilityScope.GLOBAL:
                attrs['jurisdiction'] = None
        return attrs

    def create(self, validated_data):
        if not self.context.get('allow_scope_write'):
            validated_data.pop('jurisdiction', None)
            validated_data.pop('visibility_scope', None)
        tags_data = validated_data.pop('tags', [])
        instance = super().create(validated_data)
        if tags_data:
            tags = [Tag.objects.get_or_create(slug=tag)[0] for tag in tags_data]
            instance.tags.set(tags)
        return instance

    def update(self, instance: Document, validated_data: dict):
        if not self.context.get('allow_scope_write'):
            validated_data.pop('jurisdiction', None)
            validated_data.pop('visibility_scope', None)
        tags_data = validated_data.pop('tags', None)

        if 'description' in validated_data and validated_data['description'] is None:
            validated_data['description'] = ''

        replacing_file = False
        old_file_name = getattr(getattr(instance, "file", None), "name", "") or ""
        if 'file' in validated_data:
            file_value = validated_data.get('file')
            if file_value is None:
                validated_data.pop('file')
            elif isinstance(file_value, str) and not file_value.strip():
                validated_data.pop('file')
            elif hasattr(file_value, 'name') and not file_value.name:
                validated_data.pop('file')
            elif hasattr(file_value, 'size') and file_value.size == 0:
                validated_data.pop('file')
            else:
                replacing_file = True

        instance = super().update(instance, validated_data)

        if replacing_file and old_file_name:
            new_name = getattr(getattr(instance, "file", None), "name", "") or ""
            if new_name and new_name != old_file_name:
                try:
                    instance.file.storage.delete(old_file_name)
                except Exception:
                    logger.exception(
                        "Failed to delete previous library file %s for document id=%s",
                        old_file_name,
                        instance.pk,
                    )

        if tags_data is not None:
            tags_data = [tag for tag in tags_data if tag and isinstance(tag, str) and tag.strip()]
            tags = [Tag.objects.get_or_create(slug=tag)[0] for tag in tags_data]
            instance.tags.set(tags)

        instance.save()
        return instance

    def get_created_by_name(self, obj):
        return _user_display_name(getattr(obj, "created_by", None))

    def get_updated_by_name(self, obj):
        return _user_display_name(getattr(obj, "updated_by", None))

    def get_jurisdiction_code(self, obj):
        jur = getattr(obj, "jurisdiction", None)
        return getattr(jur, "code", None)

    def get_jurisdiction_name(self, obj):
        jur = getattr(obj, "jurisdiction", None)
        return getattr(jur, "name", None)

    def get_jurisdiction_detail(self, obj):
        return serialize_jurisdiction(getattr(obj, "jurisdiction", None))

    def get_scope(self, obj):
        return VISIBILITY_TO_LIBRARY_SCOPE.get(
            getattr(obj, "visibility_scope", None),
            LIBRARY_SCOPE_PERSONAL,
        )

    def get_is_recent(self, obj):
        return is_recent_timestamp(getattr(obj, "created", None))

    def get_days_since_added(self, obj):
        return days_since_added(getattr(obj, "created", None))

    def get_days_remaining_as_new(self, obj):
        return days_remaining_as_new(getattr(obj, "created", None))

    def get_is_favorited(self, obj):
        favorited = self.context.get('favorited_ids')
        if favorited is not None:
            return obj.pk in favorited
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return LibraryFavorite.objects.filter(user=user, document=obj).exists()

    def get_is_in_my_library(self, obj):
        if obj.visibility_scope == VisibilityScope.CABINET:
            cabinet = self.context.get('cabinet')
            return bool(cabinet and obj.cabinet_id == getattr(cabinet, 'id', None))
        saved = self.context.get('saved_ids')
        if saved is not None:
            return obj.pk in saved
        cabinet = self.context.get('cabinet')
        if not cabinet:
            return False
        return LibrarySave.objects.filter(cabinet=cabinet, document=obj).exists()

    def get_is_owned(self, obj):
        cabinet = self.context.get('cabinet')
        return bool(
            cabinet
            and obj.visibility_scope == VisibilityScope.CABINET
            and obj.cabinet_id == getattr(cabinet, 'id', None)
        )

    def get_source_library(self, obj):
        return _source_library_label(obj)

    def get_created_at(self, obj):
        created = getattr(obj, "created", None)
        return created.isoformat() if created else None

    def get_updated_at(self, obj):
        modified = getattr(obj, "modified", None)
        return modified.isoformat() if modified else None

    def get_size(self, obj):
        f = getattr(obj, "file", None)
        if not f or not getattr(f, "name", ""):
            return 0
        try:
            return int(f.size or 0)
        except (OSError, ValueError, AttributeError, TypeError):
            return 0

    def get_tags(self, obj):
        try:
            return [tag.slug for tag in obj.tags.all() if getattr(tag, "slug", None)]
        except Exception:
            logger.exception("Failed to load tags for library document id=%s", getattr(obj, "pk", None))
            return []

    def to_representation(self, instance) -> dict:
        if 'tags' in self.fields and not isinstance(self.fields['tags'], serializers.SerializerMethodField):
            self.fields['tags'] = serializers.SerializerMethodField()

        try:
            data = super().to_representation(instance)
        except Exception:
            logger.exception("Failed to serialize library document id=%s", getattr(instance, "pk", None))
            created = getattr(instance, "created", None)
            modified = getattr(instance, "modified", None)
            return {
                "id": getattr(instance, "pk", None),
                "resource_uid": str(getattr(instance, "resource_uid", "") or "") or None,
                "title": getattr(instance, "title", "") or "",
                "category": getattr(instance, "category", "") or "",
                "resource_type": getattr(instance, "resource_type", "other") or "other",
                "description": getattr(instance, "description", "") or "",
                "file": None,
                "external_url": getattr(instance, "external_url", "") or "",
                "size": 0,
                "is_shared": bool(getattr(instance, "is_shared", False)),
                "visibility_scope": getattr(instance, "visibility_scope", None),
                "scope": VISIBILITY_TO_LIBRARY_SCOPE.get(
                    getattr(instance, "visibility_scope", None), LIBRARY_SCOPE_PERSONAL
                ),
                "jurisdiction": getattr(instance, "jurisdiction_id", None),
                "jurisdiction_code": getattr(getattr(instance, "jurisdiction", None), "code", None),
                "status": getattr(instance, "status", "published") or "published",
                "created_by": getattr(instance, "created_by_id", None),
                "created_by_name": _user_display_name(getattr(instance, "created_by", None)),
                "tags": [],
                "created": created.isoformat() if created else None,
                "created_at": created.isoformat() if created else None,
                "modified": modified.isoformat() if modified else None,
                "is_recent": is_recent_timestamp(created),
                "days_remaining_as_new": days_remaining_as_new(created),
            }

        file_url = data.get("file")
        if file_url and isinstance(file_url, str):
            request = self.context.get("request") if hasattr(self, "context") and self.context else None
            if request:
                if file_url.startswith("/"):
                    data["file"] = request.build_absolute_uri(file_url)
                elif not file_url.startswith("http://") and not file_url.startswith("https://"):
                    data["file"] = request.build_absolute_uri("/" + file_url.lstrip("/"))

        data["recent_window_days"] = LAST_ADDED_DAYS
        return data
