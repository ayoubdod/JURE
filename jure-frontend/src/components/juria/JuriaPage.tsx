import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JuriaSidebar } from '@/components/juria/JuriaSidebar';
import { JuriaEmptyState } from '@/components/juria/JuriaEmptyState';
import { JuriaConversationView } from '@/components/juria/JuriaConversationView';
import useJuriaStore from '@/stores/juriaStore';
import type { JuriaMode } from '@/types/juria';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function JuriaPage() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const activeId = useJuriaStore((s) => s.activeConversationId);
  const conversations = useJuriaStore((s) => s.conversations);
  const setActive = useJuriaStore((s) => s.setActiveConversation);
  const create = useJuriaStore((s) => s.createConversation);
  const sendMessage = useJuriaStore((s) => s.sendMessage);
  const loadInitial = useJuriaStore((s) => s.loadInitial);
  const juriaUnavailable = useJuriaStore((s) => s.juriaUnavailable);
  const clearJuriaUnavailable = useJuriaStore((s) => s.clearJuriaUnavailable);
  const detailLoading = useJuriaStore((s) => s.detailLoading);

  const hasActive = !!activeId && conversations.some((c) => c.id === activeId);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const c = params.get('c');
    if (c && c !== activeId) {
      setActive(c);
    }
  }, [params, activeId, setActive]);

  useEffect(() => {
    if (activeId) {
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.set('c', activeId);
          return n;
        },
        { replace: true }
      );
      setMobileListOpen(false);
    } else {
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete('c');
          return n;
        },
        { replace: true }
      );
    }
  }, [activeId, setParams]);

  if (juriaUnavailable) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-6 sm:p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
        <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Juria indisponible</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
            Le service Juria est désactivé ou momentanément indisponible côté serveur. Réessayez plus tard.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            clearJuriaUnavailable();
            void loadInitial();
          }}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-[1600px] overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-slate-50/80 shadow-none sm:shadow-sm dark:border-slate-800 dark:bg-slate-950/50',
        'h-[calc(100dvh-4.5rem)] sm:h-[calc(100vh-7rem)] min-h-[320px] sm:min-h-[480px]'
      )}
    >
      {/* Desktop sidebar */}
      <div className="hidden md:contents">
        <JuriaSidebar />
      </div>

      {/* Mobile conversation list sheet */}
      <Sheet open={isMobile && mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side="left" className="w-[min(100vw,20rem)] p-0 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations Juria</SheetTitle>
          </SheetHeader>
          <div className="h-full min-h-0">
            <JuriaSidebar />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-slate-950">
        <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-2 py-1.5 md:hidden dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label="Open conversations"
            onClick={() => setMobileListOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {hasActive && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Close conversation"
              onClick={() => setActive(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {hasActive
              ? conversations.find((c) => c.id === activeId)?.title ?? 'Juria'
              : 'Juria'}
          </span>
        </div>

        {!hasActive ?
          <JuriaEmptyState
            onPickMode={(mode: JuriaMode) => {
              void create(mode).catch((e) =>
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
                  const id = await create('CHAT');
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
        : detailLoading && !conversations.find((c) => c.id === activeId)?.messages.length ?
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Chargement de la conversation…</div>
        : <JuriaConversationView />}
      </div>
    </div>
  );
}
