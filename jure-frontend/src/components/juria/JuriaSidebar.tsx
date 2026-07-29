import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronDown, MoreHorizontal, Plus, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { JURIA_MODE_META } from '@/components/juria/juriaConstants';
import type { JuriaConversation, JuriaMode } from '@/types/juria';
import { cn } from '@/lib/utils';

type GroupKey = 'AUJOURD\'HUI' | 'HIER' | 'CETTE SEMAINE' | 'PLUS ANCIEN';

function bucketConv(c: JuriaConversation): GroupKey {
  const d = dayjs(c.updatedAt);
  const now = dayjs();
  if (d.isSame(now, 'day')) return 'AUJOURD\'HUI';
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'HIER';
  if (d.isAfter(now.subtract(7, 'day'))) return 'CETTE SEMAINE';
  return 'PLUS ANCIEN';
}

const GROUP_ORDER: GroupKey[] = ['AUJOURD\'HUI', 'HIER', 'CETTE SEMAINE', 'PLUS ANCIEN'];

export function JuriaSidebar({
  variant = 'full',
  caseId,
  newConversationCase,
}: {
  variant?: 'full' | 'compact';
  /** When set, only conversations linked to this case are listed. */
  caseId?: number;
  /** Pre-link new conversations (e.g. case panel). */
  newConversationCase?: { id: number; reference?: string; title?: string };
}) {
  const conversations = useJuriaStore((s) => s.conversations);
  const activeId = useJuriaStore((s) => s.activeConversationId);
  const setActive = useJuriaStore((s) => s.setActiveConversation);
  const create = useJuriaStore((s) => s.createConversation);
  const rename = useJuriaStore((s) => s.renameConversation);
  const archive = useJuriaStore((s) => s.archiveConversation);
  const del = useJuriaStore((s) => s.deleteConversation);
  const usage = useJuriaStore((s) => s.usage);
  const listLoading = useJuriaStore((s) => s.listLoading);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return conversations.filter((c) => {
      if (c.archived) return false;
      if (caseId != null && c.caseId !== caseId) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
      );
    });
  }, [conversations, debounced, caseId]);

  const grouped = useMemo(() => {
    const m: Record<GroupKey, JuriaConversation[]> = {
      'AUJOURD\'HUI': [],
      HIER: [],
      'CETTE SEMAINE': [],
      'PLUS ANCIEN': [],
    };
    for (const c of filtered) {
      m[bucketConv(c)].push(c);
    }
    return m;
  }, [filtered]);

  const Row = ({ c }: { c: JuriaConversation }) => {
    const meta = JURIA_MODE_META[c.mode];
    const last = c.messages[c.messages.length - 1];
    const preview =
      c.lastMessagePreview?.slice(0, 72) ?? last?.content?.slice(0, 72) ?? 'Nouvelle conversation';
    const active = c.id === activeId;

    const inner = (
      <button
        type="button"
        onClick={() => setActive(c.id)}
        className={cn(
          'group relative w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition',
          active
            ? 'border-indigo-200 bg-indigo-50/90 dark:border-indigo-900 dark:bg-indigo-950/40'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
        )}
      >
        {active && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-indigo-500" />}
        <div className="flex items-start gap-2 pl-1">
          <span className="text-base leading-none">{meta.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">{c.title}</span>
              <span className="shrink-0 text-[10px] text-slate-400">{dayjs(c.updatedAt).format('HH:mm')}</span>
            </div>
            <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{preview}</p>
            {c.caseReference && (
              <span className="mt-1 inline-flex max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                #{c.caseReference}
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <span
                role="button"
                tabIndex={0}
                className="rounded p-1 opacity-0 hover:bg-slate-200 group-hover:opacity-100 dark:hover:bg-slate-700"
                onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  const t = window.prompt('Nouveau titre', c.title);
                  if (t) rename(c.id, t);
                }}
              >
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void archive(c.id).catch((e) =>
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
                  void del(c.id).catch((e) =>
                    toast({ title: 'Suppression impossible', description: getJuriaErrorMessage(e), variant: 'destructive' })
                  );
                }}
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </button>
    );

    return (
      <ContextMenu key={c.id}>
        <ContextMenuTrigger asChild>{inner}</ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          <ContextMenuItem
            onClick={() => {
              const t = window.prompt('Nouveau titre', c.title);
              if (t) rename(c.id, t);
            }}
          >
            Renommer
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              void archive(c.id).catch((e) =>
                toast({ title: 'Archivage impossible', description: getJuriaErrorMessage(e), variant: 'destructive' })
              );
            }}
          >
            Archiver
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-600"
            onClick={() => {
              void del(c.id).catch((e) =>
                toast({ title: 'Suppression impossible', description: getJuriaErrorMessage(e), variant: 'destructive' })
              );
            }}
          >
            Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        variant === 'full' ? 'w-[280px] shrink-0 border-r' : 'w-full max-w-full shrink-0 border-b border-slate-200 sm:w-[220px] sm:border-b-0 sm:border-r dark:border-slate-800'
      )}
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900 dark:text-white">Juria</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Beta
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1 bg-indigo-600 text-xs hover:bg-indigo-700">
                <Plus className="h-3.5 w-3.5" />
                Nouvelle conversation
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {(
                [
                  ['CHAT', '💬 Chat juridique'],
                  ['CONTRACT_ANALYSIS', '📄 Analyse de contrat'],
                  ['LEGAL_RESEARCH', '🔍 Recherche juridique'],
                  ['DOCUMENT_DRAFTING', '📝 Rédaction de document'],
                ] as [JuriaMode, string][]
              ).map(([mode, label]) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => {
                    void create(mode, newConversationCase).catch((e) =>
                      toast({
                        title: 'Création impossible',
                        description: getJuriaErrorMessage(e),
                        variant: 'destructive',
                      })
                    );
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {listLoading && (
          <p className="px-2 py-3 text-center text-xs text-slate-500">Chargement…</p>
        )}
        {GROUP_ORDER.map((g) => {
          const list = grouped[g];
          if (list.length === 0) return null;
          return (
            <div key={g} className="mb-4">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
              <div className="space-y-1">
                {list.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-slate-500">Aucune conversation</p>
        )}
      </div>

      {variant === 'full' && (
        <div className="shrink-0 border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
          {usage ?
            <>
              Ce mois-ci ({usage.month} {usage.year}): {usage.total_messages} messages · {usage.total_tokens} tokens
            </>
          : '—'}
        </div>
      )}
    </aside>
  );
}
