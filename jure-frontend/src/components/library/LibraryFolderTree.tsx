import React from 'react';
import { Folder, BookOpen } from 'lucide-react';
import { DocumentCategory } from '@/utils/constants';
import { cn } from '@/lib/utils';

export type FolderTreeItem = {
  id: string;
  label: string;
  count: number;
  icon?: React.ReactNode;
};

interface LibraryFolderTreeProps {
  selectedId: string;
  onSelect: (id: string) => void;
  items: FolderTreeItem[];
  className?: string;
}

const LibraryFolderTree: React.FC<LibraryFolderTreeProps> = ({
  selectedId,
  onSelect,
  items,
  className,
}) => {
  return (
    <nav
      className={cn(
        'flex flex-col gap-0.5 text-[13px]',
        className
      )}
      aria-label="Document folders"
    >
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors duration-150',
              'border border-transparent',
              isSelected
                ? 'bg-[#0F172A]/5 dark:bg-white/5 text-[#0F172A] dark:text-[#F8FAFC]'
                : 'text-[#64748B] dark:text-slate-400 hover:bg-[#0F172A]/[0.03] dark:hover:bg-white/[0.03] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            )}
          >
            {item.id === 'all' ? (
              <BookOpen className="w-4 h-4 shrink-0 text-[#64748B] dark:text-slate-400" />
            ) : (
              <Folder className="w-4 h-4 shrink-0 text-[#64748B] dark:text-slate-400" />
            )}
            <span className="flex-1 truncate font-medium">{item.label}</span>
            <span
              className={cn(
                'text-[11px] px-1.5 py-0.5 rounded',
                isSelected
                  ? 'bg-[#0F172A]/10 dark:bg-white/10 text-[#64748B] dark:text-slate-400'
                  : 'text-[#94A3B8] dark:text-slate-500'
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export const buildFolderTreeFromDocuments = (
  documents: API.Document[],
  categoryOptions: { label: string; value: string }[]
): FolderTreeItem[] => {
  const counts: Record<string, number> = { all: documents.length };
  categoryOptions.forEach((c) => {
    counts[c.value] = documents.filter((d) => d.category === c.value).length;
  });

  const allItem: FolderTreeItem = {
    id: 'all',
    label: 'All Documents',
    count: counts.all,
  };

  const categoryItems: FolderTreeItem[] = categoryOptions.map((c) => ({
    id: c.value,
    label: c.label,
    count: counts[c.value] ?? 0,
  }));

  return [allItem, ...categoryItems];
};

export default LibraryFolderTree;
