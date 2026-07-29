import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { JuriaComposer } from '@/components/juria/JuriaComposer';
import { JuriaMarkdown } from '@/components/juria/JuriaMarkdown';
import useJuriaStore from '@/stores/juriaStore';
import type { JuriaMode } from '@/types/juria';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';

export function JuriaFloatingAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const activeId = useJuriaStore((s) => s.activeConversationId);
  const conversations = useJuriaStore((s) => s.conversations);
  const create = useJuriaStore((s) => s.createConversation);
  const sendMessage = useJuriaStore((s) => s.sendMessage);
  const createLinkedConversation = useJuriaStore((s) => s.createLinkedConversation);
  const processingId = useJuriaStore((s) => s.processingConversationId);
  const fabCase = useJuriaStore((s) => s.fabCaseContext);

  const hidden =
    location.pathname.startsWith('/dashboard/juria') || location.pathname.startsWith('/dashboard/legal-ai');

  const conv = conversations.find((c) => c.id === activeId);
  const [draft, setDraft] = useState('');
  const [attach, setAttach] = useState<File | null>(null);

  if (hidden) return null;

  const ensureConv = async (mode: JuriaMode = 'CHAT') => {
    if (activeId && conversations.some((c) => c.id === activeId)) return activeId;
    const link = fabCase ? { id: fabCase.id, reference: fabCase.reference, title: fabCase.title } : undefined;
    return create(mode, link);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text && !attach) return;
    try {
      const id = await ensureConv(conv?.mode ?? 'CHAT');
      setDraft('');
      const file = attach;
      setAttach(null);
      await sendMessage(id, text || (file ? `📎 ${file.name}` : ''), file ?? undefined);
    } catch (e) {
      toast({
        title: 'Erreur',
        description: getJuriaErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  const quick = async (label: string, mode: JuriaMode) => {
    try {
      await ensureConv(mode);
      setDraft(label);
      setOpen(true);
    } catch (e) {
      toast({
        title: 'Erreur',
        description: getJuriaErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  const lastAssistant = conv?.messages.filter((m) => m.role === 'assistant').pop();

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[45] p-0">
      <div className="pointer-events-auto flex flex-col items-end gap-3 pr-6 pb-20">
        {open && (
          <div className="flex h-[480px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[20px] border border-slate-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Juria</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Beta
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Votre assistant juridique marocain</p>
                {fabCase && (
                  <p className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                    Contexte: Dossier #{fabCase.reference ?? fabCase.id} actif
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(false)} aria-label="Fermer">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {lastAssistant?.content && (
                <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-[12px] dark:border-slate-800 dark:bg-slate-900/60">
                  <JuriaMarkdown content={lastAssistant.content.slice(0, 1200)} />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Actions rapides</p>
                <div className="flex flex-col gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => void quick('Analyser un contrat', 'CONTRACT_ANALYSIS')}>
                    📄 Analyser un document
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => void quick('Recherche rapide sur ', 'LEGAL_RESEARCH')}>
                    🔍 Recherche rapide
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => void quick('Rédiger un acte juridique : ', 'DOCUMENT_DRAFTING')}>
                    📝 Rédiger un acte
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => void quick('', 'CHAT')}>
                    💬 Poser une question
                  </Button>
                </div>
              </div>
            </div>

            <JuriaComposer
              mode={conv?.mode ?? 'CHAT'}
              onModeChange={(m) => {
                void (async () => {
                  try {
                    const link = fabCase ?
                      { id: fabCase.id, reference: fabCase.reference, title: fabCase.title }
                    : undefined;
                    await create(m, link);
                  } catch (e) {
                    toast({
                      title: 'Erreur',
                      description: getJuriaErrorMessage(e),
                      variant: 'destructive',
                    });
                  }
                })();
              }}
              value={draft}
              onChange={setDraft}
              onSend={() => void handleSend()}
              disabled={processingId === activeId}
              linkedCase={
                conv?.caseId ? { reference: conv.caseReference, title: conv.caseTitle } : undefined
              }
              onLinkCase={(c) => {
                void createLinkedConversation(c).catch((e) =>
                  toast({
                    title: 'Impossible de lier',
                    description: getJuriaErrorMessage(e),
                    variant: 'destructive',
                  })
                );
              }}
              onUnlinkCase={() => {}}
              compact
              attachment={attach}
              onAttachmentChange={setAttach}
            />

            <div className="shrink-0 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full gap-2 text-indigo-600 dark:text-indigo-400"
                onClick={() => {
                  const q = activeId ? `?c=${encodeURIComponent(activeId)}` : '';
                  navigate(`/dashboard/juria${q}`);
                  setOpen(false);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ouvrir Juria complet
              </Button>
            </div>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                'relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] transition hover:brightness-105',
                'animate-juria-fab-breathe'
              )}
              aria-label="Juria"
            >
              <Sparkles className="h-6 w-6" />
              {processingId && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 ring-2 ring-white" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">Demander à Juria</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
