import type { JuriaApiConversationDetail, JuriaApiConversationListItem, JuriaApiMessage } from '@/services/juria/types';
import { normalizeJuriaConversationId } from '@/services/juria/api';
import type { JuriaConversation, JuriaMessage, JuriaMode } from '@/types/juria';

const MODES: JuriaMode[] = ['CHAT', 'CONTRACT_ANALYSIS', 'LEGAL_RESEARCH', 'DOCUMENT_DRAFTING'];

function mapMode(mode: unknown): JuriaMode {
  const m = String(mode || '').toUpperCase() as JuriaMode;
  return MODES.includes(m) ? m : 'CHAT';
}

export function mapApiListItemToConversation(item: JuriaApiConversationListItem): JuriaConversation {
  const id = normalizeJuriaConversationId(item.id) ?? String(item.id ?? '');
  return {
    id,
    title: (item.title || '').trim() || 'Conversation',
    mode: mapMode(item.mode),
    caseId: item.linked_case_id ?? undefined,
    archived: Boolean(item.is_archived),
    updatedAt: item.updated_at || new Date().toISOString(),
    createdAt: item.created_at,
    messages: [],
    lastMessagePreview: item.last_message_preview,
    projectId: item.project_id ?? undefined,
    threadId: item.thread_id ?? undefined,
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

  msg.author = m.author ?? undefined;
  msg.sources = m.sources ?? [];
  msg.analysis = (m.analysis as JuriaMessage['analysis']) ?? undefined;
  msg.isSuperseded = Boolean(m.is_superseded);
  msg.editedAt = m.edited_at;
  msg.parentMessageId = m.parent_message_id ?? null;
  msg.versions = m.versions;

  return msg;
}
