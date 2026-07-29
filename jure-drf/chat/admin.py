from django.contrib import admin
from .models import (
    Conversation,
    ConversationMembership,
    Message,
    MessagePin,
    Attachment,
    ReadReceipt,
    DeliveryReceipt,
)

admin.site.register(Conversation)
admin.site.register(ConversationMembership)
admin.site.register(Message)
admin.site.register(MessagePin)
admin.site.register(Attachment)
admin.site.register(ReadReceipt)
admin.site.register(DeliveryReceipt)    