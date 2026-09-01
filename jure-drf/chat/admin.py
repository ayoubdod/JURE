from django.contrib import admin

from core.unfold_admin import JureModelAdmin
from .models import (
    Attachment,
    Conversation,
    ConversationMembership,
    DeliveryReceipt,
    Message,
    MessagePin,
    ReadReceipt,
)

admin.site.register(Conversation, JureModelAdmin)
admin.site.register(ConversationMembership, JureModelAdmin)
admin.site.register(Message, JureModelAdmin)
admin.site.register(MessagePin, JureModelAdmin)
admin.site.register(Attachment, JureModelAdmin)
admin.site.register(ReadReceipt, JureModelAdmin)
admin.site.register(DeliveryReceipt, JureModelAdmin)
