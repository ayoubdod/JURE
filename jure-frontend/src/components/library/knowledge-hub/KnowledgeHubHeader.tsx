import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  documentCount: number;
  onUpload: () => void;
  className?: string;
  /** When true, render nothing — upload lives in sticky toolbar. */
  hidden?: boolean;
};

/**
 * Legacy hero header kept for API compatibility.
 * Knowledge Hub workspace uses sticky toolbar instead; this component is unused/minimal.
 */
const KnowledgeHubHeader: React.FC<Props> = ({ documentCount, onUpload, className, hidden }) => {
  if (hidden) return null;

  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 border-b border-slate-200/80 px-3 py-2 dark:border-slate-800',
        className
      )}
    >
      <p className="text-[12px] text-slate-500 tabular-nums">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Knowledge Hub</span>
        <span className="mx-1.5 text-slate-300">·</span>
        {documentCount} assets
      </p>
      <Button
        onClick={onUpload}
        size="sm"
        className="hidden h-8 gap-1.5 rounded-md bg-[#64499D] px-2.5 text-[12px] text-white hover:bg-[#4D3680] md:inline-flex"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload
      </Button>
    </header>
  );
};

export default KnowledgeHubHeader;
