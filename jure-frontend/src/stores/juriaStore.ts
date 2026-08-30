import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  JuriaActivity,
  JuriaArtifact,
  JuriaConversation,
  JuriaFile,
  JuriaLang,
  JuriaMessage,
  JuriaMode,
  JuriaProject,
  JuriaTab,
  JuriaThread,
} from '@/types/juria';
import {
  apiJuriaArchiveConversation,
  apiJuriaArchiveProject,
  apiJuriaCreateConversation,
  apiJuriaCreateProject,
  apiJuriaCreateThread,
  apiJuriaDeleteMessage,
  apiJuriaDeleteProject,
  apiJuriaDeleteThread,
  apiJuriaDownloadDocument,
  apiJuriaDraft,
  apiJuriaDuplicateProject,
  apiJuriaEditMessage,
  apiJuriaGetConversation,
  apiJuriaGetProject,
  apiJuriaListActivity,
  apiJuriaListAllConversations,
  apiJuriaListAllProjects,
  apiJuriaListArtifacts,
  apiJuriaListFiles,
  apiJuriaListThreadMessages,
  apiJuriaListThreads,
  apiJuriaRestoreProject,
  apiJuriaSendMessage,
  apiJuriaSendMessageWithLang,
  apiJuriaSendThreadMessage,
  apiJuriaUpdateProject,
  apiJuriaUpdateThread,
  apiJuriaUsage,
  isJuriaConversationId,
  normalizeJuriaConversationId,
  type JuriaProjectCreateBody,
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

  projects: JuriaProject[];
  archivedProjects: JuriaProject[];
  activeProjectId: string | null;
  activeThreadId: string | null;
  threads: JuriaThread[];
  threadMessages: Record<string, JuriaMessage[]>;
  activeTab: JuriaTab;
  archiveView: boolean;
  projectLanguage: JuriaLang;
  files: JuriaFile[];
  artifacts: JuriaArtifact[];
  activities: JuriaActivity[];
  processingThreadId: string | null;

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

  loadProjects: (status?: string) => Promise<void>;
  loadArchivedProjects: () => Promise<void>;
  loadProjectDetail: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  setArchiveView: (v: boolean) => void;
  setActiveTab: (tab: JuriaTab) => void;
  setProjectLanguage: (lang: JuriaLang) => void;
  createProject: (body: JuriaProjectCreateBody) => Promise<string>;
  /** One-click chat without the full project wizard. */
  createQuickChat: (opts?: { language?: JuriaLang; name?: string }) => Promise<string>;
  updateProject: (id: string, body: Partial<JuriaProjectCreateBody> & { is_favorite?: boolean }) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<string>;
  loadThreads: (projectId: string) => Promise<void>;
  setActiveThread: (id: string | null) => void;
  createThread: (projectId: string, title?: string, mode?: JuriaMode) => Promise<string>;
  updateThread: (threadId: string, body: { title?: string; is_archived?: boolean }) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  loadThreadMessages: (threadId: string) => Promise<void>;
  sendThreadMessage: (
    threadId: string,
    text: string,
    file?: File | null,
    opts?: { signal?: AbortSignal; language?: JuriaLang; mode?: JuriaMode }
  ) => Promise<void>;
  editMessage: (messageId: string, content: string, language?: JuriaLang) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadFiles: (projectId: string) => Promise<void>;
  loadArtifacts: (projectId: string) => Promise<void>;
  loadActivities: (projectId: string) => Promise<void>;
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

      projects: [],
      archivedProjects: [],
      activeProjectId: null,
      activeThreadId: null,
      threads: [],
      threadMessages: {},
      activeTab: 'chat',
      archiveView: false,
      projectLanguage: 'fr',
      files: [],
      artifacts: [],
      activities: [],
      processingThreadId: null,

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
          await Promise.all([get().loadConversations(), get().loadUsage(), get().loadProjects()]);
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
          const res = await apiJuriaSendMessageWithLang(
            conversationId,
            {
              message: msgText || ' ',
              file: file ?? undefined,
              file_name: file?.name,
              language: get().projectLanguage,
            },
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
            activeTab: res.artifact_id ? 'artifacts' : s.activeTab,
          }));
          const pid = get().activeProjectId;
          if (pid) void get().loadArtifacts(pid).catch(() => undefined);
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

      loadProjects: async (status = 'ACTIVE') => {
        set({ listLoading: true, juriaUnavailable: false });
        try {
          const items = await apiJuriaListAllProjects({ status });
          if (status === 'ARCHIVED') {
            set({ archivedProjects: items });
          } else {
            // Merge — never wipe a project that was just created while this fetch was in flight
            set((s) => {
              const serverIds = new Set(items.map((p) => p.id));
              const pending = s.projects.filter((p) => !serverIds.has(p.id));
              const activeId = s.activeProjectId;
              const keepActive =
                activeId && !serverIds.has(activeId)
                  ? s.projects.find((p) => p.id === activeId)
                  : undefined;
              const extras = pending.filter((p) => p.id !== keepActive?.id);
              return {
                projects: [
                  ...(keepActive ? [keepActive] : []),
                  ...items,
                  ...extras.filter((p) => p.id !== keepActive?.id),
                ],
              };
            });
          }
        } catch (e) {
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
          throw e;
        } finally {
          set({ listLoading: false });
        }
      },

      loadArchivedProjects: async () => {
        set({ listLoading: true });
        try {
          const items = await apiJuriaListAllProjects({ status: 'ARCHIVED' });
          set({ archivedProjects: items, archiveView: true });
        } finally {
          set({ listLoading: false });
        }
      },

      loadProjectDetail: async (id) => {
        const detail = await apiJuriaGetProject(id);
        // Ignore stale responses if the user already switched project
        if (get().activeProjectId !== id) {
          set((s) => ({
            projects: s.projects.some((p) => p.id === id)
              ? s.projects.map((p) => (p.id === id ? { ...p, ...detail } : p))
              : [detail, ...s.projects],
          }));
          return;
        }
        set((s) => ({
          projects: s.projects.some((p) => p.id === id)
            ? s.projects.map((p) => (p.id === id ? { ...p, ...detail } : p))
            : [detail, ...s.projects],
          archivedProjects: s.archivedProjects.map((p) => (p.id === id ? { ...p, ...detail } : p)),
          activeProjectId: id,
          projectLanguage: detail.preferred_language || s.projectLanguage,
        }));
        await Promise.all([
          get().loadThreads(id),
          get().loadFiles(id).catch(() => undefined),
          get().loadArtifacts(id).catch(() => undefined),
          get().loadActivities(id).catch(() => undefined),
        ]);
      },

      setActiveProject: (id) => {
        set({
          activeProjectId: id,
          activeTab: 'chat',
          archiveView: false,
          activeThreadId: null,
          threads: [],
          threadMessages: {},
        });
        if (id) void get().loadProjectDetail(id);
      },

      setArchiveView: (v) => set({ archiveView: v, activeProjectId: v ? null : get().activeProjectId }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setProjectLanguage: (lang) => {
        set({ projectLanguage: lang });
        const id = get().activeProjectId;
        if (id) void get().updateProject(id, { preferred_language: lang });
      },

      createProject: async (body) => {
        const project = await apiJuriaCreateProject(body);
        set((s) => ({
          projects: [project, ...s.projects.filter((p) => p.id !== project.id)],
          activeProjectId: project.id,
          archiveView: false,
          activeTab: 'chat',
          projectLanguage: project.preferred_language || 'fr',
          activeThreadId: null,
          threads: [],
          threadMessages: {},
        }));
        await get().loadProjectDetail(project.id);
        return project.id;
      },

      createQuickChat: async (opts) => {
        const lang = opts?.language || get().projectLanguage || 'fr';
        const stamp = new Date().toLocaleString(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        const name =
          opts?.name ||
          (lang === 'ar'
            ? `محادثة سريعة — ${stamp}`
            : lang === 'en'
              ? `Quick chat — ${stamp}`
              : lang === 'darija'
                ? `Chat darija — ${stamp}`
                : `Chat rapide — ${stamp}`);
        return get().createProject({
          name,
          preferred_language: lang,
          jurisdiction_code: 'MA',
          description: '',
          is_simple: true,
        });
      },

      updateProject: async (id, body) => {
        const detail = await apiJuriaUpdateProject(id, body);
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...detail } : p)),
          projectLanguage: detail.preferred_language || s.projectLanguage,
        }));
      },

      archiveProject: async (id) => {
        await apiJuriaArchiveProject(id);
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        }));
      },

      restoreProject: async (id) => {
        const restored = await apiJuriaRestoreProject(id);
        set((s) => ({
          archivedProjects: s.archivedProjects.filter((p) => p.id !== id),
          projects: [restored, ...s.projects],
        }));
      },

      deleteProject: async (id) => {
        await apiJuriaDeleteProject(id);
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          archivedProjects: s.archivedProjects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        }));
      },

      duplicateProject: async (id) => {
        const clone = await apiJuriaDuplicateProject(id);
        set((s) => ({ projects: [clone, ...s.projects] }));
        return clone.id;
      },

      loadThreads: async (projectId) => {
        const threads = await apiJuriaListThreads(projectId);
        // Drop stale thread lists from a previous project
        if (get().activeProjectId !== projectId) return;
        const first = threads[0];
        set({
          threads,
          activeThreadId: first?.id ?? null,
        });
        const tid = get().activeThreadId;
        if (tid) await get().loadThreadMessages(tid);
      },

      setActiveThread: (id) => {
        set({ activeThreadId: id });
        if (id) void get().loadThreadMessages(id);
      },

      createThread: async (projectId, title, mode) => {
        const thread = await apiJuriaCreateThread(projectId, { title, mode });
        set((s) => ({ threads: [thread, ...s.threads], activeThreadId: thread.id, activeTab: 'chat' }));
        return thread.id;
      },

      updateThread: async (threadId, body) => {
        const thread = await apiJuriaUpdateThread(threadId, body);
        set((s) => ({
          threads: body.is_archived
            ? s.threads.filter((t) => t.id !== threadId)
            : s.threads.map((t) => (t.id === threadId ? { ...t, ...thread } : t)),
          activeThreadId: body.is_archived && s.activeThreadId === threadId ? s.threads.find((t) => t.id !== threadId)?.id ?? null : s.activeThreadId,
        }));
      },

      deleteThread: async (threadId) => {
        await apiJuriaDeleteThread(threadId);
        set((s) => {
          const next = s.threads.filter((t) => t.id !== threadId);
          return {
            threads: next,
            activeThreadId: s.activeThreadId === threadId ? next[0]?.id ?? null : s.activeThreadId,
          };
        });
      },

      loadThreadMessages: async (threadId) => {
        const rows = await apiJuriaListThreadMessages(threadId);
        set((s) => ({
          threadMessages: { ...s.threadMessages, [threadId]: rows.map(mapApiMessageToJuria) },
        }));
      },

      sendThreadMessage: async (threadId, text, file, opts) => {
        const msgText = text.trim() || (file ? `📎 ${file.name}` : '');
        if (!msgText && !file) return;
        set({ processingThreadId: threadId, juriaUnavailable: false });
        try {
          const res = await apiJuriaSendThreadMessage(
            threadId,
            {
              message: msgText || ' ',
              file: file ?? undefined,
              file_name: file?.name,
              language: opts?.language,
              mode: opts?.mode,
            },
            { signal: opts?.signal }
          );
          const userMsg = mapApiMessageToJuria(res.user_message);
          const asstMsg = mapApiMessageToJuria(res.assistant_message);
          set((s) => ({
            threadMessages: {
              ...s.threadMessages,
              [threadId]: [...(s.threadMessages[threadId] ?? []), userMsg, asstMsg],
            },
            threads: s.threads.map((t) =>
              t.id === threadId
                ? { ...t, updated_at: new Date().toISOString(), last_message_preview: asstMsg.content?.slice(0, 72) }
                : t
            ),
          }));
          const pid = get().activeProjectId;
          if (pid) void get().loadProjectDetail(pid).catch(() => undefined);
          await get().loadUsage();
        } catch (e) {
          if (isJuriaDisabledError(e)) set({ juriaUnavailable: true });
          throw new Error(getJuriaErrorMessage(e) || 'Erreur');
        } finally {
          set((s) => ({
            processingThreadId: s.processingThreadId === threadId ? null : s.processingThreadId,
          }));
        }
      },

      editMessage: async (messageId, content, language) => {
        const res = await apiJuriaEditMessage(messageId, { content, language, regenerate: true });
        const tid = get().activeThreadId;
        if (!tid) return;
        const userMsg = mapApiMessageToJuria(res.user_message);
        const asstMsg = res.assistant_message ? mapApiMessageToJuria(res.assistant_message) : null;
        set((s) => {
          const prev = s.threadMessages[tid] ?? [];
          const next = prev.map((m) => (m.id === userMsg.id ? userMsg : m));
          const withoutOldAsst = next.map((m) =>
            m.role === 'assistant' && m.id !== asstMsg?.id && prev.some((p) => p.id === userMsg.id)
              ? m
              : m
          );
          return {
            threadMessages: {
              ...s.threadMessages,
              [tid]: asstMsg ? [...withoutOldAsst.filter((m) => m.id !== asstMsg.id), asstMsg] : withoutOldAsst,
            },
          };
        });
        await get().loadThreadMessages(tid);
      },

      deleteMessage: async (messageId) => {
        await apiJuriaDeleteMessage(messageId);
        const tid = get().activeThreadId;
        if (!tid) return;
        set((s) => ({
          threadMessages: {
            ...s.threadMessages,
            [tid]: (s.threadMessages[tid] ?? []).filter((m) => m.id !== messageId),
          },
        }));
        await get().loadThreadMessages(tid);
      },

      loadFiles: async (projectId) => {
        const files = await apiJuriaListFiles(projectId);
        set({ files });
      },

      loadArtifacts: async (projectId) => {
        const artifacts = await apiJuriaListArtifacts(projectId);
        set({ artifacts });
      },

      loadActivities: async (projectId) => {
        const activities = await apiJuriaListActivity(projectId);
        set({ activities });
      },
    }),
    {
      name: 'juria-fab-v1',
      partialize: (s) => ({ fabCaseContext: s.fabCaseContext }),
    }
  )
);

export default useJuriaStore;
