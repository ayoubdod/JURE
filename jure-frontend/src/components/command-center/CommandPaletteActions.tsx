import React, { memo } from 'react';
import {
  BookOpen,
  Brain,
  Calendar,
  FileSignature,
  FolderPlus,
  Receipt,
  ScrollText,
  Search,
  ShieldAlert,
  Upload,
  UserPlus,
  NotebookPen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommandActionId } from './types';

type Action = {
  id: CommandActionId;
  label: string;
  hint: string;
  icon: React.ElementType;
  kbd?: string;
};

const ACTIONS: Action[] = [
  { id: 'matter', label: 'New Matter', hint: 'Open a matter', icon: FolderPlus, kbd: 'M' },
  { id: 'client', label: 'New Client', hint: 'Register client', icon: UserPlus, kbd: 'C' },
  { id: 'upload', label: 'Upload Knowledge', hint: 'Index documents', icon: Upload, kbd: 'U' },
  { id: 'contract', label: 'Generate Contract', hint: 'AI draft', icon: FileSignature, kbd: 'G' },
  { id: 'askAi', label: 'Ask AI', hint: 'Open JURIA', icon: Brain, kbd: 'J' },
  { id: 'conflict', label: 'Conflict Check', hint: 'Party search', icon: ShieldAlert },
  { id: 'draft', label: 'Draft with AI', hint: 'Compose', icon: ScrollText },
  { id: 'notes', label: 'Meeting Notes', hint: 'Capture', icon: NotebookPen },
  { id: 'research', label: 'Research', hint: 'Notebook', icon: Search },
  { id: 'timeline', label: 'Timeline', hint: 'Matter history', icon: Calendar },
  { id: 'invoice', label: 'Invoice', hint: 'Finance', icon: Receipt },
  { id: 'knowledge', label: 'Knowledge Hub', hint: 'Repository', icon: BookOpen },
];

type Props = {
  onAction: (id: CommandActionId) => void;
  className?: string;
};

const CommandPaletteActions = memo(function CommandPaletteActions({ onAction, className }: Props) {
  return (
    <section
      aria-label="Command palette actions"
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Commands</h2>
        <p className="text-[10px] text-slate-400">Mission control actions</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {ACTIONS.map(({ id, label, hint, icon: Icon, kbd }) => (
          <button
            key={id}
            type="button"
            onClick={() => onAction(id)}
            className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/70"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-[#64499D]/10 group-hover:text-[#64499D] dark:bg-slate-800 dark:text-slate-300">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-slate-800 dark:text-slate-100">
                {label}
              </span>
              <span className="block truncate text-[10px] text-slate-400">{hint}</span>
            </span>
            {kbd && (
              <kbd className="hidden rounded border border-slate-200 px-1 py-0.5 font-mono text-[9px] text-slate-400 sm:inline dark:border-slate-700">
                {kbd}
              </kbd>
            )}
          </button>
        ))}
      </div>
    </section>
  );
});

export default CommandPaletteActions;
export { ACTIONS };
