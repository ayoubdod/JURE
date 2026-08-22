import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TagsInput from '@/components/TagsInput';
import {
  Copy,
  Edit,
  FileText,
  Calendar,
  HardDrive,
  Loader2,
  Archive,
  Image,
  Video,
  Radio,
  File,
} from 'lucide-react';
import { DocumentCategory } from '@/utils/constants';
import { getFileType } from '@/utils/functions';
import FilePreviewer from '@/components/library/FilePreviewer';
import { apiUpdateDocument, apiCopySharedDocument } from '@/services/library/api';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { API_ORIGIN } from '@/config/api';
import { useAppTranslation } from '@/i18n';
import {
  inferLegalArea,
  mergeAreaIntoTags,
  splitDocumentTags,
  type LegalAreaId,
} from '@/lib/libraryTaxonomy';

export interface DocumentDetailDrawerRef {
  open: (doc: API.Document) => void;
  close: () => void;
}

const schema = yup.object({
  title: yup.string().optional(),
  category: yup.string().optional(),
  tags: yup.array().of(yup.string()).optional(),
  description: yup.string().nullable().optional(),
});

const DocumentDetailDrawer = forwardRef<
  DocumentDetailDrawerRef,
  {
    onSuccess?: (doc: API.Document) => void;
    onCopied?: (doc: API.Document) => void;
  }
>(({ onSuccess, onCopied }, ref) => {
  const [currentDoc, setCurrentDoc] = useState<API.Document | null>(null);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [legalArea, setLegalArea] = useState<LegalAreaId | ''>('');
  const { toast } = useToast();
  const { t, tf, enumLabel, enumOptions } = useAppTranslation();

  const form = useForm<Partial<API.DocumentUpdateForm>>({
    resolver: yupResolver(schema) as never,
  });

  useImperativeHandle(ref, () => ({
    open: (doc: API.Document) => {
      setCurrentDoc(doc);
      const { area, userTags } = splitDocumentTags(doc.tags);
      setLegalArea(area || inferLegalArea(doc) || '');
      form.reset({
        title: doc.title,
        category: doc.category as API.DocumentCategory,
        tags: userTags,
        description: doc.description,
      });
      setIsEditing(false);
      setOpen(true);
    },
    close: () => {
      setOpen(false);
      setCurrentDoc(null);
    },
  }));

  const getFileUrl = (fileUrl: string) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))
      return fileUrl;
    return fileUrl.startsWith('/') ? `${API_ORIGIN}${fileUrl}` : `${API_ORIGIN}/${fileUrl}`;
  };

  const resolveFileUrl = (url: string) => getFileUrl(url);

  const getFileSizeLabel = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (fileName: string) => {
    const fileType = getFileType(fileName);
    switch (fileType) {
      case 'archive':
        return <Archive size={20} className="text-slate-500" />;
      case 'document':
        return <FileText size={20} className="text-slate-500" />;
      case 'image':
        return <Image size={20} className="text-slate-500" />;
      case 'video':
        return <Video size={20} className="text-slate-500" />;
      case 'audio':
        return <Radio size={20} className="text-slate-500" />;
      default:
        return <File size={20} className="text-slate-500" />;
    }
  };

  const handleSave = form.handleSubmit(async (data) => {
    if (!currentDoc) return;
    setIsLoading(true);
    try {
      const updateData: Partial<API.DocumentUpdateForm> & { id: number } = {
        id: currentDoc.id,
      };
      if (data.title !== undefined && data.title !== currentDoc.title)
        updateData.title = data.title;
      if (data.category !== undefined && data.category !== currentDoc.category)
        updateData.category = data.category as API.DocumentCategory;
      const nextTags = mergeAreaIntoTags(data.tags || [], legalArea || null);
      if (JSON.stringify(nextTags) !== JSON.stringify(currentDoc.tags || []))
        updateData.tags = nextTags;
      if (
        data.description !== undefined &&
        (data.description || '') !== (currentDoc.description || '')
      )
        updateData.description = data.description;

      if (Object.keys(updateData).length <= 1) {
        toast({ title: 'No changes', description: 'Nothing to save.' });
        setIsLoading(false);
        return;
      }

      const res = await apiUpdateDocument(updateData);
      setCurrentDoc(res.data);
      onSuccess?.(res.data);
      setIsEditing(false);
      toast({ title: 'Saved', description: 'Document updated.' });
    } catch (err) {
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        if (Object.keys(remoteValidation).length > 0) {
          Object.entries(remoteValidation).forEach(([key, msg]) =>
            form.setError(key as keyof API.DocumentUpdateForm, { message: msg })
          );
        } else {
          toast({
            title: 'Update failed',
            description: err.response?.data?.detail || err.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update document.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  });

  const handleCopyToLibrary = async () => {
    if (!currentDoc?.is_shared) return;
    setIsLoading(true);
    try {
      const res = await apiCopySharedDocument(currentDoc.id);
      onCopied?.(res.data);
      toast({
        title: t.library.toasts.copiedTitle,
        description: tf(t.library.toasts.copiedDesc, { title: res.data.title || currentDoc.title }),
      });
    } catch (err) {
      const description = isAxiosError(err)
        ? err.response?.data?.detail || t.library.toasts.copyFailedDesc
        : t.library.toasts.copyFailedDesc;
      toast({
        title: t.library.toasts.copyFailedTitle,
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentDoc) return null;

  const shared = Boolean(currentDoc.is_shared);
  const categoryLabel =
    enumLabel('documentCategory', currentDoc.category) ||
    DocumentCategory.getLabel(currentDoc.category) ||
    t.library.unclassifiedCategory;
  const areaLabel =
    (legalArea && enumLabel('documentLegalArea', legalArea)) ||
    (inferLegalArea(currentDoc) &&
      enumLabel('documentLegalArea', inferLegalArea(currentDoc)!));

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setCurrentDoc(null);
      }}
    >
      <SheetContent
        side="right"
        className={cn(
          'w-full sm:max-w-md p-0 flex flex-col overflow-hidden',
          'bg-[#F8FAFC] dark:bg-[#0F172A]',
          'border-l border-slate-200 dark:border-slate-800'
        )}
      >
        <SheetHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {currentDoc.title}
          </SheetTitle>
          {shared ? (
            <p className="text-[11px] text-[#64499D] dark:text-[#CFC2FF]">
              {t.library.publicLibrary}
            </p>
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Universal File Previewer */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <FilePreviewer
              fileUrl={currentDoc.file}
              fileName={currentDoc.file}
              title={currentDoc.title}
              resolveUrl={resolveFileUrl}
            />
          </div>

          {/* Metadata */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Details
              </h3>
              {!isEditing ? (
                shared ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10"
                    onClick={handleCopyToLibrary}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={12} className="mr-1 animate-spin" />
                    ) : (
                      <Copy size={12} className="mr-1" />
                    )}
                    {t.library.addToMyLibrary}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit size={12} className="mr-1" />
                    Edit
                  </Button>
                )
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-[11px] bg-[#0F172A] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#0F172A] hover:opacity-90"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Title
                  </label>
                  <Input
                    {...form.register('title')}
                    className="h-8 text-[13px] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400 focus:ring-offset-0"
                  />
                  {form.formState.errors.title && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Category
                  </label>
                  <Select
                    value={form.watch('category')}
                    onValueChange={(v) =>
                      form.setValue('category', v as API.DocumentCategory)
                    }
                  >
                    <SelectTrigger className="h-8 text-[13px] border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {enumOptions('documentCategory').map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    {t.document.update.areaLabel}
                  </label>
                  <Select
                    value={legalArea || undefined}
                    onValueChange={(v) => setLegalArea(v as LegalAreaId)}
                  >
                    <SelectTrigger className="h-8 text-[13px] border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder={t.document.update.areaPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {enumOptions('documentLegalArea').map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Description
                  </label>
                  <Textarea
                    {...form.register('description')}
                    className="min-h-20 text-[13px] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400 focus:ring-offset-0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                    Tags
                  </label>
                  <TagsInput
                    value={form.watch('tags') || []}
                    onChange={(v) => form.setValue('tags', v)}
                  />
                </div>
              </form>
            ) : (
              <dl className="space-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                    Category
                  </dt>
                  <dd className="text-[#0F172A] dark:text-[#F8FAFC]">
                    {categoryLabel}
                  </dd>
                </div>
                {areaLabel ? (
                  <div>
                    <dt className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      {t.document.update.areaLabel}
                    </dt>
                    <dd className="text-[#0F172A] dark:text-[#F8FAFC]">
                      {areaLabel}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                    Size
                  </dt>
                  <dd className="text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1">
                    <HardDrive size={12} />
                    {getFileSizeLabel(currentDoc.size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                    Modified
                  </dt>
                  <dd className="text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(currentDoc.modified).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </dd>
                </div>
                {currentDoc.description && (
                  <div>
                    <dt className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      Description
                    </dt>
                    <dd className="text-[#0F172A] dark:text-[#F8FAFC]">
                      {currentDoc.description}
                    </dd>
                  </div>
                )}
                {splitDocumentTags(currentDoc.tags).userTags.length > 0 && (
                  <div>
                    <dt className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      Tags
                    </dt>
                    <dd className="flex flex-wrap gap-1">
                      {splitDocumentTags(currentDoc.tags).userTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

DocumentDetailDrawer.displayName = 'DocumentDetailDrawer';

export default DocumentDetailDrawer;
