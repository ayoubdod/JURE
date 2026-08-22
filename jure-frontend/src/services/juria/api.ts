import axiosInstance from '@/utils/axiosInstance';
import type { JuriaMode } from '@/types/juria';
import type {
  JuriaApiConversationDetail,
  JuriaApiConversationListItem,
  JuriaApiDraftResponse,
  JuriaApiSendMessageResponse,
  JuriaApiUsage,
} from '@/services/juria/types';

const BASE = '/juria/';

const UUID_HEX_RE = /^[0-9a-f]{32}$/i;

/** Canonical lowercase UUID, or null if the value is not a conversation id. */
export function normalizeJuriaConversationId(id: unknown): string | null {
  if (id == null) return null;
  let raw = String(id).trim();
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  if (raw.startsWith('{') && raw.endsWith('}')) raw = raw.slice(1, -1).trim();
  const hex = raw.replace(/-/g, '');
  if (!UUID_HEX_RE.test(hex)) return null;
  const n = hex.toLowerCase();
  return `${n.slice(0, 8)}-${n.slice(8, 12)}-${n.slice(12, 16)}-${n.slice(16, 20)}-${n.slice(20)}`;
}

export function isJuriaConversationId(id: unknown): id is string {
  return normalizeJuriaConversationId(id) != null;
}

function conversationIdFromPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  return normalizeJuriaConversationId(rec.id ?? rec.uuid ?? rec.pk);
}

export type CreateConversationBody = {
  mode: JuriaMode;
  linked_case_id?: number | null;
  title?: string;
};

export type DraftBody = {
  document_type: string;
  parameters: Record<string, string>;
  linked_case_id?: number | null;
};

export async function apiJuriaListConversations(params?: {
  linked_case?: number;
  mode?: JuriaMode;
  is_archived?: boolean;
  page?: number;
  page_size?: number;
}) {
  const { data } = await axiosInstance.get<API.Paginated<JuriaApiConversationListItem>>(`${BASE}conversations/`, {
    params,
  });
  return data;
}

/** Fetch all pages (default: non-archived). */
export async function apiJuriaListAllConversations(filters?: {
  linked_case?: number;
  mode?: JuriaMode;
  is_archived?: boolean;
}) {
  const acc: JuriaApiConversationListItem[] = [];
  let page = 1;
  const page_size = 100;
  for (;;) {
    const data = await apiJuriaListConversations({ ...filters, page, page_size });
    acc.push(...(data.results ?? []));
    const last = data.last_page ?? 1;
    if (page >= last) break;
    page += 1;
  }
  return acc;
}

export async function apiJuriaCreateConversation(body: CreateConversationBody) {
  const { data } = await axiosInstance.post<{ id: string } | JuriaApiConversationDetail>(`${BASE}conversations/`, body);
  if (data && typeof data === 'object' && 'messages' in data && Array.isArray((data as JuriaApiConversationDetail).messages)) {
    const id = conversationIdFromPayload(data);
    if (!id) throw new Error('Conversation créée sans identifiant.');
    return {
      ...(data as JuriaApiConversationDetail),
      id,
      is_archived: Boolean((data as JuriaApiConversationDetail).is_archived),
      messages: (data as JuriaApiConversationDetail).messages ?? [],
    };
  }
  const id = conversationIdFromPayload(data);
  if (!id) throw new Error('Conversation créée sans identifiant.');
  return apiJuriaGetConversation(id);
}

export async function apiJuriaGetConversation(conversationUuid: string) {
  const id = normalizeJuriaConversationId(conversationUuid);
  if (!id) {
    throw new Error('Identifiant de conversation invalide.');
  }
  const { data } = await axiosInstance.get<JuriaApiConversationDetail>(`${BASE}conversations/${id}/`);
  return data;
}

export async function apiJuriaArchiveConversation(conversationUuid: string) {
  const id = normalizeJuriaConversationId(conversationUuid);
  if (!id) throw new Error('Identifiant de conversation invalide.');
  await axiosInstance.delete(`${BASE}conversations/${id}/`);
}

export async function apiJuriaSendMessage(
  conversationUuid: string,
  body: { message: string; file?: File | null; file_name?: string },
  opts?: { signal?: AbortSignal }
) {
  const id = normalizeJuriaConversationId(conversationUuid);
  if (!id) throw new Error('Identifiant de conversation invalide.');
  const fd = new FormData();
  fd.append('message', body.message);
  if (body.file) {
    fd.append('file', body.file);
    if (body.file_name) fd.append('file_name', body.file_name);
  }
  const { data } = await axiosInstance.post<JuriaApiSendMessageResponse>(
    `${BASE}conversations/${id}/messages/`,
    fd,
    { signal: opts?.signal }
  );
  return data;
}

export async function apiJuriaDraft(conversationUuid: string, body: DraftBody) {
  const id = normalizeJuriaConversationId(conversationUuid);
  if (!id) throw new Error('Identifiant de conversation invalide.');
  const { data } = await axiosInstance.post<JuriaApiDraftResponse>(`${BASE}conversations/${id}/draft/`, body);
  return data;
}

export async function apiJuriaUsage() {
  const { data } = await axiosInstance.get<JuriaApiUsage>(`${BASE}usage/`);
  return data;
}

/** Authenticated download (blob). Caller triggers browser save. */
export async function apiJuriaDownloadDocument(messageUuid: string, opts?: { signal?: AbortSignal }) {
  const { data } = await axiosInstance.get<Blob>(`${BASE}documents/${messageUuid}/download/`, {
    responseType: 'blob',
    signal: opts?.signal,
  });
  return data;
}
