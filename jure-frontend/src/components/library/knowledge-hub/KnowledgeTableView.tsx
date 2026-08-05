import React, { memo } from 'react';
import {
  Download,
  Edit,
  Eye,
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentCategory } from '@/utils/constants';
import { cn } from '@/lib/utils';
import { formatFileSize, riskStyles } from './knowledgeUtils';
import type { EnrichedDocument } from './types';

type SortKey = 'date' | 'name' | 'size' | 'score';

type Props = {
  items: EnrichedDocument[];
  selectedId?: number | null;
  sortBy: SortKey;
  sortOrder: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
  onSelect: (doc: EnrichedDocument) => void;
  onOpen: (doc: EnrichedDocument) => void;
  onEdit: (e: React.MouseEvent, doc: EnrichedDocument) => void;
  onDownload: (e: React.MouseEvent, doc: EnrichedDocument) => void;
  onDelete: (e: React.MouseEvent, doc: EnrichedDocument) => void;
};

const SortIcon = ({ active, order }: { active: boolean; order: 'asc' | 'desc' }) =>
  active ? (
    order === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  ) : null;

const KnowledgeTableView = memo(function KnowledgeTableView({
  items,
  selectedId,
  sortBy,
  sortOrder,
  onSort,
  onSelect,
  onOpen,
  onEdit,
  onDownload,
  onDelete,
}: Props) {
  const headers: { key: SortKey | null; label: string; className?: string }[] = [
    { key: 'name', label: 'Knowledge asset' },
    { key: null, label: 'Category', className: 'w-28' },
    { key: 'score', label: 'Score', className: 'w-20' },
    { key: null, label: 'Risk', className: 'w-24' },
    { key: 'size', label: 'Size', className: 'w-20' },
    { key: 'date', label: 'Modified', className: 'w-28' },
    { key: null, label: '', className: 'w-28' },
  ];

  return (
    <div className="overflow-x-auto min-w-0">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="border-slate-200/80 hover:bg-transparent dark:border-slate-800">
            {headers.map((h) => (
              <TableHead
                key={h.label || 'actions'}
                className={cn(
                  'h-9 px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400',
                  h.className
                )}
              >
                {h.key ? (
                  <button
                    type="button"
                    onClick={() => onSort(h.key!)}
                    className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {h.label}
                    <SortIcon active={sortBy === h.key} order={sortOrder} />
                  </button>
                ) : (
                  h.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const category =
              DocumentCategory.options.find((c) => c.value === item.category)?.label ||
              item.category;
            return (
              <TableRow
                key={item.id}
                onClick={() => onSelect(item)}
                className={cn(
                  'cursor-pointer border-slate-200/80 transition-colors dark:border-slate-800',
                  selectedId === item.id
                    ? 'bg-[#64499D]/06 dark:bg-[#64499D]/15'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/60'
                )}
              >
                <TableCell className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-[#64499D]/70" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-50">
                        {item.title}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {item.insight.aiIndexed ? 'AI Indexed' : 'Pending'} · Conf.{' '}
                        {item.insight.confidence}% · {item.insight.language}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                  {category}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-[12px] font-medium tabular-nums text-[#64499D] dark:text-[#CFC2FF]">
                  {item.insight.knowledgeScore}
                </TableCell>
                <TableCell className="px-4 py-2.5">
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize',
                      riskStyles(item.insight.riskLevel)
                    )}
                  >
                    {item.insight.riskLevel}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-[11px] text-slate-500">
                  {formatFileSize(item.size)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-[11px] text-slate-500">
                  {new Date(item.modified).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400"
                      onClick={() => onOpen(item)}
                      aria-label="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400"
                      onClick={(e) => onEdit(e, item)}
                      aria-label="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400"
                      onClick={(e) => onDownload(e, item)}
                      aria-label="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
                      onClick={(e) => onDelete(e, item)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

export default KnowledgeTableView;
