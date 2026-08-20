import json
import logging
from rest_framework import serializers
from django.http import QueryDict

from commons.models import Tag
from core.utils import is_valid_slug
from .models import Document

logger = logging.getLogger(__name__)


class SafeFileURLField(serializers.FileField):
    """File URL that never raises if the blob is missing from disk/S3."""

    def to_representation(self, value):
        try:
            return super().to_representation(value)
        except (OSError, ValueError, AttributeError):
            name = getattr(value, "name", None)
            return name or None


class DocumentSerializer(serializers.ModelSerializer):

    size = serializers.SerializerMethodField()
    file = SafeFileURLField(required=False, allow_null=True, allow_empty_file=True)
    # Don't define tags here - we'll add it manually in __init__ to prevent DRF auto-generation
    
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = Document
        # Exclude tags from fields - we'll add it manually to prevent DRF auto-generation
        fields = ['id', 'title', 'category', 'description', 'file', 'size', 'created', 'modified']
        read_only_fields = ['created', 'modified']
        extra_kwargs = {
            'title': {'required': False},
            'category': {'required': False},
        }
    
    def __init__(self, *args, **kwargs):
        # Get request context before calling super
        context = kwargs.get('context', {})
        request = context.get('request') if context else None
        
        super().__init__(*args, **kwargs)
        
        # CRITICAL: Manually add tags field AFTER super().__init__()
        # This prevents DRF from auto-generating a ManyToMany relational field with queryset
        # Default to SerializerMethodField (for read operations)
        # Only use ListField for explicit write operations
        if request and request.method in ('POST', 'PATCH', 'PUT'):
            # For write operations, use ListField
            self.fields['tags'] = serializers.ListField(
                child=serializers.CharField(),
                required=False,
                write_only=True,
                allow_null=True
            )
        else:
            # For read operations or when no request (e.g., response serialization), use SerializerMethodField
            # This prevents any auto-generated relational field with queryset
            self.fields['tags'] = serializers.SerializerMethodField()
        
        # Make file required for create, optional for update
        if self.instance is None:
            # Creating new document - file is required
            self.fields['file'].required = True
            self.fields['file'].allow_null = False
            self.fields['title'].required = True
            self.fields['category'].required = True
        else:
            # Updating existing document - file is optional
            self.fields['file'].required = False
            self.fields['file'].allow_null = True

    def to_internal_value(self, data):
        """
        Parse tags from FormData format (tags[0], tags[1]) or JSON format.
        Handles both application/json and multipart/form-data.
        """
        # Handle FormData (QueryDict) - parse tags[0], tags[1] format
        if isinstance(data, QueryDict):
            tags_list = []
            
            # First, try to parse tags[0], tags[1] format
            i = 0
            while f'tags[{i}]' in data:
                tag_value = data.get(f'tags[{i}]')
                if tag_value:
                    tags_list.append(tag_value)
                i += 1
            
            # If no indexed tags found, try other formats
            if not tags_list:
                # Try getlist for multiple values with same key
                if hasattr(data, 'getlist') and 'tags' in data:
                    tags_list = data.getlist('tags')
                # Try single 'tags' field (might be JSON string)
                elif 'tags' in data:
                    tags_value = data.get('tags')
                    if tags_value:
                        if isinstance(tags_value, str):
                            # Try parsing as JSON array
                            try:
                                tags_list = json.loads(tags_value)
                            except (json.JSONDecodeError, ValueError):
                                # If not JSON, treat as single value
                                tags_list = [tags_value] if tags_value else []
                        elif isinstance(tags_value, list):
                            tags_list = tags_value
            
            # Convert QueryDict to regular dict
            data_dict = {}
            for key in data.keys():
                # Skip tags-related keys (we'll add parsed tags separately)
                if not (key.startswith('tags[') or key == 'tags'):
                    # For QueryDict, handle files specially
                    if key == 'file':
                        # Files in FormData are accessed directly, not via getlist
                        file_value = data.get(key)
                        if file_value:
                            data_dict[key] = file_value
                    else:
                        # For other fields, get the value(s)
                        if hasattr(data, 'getlist'):
                            values = data.getlist(key)
                            data_dict[key] = values[0] if len(values) == 1 else values
                        else:
                            data_dict[key] = data.get(key)
            
            # Add parsed tags if we found any or if tags was in the request
            if tags_list or 'tags' in data:
                data_dict['tags'] = tags_list
            
            data = data_dict
        
        # For regular dicts (JSON), ensure tags is properly formatted
        elif isinstance(data, dict):
            if 'tags' in data:
                tags_value = data.get('tags')
                if tags_value is not None:
                    # Ensure tags is a list
                    if isinstance(tags_value, str):
                        try:
                            data['tags'] = json.loads(tags_value)
                        except (json.JSONDecodeError, ValueError):
                            data['tags'] = [tags_value] if tags_value else []
                    elif not isinstance(tags_value, list):
                        data['tags'] = [tags_value] if tags_value else []
        
        return super().to_internal_value(data)
    
    def validate_tags(self, value: list[str] | None):
        """Validate tags - accept None, empty list, or list of valid slugs."""
        if value is None:
            return None
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list.")
        # Filter out empty strings and None values
        value = [tag for tag in value if tag and isinstance(tag, str) and tag.strip()]
        if value:
            for tag in value:
                # Check if tag is a valid slug
                if not is_valid_slug(tag):
                    raise serializers.ValidationError(f"Invalid tag: {tag}")
        return value
    
    def validate_category(self, value):
        """Validate category is a valid choice."""
        if value:
            valid_categories = [choice[0] for choice in Document.DocumentCategory.choices]
            if value not in valid_categories:
                raise serializers.ValidationError(
                    f"Invalid category. Must be one of: {', '.join(valid_categories)}"
                )
        return value
    
    def create(self, validated_data):
        """
        Create document with tags handling.
        File is already validated as required in __init__.
        We handle tags separately to avoid DRF auto-generating a ManyToMany field.
        """
        tags_data = validated_data.pop('tags', [])
        
        # Create the document instance first (without tags)
        instance = super().create(validated_data)
        
        # Then set tags manually to avoid DRF field generation issues
        if tags_data:
            tags = []
            for tag in tags_data:
                tag_obj, created = Tag.objects.get_or_create(slug=tag)
                tags.append(tag_obj)
            instance.tags.set(tags)
            instance.save()

        return instance

    def update(self, instance: Document, validated_data: dict):
        """
        Update document instance with partial data.
        Handles tags separately as ManyToMany field.
        Only updates fields that are provided in the request.
        """
        # Extract tags to handle separately (ManyToMany field)
        tags_data = validated_data.pop('tags', None)
        
        # Handle null description - convert to empty string
        if 'description' in validated_data:
            if validated_data['description'] is None:
                validated_data['description'] = ''
        
        # Handle file field - only update if a new file is provided
        # If file is None, empty string, or empty file, don't update the file field
        if 'file' in validated_data:
            file_value = validated_data.get('file')
            # Remove file from update if it's None, empty, or an empty file object
            if file_value is None:
                validated_data.pop('file')
            elif isinstance(file_value, str) and not file_value.strip():
                validated_data.pop('file')
            elif hasattr(file_value, 'name') and not file_value.name:
                validated_data.pop('file')
            elif hasattr(file_value, 'size') and file_value.size == 0:
                validated_data.pop('file')
        
        # Update the instance with validated data (excluding tags)
        instance = super().update(instance, validated_data)
        
        # Handle tags update only if tags were explicitly provided in the request
        if tags_data is not None:
            tags = []
            # Filter out empty strings and whitespace-only strings
            tags_data = [tag for tag in tags_data if tag and isinstance(tag, str) and tag.strip()]
            for tag in tags_data:
                tag_obj, created = Tag.objects.get_or_create(slug=tag)
                tags.append(tag_obj)
            instance.tags.set(tags)
        
        # Save the instance to ensure all changes are persisted
        instance.save()
        
        return instance
    
    def get_size(self, obj):
        """Get file size, return 0 if the blob is missing (common on ephemeral Railway disks)."""
        f = getattr(obj, "file", None)
        if not f or not getattr(f, "name", ""):
            return 0
        try:
            return int(f.size or 0)
        except (OSError, ValueError, AttributeError, TypeError):
            return 0
    
    def get_tags(self, obj):
        """Get tags as a list of slugs."""
        try:
            return [tag.slug for tag in obj.tags.all() if getattr(tag, "slug", None)]
        except Exception:
            logger.exception("Failed to load tags for library document id=%s", getattr(obj, "pk", None))
            return []
    
    def to_representation(self, instance) -> dict:
        """Convert model instance to dictionary representation."""
        # Ensure tags field is SerializerMethodField for read operations
        # (it might be ListField with write_only=True from __init__)
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
                "title": getattr(instance, "title", "") or "",
                "category": getattr(instance, "category", "") or "",
                "description": getattr(instance, "description", "") or "",
                "file": None,
                "size": 0,
                "tags": [],
                "created": created.isoformat() if created else None,
                "modified": modified.isoformat() if modified else None,
            }

        # Ensure file URL is absolute
        file_url = data.get("file")
        if file_url and isinstance(file_url, str):
            request = self.context.get("request") if hasattr(self, "context") and self.context else None
            if request:
                if file_url.startswith("/"):
                    data["file"] = request.build_absolute_uri(file_url)
                elif not file_url.startswith("http://") and not file_url.startswith("https://"):
                    data["file"] = request.build_absolute_uri("/" + file_url.lstrip("/"))

        return data