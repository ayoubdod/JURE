import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JuriaSidebar } from '@/components/juria/JuriaSidebar';
import { JuriaEmptyState } from '@/components/juria/JuriaEmptyState';
import { JuriaConversationView } from '@/components/juria/JuriaConversationView';
import useJuriaStore from '@/stores/juriaStore';
import type { JuriaMode } from '@/types/juria';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';

export default function JuriaPage() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
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
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
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
    <div className="flex h-[calc(100vh-7rem)] min-h-[480px] w-full max-w-[1600px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <JuriaSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-slate-950">
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
