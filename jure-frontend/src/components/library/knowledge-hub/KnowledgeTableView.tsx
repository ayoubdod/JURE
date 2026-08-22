import React, { memo } from 'react';
import {
  Copy,
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
import { formatFileSize, isPlatformShared } from './knowledgeUtils';
import { fileFormatLabel } from '@/lib/libraryTaxonomy';
import type { EnrichedDocument } from './types';
import { useAppTranslation } from '@/i18n';

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
  onCopy?: (e: React.MouseEvent, doc: EnrichedDocument) => void;
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
  onCopy,
}: Props) {
  const { t, enumLabel } = useAppTranslation();
  const headers: { key: SortKey | null; label: string; className?: string }[] = [
    { key: 'name', label: 'Document' },
    { key: null, label: t.document.create.categoryLabel, className: 'w-40' },
    { key: null, label: t.library.legalAreas, className: 'w-44' },
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
                  'h-8 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400',
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
              enumLabel('documentCategory', item.category) ||
              DocumentCategory.getLabel(item.category) ||
              item.category;
            const areaLabel = item.legalArea
              ? enumLabel('documentLegalArea', item.legalArea)
              : null;
            const shared = isPlatformShared(item);
            const format = fileFormatLabel(item.file);
            return (
              <TableRow
                key={item.id}
                tabIndex={0}
                onClick={() => onSelect(item)}
                onDoubleClick={() => onOpen(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(item);
                  }
                }}
                className={cn(
                  'cursor-pointer border-slate-100 transition-colors duration-100 dark:border-slate-800/60',
                  'focus-visible:outline-none focus-visible:bg-[#64499D]/08 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/35',
                  selectedId === item.id
                    ? 'bg-[#64499D]/06 dark:bg-[#64499D]/15'
                    : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/50'
                )}
              >
                <TableCell className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#64499D]/70" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                        {item.title}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {shared ? `${t.library.publicLibrary} · ` : ''}
                        {format || item.insight.language}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span className="inline-flex max-w-full truncate rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {category}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2">
                  {areaLabel ? (
                    <span className="inline-flex max-w-full truncate rounded-md border border-[#64499D]/20 bg-[#64499D]/08 px-1.5 py-0.5 text-[10px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
                      {areaLabel}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-[11px] text-slate-500">
                  {formatFileSize(item.size)}
                </TableCell>
                <TableCell className="px-3 py-2 text-[11px] text-slate-500">
                  {new Date(item.modified).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
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
                    {shared ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-[#64499D]"
                        onClick={(e) => onCopy?.(e, item)}
                        aria-label={t.library.addToMyLibrary}
                        title={t.library.addToMyLibrary}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400"
                        onClick={(e) => onEdit(e, item)}
                        aria-label="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400"
                      onClick={(e) => onDownload(e, item)}
                      aria-label="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {shared ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
                        onClick={(e) => onDelete(e, item)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
