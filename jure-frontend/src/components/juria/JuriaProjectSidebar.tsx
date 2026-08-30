import React, { useMemo, useState } from 'react';
import { Archive, Folder, MessageSquare, PanelLeftClose, Plus, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import useJuriaStore from '@/stores/juriaStore';
import { useDebounce } from '@/hooks/use-debounce';
import type { JuriaProject } from '@/types/juria';
import { useAppTranslation } from '@/i18n';

export function JuriaProjectSidebar({
  onNewProject,
  onQuickChat,
  quickBusy,
  onOpenProject,
  onCollapse,
  variant = 'full',
}: {
  onNewProject: () => void;
  onQuickChat?: () => void;
  quickBusy?: boolean;
  onOpenProject?: (id: string) => void;
  onCollapse?: () => void;
  variant?: 'full' | 'compact';
}) {
  const { t } = useAppTranslation();
  const w = t.juria.workspace;
  const projects = useJuriaStore((s) => s.projects);
  const activeId = useJuriaStore((s) => s.activeProjectId);
  const setActive = useJuriaStore((s) => s.setActiveProject);
  const openProject = onOpenProject ?? setActive;
  const archiveView = useJuriaStore((s) => s.archiveView);
  const setArchiveView = useJuriaStore((s) => s.setArchiveView);
  const loadArchived = useJuriaStore((s) => s.loadArchivedProjects);
  const usage = useJuriaStore((s) => s.usage);
  const listLoading = useJuriaStore((s) => s.listLoading);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return projects.filter((p) => {
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    });
  }, [projects, debounced]);

  const favorites = useMemo(() => filtered.filter((p) => p.is_favorite), [filtered]);
  const nonFavorites = useMemo(() => filtered.filter((p) => !p.is_favorite), [filtered]);
  const recent = nonFavorites.slice(0, 4);
  const rest = nonFavorites.slice(4);

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80',
        variant === 'full' ? 'w-full shrink-0 border-e md:w-[280px]' : 'w-full max-w-full shrink-0 sm:w-[220px] sm:border-e'
      )}
    >
      <div className="shrink-0 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <img src="/images/juria-icon.png" alt="" className="h-7 w-7 rounded-lg object-contain ring-1 ring-[#64499D]/20" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold tracking-[0.12em] text-slate-900 dark:text-white">JURIA</p>
            <p className="text-[10px] text-slate-400">{w.tagline}</p>
          </div>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:inline-flex"
              aria-label={w.collapseSidebar}
              title={w.collapseSidebar}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {onQuickChat ? (
          <Button
            size="sm"
            className="mt-3 h-9 w-full gap-1 bg-[#64499D] text-xs shadow-sm hover:bg-[#4D3680]"
            disabled={quickBusy}
            onClick={onQuickChat}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {quickBusy ? w.quickChatCreating : w.quickChat}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={onQuickChat ? 'outline' : 'default'}
          className={cn(
            'mt-2 h-9 w-full gap-1 text-xs',
            !onQuickChat && 'mt-3 bg-[#64499D] shadow-sm hover:bg-[#4D3680]'
          )}
          onClick={onNewProject}
        >
          <Plus className="h-3.5 w-3.5" />
          {w.newProject}
        </Button>
        <div className="relative mt-3">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={w.searchProjects}
            className="h-9 ps-9 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {listLoading && <p className="px-2 py-3 text-center text-xs text-slate-500">{w.loading}</p>}
        {!listLoading && filtered.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Folder className="mx-auto mb-2 h-8 w-8 text-[#64499D]/40" />
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{w.emptyHint}</p>
          </div>
        )}
        {favorites.length > 0 && (
          <Section title={w.favorites}>
            {favorites.map((p) => (
              <ProjectRow key={p.id} p={p} active={p.id === activeId && !archiveView} onOpen={openProject} />
            ))}
          </Section>
        )}
        {recent.length > 0 && (
          <Section title={w.recent}>
            {recent.map((p) => (
              <ProjectRow key={p.id} p={p} active={p.id === activeId && !archiveView} onOpen={openProject} />
            ))}
          </Section>
        )}
        {rest.length > 0 && (
          <Section title={w.projects}>
            {rest.map((p) => (
              <ProjectRow key={p.id} p={p} active={p.id === activeId && !archiveView} onOpen={openProject} />
            ))}
          </Section>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 p-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setArchiveView(true);
            void loadArchived();
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition',
            archiveView ? 'bg-[#64499D]/10 text-[#64499D]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {w.archived}
        </button>
        {usage && (
          <p className="mt-1 px-2.5 text-[10px] text-slate-400">
            {usage.total_messages} messages · {usage.total_tokens} tokens
          </p>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ProjectRow({ p, active, onOpen }: { p: JuriaProject; active: boolean; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className={cn(
        'group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition',
        active
          ? 'bg-[#64499D]/[0.08] ring-1 ring-[#64499D]/15'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
      )}
    >
      <Folder className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active ? 'text-[#64499D]' : 'text-slate-400')} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="line-clamp-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
          {p.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
        </span>
        {p.linked_case_reference && (
          <span className="mt-0.5 block truncate text-[10px] text-slate-400">#{p.linked_case_reference}</span>
        )}
      </span>
    </button>
  );
}
