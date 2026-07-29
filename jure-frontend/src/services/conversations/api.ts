import axiosInstance from '@/utils/axiosInstance';
import { getFormDataFromObject } from '@/utils/functions';

/**
 * Chat API – requires baseURL to include /api/v1 (e.g. VITE_API_BASE_URL=http://localhost:8000/api/v1).
 * All paths resolve to ${baseURL}/chat/... = api/v1/chat/...
 */

export const apiListConversations = (params?: { include_archived?: 0 | 1 }) =>
  axiosInstance.get<API.Conversation[]>('/chat/conversations/', { params });

/** Fetch suggested icon presets for group chats. */
export const apiGetSuggestedIcons = () =>
  axiosInstance.get<API.SuggestedIcon[]>('/chat/conversations/suggested-icons/');

/** Fetch messages with pagination. Supports before_id for loading older messages. */
export const apiGetMessages = (
  conversationId: number,
  params?: { before_id?: number; before?: string; after?: string; limit?: number }
) =>
  axiosInstance
    .get<API.Message[]>(`/chat/conversations/${conversationId}/messages/`, { params })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.get<API.Message[]>('/chat/messages/', {
          params: { conversation_id: conversationId, ...params },
        });
      }
      throw err;
    });

// export const apiSendMessage = async (payload: SendMessageDTO) => {
//   if (payload.file) {
//     const form = new FormData();
//     form.append('content', payload.content);
//     form.append('type', payload.type ?? 'text');
//     if (payload.replyTo) form.append('replyTo', payload.replyTo);
//     form.append('file', payload.file);
//     return axiosInstance.post<ChatMessage>(`/chat/conversations/${payload.chatId}/messages/`, form, {
//       headers: { 'Content-Type': 'multipart/form-data' },
//     });
//   }
//   return axiosInstance.post<ChatMessage>(`/chat/conversations/${payload.chatId}/messages/`, {
//     content: payload.content,
//     type: payload.type ?? 'text',
//     replyTo: payload.replyTo ?? null,
//   });
// };

export const apiMarkRead = (messageId: number) =>
  axiosInstance.post(`/chat/messages/${messageId}/mark_read/`);

/** Mark conversation as read (call when user opens conversation) */
export const apiMarkConversationRead = (conversationId: number) =>
  axiosInstance.post(`/chat/conversations/${conversationId}/mark_read/`);

export const apiCreateConversation = (payload: { participants: number[]; title?: string, type?: 'direct' | 'group' }) =>
  axiosInstance.post<API.Conversation>('/chat/conversations/', payload);

export const apiDeleteConversation = (conversationId: number) =>
  axiosInstance.delete(`/chat/conversations/${conversationId}/`);

/** Rename a group conversation. Only group conversations (type === "group") can be renamed. */
export const apiRenameConversation = (conversationId: number, title: string) =>
  axiosInstance.patch<API.Conversation>(
    `/chat/conversations/${conversationId}/`,
    { title },
    { headers: jsonHeaders }
  );

/** Set group icon to a preset (emoji). */
export const apiSetConversationIconPreset = (conversationId: number, iconPreset: string) =>
  axiosInstance.patch<API.Conversation>(
    `/chat/conversations/${conversationId}/`,
    { icon_preset: iconPreset },
    { headers: jsonHeaders }
  );

/** Upload custom image as group icon. */
export const apiUploadConversationIcon = (conversationId: number, file: File) => {
  const formData = new FormData();
  formData.append('icon', file);
  return axiosInstance.patch<API.Conversation>(
    `/chat/conversations/${conversationId}/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};

const jsonHeaders = { 'Content-Type': 'application/json' };

export const apiArchiveConversation = (conversationId: number) =>
  axiosInstance
    .post(`/chat/conversations/${conversationId}/archive/`, { archived: true }, { headers: jsonHeaders })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.post(`/chat/conversations/archive/`, { conversation_id: conversationId, id: conversationId, archived: true }, { headers: jsonHeaders });
      }
      throw err;
    })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.patch(`/chat/conversations/${conversationId}/`, { archived: true }, { headers: jsonHeaders });
      }
      throw err;
    });

export const apiUnarchiveConversation = (conversationId: number) =>
  axiosInstance
    .post(`/chat/conversations/${conversationId}/archive/`, { archived: false }, { headers: jsonHeaders })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.post(`/chat/conversations/archive/`, { conversation_id: conversationId, id: conversationId, archived: false }, { headers: jsonHeaders });
      }
      throw err;
    })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.patch(`/chat/conversations/${conversationId}/`, { archived: false }, { headers: jsonHeaders });
      }
      throw err;
    });

export const apiPinConversation = (conversationId: number) =>
  axiosInstance
    .post(`/chat/conversations/${conversationId}/pin/`, { pinned: true }, { headers: jsonHeaders })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.post(`/chat/conversations/pin/`, { conversation_id: conversationId, id: conversationId, pinned: true }, { headers: jsonHeaders });
      }
      throw err;
    })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.patch(`/chat/conversations/${conversationId}/`, { is_pinned: true }, { headers: jsonHeaders });
      }
      throw err;
    });

export const apiUnpinConversation = (conversationId: number) =>
  axiosInstance
    .post(`/chat/conversations/${conversationId}/pin/`, { pinned: false }, { headers: jsonHeaders })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.post(`/chat/conversations/pin/`, { conversation_id: conversationId, id: conversationId, pinned: false }, { headers: jsonHeaders });
      }
      throw err;
    })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.patch(`/chat/conversations/${conversationId}/`, { is_pinned: false }, { headers: jsonHeaders });
      }
      throw err;
    });

/**
 * Send a message. Attachments: legacy POST /chat/messages/ with FormData.
 * JSON: preferred POST /chat/conversations/{id}/messages/ with body (+ messageType + shared*Id);
 * falls back to POST /chat/messages/ with conversation on 404.
 */
export const apiSendMessage = (data: API.CreateMessageForm) => {
  const hasAttachments = data.attachments && data.attachments.length > 0;
  if (hasAttachments) {
    return axiosInstance.post<API.Message>(`/chat/messages/`, getFormDataFromObject(data));
  }
  const convId = data.conversation;
  const json: Record<string, unknown> = {
    body: data.body ?? '',
  };
  if (data.messageType && data.messageType !== 'TEXT') {
    json.messageType = data.messageType;
    if (data.sharedCaseId != null) json.sharedCaseId = data.sharedCaseId;
    if (data.sharedTaskId != null) json.sharedTaskId = data.sharedTaskId;
    if (data.sharedAppointmentId != null) json.sharedAppointmentId = data.sharedAppointmentId;
  }

  return axiosInstance
    .post<API.Message>(`/chat/conversations/${convId}/messages/`, json, { headers: jsonHeaders })
    .catch((err) => {
      if (err?.response?.status === 404) {
        return axiosInstance.post<API.Message>(
          `/chat/messages/`,
          { conversation: convId, ...json },
          { headers: jsonHeaders }
        );
      }
      throw err;
    });
};

export const apiLinkConversationCase = (conversationId: number, caseId: number | string) =>
  axiosInstance.post<API.Conversation>(
    `/chat/conversations/${conversationId}/link-case/`,
    { caseId },
    { headers: jsonHeaders }
  );

export const apiUnlinkConversationCase = (conversationId: number) =>
  axiosInstance.delete(`/chat/conversations/${conversationId}/link-case/`);

// ─── Message actions ──────────────────────────────────────────────────────

/** Edit a message (sender only). */
export const apiEditMessage = (messageId: number, body: string) =>
  axiosInstance.patch<API.Message>(`/chat/messages/${messageId}/`, { body }, { headers: jsonHeaders });

/** Delete a message (soft delete; sender only). */
export const apiDeleteMessage = (messageId: number) =>
  axiosInstance.delete(`/chat/messages/${messageId}/`);

/** Forward a message to another conversation. */
export const apiForwardMessage = (messageId: number, targetConversationId: number) =>
  axiosInstance.post<API.Message>(
    `/chat/messages/${messageId}/forward/`,
    { target_conversation_id: targetConversationId },
    { headers: jsonHeaders }
  );

/** Pin or unpin a message. Shared: when anyone pins, all participants see it. */
export const apiPinMessage = (messageId: number, pinned: boolean) =>
  axiosInstance.post<{ status: 'pinned' | 'unpinned' }>(
    `/chat/messages/${messageId}/pin/`,
    { pinned, is_pinned: pinned },
    { headers: jsonHeaders }
  );

/** List pinned messages for a conversation (shared: any participant). */
export const apiListPinnedMessages = (conversationId: number) =>
  axiosInstance.get<API.Message[]>(`/chat/conversations/${conversationId}/pinned-messages/`);