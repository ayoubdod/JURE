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
import { JURIA_MODE_VISUAL, juriaModeVisual } from '@/components/juria/juriaConstants';
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

function ConversationRow({
  c,
  active,
  onOpen,
  onRename,
  onArchive,
  onDelete,
  renameLabel,
  archiveLabel,
  deleteLabel,
  renamePrompt,
  previewFallback,
}: {
  c: JuriaConversation;
  active: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  renameLabel: string;
  archiveLabel: string;
  deleteLabel: string;
  renamePrompt: string;
  previewFallback: string;
}) {
  const visual = juriaModeVisual(c.mode);
  const Icon = visual.Icon;
  const last = c.messages[c.messages.length - 1];
  const preview = c.lastMessagePreview?.slice(0, 72) ?? last?.content?.slice(0, 72) ?? previewFallback;

  const promptRename = () => {
    const next = window.prompt(renamePrompt, c.title);
    if (next) onRename(c.id, next);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpen(c.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(c.id);
            }
          }}
          className={cn(
            'group relative w-full cursor-pointer rounded-lg border border-transparent px-2.5 py-2 text-left transition',
            active
              ? 'border-[#64499D]/20 bg-[#64499D]/[0.06] dark:border-[#64499D]/30 dark:bg-[#64499D]/15'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
          )}
        >
          {active && <span className="absolute bottom-2 start-0 top-2 w-0.5 rounded-full bg-[#64499D]" />}
          <div className="flex items-start gap-2 ps-1.5">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
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
                <DropdownMenuItem onClick={promptRename}>{renameLabel}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive(c.id)}>{archiveLabel}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => onDelete(c.id)}>
                  {deleteLabel}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onClick={promptRename}>{renameLabel}</ContextMenuItem>
        <ContextMenuItem onClick={() => onArchive(c.id)}>{archiveLabel}</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-red-600" onClick={() => onDelete(c.id)}>
          {deleteLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

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

  const modeEntries: JuriaMode[] = ['CHAT', 'CONTRACT_ANALYSIS', 'LEGAL_RESEARCH', 'DOCUMENT_DRAFTING'];

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        variant === 'full'
          ? 'w-full shrink-0 border-e md:w-[280px]'
          : 'w-full max-w-full shrink-0 border-b border-slate-200 sm:w-[220px] sm:border-b-0 sm:border-e dark:border-slate-800'
      )}
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/images/juria-icon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
            <span className="text-[13px] font-semibold tracking-wide text-slate-900 dark:text-white">{t.juria.name}</span>
            <span className="rounded-full bg-[#64499D]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#64499D]">
              {t.juria.beta}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="mt-3 h-8 w-full gap-1 bg-[#64499D] text-xs hover:bg-[#4D3680]">
              <Plus className="h-3.5 w-3.5" />
              {t.juria.newConversation}
              <ChevronDown className="ms-auto h-3.5 w-3.5 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {modeEntries.map((mode) => {
                const Icon = JURIA_MODE_VISUAL[mode].Icon;
                return (
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
                    <Icon className="me-2 h-3.5 w-3.5 text-[#64499D]" />
                    {t.juria.modes[mode].label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        <div className="relative mt-3">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.juria.searchPlaceholder}
            className="h-9 ps-9 text-xs"
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
              <p className="mb-2 px-2 text-[10px] font-medium tracking-wide text-slate-400">
                {t.juria.groups[g]}
              </p>
              <div className="space-y-1">
                {list.map((c) => (
                  <ConversationRow
                    key={c.id}
                    c={c}
                    active={c.id === activeId}
                    onOpen={setActive}
                    onRename={rename}
                    onArchive={(id) => {
                      void archive(id).catch((e) =>
                        toast({ title: t.juria.toasts.archiveFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
                      );
                    }}
                    onDelete={(id) => {
                      void del(id).catch((e) =>
                        toast({ title: t.juria.toasts.deleteFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
                      );
                    }}
                    renameLabel={t.juria.rename}
                    archiveLabel={t.juria.archive}
                    deleteLabel={t.juria.delete}
                    renamePrompt={t.juria.renamePrompt}
                    previewFallback={t.juria.newConversationPreview}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && !listLoading && (
          <div className="flex flex-col items-center px-3 py-10 text-center">
            <img src="/images/juria-icon.png" alt="" className="mb-3 h-10 w-10 rounded-lg opacity-80" />
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{t.juria.emptyConversations}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{t.juria.emptyConversationsHint}</p>
          </div>
        )}
      </div>

      {variant === 'full' && (
        <div className="shrink-0 border-t border-slate-200 px-3 py-2.5 text-[10px] leading-relaxed text-slate-400 dark:border-slate-800">
          {usage ?
            <>
              <p className="font-medium text-slate-500 dark:text-slate-400">
                {tf(t.juria.usageThisMonth, { month: usage.month, year: usage.year })}
              </p>
              <p>
                {tf(t.juria.usageStats, {
                  conversations: filtered.length,
                  tokens: usage.total_tokens,
                })}
              </p>
            </>
          : '—'}
        </div>
      )}
    </aside>
  );
}
