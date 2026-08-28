import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useAppTranslation } from '@/i18n';

export const CREATE_INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

export const CREATE_SELECT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-start text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus:ring-2 focus:ring-[#64499D]/25 focus:ring-offset-0 focus:border-[#64499D] rtl:text-right';

export const CREATE_TEXTAREA_CLASS =
  'min-h-[92px] rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D] resize-none';

export const CREATE_SERVER_SELECT_CLASS =
  'h-10 w-full justify-between rounded-lg border-slate-200 bg-white px-3 text-start text-[13.5px] font-normal shadow-none hover:bg-white hover:border-[#64499D]/45 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-950';

export const CREATE_FOOTER_CLASS =
  'shrink-0 flex !flex-row !flex-nowrap items-center justify-end gap-2.5 !space-x-0 border-t border-slate-200 bg-white px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950 md:px-7';

export const CREATE_CANCEL_CLASS =
  'h-10 w-auto shrink-0 rounded-lg border-slate-200 px-4 text-[13.5px] shadow-none dark:border-zinc-700';

export const CREATE_SUBMIT_CLASS =
  'h-10 w-auto min-w-[180px] shrink-0 rounded-lg bg-[#64499D] px-5 text-[13.5px] font-medium text-white shadow-none hover:bg-[#4D3680] [&_svg]:size-4';

export function CreateFormDialog({
  open,
  onOpenChange,
  isBusy,
  formId,
  title,
  description,
  icon: Icon,
  closeLabel,
  onClose,
  onOpenAutoFocus,
  contentClassName,
  overlayClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBusy: boolean;
  formId: string;
  title: string;
  description: string;
  icon: LucideIcon;
  closeLabel: string;
  onClose: () => void;
  onOpenAutoFocus?: () => void;
  contentClassName?: string;
  overlayClassName?: string;
  children: ReactNode;
}) {
  const { dir } = useAppTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isBusy) return;
        onOpenChange(next);
      }}
      modal
    >
      <DialogPortal>
        <DialogOverlay className={cn('bg-slate-950/50', overlayClassName)} />
        <DialogPrimitive.Content
          dir={dir}
          aria-describedby={`${formId}-description`}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            onOpenAutoFocus?.();
          }}
          onEscapeKeyDown={(event) => {
            if (isBusy) event.preventDefault();
          }}
          onFocusOutside={(event) => {
            event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isBusy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (isBusy) event.preventDefault();
            const target = event.target as HTMLElement | null;
            if (target?.closest?.('input[type="file"]')) event.preventDefault();
          }}
          className={cn(
            'fixed z-50 flex min-h-0 flex-col overflow-hidden border border-slate-200/90 bg-white p-0 shadow-2xl outline-none',
            'dark:border-zinc-800 dark:bg-zinc-950',
            'inset-x-[2.5vw] bottom-0 top-auto h-[min(92dvh,840px)] w-auto translate-x-0 translate-y-0 rounded-t-[20px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-[min(86vh,740px)] md:w-[min(90vw,720px)] md:max-w-[720px]',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]',
            'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
            'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
            'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]',
            contentClassName
          )}
        >
          <header className="relative shrink-0 border-b border-[#64499D]/10 bg-[#F7F4FF] px-6 py-4 pe-14 dark:border-[#8B6FD1]/15 dark:bg-[#24183F]/80 md:px-7">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  'linear-gradient(135deg, rgba(100,73,157,0.08) 0%, rgba(100,73,157,0.02) 52%, transparent 100%)',
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-3 top-3 z-10 h-8 w-8 rounded-full text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              onClick={onClose}
              disabled={isBusy}
              aria-label={closeLabel}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="relative flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#64499D] shadow-sm ring-1 ring-[#64499D]/15 dark:bg-zinc-900 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/25">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                  {title}
                </DialogTitle>
                <DialogDescription
                  id={`${formId}-description`}
                  className="mt-1 text-[13px] leading-snug text-slate-500 dark:text-zinc-400"
                >
                  {description}
                </DialogDescription>
              </div>
            </div>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function CreateFormSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-2.5">
        <span className="text-[11px] font-semibold tabular-nums tracking-[0.14em] text-[#64499D]/70 dark:text-[#CFC2FF]/70">
          {index}
        </span>
        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{title}</h3>
      </header>
      {children}
    </section>
  );
}

export function CreateFormField({
  id,
  label,
  required,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
        {label}
        {required ? <span className="ms-1 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
