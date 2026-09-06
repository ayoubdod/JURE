from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from cases.models import Case


class ClientCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ['reference', 'title', 'category', 'status']


def _firm_client_profile(obj):
    try:
        return obj.firm_client_profile
    except ObjectDoesNotExist:
        return None

