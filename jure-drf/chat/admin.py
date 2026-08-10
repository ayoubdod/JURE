from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import (
    Attachment,
    Conversation,
    ConversationMembership,
    DeliveryReceipt,
    Message,
    MessagePin,
    ReadReceipt,
)

admin.site.register(Conversation, ModelAdmin)
admin.site.register(ConversationMembership, ModelAdmin)
admin.site.register(Message, ModelAdmin)
admin.site.register(MessagePin, ModelAdmin)
admin.site.register(Attachment, ModelAdmin)
admin.site.register(ReadReceipt, ModelAdmin)
admin.site.register(DeliveryReceipt, ModelAdmin)
