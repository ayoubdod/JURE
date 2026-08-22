import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JuriaConversation, JuriaMessage, JuriaMode } from '@/types/juria';
import {
  apiJuriaArchiveConversation,
  apiJuriaCreateConversation,
  apiJuriaDownloadDocument,
  apiJuriaDraft,
  apiJuriaGetConversation,
  apiJuriaListAllConversations,
  apiJuriaSendMessage,
  apiJuriaUsage,
  isJuriaConversationId,
  normalizeJuriaConversationId,
} from '@/services/juria/api';
import { mapApiDetailToConversation, mapApiListItemToConversation, mapApiMessageToJuria } from '@/utils/juriaMappers';
import { getJuriaErrorMessage, isJuriaDisabledError } from '@/utils/juriaErrors';

type FabCase = { id: number; reference?: string; title?: string };

interface JuriaStoreState {
  juriaUnavailable: boolean;
  listLoading: boolean;
  detailLoading: boolean;
  usage: import('@/services/juria/types').JuriaApiUsage | null;
  conversations: JuriaConversation[];
  activeConversationId: string | null;
  fabCaseContext: FabCase | null;
  processingConversationId: string | null;

  setFabCaseContext: (c: FabCase | null) => void;
  clearJuriaUnavailable: () => void;

  loadConversations: (filters?: { linked_case?: number; mode?: JuriaMode; is_archived?: boolean }) => Promise<void>;
  loadUsage: () => Promise<void>;
  loadInitial: () => Promise<void>;
  /** Load full message history for a conversation. */
  loadConversationDetail: (id: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;

  createConversation: (
    mode: JuriaMode,
    caseLink?: { id: number; reference?: string; title?: string }
  ) => Promise<string>;

  /** Create a new conversation linked to a case (API); switches active. */
  createLinkedConversation: (caseLink: { id: number; reference?: string; title?: string }) => Promise<string>;

  renameConversation: (id: string, title: string) => void;
  archiveConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  /** Local-only (no PATCH on backend). */
  linkConversationToCase: (id: string, c: { id: number; reference?: string; title?: string } | null) => void;

  sendMessage: (
    conversationId: string,
    text: string,
    file?: File | null,
    opts?: { signal?: AbortSignal }
  ) => Promise<void>;

  requestDraft: (
    conversationId: string,
    documentType: string,
    parameters: Record<string, string>,
    linkedCaseId?: number | null
  ) => Promise<void>;

  /** Save blob from message download endpoint. */
  downloadDocumentToFile: (messageId: string, filename?: string) => Promise<void>;
}

let listFetchId = 0;

function mergeConversationLists(local: JuriaConversation[], incoming: JuriaConversation[]): JuriaConversation[] {
  const byId = new Map<string, JuriaConversation>();
  for (const c of incoming) {
    if (!c.id) continue;
    const prev = local.find((x) => x.id === c.id);
    byId.set(
      c.id,
      prev
        ? {
            ...c,
            messages: prev.messages.length > 0 ? prev.messages : c.messages,
            caseReference: prev.caseReference ?? c.caseReference,
            caseTitle: prev.caseTitle ?? c.caseTitle,
            lastMessagePreview: c.lastMessagePreview ?? prev.lastMessagePreview,
          }
        : c
    );
  }
  for (const c of local) {
    if (!c.id || c.archived || byId.has(c.id)) continue;
    byId.set(c.id, c);
  }
  return [...byId.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

const useJuriaStore = create<JuriaStoreState>()(
  persist(
    (set, get) => ({
      juriaUnavailable: false,
      listLoading: false,
      detailLoading: false,
      usage: null,
      conversations: [],
      activeConversationId: null,
      fabCaseContext: null,
      processingConversationId: null,

      setFabCaseContext: (c) => set({ fabCaseContext: c }),
      clearJuriaUnavailable: () => set({ juriaUnavailable: false }),

      loadUsage: async () => {
        try {
          const usage = await apiJuriaUsage();
          set({ usage });
        } catch (e) {
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
        }
      },

      loadConversations: async (filters) => {
        const fetchId = ++listFetchId;
        set({ listLoading: true, juriaUnavailable: false });
        try {
          const items = await apiJuriaListAllConversations({ ...filters, is_archived: filters?.is_archived ?? false });
          if (fetchId !== listFetchId) return;
          const mapped = items.map(mapApiListItemToConversation).filter((c) => isJuriaConversationId(c.id));
          set({ conversations: mergeConversationLists(get().conversations, mapped) });
        } catch (e) {
          if (fetchId !== listFetchId) return;
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
          throw e;
        } finally {
          if (fetchId === listFetchId) set({ listLoading: false });
        }
      },

      loadConversationDetail: async (id) => {
        const nid = normalizeJuriaConversationId(id);
        if (!nid) {
          set({ activeConversationId: null, detailLoading: false });
          return;
        }
        set({ detailLoading: true, juriaUnavailable: false });
        try {
          const detail = await apiJuriaGetConversation(nid);
          const conv = mapApiDetailToConversation(detail);
          const prev = get().conversations.find((c) => c.id === nid);
          if (prev?.caseReference) {
            conv.caseReference = prev.caseReference;
            conv.caseTitle = prev.caseTitle;
          }
          if (prev?.messages.length && conv.messages.length === 0) {
            conv.messages = prev.messages;
          }
          set((s) => ({
            conversations: s.conversations.some((c) => c.id === nid)
              ? s.conversations.map((c) => (c.id === nid ? { ...conv, id: nid } : c))
              : [{ ...conv, id: nid }, ...s.conversations.filter((c) => c.id !== nid)],
            activeConversationId: nid,
          }));
        } catch (e) {
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
          throw e;
        } finally {
          set({ detailLoading: false });
        }
      },

      loadInitial: async () => {
        try {
          await Promise.all([get().loadConversations(), get().loadUsage()]);
        } catch {
          /* flags set in loaders */
        }
      },

      setActiveConversation: (id) => {
        const next = normalizeJuriaConversationId(id);
        set({ activeConversationId: next });
        if (next) {
          void get().loadConversationDetail(next).catch(() => {
            /* keep the conversation selected even if history fetch fails */
          });
        }
      },

      createConversation: async (mode, caseLink) => {
        listFetchId += 1;
        set({ juriaUnavailable: false });
        const detail = await apiJuriaCreateConversation({
          mode,
          linked_case_id: caseLink?.id ?? null,
          title: '',
        });
        const conv = mapApiDetailToConversation(detail);
        const id = normalizeJuriaConversationId(conv.id);
        if (!id) {
          throw new Error('Conversation créée sans identifiant.');
        }
        conv.id = id;
        conv.archived = false;
        conv.updatedAt = conv.updatedAt || new Date().toISOString();
        if (caseLink) {
          conv.caseReference = caseLink.reference;
          conv.caseTitle = caseLink.title;
        }
        set((s) => ({
          conversations: [conv, ...s.conversations.filter((c) => c.id !== id)],
          activeConversationId: id,
        }));
        void get().loadUsage();
        return id;
      },

      createLinkedConversation: async (caseLink) => {
        const mode = get().conversations.find((c) => c.id === get().activeConversationId)?.mode ?? 'CHAT';
        return get().createConversation(mode, caseLink);
      },

      renameConversation: (id, title) => {
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
      },

      archiveConversation: async (id) => {
        await apiJuriaArchiveConversation(id);
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
        }));
        await get().loadUsage();
      },

      deleteConversation: async (id) => {
        await get().archiveConversation(id);
      },

      linkConversationToCase: (id, c) => {
        set((s) => ({
          conversations: s.conversations.map((conv) =>
            conv.id === id
              ? {
                  ...conv,
                  ...(c == null
                    ? { caseId: undefined, caseReference: undefined, caseTitle: undefined }
                    : {
                        caseId: c.id,
                        caseReference: c.reference,
                        caseTitle: c.title,
                      }),
                }
              : conv
          ),
        }));
      },

      sendMessage: async (conversationId, text, file, opts) => {
        const msgText = text.trim() || (file ? `📎 ${file.name}` : '');
        if (!msgText && !file) return;

        set({ processingConversationId: conversationId, juriaUnavailable: false });
        try {
          const res = await apiJuriaSendMessage(
            conversationId,
            { message: msgText || ' ', file: file ?? undefined, file_name: file?.name },
            { signal: opts?.signal }
          );
          const userMsg = mapApiMessageToJuria(res.user_message);
          const asstMsg = mapApiMessageToJuria(res.assistant_message);

          set((s) => ({
            conversations: s.conversations.map((c) => {
              if (c.id !== conversationId) return c;
              const nextTitle =
                c.title && c.title !== 'Conversation'
                  ? c.title
                  : (msgText.replace(/^📎\s*/, '').slice(0, 60) || c.title);
              return {
                ...c,
                title: nextTitle,
                messages: [...c.messages, userMsg, asstMsg],
                updatedAt: new Date().toISOString(),
                lastMessagePreview: asstMsg.content?.slice(0, 72) || c.lastMessagePreview,
              };
            }),
          }));
          await get().loadUsage();
        } catch (e) {
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
          throw new Error(getJuriaErrorMessage(e) || 'Erreur');
        } finally {
          set((s) => ({
            processingConversationId:
              s.processingConversationId === conversationId ? null : s.processingConversationId,
          }));
        }
      },

      requestDraft: async (conversationId, documentType, parameters, linkedCaseId) => {
        set({ processingConversationId: conversationId, juriaUnavailable: false });
        try {
          const res = await apiJuriaDraft(conversationId, {
            document_type: documentType,
            parameters,
            linked_case_id: linkedCaseId ?? null,
          });
          const m: JuriaMessage = {
            id: res.message.id,
            role: 'assistant',
            content: res.message.content ?? '',
            createdAt: res.message.created_at,
            tokensUsed: res.message.tokens_used ?? undefined,
            documentCard: {
              typeName: documentType.replace(/_/g, ' '),
              previewLines: (res.message.content || '').split('\n').slice(0, 4).join('\n').trim() || '—',
              generatedAt: res.message.created_at,
              docxUrl: res.document_download_url,
              downloadMessageId: res.message.id,
            },
          };

          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, messages: [...c.messages, m], updatedAt: new Date().toISOString() }
                : c
            ),
          }));
          await get().loadUsage();
        } catch (e) {
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
          throw new Error(getJuriaErrorMessage(e) || 'Erreur');
        } finally {
          set({ processingConversationId: null });
        }
      },

      downloadDocumentToFile: async (messageId, filename) => {
        const blob = await apiJuriaDownloadDocument(messageId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `juria-${messageId}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: 'juria-fab-v1',
      partialize: (s) => ({ fabCaseContext: s.fabCaseContext }),
    }
  )
);

export default useJuriaStore;
