'use client';

import React, { useId } from 'react';
import { FileCheck, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateFormDialog } from '@/components/forms/CreateFormShell';
import { useAppTranslation } from '@/i18n';

export type ConversionTargetType = 'LITIGATION' | 'ADMINISTRATIVE_DUTY';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (t: ConversionTargetType) => void;
};

export function CaseTypeSelector({ open, onOpenChange, onSelectType }: Props) {
  const formId = useId();
  const { t } = useAppTranslation();
  const cw = t.cases.modal.consultationWorkflow;

  const options: {
    value: ConversionTargetType;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      value: 'LITIGATION',
      label: t.cases.workspaces.litigation.title,
      description: cw.litigationOptionHint,
      icon: Scale,
    },
    {
      value: 'ADMINISTRATIVE_DUTY',
      label: t.cases.workspaces.administrative.title,
      description: cw.administrativeOptionHint,
      icon: FileCheck,
    },
  ];

  return (
    <CreateFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isBusy={false}
      formId={formId}
      title={cw.convertDialogTitle}
      description={cw.convertDialogDescription}
      icon={Scale}
      closeLabel={t.common.close}
      onClose={() => onOpenChange(false)}
      overlayClassName="z-[100]"
      contentClassName="z-[110] h-auto max-h-[min(92dvh,560px)] md:h-auto md:w-[min(90vw,520px)] md:max-w-[520px]"
    >
      <div className="px-6 py-5 md:px-7">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectType(opt.value)}
                className={cn(
                  'flex h-full flex-col items-start gap-2 rounded-xl border px-3 py-3 text-start transition-all duration-200',
                  'border-slate-200 bg-white hover:border-[#64499D]/40 hover:bg-[#F7F4FF] hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                  'dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-[#8B6FD1]/40 dark:hover:bg-[#64499D]/15'
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/25">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </div>
                <span className="text-[13px] font-semibold leading-tight text-slate-900 dark:text-zinc-100">{opt.label}</span>
                <span className="text-[11.5px] leading-snug text-slate-500 dark:text-zinc-400">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </CreateFormDialog>
  );
}
