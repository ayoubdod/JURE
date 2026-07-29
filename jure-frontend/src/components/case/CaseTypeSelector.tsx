'use client';

import React from 'react';
import { MessageCircle, Gavel, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CaseTypeChoice = 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE_DUTY';

const CASE_TYPES: {
  value: CaseTypeChoice;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'CONSULTATION',
    label: 'Consultation',
    description: 'Client advisory session, legal question, outcome tracking',
    icon: MessageCircle,
  },
  {
    value: 'LITIGATION',
    label: 'Litigation',
    description: 'Active court case with parties, hearings, and deadlines',
    icon: Gavel,
  },
  {
    value: 'ADMINISTRATIVE_DUTY',
    label: 'Administrative Duty',
    description: 'Filing, registration, compliance, or notarial task',
    icon: FileCheck,
  },
];

export interface CaseTypeSelectorProps {
  onSelect: (type: CaseTypeChoice) => void;
  className?: string;
}

const CaseTypeSelector: React.FC<CaseTypeSelectorProps> = ({ onSelect, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Choose the type of matter you want to create:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CASE_TYPES.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-left transition-colors',
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
