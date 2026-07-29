import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: { value: string; label: string }[];
}

const PaginationComponent: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [
    { value: '1', label: '1 per page' },
    { value: '5', label: '5 per page' },
    { value: '10', label: '10 per page' },
    { value: '20', label: '20 per page' },
    { value: '50', label: '50 per page' },
  ],
}) => {
  if (isLoading) {
    return null;
  }

  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);

  const prevDisabled = currentPage <= 1 || totalCount === 0;
  const nextDisabled = currentPage >= totalPages || totalCount === 0;

  return (
    <div className="w-full border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 py-3.5 px-2 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">
          Showing {start}–{end} of {totalCount} cases
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              onPageSizeChange(parseInt(value, 10));
            }}
          >
            <SelectTrigger
              className={cn(
                'h-10 w-[130px] rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px]',
                'focus:ring-2 focus:ring-primary/25'
              )}
            >
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!prevDisabled) onPageChange(currentPage - 1);
                  }}
                  className={cn(
                    'h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-[13px]',
                    prevDisabled && 'pointer-events-none cursor-not-allowed opacity-45'
                  )}
                />
              </PaginationItem>
              {totalPages > 1 &&
                Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onPageChange(pageNum);
                        }}
                        isActive={pageNum === currentPage}
                        className="h-10 min-w-[2.25rem] rounded-lg text-[13px]"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!nextDisabled) onPageChange(currentPage + 1);
                  }}
                  className={cn(
                    'h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-[13px]',
                    nextDisabled && 'pointer-events-none cursor-not-allowed opacity-45'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
};

export default PaginationComponent;
