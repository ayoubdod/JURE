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
import { Badge } from "@/components/ui/badge";
import { 
  AlignJustify, 
  Calendar, 
  Edit, 
  FileText, 
  Gavel, 
  Loader2, 
  Mail, 
  MapPin, 
  Phone, 
  Plus, 
  Scale, 
  Tags, 
  Type, 
  UserCheck, 
  Users, 
  X,
  Save,
  UserPlus,
  Trash2
} from 'lucide-react';
import { apiUpdateCase } from '@/services/case/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';

export interface CaseViewModalRef {
  show: (instance: API.Case) => void;
  hide: () => void;
}

export interface CaseViewModalProps {
  onSuccess?: (_: API.Case) => void;
  onDelete?: (caseItem: API.Case) => void;
  deleteModalRef?: React.RefObject<{ show: (caseItem: API.Case) => void }>;
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

const CaseViewModal = forwardRef<CaseViewModalRef, CaseViewModalProps>(({ onSuccess, onDelete, deleteModalRef }, ref) => {
  const [instance, setInstance] = useState<API.Case | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [additionalAssignees, setAdditionalAssignees] = useState<API.CabinetMember[]>([]);
  const { toast } = useToast();

  const mainForm = useForm<API.CaseUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.CaseUpdateForm>
  });

  const show = (instance: API.Case) => {
    setInstance(instance);
    setIsEditing(false);
    setAdditionalAssignees([]);
    
    mainForm.reset({
      category: instance.category,
      status: instance.status,
      summary: instance.summary,
      description: instance.description,
      reference: instance.reference,
      title: instance.title,
      court: instance.court,
      assigned_to: instance?.assigned_to?.id ? instance.assigned_to.id : null,
      client: instance?.client?.id ? instance.client.id : null
    });
    setIsOpen(true);
  }

  const hide = () => {
    setIsOpen(false);
    setIsEditing(false);
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
        onSuccess?.(res.data);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Case updated successfully",
        });
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.CaseUpdateForm,  { type: 'server', message: remoteValidation[key] });
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case CaseStatus.OPEN: return 'bg-green-100 text-green-800';
      case CaseStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
      case CaseStatus.CLOSED: return 'bg-gray-100 text-gray-800';
      case CaseStatus.CANCELLED: return 'bg-red-100 text-red-800';
      case CaseStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case CaseStatus.ARCHIVED: return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addAssignee = () => {
    // This would typically open a modal to select a team member
    toast({
      title: "Add Assignee",
      description: "Feature to add additional assignees coming soon",
    });
  };

  const removeAssignee = (assigneeId: number) => {
    setAdditionalAssignees(prev => prev.filter(a => a.id !== assigneeId));
  };

  if (!instance) return null;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case CaseStatus.OPEN: return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800/60';
      case CaseStatus.IN_PROGRESS: return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800/60';
      case CaseStatus.CLOSED: return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60';
      case CaseStatus.CANCELLED: return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800/60';
      case CaseStatus.PENDING: return 'bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:ring-yellow-800/60';
      case CaseStatus.ARCHIVED: return 'bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:ring-gray-800/60';
      default: return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {!isEditing ? (
          <>
            {/* Header Banner */}
            <div className="relative h-40 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
              {/* Decorative Pattern Overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '32px 32px'
                }}></div>
              </div>
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
              
              {/* Header Content */}
              <div className="relative px-8 pt-8 pb-6">
                {/* Close Button - Positioned in header content area */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 z-10"
                  onClick={hide}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </Button>

                <div className="flex items-start justify-between gap-4 pr-12">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-4 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex-shrink-0">
                      <Scale className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl font-bold text-white mb-2 truncate">
                        {instance.title}
                      </DialogTitle>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset bg-white/20 backdrop-blur-sm text-white border border-white/30">
                          {instance.reference}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeColor(instance.status)}`}>
                          {instance.status}
                        </span>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset bg-white/20 backdrop-blur-sm text-white border border-white/30">
                          {CaseCategory.getLabel(instance.category)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {(deleteModalRef || onDelete) && instance && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (deleteModalRef?.current) {
                            deleteModalRef.current.show(instance);
                          } else if (onDelete) {
                            onDelete(instance);
                          }
                        }}
                        className="h-9 bg-white/20 hover:bg-red-500/30 backdrop-blur-sm text-white border border-white/30 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <DialogHeader className="px-8 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                  <Scale className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    Edit Case
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Update case information
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={hide}
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
        )}

        {isEditing ? (
          // Edit Form
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
                    Primary Assignee <span className="text-slate-400 text-xs">(optional)</span>
                  </label>
                  <ServerSelect
                    link='/cabinets/members/select_list'
                    value={mainForm.watch('assigned_to')}
                    onChange={(val) => mainForm.setValue('assigned_to', val ? Number(val) : null)}
                    labelKey={'email'}
                    cleanable
                    showAvatar
                  />
                  {mainForm.formState.errors.assigned_to && (
                    <p className="text-red-500 text-xs mt-1">
                      {mainForm.formState.errors.assigned_to.message}
                    </p>
                  )}
                </div>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Summary
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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

            <DialogFooter className="pt-6 border-t border-slate-200 dark:border-slate-800 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // View Mode
          <div className="px-8 py-6 space-y-6">
            {/* Case Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Case Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                    <FileText className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Case Details
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                    <Gavel className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Court</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{instance.court}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                    <AlignJustify className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</p>
                      <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{instance.description}</p>
                    </div>
                  </div>

                  {instance.summary && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                      <FileText className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Summary</p>
                        <p className="text-sm text-slate-900 dark:text-white">{instance.summary}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Created</p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {new Date(instance.created).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      {instance.created_by && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          By: {instance.created_by.first_name} {instance.created_by.last_name || ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment & Team Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                    <Users className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Assignment & Team
                  </h3>
                </div>

                {/* Primary Assignee */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Primary Assignee</p>
                    {instance.assigned_to ? (
                      <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            image={getPersonImage(instance.assigned_to as Record<string, unknown>)}
                            firstName={instance.assigned_to.first_name}
                            lastName={instance.assigned_to.last_name}
                            email={instance.assigned_to.email}
                            size="lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {instance.assigned_to.first_name} {instance.assigned_to.last_name}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{instance.assigned_to.email}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Not assigned</p>
                      </div>
                    )}
                  </div>

                  {/* Additional Assignees */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Additional Assignees</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addAssignee}
                        className="h-8 px-3 text-xs border-slate-300 dark:border-slate-700"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    {additionalAssignees.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">No additional assignees</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {additionalAssignees.map((assignee) => (
                          <div key={assignee.id} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <UserAvatar
                                image={getPersonImage(assignee as Record<string, unknown>)}
                                firstName={assignee.first_name}
                                lastName={assignee.last_name}
                                size="sm"
                                className="h-8 w-8 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {assignee.first_name} {assignee.last_name}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{assignee.email}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAssignee(assignee.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            {instance.client && (
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                    <Users className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Related Client
                  </h3>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#64499D] to-[#3b2b66] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {instance.client.first_name?.[0]}{instance.client.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                        {instance.client.first_name} {instance.client.last_name}
                      </h4>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                          <span className="truncate">{instance.client.email}</span>
                        </div>
                        {instance.client.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Phone className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                            <span>{instance.client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

CaseViewModal.displayName = 'CaseViewModal';

export default CaseViewModal; 