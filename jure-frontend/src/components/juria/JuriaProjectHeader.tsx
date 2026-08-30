import {
  Activity,
  Archive,
  Calendar,
  Copy,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Library,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  ScrollText,
  Settings2,
  Star,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JuriaProject, JuriaTab } from '@/types/juria';
import useJuriaStore from '@/stores/juriaStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JuriaTextPromptDialog } from '@/components/juria/JuriaTextPromptDialog';
import { useMemo, useState } from 'react';
import { useAppTranslation } from '@/i18n';

export function JuriaProjectHeader({
  project,
  tab,
  onTab,
}: {
  project: JuriaProject;
  tab: JuriaTab;
  onTab: (t: JuriaTab) => void;
}) {
  const { t, tf } = useAppTranslation();
  const w = t.juria.workspace;
  const update = useJuriaStore((s) => s.updateProject);
  const archive = useJuriaStore((s) => s.archiveProject);
  const duplicate = useJuriaStore((s) => s.duplicateProject);
  const setActive = useJuriaStore((s) => s.setActiveProject);
  const [renameOpen, setRenameOpen] = useState(false);

  const tabs = useMemo(() => {
    const all = [
      { id: 'overview' as const, label: w.tabs.overview, Icon: LayoutDashboard },
      { id: 'chat' as const, label: w.tabs.chat, Icon: MessageSquare },
      { id: 'sources' as const, label: w.tabs.sources, Icon: Library },
      { id: 'documents' as const, label: w.tabs.documents, Icon: FileText },
      { id: 'case' as const, label: w.tabs.case, Icon: FolderOpen },
      { id: 'calendar' as const, label: w.tabs.calendar, Icon: Calendar },
      { id: 'tasks' as const, label: w.tabs.tasks, Icon: ScrollText },
      { id: 'team' as const, label: w.tabs.team, Icon: Users },
      { id: 'artifacts' as const, label: w.tabs.artifacts, Icon: PenLine },
      { id: 'activity' as const, label: w.tabs.activity, Icon: Activity },
      { id: 'instructions' as const, label: w.tabs.instructions, Icon: Settings2 },
    ] satisfies { id: JuriaTab; label: string; Icon: typeof MessageSquare }[];
    if (project.is_simple) {
      return all.filter((t) => t.id === 'chat');
    }
    return all;
  }, [project.is_simple, w.tabs]);

  return (
    <header className="shrink-0 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">{project.description}</p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>{w.actions.rename}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void update(project.id, { is_favorite: !project.is_favorite })}>
              <Star className="me-2 h-3.5 w-3.5" />
              {project.is_favorite ? w.actions.unfavorite : w.actions.favorite}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                void duplicate(project.id).then((id) => {
                  if (id) setActive(id);
                })
              }
            >
              <Copy className="me-2 h-3.5 w-3.5" />
              {w.actions.duplicate}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (window.confirm(tf(w.header.archiveConfirm, { name: project.name }))) {
                  void archive(project.id);
                }
              }}
            >
              <Archive className="me-2 h-3.5 w-3.5" />
              {w.actions.archive}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <nav className="mt-3 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition',
              tab === id
                ? 'bg-[#64499D] text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>
      <JuriaTextPromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={w.header.renameProject}
        label={w.header.nameLabel}
        initialValue={project.name}
        confirmLabel={w.actions.save}
        onConfirm={(name) => void update(project.id, { name })}
      />
    </header>
  );
}
