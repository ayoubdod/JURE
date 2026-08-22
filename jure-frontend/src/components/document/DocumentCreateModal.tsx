'use client';

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { apiCreateDocument } from '@/services/library/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import TagsInput from '../TagsInput';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { mergeAreaIntoTags, type LegalAreaId } from '@/lib/libraryTaxonomy';

const INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

const SELECT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus:ring-2 focus:ring-[#64499D]/25 focus:ring-offset-0 focus:border-[#64499D]';

const TEXTAREA_CLASS =
  'min-h-[92px] rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

const DEFAULT_VALUES: API.DocumentCreateForm = {
  title: '',
  category: '' as API.DocumentCategory,
  tags: [],
  description: '',
  file: undefined as unknown as File,
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DocumentCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface DocumentCreateModalProps {
  onSuccess?: (_: API.Document) => void;
}

const DocumentCreateModal = forwardRef<DocumentCreateModalRef, DocumentCreateModalProps>(
  ({ onSuccess }, ref) => {
    const { t, tf, enumOptions } = useAppTranslation();
    const { toast } = useToast();
    const m = t.document.create;
    const formId = useId();
    const titleRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
    const [isDragging, setIsDragging] = useState(false);
    const [legalArea, setLegalArea] = useState<LegalAreaId | ''>('');

    const isBusy = submitPhase !== 'idle';

    const schema = useMemo(
      () =>
        yup.object({
          title: yup.string().required(m.titleRequired),
          category: yup.string().required(m.categoryRequired),
          tags: yup.array().of(yup.string()).default([]),
          description: yup.string().nullable().default(''),
          file: yup
            .mixed()
            .required(m.fileRequired)
            .test('is-file', m.invalidFile, (value) => value instanceof File),
        }),
      [m.titleRequired, m.categoryRequired, m.fileRequired, m.invalidFile]
    );

    const mainForm = useForm<API.DocumentCreateForm>({
      resolver: yupResolver(schema) as Resolver<API.DocumentCreateForm>,
      defaultValues: DEFAULT_VALUES,
    });

    const resetLocalState = () => {
      mainForm.reset(DEFAULT_VALUES);
      setLegalArea('');
      setSubmitPhase('idle');
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      scrollRef.current?.scrollTo({ top: 0 });
    };

    const show = () => {
      resetLocalState();
      setIsOpen(true);
    };

    const hide = () => {
      if (isBusy) return;
      setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({ show, hide }));

    const assignFile = (file: File | undefined) => {
      if (!file) return;
      mainForm.setValue('file', file, { shouldValidate: true, shouldDirty: true });
      mainForm.clearErrors('file');
    };

    const clearFile = () => {
      mainForm.setValue('file', undefined as unknown as File, { shouldValidate: true, shouldDirty: true });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      assignFile(event.target.files?.[0]);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (isBusy) return;
      assignFile(event.dataTransfer.files?.[0]);
    };

    const handleSubmit = async (data: API.DocumentCreateForm) => {
      const file = data.file instanceof File ? data.file : undefined;
      if (!file) {
        mainForm.setError('file', { message: m.fileRequired });
        return;
      }

      setSubmitPhase('loading');
      try {
        const res = await apiCreateDocument({
          title: data.title.trim(),
          category: data.category,
          tags: mergeAreaIntoTags(data.tags || [], legalArea || null),
          description: data.description?.trim() || null,
          file,
        });

        setSubmitPhase('success');
        toast({
          title: m.createdTitle,
          description: tf(m.createdDescription, { title: data.title.trim() }),
        });
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        onSuccess?.(res.data);
        setIsOpen(false);
        setSubmitPhase('idle');
      } catch (err) {
        setSubmitPhase('idle');
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          const keys = Object.keys(remoteValidation);
          keys.forEach((key) => {
            mainForm.setError(key as keyof API.DocumentCreateForm, {
              message: remoteValidation[key],
            });
          });
          if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();
        }
      }
    };

    const onInvalid = () => {
      const order: (keyof API.DocumentCreateForm)[] = ['title', 'category', 'file', 'description', 'tags'];
      const first = order.find((key) => mainForm.formState.errors[key]);
      if (first === 'file') {
        fileInputRef.current?.focus();
        return;
      }
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
    };

    const fieldError = (name: keyof API.DocumentCreateForm) =>
      mainForm.formState.errors[name]?.message as string | undefined;

    const titleRegister = mainForm.register('title');
    const selectedFile = mainForm.watch('file');
    const selectedFileValid = selectedFile instanceof File ? selectedFile : null;

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (isBusy) return;
          setIsOpen(open);
        }}
        modal
      >
        <DialogPortal>
          <DialogOverlay className="bg-slate-950/50" />
          <DialogPrimitive.Content
            aria-describedby={`${formId}-description`}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              titleRef.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (isBusy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (isBusy) event.preventDefault();
            }}
            className={cn(
              'fixed z-50 flex min-h-0 flex-col overflow-hidden border border-slate-200/90 bg-white p-0 shadow-2xl outline-none',
              'dark:border-zinc-800 dark:bg-zinc-950',
              'inset-x-[2.5vw] bottom-0 top-auto h-[min(92dvh,780px)] w-auto translate-x-0 translate-y-0 rounded-t-[20px]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-[min(86vh,680px)] md:w-[min(90vw,720px)] md:max-w-[720px]',
              'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]',
              'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
              'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
              'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]'
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
                onClick={hide}
                disabled={isBusy}
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#64499D] shadow-sm ring-1 ring-[#64499D]/15 dark:bg-zinc-900 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/25">
                  <FileText className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <DialogTitle className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                    {m.title}
                  </DialogTitle>
                  <DialogDescription
                    id={`${formId}-description`}
                    className="mt-1 text-[13px] leading-snug text-slate-500 dark:text-zinc-400"
                  >
                    {m.description}
                  </DialogDescription>
                </div>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={mainForm.handleSubmit(handleSubmit, onInvalid)}
              noValidate
              aria-busy={isBusy}
            >
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7"
              >
                <div className="space-y-6">
                  <FormSection index="01" title={m.sectionInfo}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field id={`${formId}-title`} label={m.titleLabel} error={fieldError('title')}>
                        <Input
                          id={`${formId}-title`}
                          placeholder={m.titlePlaceholder}
                          className={INPUT_CLASS}
                          disabled={isBusy}
                          aria-invalid={!!fieldError('title')}
                          {...titleRegister}
                          ref={(el) => {
                            titleRef.current = el;
                            titleRegister.ref(el);
                          }}
                        />
                      </Field>
                      <Field
                        id={`${formId}-category`}
                        label={m.categoryLabel}
                        error={fieldError('category')}
                      >
                        <Select
                          value={mainForm.watch('category') || undefined}
                          onValueChange={(val: API.DocumentCategory) =>
                            mainForm.setValue('category', val, { shouldValidate: true, shouldDirty: true })
                          }
                          disabled={isBusy}
                        >
                          <SelectTrigger id={`${formId}-category`} className={SELECT_CLASS}>
                            <SelectValue placeholder={m.categoryPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {enumOptions('documentCategory').map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field id={`${formId}-area`} label={m.areaLabel}>
                        <Select
                          value={legalArea || undefined}
                          onValueChange={(val: LegalAreaId) => setLegalArea(val)}
                          disabled={isBusy}
                        >
                          <SelectTrigger id={`${formId}-area`} className={SELECT_CLASS}>
                            <SelectValue placeholder={m.areaPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {enumOptions('documentLegalArea').map((area) => (
                              <SelectItem key={area.value} value={area.value}>
                                {area.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </FormSection>

                  <FormSection index="02" title={m.sectionFile}>
                    <Field id={`${formId}-file`} label={m.fileLabel} error={fieldError('file')}>
                      <input
                        ref={fileInputRef}
                        id={`${formId}-file`}
                        type="file"
                        className="sr-only"
                        disabled={isBusy}
                        onChange={handleFileChange}
                      />
                      {selectedFileValid ? (
                        <div className="flex items-center gap-3 rounded-xl border border-[#64499D]/20 bg-[#F7F4FF] px-3.5 py-3 dark:border-[#8B6FD1]/30 dark:bg-[#24183F]/50">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-zinc-900 dark:text-[#CFC2FF]">
                            <FileText className="h-4 w-4" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                              {selectedFileValid.name}
                            </p>
                            <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                              {formatFileSize(selectedFileValid.size)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isBusy}
                              className="text-[12px] font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]"
                            >
                              {m.changeFile}
                            </button>
                            <button
                              type="button"
                              onClick={clearFile}
                              disabled={isBusy}
                              className="text-[12px] text-slate-500 hover:text-red-600"
                            >
                              {m.removeFile}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              fileInputRef.current?.click();
                            }
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (!isBusy) setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          className={cn(
                            'group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-all duration-200',
                            isDragging
                              ? 'border-[#64499D]/55 bg-[#F7F4FF] shadow-[0_8px_24px_rgba(100,73,157,0.12)] dark:border-[#8B6FD1]/50 dark:bg-[#24183F]/50'
                              : 'border-slate-200 bg-white hover:border-[#64499D]/45 hover:bg-[#F7F4FF] hover:shadow-[0_8px_24px_rgba(100,73,157,0.12)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-[#8B6FD1]/50 dark:hover:bg-[#24183F]/50'
                          )}
                        >
                          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]">
                            <Upload className="h-4 w-4" aria-hidden />
                          </div>
                          <p className="text-[13px] font-medium text-slate-700 dark:text-zinc-200">{m.dragDrop}</p>
                          <p className="mt-1 text-[12px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
                            {m.chooseFile}
                          </p>
                        </div>
                      )}
                    </Field>
                  </FormSection>

                  <FormSection index="03" title={m.sectionDetails}>
                    <div className="space-y-4">
                      <Field
                        id={`${formId}-description`}
                        label={m.descriptionLabel}
                        error={fieldError('description')}
                      >
                        <Textarea
                          id={`${formId}-description`}
                          placeholder={m.descriptionPlaceholder}
                          className={TEXTAREA_CLASS}
                          disabled={isBusy}
                          aria-invalid={!!fieldError('description')}
                          {...mainForm.register('description')}
                        />
                      </Field>
                      <Field id={`${formId}-tags`} label={m.tagsLabel} error={fieldError('tags')}>
                        <TagsInput
                          value={mainForm.watch('tags') || []}
                          onChange={(val) => {
                            mainForm.setValue('tags', val, { shouldDirty: true });
                            mainForm.trigger('tags');
                          }}
                          setError={(err) => mainForm.setError('tags', { message: err })}
                        />
                      </Field>
                    </div>
                  </FormSection>
                </div>
              </div>

              <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2.5 space-x-0 border-t border-slate-200 bg-white px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:space-x-0 md:px-7">
                <Button
                  type="button"
                  variant="outline"
                  onClick={hide}
                  disabled={isBusy}
                  className="h-10 border-slate-200 px-4 dark:border-zinc-700"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={isBusy}
                  className="h-10 min-w-[148px] bg-[#64499D] px-4 text-white hover:bg-[#4D3680]"
                >
                  {submitPhase === 'loading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {m.creating}
                    </>
                  ) : submitPhase === 'success' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {m.createdTitle}
                    </>
                  ) : (
                    m.submit
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }
);

function FormSection({
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

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
        {label}
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

DocumentCreateModal.displayName = 'DocumentCreateModal';

export default DocumentCreateModal;
