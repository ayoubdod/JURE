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
    return data as JuriaApiConversationDetail;
  }
  const id = (data as { id: string }).id;
  return apiJuriaGetConversation(id);
}

export async function apiJuriaGetConversation(conversationUuid: string) {
  const { data } = await axiosInstance.get<JuriaApiConversationDetail>(`${BASE}conversations/${conversationUuid}/`);
  return data;
}

export async function apiJuriaArchiveConversation(conversationUuid: string) {
  await axiosInstance.delete(`${BASE}conversations/${conversationUuid}/`);
}

export async function apiJuriaSendMessage(
  conversationUuid: string,
  body: { message: string; file?: File | null; file_name?: string },
  opts?: { signal?: AbortSignal }
) {
  const fd = new FormData();
  fd.append('message', body.message);
  if (body.file) {
    fd.append('file', body.file);
    if (body.file_name) fd.append('file_name', body.file_name);
  }
  const { data } = await axiosInstance.post<JuriaApiSendMessageResponse>(
    `${BASE}conversations/${conversationUuid}/messages/`,
    fd,
    { signal: opts?.signal }
  );
  return data;
}

export async function apiJuriaDraft(conversationUuid: string, body: DraftBody) {
  const { data } = await axiosInstance.post<JuriaApiDraftResponse>(`${BASE}conversations/${conversationUuid}/draft/`, body);
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
