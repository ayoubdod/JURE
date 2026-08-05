import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  documentCount: number;
  onUpload: () => void;
  className?: string;
};

const KnowledgeHubHeader: React.FC<Props> = ({ documentCount, onUpload, className }) => {
  const reduceMotion = useReducedMotion();

  return (
    <header
      className={cn(
        'relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80',
        'bg-gradient-to-br from-white via-[#F8F6FC] to-[#F4F1FF]/60',
        'dark:from-slate-950 dark:via-[#1a1528] dark:to-slate-950',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 100% -20%, rgba(100,73,157,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(139,111,209,0.08), transparent 50%)',
        }}
      />
      <div className="relative flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#64499D]/15 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#64499D] shadow-sm backdrop-blur-sm dark:border-[#8B6FD1]/25 dark:bg-white/5 dark:text-[#CFC2FF]"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Legal intelligence layer
          </motion.div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[28px]">
            Knowledge Hub
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            AI-powered legal intelligence repository — where your firm&apos;s knowledge lives.
            <span className="ml-1.5 text-slate-400 dark:text-slate-500">
              {documentCount} assets indexed
            </span>
          </p>
        </div>
        <Button
          onClick={onUpload}
          className="h-10 shrink-0 gap-2 rounded-lg bg-[#64499D] px-4 text-[13px] font-medium text-white shadow-jure hover:bg-[#4D3680] border-0"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Documents
        </Button>
      </div>
    </header>
  );
};

export default KnowledgeHubHeader;
