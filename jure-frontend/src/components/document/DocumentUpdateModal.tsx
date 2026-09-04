'use client'
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlignJustify, Briefcase, FileText, Loader2, Tags, Type, X, Archive, Image, Video, Radio, File, Download, Eye } from 'lucide-react';
import { apiUpdateDocument } from '@/services/library/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation, getFileType } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DialogDescription } from '@radix-ui/react-dialog';
import { Textarea } from '../ui/textarea';
import TagsInput from '@/components/common/TagsInput';
import { useToast } from '@/hooks/use-toast';
import { devError, devWarn } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';
import { mergeAreaIntoTags, splitDocumentTags, type LegalAreaId } from '@/lib/libraryTaxonomy';

export interface DocumentUpdateModalRef {
  show: (instance: API.Document) => void;
  hide: () => void;
}

export interface DocumentUpdateModalProps {
  onSuccess?: (_: API.Document) => void;
}

const schema = yup.object({
  title: yup.string().optional(),
  category: yup.string().optional(),
  tags: yup.array().of(yup.string()).optional(),
  description: yup.string().nullable().optional(),
  file: yup.mixed().optional(),
});

const DocumentUpdateModal = forwardRef<DocumentUpdateModalRef, DocumentUpdateModalProps>(({ onSuccess }, ref) => {
  const { t, tf, enumOptions } = useAppTranslation();
  const m = t.document.update;
  const [instance, setInstance] = useState<API.Document | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [legalArea, setLegalArea] = useState<LegalAreaId | ''>('');
  const { toast } = useToast();

  const mainForm = useForm<API.DocumentUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.DocumentUpdateForm>
  });

  const show = (instance: API.Document) => {
    setInstance(instance);
    const { area, userTags } = splitDocumentTags(instance.tags);

    mainForm.reset({
      title: instance.title,
      category: instance.category as API.DocumentCategory,
      tags: userTags,
      description: instance.description,
    });
    setLegalArea(area || '');
    setIsOpen(true);
  }

  const hide = () => {
    setIsOpen(false);
    setLegalArea('');
    mainForm.reset();
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.DocumentUpdateForm) => {
    if (!instance) {
      toast({
        title: t.common.error,
        description: m.instanceMissing,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Handle file input - it can be FileList, File, or undefined
      // Use safer type checks to avoid instanceof errors
      let fileToUpload: File | undefined = undefined;
      
      if (data.file) {
        // Check for FileList - has length property and item method
        if (typeof FileList !== 'undefined' && data.file instanceof FileList && data.file.length > 0) {
          fileToUpload = data.file[0];
        } 
        // Check for File - has name, size, type properties
        else if (typeof File !== 'undefined' && data.file instanceof File) {
          fileToUpload = data.file;
        }
        // Fallback: check if it has File-like properties
        else if (data.file && typeof data.file === 'object' && 'name' in data.file && 'size' in data.file) {
          fileToUpload = data.file as File;
        }
      }

      // Prepare update data - compare form values with original to detect changes
      const updateData: Partial<API.DocumentUpdateForm> = {};
      let hasChanges = false;
      
      // Compare each field with the original value
      // Only include fields that have actually changed
      if (data.title !== undefined && data.title !== instance.title) {
        updateData.title = data.title;
        hasChanges = true;
      }
      
      if (data.category !== undefined && data.category !== instance.category) {
        updateData.category = data.category;
        hasChanges = true;
      }
      
      // Compare tags arrays including persisted legal-area tag
      const nextTags = mergeAreaIntoTags(data.tags || [], legalArea || null);
      const originalTags = instance.tags || [];
      const tagsChanged = JSON.stringify(nextTags) !== JSON.stringify(originalTags);
      if (tagsChanged) {
        updateData.tags = nextTags;
        hasChanges = true;
      }
      
      // Compare description (handle null/empty string)
      if (data.description !== undefined) {
        const originalDesc = instance.description || '';
        const newDesc = data.description || '';
        if (originalDesc !== newDesc) {
          updateData.description = data.description;
          hasChanges = true;
        }
      }
      
      // Only add file if a new one is being uploaded
      if (fileToUpload) {
        updateData.file = fileToUpload;
        hasChanges = true;
      }

      // Validate that at least one field is being updated
      if (!hasChanges) {
        toast({
          title: m.noChangesTitle,
          description: m.noChangesDesc,
          variant: "default",
        });
        setIsLoading(false);
        return;
      }

      const fieldsToUpdate = Object.keys(updateData).filter(key => key !== 'file' || fileToUpload);

      // Store fieldsToUpdate for use in validation later
      const fieldsBeingUpdated = fieldsToUpdate;

      // Send update request
      const res = await apiUpdateDocument({
        ...updateData,
        id: instance.id,
      });

      // Validate response
      if (!res || !res.data) {
        const errorMsg = 'Invalid response: No data returned from server. The update may not have been saved.';
        devError(errorMsg, res);
        throw new Error(errorMsg);
      }
      
      // Verify the document was actually updated
      const updatedDocument = res.data;
      
      if (!updatedDocument || typeof updatedDocument !== 'object') {
        const errorMsg = 'Invalid response: Response data is not a valid document object.';
        devError(errorMsg, updatedDocument);
        throw new Error(errorMsg);
      }

      if (!updatedDocument.id || updatedDocument.id !== instance.id) {
        devWarn('Response document ID does not match request ID', {
          expected: instance.id,
          received: updatedDocument.id,
        });
      }
      
      // Verify that the update actually changed something
      const wasUpdated = 
        (updateData.title !== undefined && updatedDocument.title !== instance.title) ||
        (updateData.category !== undefined && updatedDocument.category !== instance.category) ||
        (updateData.description !== undefined && updatedDocument.description !== instance.description) ||
        (updateData.tags !== undefined && JSON.stringify(updatedDocument.tags) !== JSON.stringify(instance.tags)) ||
        (fileToUpload !== undefined);
      
      // Compare all fields to see what changed
      const comparison = {
        title: {
          sent: updateData.title,
          original: instance.title,
          received: updatedDocument.title,
          changed: updateData.title !== undefined && updatedDocument.title !== instance.title
        },
        category: {
          sent: updateData.category,
          original: instance.category,
          received: updatedDocument.category,
          changed: updateData.category !== undefined && updatedDocument.category !== instance.category
        },
        description: {
          sent: updateData.description,
          original: instance.description,
          received: updatedDocument.description,
          changed: updateData.description !== undefined && updatedDocument.description !== instance.description
        },
        tags: {
          sent: updateData.tags,
          original: instance.tags,
          received: updatedDocument.tags,
          changed: updateData.tags !== undefined && JSON.stringify(updatedDocument.tags) !== JSON.stringify(instance.tags)
        }
      };

      if (!wasUpdated && fieldsBeingUpdated.length > 0) {
        devWarn('Document may not have been updated; values appear unchanged.', {
          sent: updateData,
          received: updatedDocument,
          comparison,
        });

        // Still show success but warn user
        toast({
          title: m.updateCompletedTitle,
          description: m.updateCompletedDesc,
          variant: "default",
        });
      } else {
        toast({
          title: m.successTitle,
          description: tf(m.successDesc, { title: updatedDocument.title || instance.title }),
        });
      }
      
      // Always call onSuccess to refresh the list, even if values appear unchanged
      // The backend might have updated other fields (like modified timestamp)
      onSuccess?.(updatedDocument);
      
      // Small delay to ensure callback completes before closing
      setTimeout(() => {
        hide();
      }, 100);
    } catch (err) {
      devError('Error updating document:', err);

      if (isAxiosError(err)) {
        devError('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers,
            data: err.config?.data,
          },
        });

        const remoteValidation = getRemoteFieldsValidation(err);
        const hasValidationErrors = Object.keys(remoteValidation).length > 0;

        if (hasValidationErrors) {
          devError('Validation errors:', remoteValidation);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.DocumentUpdateForm, { message: remoteValidation[key] });
          });
          toast({
            title: m.validationErrorTitle,
            description: m.validationErrorDesc,
            variant: "destructive",
          });
        } else {
          // Show detailed error message with backend diagnosis
          const status = err.response?.status;
          const statusText = err.response?.statusText;
          const errorData = err.response?.data;
          
          let errorMessage = m.updateFailedTitle;
          let backendIssue = '';
          
          // Diagnose backend issues (dev diagnostics — not user chrome)
          if (status === 400) {
            backendIssue = 'Bad Request - The backend rejected the data format.';
          } else if (status === 404) {
            backendIssue = 'Not Found - The document may have been deleted.';
          } else if (status === 500) {
            backendIssue = 'Server Error - The backend encountered an internal error.';
          } else if (status === 422) {
            backendIssue = 'Validation Error - The backend could not process the data.';
          } else if (!status) {
            backendIssue = 'Network Error - Could not reach the backend server.';
          }
          
          // Check for error keys as backend returns consistent JSON responses
          if (errorData && typeof errorData === 'object') {
            // Check for 'error' key (single error message)
            if ('error' in errorData && typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            }
            // Check for 'errors' key (multiple errors)
            else if ('errors' in errorData) {
              if (Array.isArray(errorData.errors)) {
                errorMessage = errorData.errors.join(', ');
              } else if (typeof errorData.errors === 'string') {
                errorMessage = errorData.errors;
              } else if (typeof errorData.errors === 'object') {
                errorMessage = Object.values(errorData.errors).flat().join(', ');
              }
            }
            // Check for 'detail' key (DRF standard)
            else if ('detail' in errorData && typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            }
            // Check for 'message' key
            else if ('message' in errorData && typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            }
            // If errorData is a string
            else if (typeof errorData === 'string') {
              errorMessage = errorData;
            }
          }
          
          const fullErrorMessage = status
            ? `[${status} ${statusText || ''}] ${errorMessage}${backendIssue ? `\n\nBackend Issue: ${backendIssue}` : ''}`
            : errorMessage;

          devError('Update failed:', {
            status,
            statusText,
            errorData,
            backendIssue,
            requestData: updateData,
          });

          toast({
            title: m.updateFailedTitle,
            description: fullErrorMessage,
            variant: "destructive",
          });
          
          if (backendIssue) {
            devError('BACKEND ISSUE DETECTED:', {
              status,
              issue: backendIssue,
              errorData,
              requestPayload: updateData,
              url: `/library/documents/${instance.id}/`,
            });
          }
        }
      } else {
        // Safer error message extraction
        let errorMessage = m.unexpectedError;
        if (err && typeof err === 'object') {
          if ('message' in err && typeof err.message === 'string') {
            errorMessage = err.message;
          } else if ('toString' in err && typeof err.toString === 'function') {
            errorMessage = err.toString();
          }
        }
        devError('Non-Axios error:', err);
        toast({
          title: t.common.error,
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFileSizeLabel = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (fileName: string) => {
    const fileType = getFileType(fileName);
    switch (fileType) {
      case 'archive': return <Archive size={20} className="text-purple-600 dark:text-purple-400" />;
      case 'document': return <FileText size={20} className="text-purple-600 dark:text-purple-400" />;
      case 'image': return <Image size={20} className="text-purple-600 dark:text-purple-400" />;
      case 'video': return <Video size={20} className="text-purple-600 dark:text-purple-400" />;
      case 'audio': return <Radio size={20} className="text-purple-600 dark:text-purple-400" />;
      case 'other': return <File size={20} className="text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#7B68EE] to-[#9370DB] overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 end-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={hide}
            disabled={isLoading}
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {m.title}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {m.description}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          {/* Document Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                <FileText className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {m.sectionInfo}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  {m.titleLabel}
                </label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    {...mainForm.register('title')} 
                    placeholder={m.titlePlaceholder}
                    className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                  />
                </div>
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Tags className="w-4 h-4" />
                  {m.categoryLabel}
                </label>
                <div className="relative">
                  <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <Select
                    value={mainForm.watch('category')}
                    onValueChange={(val: API.DocumentCategory) => mainForm.setValue('category', val)}
                  >
                    <SelectTrigger className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]">
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
                </div>
                {mainForm.formState.errors.category && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.category.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {m.areaLabel}
                </label>
                <Select
                  value={legalArea || undefined}
                  onValueChange={(val: LegalAreaId) => setLegalArea(val)}
                >
                  <SelectTrigger className="h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]">
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
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlignJustify className="w-4 h-4" />
                {m.descriptionLabel}
              </label>
              <Textarea 
                {...mainForm.register('description')} 
                placeholder={m.descriptionPlaceholder}
                className="min-h-[100px] border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
              />
              {mainForm.formState.errors.description && (
                <p className="text-red-500 text-xs mt-1">
                  {mainForm.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Current File Display */}
            {instance && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {m.currentFile}
                </label>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    {getFileIcon(instance.file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {instance.file.split('/').pop() || instance.file}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {getFileSizeLabel(instance.size)} • {getFileType(instance.file).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => window.open(instance.file, '_blank')}
                    >
                      <Eye size={14} className="mr-1" />
                      {m.view}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = instance.file;
                        link.download = instance.file.split('/').pop() || 'download';
                        link.click();
                      }}
                    >
                      <Download size={14} className="mr-1" />
                      {t.document.download}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* New File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {m.replaceFile} <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">{m.replaceFileOptional}</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="file"
                  {...mainForm.register('file')}
                  className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D] cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#64499D] file:text-white hover:file:bg-[#563d89]"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {m.replaceFileHint}
              </p>
              {mainForm.formState.errors.file && (
                <p className="text-red-500 text-xs mt-1">
                  {mainForm.formState.errors.file.message}
                </p>
              )}
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Tags className="w-4 h-4" />
                {m.tagsLabel}
              </label>
              <TagsInput
                value={mainForm.watch('tags') || []} 
                onChange={(val) => {
                  mainForm.setValue('tags', val);
                  mainForm.trigger('tags');
                }}
                setError={(err) => mainForm.setError('tags', { message: err })}
              />
              {mainForm.formState.errors.tags && (
                <p className="text-red-500 text-xs mt-1">
                  {mainForm.formState.errors.tags.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px] bg-[#64499d] hover:bg-[#563d89] text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {m.updating}
                </>
              ) : (
                m.submit
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

DocumentUpdateModal.displayName = 'DocumentUpdateModal';

export default DocumentUpdateModal;
