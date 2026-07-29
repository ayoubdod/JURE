import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JuriaSidebar } from '@/components/juria/JuriaSidebar';
import { JuriaConversationView } from '@/components/juria/JuriaConversationView';
import { JuriaEmptyState } from '@/components/juria/JuriaEmptyState';
import useJuriaStore from '@/stores/juriaStore';
import { buildJuriaCaseContextPayload } from '@/utils/juriaCaseContext';
import type { JuriaMode } from '@/types/juria';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';

export function JuriaCasePanel({ caseItem }: { caseItem: API.Case }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const activeId = useJuriaStore((s) => s.activeConversationId);
  const conversations = useJuriaStore((s) => s.conversations);
  const create = useJuriaStore((s) => s.createConversation);
  const sendMessage = useJuriaStore((s) => s.sendMessage);
  const loadConversations = useJuriaStore((s) => s.loadConversations);
  const detailLoading = useJuriaStore((s) => s.detailLoading);
  const caseCtx = buildJuriaCaseContextPayload(caseItem);
  const refLine = caseItem.reference?.trim();
  const title = caseItem.title?.trim();

  const linked = {
    id: caseItem.id,
    reference: refLine,
    title: title || refLine || undefined,
  };

  useEffect(() => {
    void loadConversations();
  }, [loadConversations, caseItem.id]);

  const hasActive =
    !!activeId && conversations.some((c) => c.id === activeId && c.caseId === caseItem.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Assistant Juria — Dossier #{refLine ?? caseItem.id}
              </h3>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Toutes les questions posées ici sont liées à ce dossier.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={() => {
              const q = activeId ? `?c=${encodeURIComponent(activeId)}` : '';
              navigate(`/dashboard/juria${q}`);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir dans Juria
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        <JuriaSidebar variant="compact" caseId={caseItem.id} newConversationCase={linked} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-slate-950">
          {!hasActive ?
            <JuriaEmptyState
              onPickMode={(mode: JuriaMode) => {
                void create(mode, linked).catch((e) =>
                  toast({
                    title: 'Création impossible',
                    description: getJuriaErrorMessage(e),
                    variant: 'destructive',
                  })
                );
              }}
              onPickStarter={(text) => {
                void (async () => {
                  try {
                    const id = await create('CHAT', linked);
                    await sendMessage(id, text);
                  } catch (e) {
                    toast({
                      title: 'Erreur',
                      description: getJuriaErrorMessage(e),
                      variant: 'destructive',
                    });
                  }
                })();
              }}
            />
          : detailLoading && !(conversations.find((c) => c.id === activeId)?.messages.length) ?
            <div className="flex flex-1 items-center justify-center text-xs text-slate-500">Chargement…</div>
          : <JuriaConversationView caseContext={caseCtx} compact showCaseLink={false} />}
        </div>
      </div>
    </div>
  );
}
