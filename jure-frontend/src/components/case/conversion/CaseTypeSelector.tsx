'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileCheck, Gavel, Scale, X } from 'lucide-react';

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
    icon: Gavel,
  },
  {
    value: 'ADMINISTRATIVE_DUTY',
    label: 'Administrative Duty',
    description: 'Filing, registration, compliance, or notarial task',
    icon: FileCheck,
  },
];

export function CaseTypeSelector({ open, onOpenChange, onSelectType }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-slate-200 p-0 sm:rounded-xl [&>button]:hidden">
        {/* Same charter as CaseModal / CaseCreateModal */}
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B]">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 h-9 w-9 border border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="relative px-8 pb-6 pt-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-sm">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Convert Consultation to Case
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/90">
                  Select the type of case to create from this consultation.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSelectType(opt.value)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors',
                    'border-slate-200 bg-white hover:border-purple-500 hover:bg-purple-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-purple-500 dark:hover:bg-purple-950/20'
                  )}
                >
                  <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden />
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">{opt.label}</span>
                  <span className="text-[13px] leading-snug text-slate-500 dark:text-slate-400">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
