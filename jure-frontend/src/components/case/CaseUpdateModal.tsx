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
import { AlignJustify, FileText, Gavel, Loader2, Scale, StickyNote, Tags, Type, User, UserCheck, X, Save } from 'lucide-react';
import { apiUpdateCase } from '@/services/case/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { useToast } from '@/hooks/use-toast';
import { devError } from '@/utils/devLog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';


export interface CaseUpdateModalRef {
  show: (instance: API.Case) => void;
  hide: () => void;
}

export interface CaseUpdateModalProps {
  onSuccess?: (_: API.Case) => void;
}

const schema = yup.object({
  category: yup.string().required('Category is required'),
  status: yup.string().required('Status is required'),
  summary: yup.string().optional().default(''),
  description: yup.string().required('Description is required'),
  reference: yup.string().required('Reference is required'),
  title: yup.string().required('Title is required'),
  court: yup.string().required('Court is required'),
  assigned_to: yup.number().nullable().optional(),
  client: yup.number().nullable().optional(),
});

const CaseUpdateModal = forwardRef<CaseUpdateModalRef, CaseUpdateModalProps>(({ onSuccess }, ref) => {
  const [instance, setInstance] = useState<API.Case | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const mainForm = useForm<API.CaseUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.CaseUpdateForm>
  });

  const show = (instance: API.Case) => {
    setInstance(instance);
    
    const formData = {
      category: instance.category,
      status: instance.status,
      summary: instance.summary,
      description: instance.description,
      reference: instance.reference,
      title: instance.title,
      court: instance.court,
      assigned_to: instance?.assigned_to?.id ? instance.assigned_to.id : null,
      client: instance?.client?.id ? instance.client.id : null
    };
    
    mainForm.reset(formData);
    setIsOpen(true);
  }

  const hide = () => {
    setIsOpen(false);
    mainForm.reset();
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.CaseUpdateForm) => {
    if (!instance) return;
    
    setIsLoading(true);
    
    // Ensure assigned_to and client are properly formatted
    const submitData = {
      ...data,
      id: instance.id,
      assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      client: data.client ? Number(data.client) : null,
    };
    
    await apiUpdateCase(submitData)
      .then((res) => {
        toast({ title: 'Dossier mis à jour' });
        onSuccess?.(res.data);
        hide();
      })
      .catch((err) => {
        devError('apiUpdateCase', err);
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.CaseUpdateForm, { message: remoteValidation[key] });
          });

          let msg = 'Impossible de mettre à jour le dossier.';
          const d = err.response?.data as Record<string, unknown> | string | undefined;
          if (typeof d === 'string') msg = d;
          else if (d && typeof d === 'object' && !Array.isArray(d)) {
            const detail = (d as any).detail;
            if (typeof detail === 'string') msg = detail;
            else if (Array.isArray(detail) && detail.length > 0) msg = String(detail[0]);
            else {
              const first = Object.entries(d).find(([, v]) => v != null);
              if (first) {
                const v = first[1];
                msg = `${first[0]}: ${Array.isArray(v) ? String(v[0]) : String(v)}`;
              }
            }
          }
          toast({ title: 'Erreur', description: msg, variant: 'destructive' });
        } else {
          toast({ title: 'Erreur', description: 'Impossible de mettre à jour le dossier.', variant: 'destructive' });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
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
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Update Case
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Modify the case details below
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                <FileText className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Basic Information
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Reference <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    {...mainForm.register('reference')} 
                    placeholder="Case reference"
                    className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                  />
                </div>
                {mainForm.formState.errors.reference && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.reference.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    {...mainForm.register('title')} 
                    placeholder="Case title"
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Court Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    {...mainForm.register('court')} 
                    placeholder="Court name"
                    className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                  />
                </div>
                {mainForm.formState.errors.court && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.court.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={mainForm.watch('category')} 
                  onValueChange={(val: API.CaseCategory) => mainForm.setValue('category', val)}
                >
                  <SelectTrigger className="h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CaseCategory.options.map((category, index) => (
                      <SelectItem key={index} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.category && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <AlignJustify className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Textarea 
                  {...mainForm.register('description')} 
                  placeholder="Provide a detailed description of the case..."
                  className="pl-10 min-h-[100px] resize-none border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                />
              </div>
              {mainForm.formState.errors.description && (
                <p className="text-red-500 text-xs mt-1">
                  {mainForm.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>

          {/* Case Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                <Tags className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Case Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Status <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={mainForm.watch('status')} 
                  onValueChange={(val: API.CaseStatus) => mainForm.setValue('status', val)}
                >
                  <SelectTrigger className="h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CaseStatus.options.map((status, index) => (
                      <SelectItem key={index} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.status && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Summary
                </label>
                <div className="relative">
                  <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    {...mainForm.register('summary')} 
                    placeholder="Brief case summary"
                    className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                  />
                </div>
                {mainForm.formState.errors.summary && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.summary.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                <UserCheck className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Assignment & Relations
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Assigned To <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <ServerSelect
                  link='/cabinets/members/select_list'
                  value={mainForm.watch('assigned_to')}
                  onChange={(val) => {
                    mainForm.setValue('assigned_to', val ? Number(val) : null);
                  }}
                  labelKey={'email'}
                  cleanable
                />
                {mainForm.formState.errors.assigned_to && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.assigned_to.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Related Client <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <ServerSelect
                  link='/clients/clients/'
                  value={mainForm.watch('client')}
                  onChange={(val) => mainForm.setValue('client', val)}
                  labelKey={(client: any) => `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || 'Unnamed'}
                  cleanable
                  placeholder="Select a client"
                />
                {mainForm.formState.errors.client && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.client.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-slate-200 dark:border-slate-800 gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={hide} 
              disabled={isLoading}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#64499D] hover:bg-[#5a3f8a] text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Case
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CaseUpdateModal.displayName = 'CaseUpdateModal';

export default CaseUpdateModal;
