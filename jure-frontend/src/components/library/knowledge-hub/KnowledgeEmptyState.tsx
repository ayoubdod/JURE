import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Wand2, Import, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  filtered: boolean;
  onUpload: () => void;
  className?: string;
};

const KnowledgeEmptyState: React.FC<Props> = ({ filtered, onUpload, className }) => {
  const reduceMotion = useReducedMotion();

  if (filtered) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center px-6 py-20 text-center',
          className
        )}
      >
        <FileText className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <h3 className="text-[14px] font-medium text-slate-900 dark:text-slate-50">
          No matching knowledge
        </h3>
        <p className="mt-1 max-w-sm text-[12px] text-slate-500">
          Try a different question, collection, or clear your filters.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:py-24',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(100,73,157,0.12), transparent 70%)',
        }}
      />
      <motion.div
        initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="relative mb-6 flex h-28 w-28 items-center justify-center"
      >
        <div className="absolute inset-0 rounded-full border border-[#64499D]/15 animate-pulse motion-reduce:animate-none" />
        <div className="absolute inset-3 rounded-full border border-[#64499D]/20" />
        <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#64499D]/20 to-transparent" />
        <FileText className="relative h-8 w-8 text-[#64499D]" />
        <span className="absolute -right-1 top-2 h-2 w-2 rounded-full bg-[#64499D]/70" />
        <span className="absolute bottom-3 -left-0.5 h-1.5 w-1.5 rounded-full bg-[#8B6FD1]" />
        <span className="absolute right-4 bottom-1 h-1 w-1 rounded-full bg-[#CFC2FF]" />
      </motion.div>
      <h3 className="relative text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Your firm&apos;s knowledge begins here.
      </h3>
      <p className="relative mt-2 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        Upload legal documents and watch intelligence expand — summaries, entities, risks, and
        searchable knowledge across your organization.
      </p>
      <div className="relative mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={onUpload}
          className="h-10 gap-2 rounded-lg bg-[#64499D] text-[13px] text-white hover:bg-[#4D3680] border-0"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Documents
        </Button>
        <Button
          variant="outline"
          disabled
          title="Coming soon"
          className="h-10 gap-2 rounded-lg border-slate-200 text-[13px] dark:border-slate-700"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Generate AI Folder
        </Button>
        <Button
          variant="outline"
          disabled
          title="Coming soon"
          className="h-10 gap-2 rounded-lg border-slate-200 text-[13px] dark:border-slate-700"
        >
          <Import className="h-3.5 w-3.5" />
          Import Repository
        </Button>
      </div>
    </div>
  );
};

export default KnowledgeEmptyState;
