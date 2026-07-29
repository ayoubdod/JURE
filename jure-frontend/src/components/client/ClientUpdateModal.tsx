'use client';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Mail, Phone, User, MapPin, X, Save, FileSpreadsheet } from 'lucide-react';
import { apiUpdateClient } from '@/services/client/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { DialogDescription } from '@radix-ui/react-dialog';
import { devError } from '@/utils/devLog';

export interface ClientUpdateModalRef {
  show: (instance: API.Client) => void;
  hide: () => void;
}

export interface ClientUpdateModalProps {
  onSuccess?: (_: API.Client) => void;
  readOnly?: boolean; // optional; use if you want view-only mode
}

const schema = yup.object({
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  phone: yup.string().required('Phone is required'),
  address: yup.string().required('Address is required'),
  ice: yup.string().optional(),
  fiscal_if: yup.string().optional(),
});

const ClientUpdateModal = forwardRef<ClientUpdateModalRef, ClientUpdateModalProps>(
  ({ onSuccess, readOnly = false }, ref) => {
    const [instance, setInstance] = useState<API.Client | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const mainForm = useForm<API.ClientUpdateForm>({
      resolver: yupResolver(schema) as unknown as Resolver<API.ClientUpdateForm>,
    });

    const show = (inst: API.Client) => {
      setInstance(inst);
      const apiIf = (inst as API.Client & { if?: string | null }).if;
      mainForm.reset({
        first_name: inst.first_name,
        last_name: inst.last_name,
        email: inst.email,
        phone: inst.phone,
        address: inst.address,
        ice: inst.ice ?? '',
        fiscal_if: inst.fiscal_if ?? apiIf ?? '',
      });
      setIsOpen(true);
    };

    const hide = () => {
      if (isLoading) return;
      setIsOpen(false);
      mainForm.reset();
    };

    useImperativeHandle(ref, () => ({ show, hide }), [isLoading]);

    const handleSubmit = async (data: API.ClientUpdateForm) => {
      if (!instance) return;
      setIsLoading(true);
      
      // Check if any values actually changed
      const apiIf = (instance as API.Client & { if?: string | null }).if;
      const prevIf = instance.fiscal_if ?? apiIf ?? '';
      const hasChanges = 
        data.first_name !== instance.first_name ||
        data.last_name !== instance.last_name ||
        data.email !== instance.email ||
        data.phone !== instance.phone ||
        (data.address || '') !== (instance.address || '') ||
        (data.ice || '') !== (instance.ice || '') ||
        (data.fiscal_if || '') !== (prevIf || '');
      
      if (!hasChanges) {
        // No changes detected, just close the modal
        hide();
        setIsLoading(false);
        return;
      }
      
      // Exclude 'id' from the payload since it's in the URL
      const { id, ...updateData } = data;
      
      await apiUpdateClient({
        ...updateData,
        id: instance.id,
      })
        .then((res) => {
          onSuccess?.(res.data);
          hide();
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            devError('Error updating client:', err.response?.data);

            // Check if it's a duplicate error
            const errorData = err.response?.data;
            if (errorData) {
              // Handle duplicate email/phone errors with better messaging
              if (errorData.email && Array.isArray(errorData.email)) {
                const emailError = errorData.email[0];
                if (emailError && typeof emailError === 'string' && emailError.toLowerCase().includes('already')) {
                  mainForm.setError('email', { 
                    message: 'This email is already in use by another client. Please use a different email address.' 
                  });
                } else {
                  mainForm.setError('email', { message: emailError });
                }
              }
              
              if (errorData.phone && Array.isArray(errorData.phone)) {
                const phoneError = errorData.phone[0];
                if (phoneError && typeof phoneError === 'string' && phoneError.toLowerCase().includes('already')) {
                  mainForm.setError('phone', { 
                    message: 'This phone number is already in use by another client. Please use a different phone number.' 
                  });
                } else {
                  mainForm.setError('phone', { message: phoneError });
                }
              }
            }
            
            // Handle other validation errors
            const remoteValidation = getRemoteFieldsValidation(err);
            Object.keys(remoteValidation).forEach((key) => {
              // Only set error if not already set above
              if (!mainForm.formState.errors[key as keyof API.ClientUpdateForm]) {
                mainForm.setError(key as keyof API.ClientUpdateForm, { message: remoteValidation[key] });
              }
            });
          }
        })
        .finally(() => setIsLoading(false));
    };

    return (
      <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
          {/* Header Banner */}
          <div className="relative h-32 bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#64499D] overflow-hidden">
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
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    Update Client Information
                  </DialogTitle>
                  <DialogDescription className="text-white/90 mt-1">
                    Modify the client details below
                  </DialogDescription>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                  <User className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Personal Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      {...mainForm.register('first_name')}
                      placeholder="Enter first name"
                      disabled={readOnly || isLoading}
                      className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                    />
                  </div>
                  {mainForm.formState.errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {mainForm.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      {...mainForm.register('last_name')}
                      placeholder="Enter last name"
                      disabled={readOnly || isLoading}
                      className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                    />
                  </div>
                  {mainForm.formState.errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {mainForm.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                  <Mail className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Contact Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      {...mainForm.register('email')}
                      type="email"
                      placeholder="client@example.com"
                      disabled={readOnly || isLoading}
                      className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                    />
                  </div>
                  {mainForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {mainForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      {...mainForm.register('phone')}
                      placeholder="+1 (555) 000-0000"
                      disabled={readOnly || isLoading}
                      className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                    />
                  </div>
                  {mainForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {mainForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                  <MapPin className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Address Information
                </h3>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    {...mainForm.register('address')}
                    placeholder="Enter full address"
                    disabled={readOnly || isLoading}
                    className="pl-10 h-11 border-slate-300 dark:border-slate-700 focus:border-[#64499D] focus:ring-[#64499D]"
                  />
                </div>
                {mainForm.formState.errors.address && (
                  <p className="text-red-500 text-xs mt-1">
                    {mainForm.formState.errors.address.message}
                  </p>
                )}
              </div>
            </div>

            {/* B2B — fiscal (Morocco) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240]">
                  <FileSpreadsheet className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Fiscal (B2B)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ICE et IF — utilisés sur les factures et dossiers professionnels
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ICE</label>
                  <Input
                    {...mainForm.register('ice')}
                    placeholder="Identifiant Commun de l’Entreprise"
                    disabled={readOnly || isLoading}
                    className="h-11 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">IF</label>
                  <Input
                    {...mainForm.register('fiscal_if')}
                    placeholder="Identifiant fiscal"
                    disabled={readOnly || isLoading}
                    className="h-11 border-slate-300 dark:border-slate-700"
                  />
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
              {!readOnly && (
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
                      Update Client
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);

ClientUpdateModal.displayName = 'ClientUpdateModal';
export default ClientUpdateModal;