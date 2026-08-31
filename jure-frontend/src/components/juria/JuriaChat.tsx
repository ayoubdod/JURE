import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JuriaMarkdown } from '@/components/juria/JuriaMarkdown';
import { JuriaComposer } from '@/components/juria/JuriaComposer';
import { DocumentDraftingSection } from '@/components/juria/DocumentDraftingSection';
import useJuriaStore from '@/stores/juriaStore';
import useUserStore from '@/stores/userStore';
import UserAvatar from '@/components/common/UserAvatar';
import type { JuriaMessage, JuriaMode, JuriaProject, JuriaSourceHit } from '@/types/juria';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { JuriaContractIntelligence } from '@/components/juria/JuriaContractIntelligence';
import { JuriaSourcePanel } from '@/components/juria/JuriaSourcePanel';
import { JuriaAttachResourceDialog } from '@/components/juria/JuriaAttachResourceDialog';
import { JuriaSourcePreview } from '@/components/juria/JuriaSourcePreview';
import { apiJuriaCreateArtifact } from '@/services/juria/api';
import { JuriaTextPromptDialog } from '@/components/juria/JuriaTextPromptDialog';
import { useAppTranslation } from '@/i18n';

export function JuriaChat({ project }: { project: JuriaProject }) {
  const { t } = useAppTranslation();
  const w = t.juria.workspace;
  const chat = w.chat;
  const actions = t.juria.workspace.actions;
  const { toast } = useToast();
  const user = useUserStore((s) => s.user);
  const threads = useJuriaStore((s) => s.threads);
  const activeThreadId = useJuriaStore((s) => s.activeThreadId);
  const setActiveThread = useJuriaStore((s) => s.setActiveThread);
  const createThread = useJuriaStore((s) => s.createThread);
  const updateThread = useJuriaStore((s) => s.updateThread);
  const deleteThread = useJuriaStore((s) => s.deleteThread);
  const setTab = useJuriaStore((s) => s.setActiveTab);
  const threadMessages = useJuriaStore((s) => s.threadMessages);
  const send = useJuriaStore((s) => s.sendThreadMessage);
  const processing = useJuriaStore((s) => s.processingThreadId);
  const language = useJuriaStore((s) => s.projectLanguage);
  const setLanguage = useJuriaStore((s) => s.setProjectLanguage);
  const editMessage = useJuriaStore((s) => s.editMessage);
  const deleteMessage = useJuriaStore((s) => s.deleteMessage);
  const conversations = useJuriaStore((s) => s.conversations);

  const [draft, setDraft] = useState('');
  const [attach, setAttach] = useState<File | null>(null);
  const [mode, setMode] = useState<JuriaMode>('CHAT');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [threadQuery, setThreadQuery] = useState('');
  const [attachKind, setAttachKind] = useState<'case' | 'library' | null>(null);
  const [previewHit, setPreviewHit] = useState<JuriaSourceHit | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(() => {
    try {
      return localStorage.getItem('jure.juria.threadsNav') !== '0';
    } catch {
      return true;
    }
  });
  const [renameThread, setRenameThread] = useState<{ id: string; title: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const thread = threads.find((t) => t.id === activeThreadId);
  const draftConversationId = thread?.conversation_id || conversations.find((c) => c.threadId === activeThreadId)?.id;
  const messages = useMemo(
    () => (activeThreadId ? threadMessages[activeThreadId] ?? [] : []).filter((m) => !m.isSuperseded),
    [threadMessages, activeThreadId]
  );

  const visibleThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    return threads.filter((t) => !q || (t.title || '').toLowerCase().includes(q));
  }, [threads, threadQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, processing]);

  useEffect(() => {
    try {
      localStorage.setItem('jure.juria.threadsNav', threadsOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [threadsOpen]);

  const handleSend = async () => {
    if (!activeThreadId) return;
    const text = draft.trim();
    if (!text && !attach) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setDraft('');
    const file = attach;
    setAttach(null);
    try {
      await send(activeThreadId, text || (file ? `📎 ${file.name}` : ''), file ?? undefined, {
        signal: abortRef.current.signal,
        language,
        mode,
      });
    } catch (e) {
      const msg = getJuriaErrorMessage(e);
      if (msg) toast({ title: chat.sendFailed, description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {threadsOpen ? (
      <div className="hidden w-[220px] shrink-0 flex-col border-e border-slate-100 bg-white/50 md:flex dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{chat.threads}</p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-[#64499D] dark:hover:bg-slate-800"
              onClick={() => void createThread(project.id, undefined, mode)}
              aria-label={chat.newThread}
              title={chat.newThread}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-[#64499D] dark:hover:bg-slate-800"
              onClick={() => setThreadsOpen(false)}
              aria-label={w.collapseThreads}
              title={w.collapseThreads}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={threadQuery}
              onChange={(e) => setThreadQuery(e.target.value)}
              placeholder={chat.searchThreads}
              className="h-8 w-full rounded-md border border-slate-200 bg-white ps-7 pe-2 text-[11px] text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {visibleThreads.map((t) => (
            <div
              key={t.id}
              className={cn(
                'group mb-0.5 flex items-start rounded-lg',
                t.id === activeThreadId ? 'bg-[#64499D]/10 text-[#4D3680] dark:bg-[#64499D]/20 dark:text-[#C4B5FD]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'
              )}
            >
              <button type="button" onClick={() => setActiveThread(t.id)} className="min-w-0 flex-1 px-2.5 py-2 text-left text-[12px]">
                <span className="line-clamp-1 font-medium">{t.title || chat.untitledThread}</span>
                {t.last_message_preview && (
                  <span className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{t.last_message_preview}</span>
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="me-1 mt-1 rounded p-1 text-slate-400 opacity-0 hover:bg-white group-hover:opacity-100 dark:hover:bg-slate-800">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setRenameThread({ id: t.id, title: t.title || '' })}>
                    {actions.rename}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void updateThread(t.id, { is_archived: true })}>
                    {actions.archive}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => {
                      if (window.confirm(chat.deleteThreadConfirm)) void deleteThread(t.id);
                    }}
                  >
                    {actions.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
      ) : (
        <div className="hidden w-10 shrink-0 flex-col items-center border-e border-slate-100 bg-white/50 py-2 dark:border-slate-800 dark:bg-slate-950/40 md:flex">
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#64499D] dark:hover:bg-slate-800"
            onClick={() => setThreadsOpen(true)}
            aria-label={w.expandThreads}
            title={w.expandThreads}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="mt-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#64499D] dark:hover:bg-slate-800"
            onClick={() => void createThread(project.id, undefined, mode)}
            aria-label={chat.newThread}
            title={chat.newThread}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 && !processing && (
              <div className="py-16 text-center">
                <img src="/images/juria-icon.png" alt="" className="mx-auto mb-3 h-12 w-12 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700" />
                <p className="text-sm font-medium text-slate-800 dark:text-white">{chat.emptyTitle}</p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{chat.emptyHint}</p>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                currentUser={user}
                editing={editingId === m.id}
                editText={editText}
                onEditText={setEditText}
                onStartEdit={() => {
                  setEditingId(m.id);
                  setEditText(m.content);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={() => {
                  void editMessage(m.id, editText, language).then(() => setEditingId(null));
                }}
                onDelete={() => {
                  if (!window.confirm(chat.deleteMessageConfirm)) return;
                  void deleteMessage(m.id);
                }}
                onRegenerate={() => {
                  const parentId = m.parentMessageId || messages.filter((x) => x.role === 'user' && x.createdAt <= m.createdAt).pop()?.id;
                  const parent = messages.find((x) => x.id === parentId);
                  if (parent) void editMessage(parent.id, parent.content, language);
                }}
                onCreateArtifact={() => {
                  void apiJuriaCreateArtifact(project.id, {
                    title: (m.content || 'Artifact').slice(0, 80),
                    content_markdown: m.content,
                    content_html: `<p>${m.content.replace(/\n/g, '</p><p>')}</p>`,
                    thread_id: activeThreadId ?? undefined,
                  }).then(() => setTab('artifacts'));
                }}
                onOpenSource={setPreviewHit}
                onClausePrompt={(prompt) => setDraft(prompt)}
              />
            ))}
            {processing === activeThreadId && (
              <div className="flex gap-2">
                <img src="/images/juria-icon.png" alt="" className="h-8 w-8 rounded-full ring-1 ring-slate-200 dark:ring-slate-700" />
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#64499D]" />
                    <span className="text-[13px] text-slate-500">{chat.thinking}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {mode === 'DOCUMENT_DRAFTING' && draftConversationId && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <DocumentDraftingSection conversationId={draftConversationId} linkedCaseId={project.linked_case_id ?? null} />
          </div>
        )}

        <div className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
          <JuriaComposer
            mode={mode}
            onModeChange={setMode}
            value={draft}
            onChange={setDraft}
            onSend={() => void handleSend()}
            disabled={processing === activeThreadId}
            linkedCase={
              project.linked_case_id
                ? { reference: project.linked_case_reference ?? undefined, title: project.linked_case_title ?? undefined }
                : undefined
            }
            onLinkCase={() => {}}
            showCaseLink={false}
            attachment={attach}
            onAttachmentChange={setAttach}
            askLang={language}
            onAskLangChange={(l) => setLanguage(l)}
            onAddFromCase={project.is_simple ? undefined : () => setAttachKind('case')}
            onAddFromLibrary={project.is_simple ? undefined : () => setAttachKind('library')}
            canAddFromCase={!project.is_simple && Boolean(project.linked_case_id)}
          />
        </div>
      </div>
      {!project.is_simple && (
      <JuriaAttachResourceDialog
        open={attachKind !== null}
        onOpenChange={(v) => { if (!v) setAttachKind(null); }}
        projectId={project.id}
        linkedCaseId={project.linked_case_id}
        kind={attachKind || 'library'}
      />
      )}
      <JuriaSourcePreview
        hit={previewHit}
        projectId={project.id}
        linkedCaseId={project.linked_case_id}
        onClose={() => setPreviewHit(null)}
      />
      <JuriaTextPromptDialog
        open={Boolean(renameThread)}
        onOpenChange={(v) => {
          if (!v) setRenameThread(null);
        }}
        title={chat.renameThread}
        label="Nom"
        initialValue={renameThread?.title || ''}
        onConfirm={(title) => {
          if (renameThread) void updateThread(renameThread.id, { title });
        }}
      />
    </div>
  );
}

function MessageBubble({
  m,
  currentUser,
  editing,
  editText,
  onEditText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onRegenerate,
  onCreateArtifact,
  onOpenSource,
  onClausePrompt,
}: {
  m: JuriaMessage;
  currentUser: API.User | null;
  editing: boolean;
  editText: string;
  onEditText: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onCreateArtifact: () => void;
  onOpenSource: (s: JuriaSourceHit) => void;
  onClausePrompt: (prompt: string) => void;
}) {
  const { t } = useAppTranslation();
  const actions = t.juria.workspace.actions;
  const [copied, setCopied] = useState(false);
  const isUser = m.role === 'user';
  const author = m.author;
  const first = author?.first_name || (isUser ? currentUser?.first_name : '');
  const last = author?.last_name || (isUser ? currentUser?.last_name : '');
  const image = author?.image || (isUser ? currentUser?.image : undefined);

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <img src="/images/juria-icon.png" alt="Juria" className="mt-0.5 h-8 w-8 shrink-0 rounded-full ring-1 ring-slate-200 dark:ring-slate-700" />
      )}
      <div className={cn('max-w-[92%] min-w-0 sm:max-w-[85%]', isUser && 'order-first')}>
        {isUser && (
          <p className="mb-1 text-end text-[11px] text-slate-400">
            {first} {last}
          </p>
        )}
        {editing ? (
          <div className="rounded-2xl border border-[#64499D]/30 bg-white p-3 dark:bg-slate-900">
            <textarea
              className="w-full resize-none bg-transparent text-sm outline-none"
              rows={3}
              value={editText}
              onChange={(e) => onEditText(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                {actions.cancel}
              </Button>
              <Button size="sm" className="bg-[#64499D] hover:bg-[#4D3680]" onClick={onSaveEdit}>
                {actions.regenerate}
              </Button>
            </div>
          </div>
        ) : isUser ? (
          <div className="group relative">
            <div className="rounded-2xl rounded-tr-sm bg-[#64499D]/10 px-4 py-3 text-sm text-slate-900 dark:bg-[#64499D]/20 dark:text-slate-100">
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="absolute -start-8 top-1 rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-800"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    void navigator.clipboard.writeText(m.content);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  <Copy className="me-2 h-3.5 w-3.5" />
                  {copied ? actions.copied : actions.copy}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStartEdit}>
                  <Pencil className="me-2 h-3.5 w-3.5" />
                  {actions.edit}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                  <Trash2 className="me-2 h-3.5 w-3.5" />
                  {actions.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <AssistantBody
            m={m}
            onRegenerate={onRegenerate}
            onCreateArtifact={onCreateArtifact}
            onOpenSource={onOpenSource}
            onClausePrompt={onClausePrompt}
          />
        )}
        <p className={cn('mt-1 text-[10px] text-slate-400', isUser && 'text-end')}>{dayjs(m.createdAt).format('HH:mm')}</p>
      </div>
      {isUser && (
        <UserAvatar image={image} firstName={first} lastName={last} email={author?.email || currentUser?.email} size="sm" />
      )}
    </div>
  );
}

function AssistantBody({
  m,
  onRegenerate,
  onCreateArtifact,
  onOpenSource,
  onClausePrompt,
}: {
  m: JuriaMessage;
  onRegenerate: () => void;
  onCreateArtifact: () => void;
  onOpenSource: (s: JuriaSourceHit) => void;
  onClausePrompt: (prompt: string) => void;
}) {
  const { t } = useAppTranslation();
  const actions = t.juria.workspace.actions;
  const chat = t.juria.workspace.chat;
  const [copied, setCopied] = useState(false);
  const analysis = m.analysis && !m.analysis.parse_error && typeof m.analysis.risk_score === 'number' ? m.analysis : null;
  const sources = (m.sources ?? []).filter((s) => s.document);

  return (
    <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      {analysis ? (
        <JuriaContractIntelligence analysis={analysis} onClausePrompt={onClausePrompt} />
      ) : (
        <JuriaMarkdown content={m.content || ''} />
      )}
      {sources.length > 0 && <JuriaSourcePanel sources={sources} onOpen={onOpenSource} />}
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100"
          onClick={() => {
            void navigator.clipboard.writeText(m.content || '');
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          <Copy className="h-3 w-3" />
          {copied ? actions.copied : actions.copy}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100"
          onClick={onRegenerate}
        >
          <RefreshCw className="h-3 w-3" />
          {actions.regenerate}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100"
          onClick={onCreateArtifact}
        >
          {chat.createArtifact}
        </button>
      </div>
    </div>
  );
}
