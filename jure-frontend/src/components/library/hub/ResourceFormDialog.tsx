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
} from 'react';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TagsInput from '@/components/TagsInput';
import { Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { isAxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { getRemoteFieldsValidation } from '@/utils/functions';
import {
  apiCreateDocument,
  apiPublishInternationalResource,
  apiPublishLocalResource,
} from '@/services/library/api';
import { DOCUMENT_CATEGORY_IDS, LIBRARY_RESOURCE_TYPE_IDS } from '@/lib/libraryTaxonomy';
import type { Jurisdiction } from '@/services/jurisdictions/api';

const INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';
const SELECT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus:ring-2 focus:ring-[#64499D]/25 focus:ring-offset-0 focus:border-[#64499D]';
const TEXTAREA_CLASS =
  'min-h-[88px] rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

export type ResourceFormMode = 'personal' | 'local' | 'international';

export interface ResourceFormDialogRef {
  show: (mode?: ResourceFormMode) => void;
  hide: () => void;
}

type FormValues = {
  title: string;
  description: string;
  resource_type: string;
  category: string;
  language: string;
  country: string;
  jurisdiction?: string;
  author: string;
  issuing_authority: string;
  source: string;
  reference_number: string;
  keywords: string;
  publication_date: string;
  effective_date: string;
  external_url: string;
  file?: File | null;
  tags: string[];
};

const EMPTY: FormValues = {
  title: '',
  description: '',
  resource_type: 'other',
  category: 'legal_research_opinions',
  language: '',
  country: '',
  jurisdiction: '',
  author: '',
  issuing_authority: '',
  source: '',
  reference_number: '',
  keywords: '',
  publication_date: '',
  effective_date: '',
  external_url: '',
  file: null,
  tags: [],
};

type Props = {
  jurisdictions?: Jurisdiction[];
  defaultJurisdictionId?: number | null;
  defaultLanguage?: string;
  onSuccess?: (doc: API.Document) => void;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const ResourceFormDialog = forwardRef<ResourceFormDialogRef, Props>(
  ({ jurisdictions = [], defaultJurisdictionId, defaultLanguage, onSuccess }, ref) => {
    const { t, enumLabel } = useAppTranslation();
    const hub = t.library.hub;
    const { toast } = useToast();
    const formId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<ResourceFormMode>('personal');
    const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
    const [isDragging, setIsDragging] = useState(false);
    const isBusy = submitPhase !== 'idle';

    const schema = useMemo(
      () =>
        yup.object({
          title: yup.string().required(t.validation.required),
          description:
            mode === 'personal'
              ? yup.string().default('')
              : yup.string().required(t.validation.required),
          resource_type: yup.string().required(t.validation.required),
          category: yup.string().required(t.validation.required),
          language:
            mode === 'personal'
              ? yup.string().default('')
              : yup.string().required(t.validation.required),
          country: yup.string().default(''),
          jurisdiction: yup.string().default(''),
          author: yup.string().default(''),
          issuing_authority: yup.string().default(''),
          source: yup.string().default(''),
          reference_number: yup.string().default(''),
          keywords: yup.string().default(''),
          publication_date: yup.string().default(''),
          effective_date: yup.string().default(''),
          external_url: yup
            .string()
            .transform((v) => (v ? v : undefined))
            .url()
            .optional()
            .nullable(),
          file: yup.mixed().nullable(),
          tags: yup.array().of(yup.string()).default([]),
        }),
      [t.validation.required, mode]
    );

    const form = useForm<FormValues>({
      resolver: yupResolver(schema) as Resolver<FormValues>,
      defaultValues: EMPTY,
    });

    const resetLocal = (nextMode: ResourceFormMode) => {
      form.reset({
        ...EMPTY,
        language: defaultLanguage || '',
        jurisdiction: defaultJurisdictionId ? String(defaultJurisdictionId) : '',
      });
      setMode(nextMode);
      setSubmitPhase('idle');
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useImperativeHandle(ref, () => ({
      show: (nextMode = 'personal') => {
        resetLocal(nextMode);
        setIsOpen(true);
      },
      hide: () => setIsOpen(false),
    }));

    const title =
      mode === 'local' ? hub.publishLocal : mode === 'international' ? hub.publishInternational : hub.addResource;

    const setFile = (file: File | null) => {
      form.setValue('file', file, { shouldValidate: true });
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) setFile(file);
    };

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      setFile(e.target.files?.[0] || null);
    };

    const handleSubmit = form.handleSubmit(async (values) => {
      const hasFile = values.file instanceof File;
      const hasUrl = Boolean(values.external_url?.trim());
      if (!hasFile && !hasUrl) {
        form.setError('file', { message: hub.requiredFileOrUrl });
        return;
      }
      if (mode === 'local' && !values.jurisdiction) {
        form.setError('jurisdiction', { message: t.validation.required });
        return;
      }
      if (mode !== 'personal' && !values.language) {
        form.setError('language', { message: t.validation.required });
        return;
      }
      if (mode !== 'personal' && !values.description?.trim()) {
        form.setError('description', { message: t.validation.required });
        return;
      }
      setSubmitPhase('loading');
      const payload: API.DocumentCreateForm = {
        title: values.title,
        description: values.description,
        category: values.category as API.DocumentCategory,
        resource_type: values.resource_type,
        language: values.language,
        country: values.country,
        author: values.author,
        issuing_authority: values.issuing_authority,
        source: values.source,
        reference_number: values.reference_number,
        keywords: values.keywords,
        publication_date: values.publication_date || undefined,
        effective_date: values.effective_date || undefined,
        external_url: values.external_url || undefined,
        file: hasFile ? (values.file as File) : undefined,
        tags: values.tags,
        jurisdiction: mode === 'local' ? values.jurisdiction : undefined,
      };
      try {
        const submit =
          mode === 'local'
            ? apiPublishLocalResource
            : mode === 'international'
              ? apiPublishInternationalResource
              : apiCreateDocument;
        const res = await submit(payload);
        setSubmitPhase('success');
        onSuccess?.(res.data);
        toast({ title: t.library.toasts.addedTitle, description: res.data.title });
        setTimeout(() => {
          setIsOpen(false);
          setSubmitPhase('idle');
        }, 500);
      } catch (err) {
        setSubmitPhase('idle');
        if (isAxiosError(err)) {
          const remote = getRemoteFieldsValidation(err);
          Object.entries(remote).forEach(([key, msg]) =>
            form.setError(key as keyof FormValues, { message: msg })
          );
          if (!Object.keys(remote).length) {
            toast({
              title: t.common.error,
              description: err.response?.data?.detail || err.message,
              variant: 'destructive',
            });
          }
        }
      }
    });

    const file = form.watch('file');

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !isBusy && setIsOpen(open)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="fixed inset-4 z-50 mx-auto flex max-h-[min(92vh,840px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:inset-y-8"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[12.5px] text-slate-500">
                  {mode === 'local'
                    ? hub.localFormHint
                    : mode === 'international'
                      ? hub.internationalFormHint
                      : hub.personalFormHint}
                </DialogDescription>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsOpen(false)}
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form id={formId} onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {mode === 'local' ? (
                  <div className="sm:col-span-2">
                    <Label htmlFor={`${formId}-jurisdiction`}>{hub.fieldJurisdiction} *</Label>
                    <Select
                      value={form.watch('jurisdiction') || ''}
                      onValueChange={(v) => form.setValue('jurisdiction', v)}
                    >
                      <SelectTrigger id={`${formId}-jurisdiction`} className={SELECT_CLASS}>
                        <SelectValue placeholder={hub.fieldJurisdiction} />
                      </SelectTrigger>
                      <SelectContent>
                        {jurisdictions.map((j) => (
                          <SelectItem key={j.id} value={String(j.id)}>
                            {j.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="sm:col-span-2">
                  <Label htmlFor={`${formId}-title`}>{hub.fieldTitle} *</Label>
                  <Input id={`${formId}-title`} className={INPUT_CLASS} {...form.register('title')} />
                  {form.formState.errors.title ? (
                    <p className="mt-1 text-[11px] text-red-600">{form.formState.errors.title.message}</p>
                  ) : null}
                </div>

                <div>
                  <Label>{hub.fieldType} *</Label>
                  <Select
                    value={form.watch('resource_type')}
                    onValueChange={(v) => form.setValue('resource_type', v)}
                  >
                    <SelectTrigger className={SELECT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIBRARY_RESOURCE_TYPE_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {enumLabel('libraryResourceType', id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{hub.fieldCategory}</Label>
                  <Select value={form.watch('category')} onValueChange={(v) => form.setValue('category', v)}>
                    <SelectTrigger className={SELECT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORY_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {enumLabel('documentCategory', id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`${formId}-language`}>{hub.fieldLanguage} *</Label>
                  <Select
                    value={form.watch('language')}
                    onValueChange={(v) => form.setValue('language', v)}
                  >
                    <SelectTrigger id={`${formId}-language`} className={SELECT_CLASS}>
                      <SelectValue placeholder={hub.fieldLanguage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t.common.languageNames.en}</SelectItem>
                      <SelectItem value="fr">{t.common.languageNames.fr}</SelectItem>
                      <SelectItem value="ar">{t.common.languageNames.ar}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`${formId}-country`}>{hub.fieldCountry}</Label>
                  <Input id={`${formId}-country`} className={INPUT_CLASS} {...form.register('country')} />
                </div>

                <div className="sm:col-span-2">
                  <Label>{hub.fieldFile} *</Label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      'mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-3 py-5 text-center',
                      isDragging
                        ? 'border-[#64499D] bg-[#64499D]/5'
                        : 'border-slate-300 dark:border-slate-700'
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-1 h-4 w-4 text-[#64499D]" />
                    <p className="text-[12.5px] text-slate-600 dark:text-slate-300">{hub.dropFile}</p>
                    {file instanceof File ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <FileText className="h-3.5 w-3.5" />
                        {file.name} · {formatFileSize(file.size)}
                      </p>
                    ) : null}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="sr-only"
                      onChange={onFileChange}
                    />
                  </div>
                  {form.formState.errors.file ? (
                    <p className="mt-1 text-[11px] text-red-600">{form.formState.errors.file.message}</p>
                  ) : null}
                  <Input
                    className={cn(INPUT_CLASS, 'mt-2')}
                    placeholder={hub.fieldUrl}
                    {...form.register('external_url')}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor={`${formId}-description`}>{hub.fieldDescription} *</Label>
                  <Textarea
                    id={`${formId}-description`}
                    className={TEXTAREA_CLASS}
                    {...form.register('description')}
                  />
                </div>

                <div>
                  <Label htmlFor={`${formId}-author`}>{hub.fieldAuthor}</Label>
                  <Input id={`${formId}-author`} className={INPUT_CLASS} {...form.register('author')} />
                </div>
                <div>
                  <Label htmlFor={`${formId}-authority`}>{hub.fieldAuthority}</Label>
                  <Input id={`${formId}-authority`} className={INPUT_CLASS} {...form.register('issuing_authority')} />
                </div>
                <div>
                  <Label htmlFor={`${formId}-source`}>{hub.fieldSource}</Label>
                  <Input id={`${formId}-source`} className={INPUT_CLASS} {...form.register('source')} />
                </div>
                <div>
                  <Label htmlFor={`${formId}-ref`}>{hub.fieldReference}</Label>
                  <Input id={`${formId}-ref`} className={INPUT_CLASS} {...form.register('reference_number')} />
                </div>
                <div>
                  <Label htmlFor={`${formId}-pub`}>{hub.fieldPublication}</Label>
                  <Input id={`${formId}-pub`} type="date" className={INPUT_CLASS} {...form.register('publication_date')} />
                </div>
                <div>
                  <Label htmlFor={`${formId}-eff`}>{hub.fieldEffective}</Label>
                  <Input id={`${formId}-eff`} type="date" className={INPUT_CLASS} {...form.register('effective_date')} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`${formId}-keywords`}>{hub.fieldKeywords}</Label>
                  <Input id={`${formId}-keywords`} className={INPUT_CLASS} {...form.register('keywords')} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{hub.fieldTags}</Label>
                  <TagsInput
                    value={form.watch('tags')}
                    onChange={(tags) => form.setValue('tags', tags)}
                  />
                </div>
              </div>
            </form>

            <DialogFooter className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isBusy}>
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                form={formId}
                disabled={isBusy}
                className="bg-[#64499D] text-white hover:bg-[#543d86]"
              >
                {submitPhase === 'loading' ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : submitPhase === 'success' ? (
                  <Check className="me-2 h-4 w-4" />
                ) : null}
                {mode === 'personal' ? hub.addResource : hub.publishResource}
              </Button>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }
);

ResourceFormDialog.displayName = 'ResourceFormDialog';
export default ResourceFormDialog;
