from rest_framework import serializers

from ..models import ConversationMembership
from .users import UserThinSerializer


class ConversationMembershipSerializer(serializers.ModelSerializer):
    user = UserThinSerializer(read_only=True)

    class Meta:
        model = ConversationMembership
        fields = ("id", "user", "is_admin", "archived", "last_read_at", "joined_at")
