import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { JuriaSidebar } from '@/components/juria/JuriaSidebar';
import { JuriaConversationView } from '@/components/juria/JuriaConversationView';
import { JuriaEmptyState } from '@/components/juria/JuriaEmptyState';
import useJuriaStore from '@/stores/juriaStore';
import { buildJuriaCaseContextPayload } from '@/utils/juriaCaseContext';
import type { JuriaMode } from '@/types/juria';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation } from '@/i18n';

export function JuriaCasePanel({ caseItem }: { caseItem: API.Case }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, tf } = useAppTranslation();
  const [chatsOpen, setChatsOpen] = useState(false);
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

  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations, caseItem.id]);

  const caseConversations = conversations.filter((c) => c.caseId === caseItem.id && !c.archived);
  const hasActive =
    !!activeId && caseConversations.some((c) => c.id === activeId);

  const sidebar = (
    <JuriaSidebar
      variant="compact"
      caseId={caseItem.id}
      newConversationCase={linked}
      onConversationOpen={() => setChatsOpen(false)}
    />
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200/90 bg-slate-50/90 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {tf(t.juria.casePanel.title, { reference: refLine ?? caseItem.id })}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs md:hidden"
              onClick={() => setChatsOpen(true)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t.juria.casePanel.chats}
            </Button>
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
              <span className="hidden sm:inline">{t.juria.casePanel.openInJuria}</span>
              <span className="sm:hidden">Juria</span>
            </Button>
          </div>
        </div>
        <p className="mt-1 hidden text-[11px] leading-relaxed text-slate-600 sm:block dark:text-slate-400">
          {t.juria.casePanel.hint}
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="hidden h-full w-[min(100%,220px)] shrink-0 md:flex">{sidebar}</div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
          {!hasActive ?
            <JuriaEmptyState
              showStarters={false}
              showCaseLink={false}
              linkedCase={linked}
              onPickMode={(mode: JuriaMode) => {
                void create(mode, linked).catch((e) =>
                  toast({
                    title: t.juria.toasts.createFailed,
                    description: getJuriaErrorMessage(e),
                    variant: 'destructive',
                  })
                );
              }}
              onPickStarter={(text, mode) => {
                void (async () => {
                  try {
                    const id = await create(mode ?? 'CHAT', linked);
                    await sendMessage(id, text);
                  } catch (e) {
                    toast({
                      title: t.common.error,
                      description: getJuriaErrorMessage(e),
                      variant: 'destructive',
                    });
                  }
                })();
              }}
              onAsk={(text, file, _caseLink, mode) => {
                void (async () => {
                  try {
                    const id = await create(mode ?? 'CHAT', linked);
                    await sendMessage(id, text, file);
                  } catch (e) {
                    toast({
                      title: t.common.error,
                      description: getJuriaErrorMessage(e),
                      variant: 'destructive',
                    });
                  }
                })();
              }}
            />
          : detailLoading && !(conversations.find((c) => c.id === activeId)?.messages.length) ?
            <div className="flex flex-1 items-center justify-center text-xs text-slate-500">{t.juria.loading}</div>
          : <JuriaConversationView caseContext={caseCtx} compact showCaseLink={false} />}
        </div>
      </div>

      <Sheet open={chatsOpen} onOpenChange={setChatsOpen}>
        <SheetContent side="start" className="flex w-[min(100vw,20rem)] flex-col p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t.juria.casePanel.chats}</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>
    </div>
  );
}
