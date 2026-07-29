import type { JuriaApiConversationDetail, JuriaApiConversationListItem, JuriaApiMessage } from '@/services/juria/types';
import type { JuriaConversation, JuriaMessage, JuriaMode } from '@/types/juria';

export function mapApiListItemToConversation(item: JuriaApiConversationListItem): JuriaConversation {
  return {
    id: item.id,
    title: item.title || 'Conversation',
    mode: item.mode as JuriaMode,
    caseId: item.linked_case_id ?? undefined,
    archived: item.is_archived,
    updatedAt: item.updated_at,
    createdAt: item.created_at,
    messages: [],
    lastMessagePreview: item.last_message_preview,
  };
}

export function mapApiDetailToConversation(detail: JuriaApiConversationDetail): JuriaConversation {
  const base = mapApiListItemToConversation(detail);
  return {
    ...base,
    messages: (detail.messages ?? []).map(mapApiMessageToJuria),
    lastMessagePreview: detail.last_message_preview,
  };
}

export function mapApiMessageToJuria(m: JuriaApiMessage): JuriaMessage {
  const role =
    m.role === 'USER' ? 'user' : m.role === 'SYSTEM' ? 'system' : ('assistant' as const);

  const msg: JuriaMessage = {
    id: m.id,
    role,
    content: m.content ?? '',
    createdAt: m.created_at,
    suggestions: m.suggestions,
    tokensUsed: m.tokens_used ?? undefined,
  };

  if (m.has_attachment && m.attachment_name) {
    msg.attachment = {
      name: m.attachment_name,
      mime: m.attachment_type ?? 'application/octet-stream',
    };
  }

  if (m.generated_document_path) {
    msg.documentCard = {
      typeName: 'Document généré',
      previewLines: (m.content || '').split('\n').slice(0, 4).join('\n').trim() || '—',
      generatedAt: m.created_at,
      downloadMessageId: m.id,
    };
  }

  return msg;
}
