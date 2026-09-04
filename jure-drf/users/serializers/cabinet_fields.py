from rest_framework import serializers


def _cabinet_for_user(obj):
    cabinet = None
    if hasattr(obj, 'get_owned_cabinet_or_none'):
        cabinet = obj.get_owned_cabinet_or_none()
    if not cabinet:
        cabinet = getattr(obj, 'cabinet', None)
    return cabinet


class CabinetLogoField(serializers.ImageField):
    """ImageField that reads from cabinet.logo and writes to cabinet.logo."""

    def get_attribute(self, obj):
        cabinet = _cabinet_for_user(obj)
        if cabinet:
            return getattr(cabinet, 'logo', None)
        return None


class CabinetAttrField(serializers.Field):
    """Writable field that reads/writes an attribute on the user's cabinet."""

    def __init__(self, cabinet_attr, child, **kwargs):
        self.cabinet_attr = cabinet_attr
        self.child = child
        kwargs.setdefault('required', False)
        kwargs.setdefault('allow_null', True)
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        cabinet = _cabinet_for_user(instance)
        if cabinet is None:
            return None
        return getattr(cabinet, self.cabinet_attr, None)

    def to_representation(self, value):
        return self.child.to_representation(value) if value is not None else None

    def to_internal_value(self, data):
        return self.child.run_validation(data)
