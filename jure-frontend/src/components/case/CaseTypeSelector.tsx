'use client';

import React from 'react';
import { MessageCircle, Gavel, FileCheck } from 'lucide-react';
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
      icon: Gavel,
    },
    {
      value: 'ADMINISTRATIVE_DUTY',
      label: t.cases.modal.types.administrative.label,
      description: t.cases.modal.types.administrative.description,
      icon: FileCheck,
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {t.cases.modal.typePrompt}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {caseTypes.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-start transition-colors',
                'border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500',
                'bg-white dark:bg-slate-950 hover:bg-purple-50/50 dark:hover:bg-purple-950/20'
              )}
            >
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">
                {opt.label}
              </span>
              <span className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
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
