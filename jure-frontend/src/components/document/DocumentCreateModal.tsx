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
import { AlignJustify, BookOpenText, CircleDot, FileText, Gavel, Heading, Heading1, Info, Layers, Loader2, Scale, StickyNote, Tags, Type, UserCheck, Users, X } from 'lucide-react';
import { apiCreateDocument } from '@/services/library/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Form, FormField, FormItem } from '../ui/form';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
// import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { DocumentCategory } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';
import TagsInput from '../TagsInput';


export interface DocumentCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface DocumentCreateModalProps {
  onSuccess?: (_: API.Document) => void;
}

const schema = yup.object({
  title: yup.string().required('Title is required'),
  category: yup.string().required('Category is required'),
  tags: yup.array().of(yup.string()).default([]),
  description: yup.string().nullable().default(''),
  file: yup.mixed()
    .required('File is required')
    .test('is-file', 'Please select a valid file', (value) => {
      return value instanceof File || (value instanceof FileList && value.length > 0);
    }),
});

const DocumentCreateModal = forwardRef<DocumentCreateModalRef, DocumentCreateModalProps>(({ onSuccess }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const mainForm = useForm<API.DocumentCreateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.DocumentCreateForm>
  });

  const show = () => {
    setIsOpen(true);
    mainForm.reset();

  }

  const hide = () => {
    setIsOpen(false);
    mainForm.reset();
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.DocumentCreateForm) => {
    setIsLoading(true);
    await apiCreateDocument({
      ...data,
      file: data.file[0],
    })
      .then((res) => {
        onSuccess?.(res.data);
        hide();
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.DocumentCreateForm, { message: remoteValidation[key] });
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
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
            className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={hide}
            disabled={isLoading}
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
                  Create New Document
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Set up a new legal document for your practice.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">

          {/* Document Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Scale className="w-4 h-4 text-purple-600" />
              Document Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Type className="w-4 h-4 text-gray-700" />
                  <span>Title</span>
                </label>

                <Input {...mainForm.register('title')}
                  placeholder='Enter Document Title' />
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Tags className="w-4 h-4 text-gray-700" />
                  <span>Category</span>
                </label>

                <Select
                  value={mainForm.watch('category')}
                  onValueChange={(val: API.DocumentCategory) => mainForm.setValue('category', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DocumentCategory.options.map((category, index) => (
                      <SelectItem key={index} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {mainForm.formState.errors.category && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-1">
                <AlignJustify className="w-4 h-4 text-gray-700" />
                <span>Description</span>
              </label>

              <Textarea {...mainForm.register('description')}
                placeholder='Enter Document Description' />
              {mainForm.formState.errors.description && (
                <p className="text-red-500 text-xs p-1">{mainForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4 text-gray-700" />
                <span>File</span>
              </label>

              <Input
                type="file"
                {...mainForm.register('file')}
                placeholder='Select Document File'
              />
              {mainForm.formState.errors.file && (
                <p className="text-red-500 text-xs p-1 pb-0">
                  {mainForm.formState.errors.file.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-1">
                <Tags className="w-4 h-4 text-gray-700" />
                <span>Tags</span>
              </label>

              <TagsInput 
                value={mainForm.watch('tags') || []} 
                onChange={(val) => {mainForm.setValue('tags', val);mainForm.trigger('tags')}}
                setError={(err) => mainForm.setError('tags', { message: err })}
                // error={mainForm.formState.errors.tags?.message}
              />

              {mainForm.formState.errors.tags && (
                <p className="text-red-500 text-xs p-1 pb-0">
                  {mainForm.formState.errors.tags.message}
                </p>
              )}
            </div>
          </div>


          




          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </form>


      </DialogContent>
    </Dialog >
  );
});

DocumentCreateModal.displayName = 'DocumentCreateModal';

export default DocumentCreateModal;
