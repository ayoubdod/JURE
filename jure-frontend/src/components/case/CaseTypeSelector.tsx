'use client';

import React from 'react';
import { MessageCircle, Scale, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export type CaseTypeChoice = 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE_DUTY';

export interface CaseTypeSelectorProps {
  onSelect: (type: CaseTypeChoice) => void;
  className?: string;
}

const CaseTypeSelector: React.FC<CaseTypeSelectorProps> = ({ onSelect, className }) => {
  const { t } = useAppTranslation();

  const caseTypes: {
    value: CaseTypeChoice;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      value: 'CONSULTATION',
      label: t.cases.modal.types.consultation.label,
      description: t.cases.modal.types.consultation.description,
      icon: MessageCircle,
    },
    {
      value: 'LITIGATION',
      label: t.cases.modal.types.litigation.label,
      description: t.cases.modal.types.litigation.description,
      icon: Scale,
    },
    {
      value: 'ADMINISTRATIVE_DUTY',
      label: t.cases.modal.types.administrative.label,
      description: t.cases.modal.types.administrative.description,
      icon: FileCheck,
    },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-[13px] text-slate-500 dark:text-zinc-400">{t.cases.modal.typePrompt}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {caseTypes.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'flex flex-col items-start gap-2.5 rounded-xl border px-3.5 py-3.5 text-start transition-all duration-200',
                'border-slate-200 bg-white hover:border-[#64499D]/40 hover:bg-[#F7F4FF] hover:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                'dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-[#8B6FD1]/40 dark:hover:bg-[#64499D]/15'
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/25">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <span className="text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100">
                {opt.label}
              </span>
              <span className="text-[12px] font-normal leading-snug text-slate-500 dark:text-zinc-400">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CaseTypeSelector;
