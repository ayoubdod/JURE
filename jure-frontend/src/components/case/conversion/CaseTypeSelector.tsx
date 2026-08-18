'use client';

import React, { useId } from 'react';
import { FileCheck, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateFormDialog } from '@/components/forms/CreateFormShell';

export type ConversionTargetType = 'LITIGATION' | 'ADMINISTRATIVE_DUTY';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (t: ConversionTargetType) => void;
};

const OPTIONS: {
  value: ConversionTargetType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'LITIGATION',
    label: 'Litigation',
    description: 'Active court case with parties, hearings, and deadlines',
    icon: Scale,
  },
  {
    value: 'ADMINISTRATIVE_DUTY',
    label: 'Administrative Duty',
    description: 'Filing, registration, compliance, or notarial task',
    icon: FileCheck,
  },
];

export function CaseTypeSelector({ open, onOpenChange, onSelectType }: Props) {
  const formId = useId();

  return (
    <CreateFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isBusy={false}
      formId={formId}
      title="Convert Consultation to Case"
      description="Select the type of case to create from this consultation."
      icon={Scale}
      closeLabel="Close"
      onClose={() => onOpenChange(false)}
      overlayClassName="z-[100]"
      contentClassName="z-[110] md:h-[min(86vh,640px)] md:w-[min(90vw,720px)] md:max-w-[720px]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectType(opt.value)}
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
                <span className="text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100">{opt.label}</span>
                <span className="text-[12px] leading-snug text-slate-500 dark:text-zinc-400">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </CreateFormDialog>
  );
}
