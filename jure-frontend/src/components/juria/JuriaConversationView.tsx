import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Bot, Download, Eye, Link2, MoreHorizontal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JuriaMarkdown } from '@/components/juria/JuriaMarkdown';
import { JuriaComposer } from '@/components/juria/JuriaComposer';
import { DocumentDraftingSection } from '@/components/juria/DocumentDraftingSection';
import { CaseLinkDropdown } from '@/components/juria/CaseLinkDropdown';
import { JURIA_MODE_META } from '@/components/juria/juriaConstants';
import useJuriaStore from '@/stores/juriaStore';
import type { JuriaCaseContextPayload } from '@/types/juria';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';

export function JuriaConversationView({
  caseContext: _caseContext,
  compact,
  showCaseLink = true,
}: {
  caseContext?: JuriaCaseContextPayload | null;
  compact?: boolean;
  showCaseLink?: boolean;
}) {
  void _caseContext;
  const { toast } = useToast();
  const conversations = useJuriaStore((s) => s.conversations);
  const activeId = useJuriaStore((s) => s.activeConversationId);
  const processingId = useJuriaStore((s) => s.processingConversationId);
  const linkCase = useJuriaStore((s) => s.linkConversationToCase);
  const createLinkedConversation = useJuriaStore((s) => s.createLinkedConversation);
  const rename = useJuriaStore((s) => s.renameConversation);
  const archive = useJuriaStore((s) => s.archiveConversation);
  const del = useJuriaStore((s) => s.deleteConversation);
  const sendMessage = useJuriaStore((s) => s.sendMessage);
  const downloadDocumentToFile = useJuriaStore((s) => s.downloadDocumentToFile);

  const conv = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);
  const [draft, setDraft] = useState('');
  const [titleEdit, setTitleEdit] = useState('');
  const [attach, setAttach] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [showAbort, setShowAbort] = useState(false);

  useEffect(() => {
    if (conv) setTitleEdit(conv.title);
  }, [conv?.id, conv?.title]);

  useEffect(() => {
    if (!activeId || processingId !== activeId) {
      setSlowHint(false);
      setShowAbort(false);
      return;
    }
    const t15 = window.setTimeout(() => setSlowHint(true), 15_000);
    const t20 = window.setTimeout(() => setShowAbort(true), 20_000);
    return () => {
      window.clearTimeout(t15);
      window.clearTimeout(t20);
    };
  }, [activeId, processingId]);

  const handleSend = async () => {
    if (!conv) return;
    const text = draft.trim();
    const file = attach;
    if (!text && !file) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setDraft('');
    setAttach(null);

    try {
      await sendMessage(conv.id, text || (file ? `📎 ${file.name}` : ''), file ?? undefined, {
        signal: abortRef.current.signal,
      });
    } catch (e) {
      const msg = getJuriaErrorMessage(e);
      if (msg) {
        toast({ title: 'Message non envoyé', description: msg, variant: 'destructive' });
      }
    }
  };

  const cancelPending = () => {
    abortRef.current?.abort();
  };

  if (!conv) return null;

  const meta = JURIA_MODE_META[conv.mode];
  const linked = conv.caseId ?
      {
        reference: conv.caseReference,
        title: conv.caseTitle,
      }
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <input
              value={titleEdit}
              onChange={(e) => setTitleEdit(e.target.value)}
              onBlur={() => rename(conv.id, titleEdit || conv.title)}
              className="min-w-0 flex-1 truncate border-none bg-transparent text-base font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/30 dark:text-white"
            />
          </div>
          {(linked?.reference || conv.caseId) && (
            <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              #{linked?.reference ?? conv.caseId} {linked?.title ? `— ${linked.title}` : ''}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showCaseLink && !conv.caseId && (
            <CaseLinkDropdown
              compact
              align="end"
              onSelect={(c) => {
                void createLinkedConversation(c).catch((e) =>
                  toast({
                    title: 'Impossible de créer la conversation liée',
                    description: getJuriaErrorMessage(e),
                    variant: 'destructive',
                  })
                );
              }}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Menu conversation">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  const t = window.prompt('Nouveau titre', conv.title);
                  if (t) rename(conv.id, t);
                }}
              >
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void archive(conv.id).catch((e) =>
                    toast({ title: 'Archivage impossible', description: getJuriaErrorMessage(e), variant: 'destructive' })
                  );
                }}
              >
                Archiver
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  void del(conv.id).catch((e) =>
                    toast({ title: 'Suppression impossible', description: getJuriaErrorMessage(e), variant: 'destructive' })
                  );
                }}
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {conv.messages.map((m) => (
            <div key={m.id}>
              {m.role === 'user' && (
                <div className="flex justify-end gap-2">
                  <div className="max-w-[85%]">
                    {m.attachment && (
                      <div className="mb-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                        <Link2 className="h-3.5 w-3.5 text-slate-500" />
                        {m.attachment.name}
                      </div>
                    )}
                    {m.content ?
                      <div className="rounded-2xl rounded-tr-sm bg-indigo-50 px-4 py-3 text-sm text-slate-900 dark:bg-indigo-950/40 dark:text-slate-100">
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    : null}
                    <p className="mt-1 text-right text-[10px] text-slate-400">{dayjs(m.createdAt).format('HH:mm')}</p>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              )}

              {m.role === 'system' && (
                <div className="flex justify-center">
                  <div className="max-w-[90%] rounded-lg bg-slate-100 px-3 py-2 text-center text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {m.content}
                  </div>
                </div>
              )}

              {m.role === 'assistant' && (
                <div className="flex justify-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[85%] min-w-0">
                    {m.documentCard ?
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">📄 Document généré</p>
                        <p className="mt-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">{m.documentCard.typeName}</p>
                        <p className="text-[11px] text-slate-500">
                          Généré le {dayjs(m.documentCard.generatedAt).format('DD MMM YYYY')}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-[13px] text-slate-700 dark:border-slate-800 dark:text-slate-200">
                          {m.documentCard.previewLines}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            type="button"
                            onClick={() => {
                              const id = m.documentCard?.downloadMessageId;
                              if (!id) return;
                              void downloadDocumentToFile(id, 'document.docx').catch((e) =>
                                toast({
                                  title: 'Téléchargement impossible',
                                  description: getJuriaErrorMessage(e),
                                  variant: 'destructive',
                                })
                              );
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Télécharger DOCX
                          </Button>
                          {m.documentCard.docxUrl ?
                            <Button size="sm" variant="ghost" className="gap-1" type="button" asChild>
                              <a href={m.documentCard.docxUrl} target="_blank" rel="noreferrer">
                                <Eye className="h-3.5 w-3.5" />
                                Ouvrir le lien
                              </a>
                            </Button>
                          : null}
                        </div>
                      </div>
                    : (
                      <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        {m.content ? <JuriaMarkdown content={m.content} /> : null}
                      </div>
                    )}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {m.suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setDraft(s)}
                            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">{dayjs(m.createdAt).format('HH:mm')}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {processingId === conv.id && (
            <div className="flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {slowHint ? 'Juria prend plus de temps que prévu...' : 'Juria analyse votre demande...'}
                  </span>
                </div>
                {showAbort && (
                  <Button size="sm" variant="outline" className="mt-2" type="button" onClick={cancelPending}>
                    Annuler
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {conv.mode === 'DOCUMENT_DRAFTING' && (
        <div className={cn('shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800', compact && 'py-2')}>
          <DocumentDraftingSection conversationId={conv.id} compact={compact} linkedCaseId={conv.caseId ?? null} />
        </div>
      )}

      <JuriaComposer
        mode={conv.mode}
        modeReadOnly
        onModeChange={() => {}}
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        disabled={processingId === conv.id}
        linkedCase={linked}
        onLinkCase={(c) => {
          void createLinkedConversation(c).catch((e) =>
            toast({
              title: 'Impossible de créer la conversation liée',
              description: getJuriaErrorMessage(e),
              variant: 'destructive',
            })
          );
        }}
        onUnlinkCase={() => linkCase(conv.id, null)}
        compact={compact}
        showCaseLink={showCaseLink}
        attachment={attach}
        onAttachmentChange={setAttach}
      />
    </div>
  );
}
