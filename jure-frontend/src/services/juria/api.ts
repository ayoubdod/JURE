import axiosInstance from '@/utils/axiosInstance';
import type { JuriaMode } from '@/types/juria';
import type {
  JuriaApiConversationDetail,
  JuriaApiConversationListItem,
  JuriaApiDraftResponse,
  JuriaApiMessage,
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

export type JuriaProjectCreateBody = {
  name: string;
  description?: string;
  preferred_language?: string;
  jurisdiction_code?: string;
  legal_domain?: string;
  instructions?: string;
  linked_case_id?: number | null;
  permissions?: Record<string, string>;
  case_document_ids?: number[];
  library_document_ids?: number[];
  connect_calendar?: boolean;
  connect_tasks?: boolean;
  client_id?: number | null;
  member_ids?: number[];
  is_simple?: boolean;
  is_favorite?: boolean;
};

export async function apiJuriaListProjects(params?: {
  status?: string;
  search?: string;
  favorite?: boolean;
  page?: number;
  page_size?: number;
}) {
  const { data } = await axiosInstance.get<API.Paginated<import('@/types/juria').JuriaProject>>(
    `${BASE}projects/`,
    { params }
  );
  return data;
}

export async function apiJuriaListAllProjects(filters?: { status?: string; search?: string }) {
  const acc: import('@/types/juria').JuriaProject[] = [];
  let page = 1;
  for (;;) {
    const data = await apiJuriaListProjects({ ...filters, page, page_size: 100 });
    acc.push(...(data.results ?? []));
    if (page >= (data.last_page ?? 1)) break;
    page += 1;
  }
  return acc;
}

export async function apiJuriaCreateProject(body: JuriaProjectCreateBody) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaProject>(`${BASE}projects/`, body);
  return data;
}

export async function apiJuriaGetProject(id: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaProject>(`${BASE}projects/${id}/`);
  return data;
}

export async function apiJuriaUpdateProject(id: string, body: Partial<JuriaProjectCreateBody> & { is_favorite?: boolean }) {
  const { data } = await axiosInstance.patch<import('@/types/juria').JuriaProject>(`${BASE}projects/${id}/`, body);
  return data;
}

export async function apiJuriaDeleteProject(id: string) {
  await axiosInstance.delete(`${BASE}projects/${id}/`);
}

export async function apiJuriaArchiveProject(id: string) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaProject>(`${BASE}projects/${id}/archive/`);
  return data;
}

export async function apiJuriaRestoreProject(id: string) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaProject>(`${BASE}projects/${id}/restore/`);
  return data;
}

export async function apiJuriaDuplicateProject(id: string) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaProject>(`${BASE}projects/${id}/duplicate/`);
  return data;
}

export async function apiJuriaProjectContext(id: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaContextSummary>(
    `${BASE}projects/${id}/context/`
  );
  return data;
}

export async function apiJuriaUpdatePermission(id: string, resource: string, level: string) {
  const { data } = await axiosInstance.patch(`${BASE}projects/${id}/permissions/`, { resource, level });
  return data as { resource: string; level: string };
}

export async function apiJuriaListMembers(projectId: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaProjectMember[]>(
    `${BASE}projects/${projectId}/members/`
  );
  return data;
}

export async function apiJuriaInviteMember(projectId: string, user_id: number, role: string) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaProjectMember>(
    `${BASE}projects/${projectId}/members/`,
    { user_id, role }
  );
  return data;
}

export async function apiJuriaUpdateMemberRole(projectId: string, memberId: string, role: string) {
  const { data } = await axiosInstance.patch<import('@/types/juria').JuriaProjectMember>(
    `${BASE}projects/${projectId}/members/${memberId}/`,
    { role }
  );
  return data;
}

export async function apiJuriaRemoveMember(projectId: string, memberId: string) {
  await axiosInstance.delete(`${BASE}projects/${projectId}/members/${memberId}/`);
}

export async function apiJuriaListSources(projectId: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaProjectSource[]>(
    `${BASE}projects/${projectId}/sources/`
  );
  return data;
}

export async function apiJuriaAddSource(projectId: string, body: Record<string, unknown>) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaProjectSource>(
    `${BASE}projects/${projectId}/sources/`,
    body
  );
  return data;
}

export async function apiJuriaRemoveSource(projectId: string, sourceId: string) {
  await axiosInstance.delete(`${BASE}projects/${projectId}/sources/${sourceId}/`);
}

export async function apiJuriaListThreads(projectId: string, params?: { search?: string; is_archived?: boolean }) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaThread[]>(
    `${BASE}projects/${projectId}/threads/`,
    { params }
  );
  return data;
}

export async function apiJuriaCreateThread(projectId: string, body: { title?: string; mode?: JuriaMode }) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaThread>(
    `${BASE}projects/${projectId}/threads/`,
    body
  );
  return data;
}

export async function apiJuriaUpdateThread(threadId: string, body: { title?: string; is_archived?: boolean }) {
  const { data } = await axiosInstance.patch<import('@/types/juria').JuriaThread>(`${BASE}threads/${threadId}/`, body);
  return data;
}

export async function apiJuriaDeleteThread(threadId: string) {
  await axiosInstance.delete(`${BASE}threads/${threadId}/`);
}

export async function apiJuriaListThreadMessages(threadId: string) {
  const { data } = await axiosInstance.get<JuriaApiMessage[]>(`${BASE}threads/${threadId}/messages/`);
  return data;
}

export async function apiJuriaSendThreadMessage(
  threadId: string,
  body: { message: string; file?: File | null; file_name?: string; language?: string; mode?: string },
  opts?: { signal?: AbortSignal }
) {
  const fd = new FormData();
  fd.append('message', body.message);
  if (body.language) fd.append('language', body.language);
  if (body.mode) fd.append('mode', body.mode);
  if (body.file) {
    fd.append('file', body.file);
    if (body.file_name) fd.append('file_name', body.file_name);
  }
  const { data } = await axiosInstance.post<JuriaApiSendMessageResponse>(
    `${BASE}threads/${threadId}/messages/`,
    fd,
    { signal: opts?.signal }
  );
  return data;
}

export async function apiJuriaEditMessage(
  messageId: string,
  body: { content: string; language?: string; regenerate?: boolean }
) {
  const { data } = await axiosInstance.post<JuriaApiSendMessageResponse>(`${BASE}messages/${messageId}/edit/`, body);
  return data;
}

export async function apiJuriaDeleteMessage(messageId: string) {
  await axiosInstance.delete(`${BASE}messages/${messageId}/`);
}

export async function apiJuriaListFiles(projectId: string, search?: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaFile[]>(`${BASE}projects/${projectId}/files/`, {
    params: { search },
  });
  return data;
}

export async function apiJuriaUploadFile(projectId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaFile>(
    `${BASE}projects/${projectId}/files/`,
    fd
  );
  return data;
}

export async function apiJuriaRemoveFile(projectId: string, fileId: string) {
  await axiosInstance.delete(`${BASE}projects/${projectId}/files/${fileId}/`);
}

export async function apiJuriaDownloadFileBlob(projectId: string, fileId: string) {
  const { data } = await axiosInstance.get<Blob>(`${BASE}projects/${projectId}/files/${fileId}/download/`, {
    responseType: 'blob',
  });
  return data;
}

export async function apiJuriaListArtifacts(projectId: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaArtifact[]>(
    `${BASE}projects/${projectId}/artifacts/`
  );
  return data;
}

export async function apiJuriaGetArtifact(projectId: string, artifactId: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaArtifact>(
    `${BASE}projects/${projectId}/artifacts/${artifactId}/`
  );
  return data;
}

export async function apiJuriaCreateArtifact(
  projectId: string,
  body: { title?: string; artifact_type?: string; content_html?: string; content_markdown?: string; thread_id?: string }
) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaArtifact>(
    `${BASE}projects/${projectId}/artifacts/`,
    body
  );
  return data;
}

export async function apiJuriaUpdateArtifact(
  projectId: string,
  artifactId: string,
  body: { title?: string; content_html?: string; content_markdown?: string; note?: string }
) {
  const { data } = await axiosInstance.patch<import('@/types/juria').JuriaArtifact>(
    `${BASE}projects/${projectId}/artifacts/${artifactId}/`,
    body
  );
  return data;
}

export async function apiJuriaDuplicateArtifact(projectId: string, artifactId: string) {
  const { data } = await axiosInstance.post<import('@/types/juria').JuriaArtifact>(
    `${BASE}projects/${projectId}/artifacts/${artifactId}/duplicate/`
  );
  return data;
}

export async function apiJuriaExportArtifact(projectId: string, artifactId: string, format: string) {
  const { data } = await axiosInstance.get<Blob>(`${BASE}projects/${projectId}/artifacts/${artifactId}/export/`, {
    params: { format },
    responseType: 'blob',
  });
  return data;
}

export async function apiJuriaCompareArtifact(projectId: string, artifactId: string, from: number, to: number) {
  const { data } = await axiosInstance.get(`${BASE}projects/${projectId}/artifacts/${artifactId}/compare/`, {
    params: { from, to },
  });
  return data as { from: number; to: number; old: string; new: string; diff: string[] };
}

export async function apiJuriaListActivity(projectId: string) {
  const { data } = await axiosInstance.get<import('@/types/juria').JuriaActivity[]>(
    `${BASE}projects/${projectId}/activity/`
  );
  return data;
}

export async function apiJuriaLookupCases(search?: string) {
  const { data } = await axiosInstance.get<
    { id: number; reference: string; title: string; status: string; case_type: string; client_id?: number; client_name?: string }[]
  >(`${BASE}lookup/cases/`, { params: { search } });
  return data;
}

export async function apiJuriaLookupCaseDocuments(caseId: number) {
  const { data } = await axiosInstance.get<{ id: number; file_name: string; other_type?: string }[]>(
    `${BASE}lookup/case-documents/`,
    { params: { case_id: caseId } }
  );
  return data;
}

export async function apiJuriaLookupLibrary(search?: string) {
  const { data } = await axiosInstance.get<
    { id: number; title: string; visibility_scope: string; resource_type: string }[]
  >(`${BASE}lookup/library/`, { params: { search } });
  return data;
}

export async function apiJuriaSendMessageWithLang(
  conversationUuid: string,
  body: { message: string; file?: File | null; file_name?: string; language?: string },
  opts?: { signal?: AbortSignal }
) {
  const id = normalizeJuriaConversationId(conversationUuid);
  if (!id) throw new Error('Identifiant de conversation invalide.');
  const fd = new FormData();
  fd.append('message', body.message);
  if (body.language) fd.append('language', body.language);
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
