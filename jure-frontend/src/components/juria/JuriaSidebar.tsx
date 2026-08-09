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
import { JURIA_MODE_VISUAL } from '@/components/juria/juriaConstants';
import type { JuriaConversation, JuriaMode } from '@/types/juria';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

type GroupKey = 'today' | 'yesterday' | 'thisWeek' | 'older';

function bucketConv(c: JuriaConversation): GroupKey {
  const d = dayjs(c.updatedAt);
  const now = dayjs();
  if (d.isSame(now, 'day')) return 'today';
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'yesterday';
  if (d.isAfter(now.subtract(7, 'day'))) return 'thisWeek';
  return 'older';
}

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'thisWeek', 'older'];

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
  const { t, tf } = useAppTranslation();
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
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };
    for (const c of filtered) {
      m[bucketConv(c)].push(c);
    }
    return m;
  }, [filtered]);

  const modeEntries: [JuriaMode, string][] = [
    ['CHAT', `💬 ${t.juria.modes.CHAT.label}`],
    ['CONTRACT_ANALYSIS', `📄 ${t.juria.modes.CONTRACT_ANALYSIS.label}`],
    ['LEGAL_RESEARCH', `🔍 ${t.juria.modes.LEGAL_RESEARCH.label}`],
    ['DOCUMENT_DRAFTING', `📝 ${t.juria.modes.DOCUMENT_DRAFTING.label}`],
  ];

  const Row = ({ c }: { c: JuriaConversation }) => {
    const visual = JURIA_MODE_VISUAL[c.mode];
    const last = c.messages[c.messages.length - 1];
    const preview =
      c.lastMessagePreview?.slice(0, 72) ?? last?.content?.slice(0, 72) ?? t.juria.newConversationPreview;
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
          <span className="text-base leading-none">{visual.icon}</span>
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
                  const next = window.prompt(t.juria.renamePrompt, c.title);
                  if (next) rename(c.id, next);
                }}
              >
                {t.juria.rename}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void archive(c.id).catch((e) =>
                    toast({ title: t.juria.toasts.archiveFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
                  );
                }}
              >
                {t.juria.archive}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  void del(c.id).catch((e) =>
                    toast({ title: t.juria.toasts.deleteFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
                  );
                }}
              >
                {t.juria.delete}
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
              const next = window.prompt(t.juria.renamePrompt, c.title);
              if (next) rename(c.id, next);
            }}
          >
            {t.juria.rename}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              void archive(c.id).catch((e) =>
                toast({ title: t.juria.toasts.archiveFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
              );
            }}
          >
            {t.juria.archive}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-600"
            onClick={() => {
              void del(c.id).catch((e) =>
                toast({ title: t.juria.toasts.deleteFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
              );
            }}
          >
            {t.juria.delete}
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
            <span className="text-lg font-semibold text-slate-900 dark:text-white">{t.juria.name}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {t.juria.beta}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1 bg-indigo-600 text-xs hover:bg-indigo-700">
                <Plus className="h-3.5 w-3.5" />
                {t.juria.newConversation}
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {modeEntries.map(([mode, label]) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => {
                    void create(mode, newConversationCase).catch((e) =>
                      toast({
                        title: t.juria.toasts.createFailed,
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
            placeholder={t.juria.searchPlaceholder}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {listLoading && (
          <p className="px-2 py-3 text-center text-xs text-slate-500">{t.juria.loading}</p>
        )}
        {GROUP_ORDER.map((g) => {
          const list = grouped[g];
          if (list.length === 0) return null;
          return (
            <div key={g} className="mb-4">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t.juria.groups[g]}
              </p>
              <div className="space-y-1">
                {list.map((c) => (
                  <Row key={c.id} c={c} />
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-slate-500">{t.juria.emptyConversations}</p>
        )}
      </div>

      {variant === 'full' && (
        <div className="shrink-0 border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
          {usage ?
            <>
              {tf(t.juria.usageThisMonth, {
                month: usage.month,
                year: usage.year,
                messages: usage.total_messages,
                tokens: usage.total_tokens,
              })}
            </>
          : '—'}
        </div>
      )}
    </aside>
  );
}
