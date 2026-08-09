'use client'
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Mail, MapPin, Phone, User, X } from 'lucide-react';
import { apiUpdateCabinetMember, apiUpdateCabinetMemberRole } from '@/services/cabinet-member/api';
import { getCabinetMemberRouteId } from '@/utils/cabinetMemberHelpers';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { DialogDescription } from '@radix-ui/react-dialog';
import { PhoneInput } from '../ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Shield } from 'lucide-react';
import { useAppTranslation } from '@/i18n';


export interface CabinetMemberUpdateModalRef {
  show: (member: API.CabinetMember) => void;
  hide: () => void;
}

export interface CabinetMemberUpdateModalProps {
  onSuccess?: (_: API.CabinetMember) => void;
}

const CabinetMemberUpdateModal = forwardRef<CabinetMemberUpdateModalRef, CabinetMemberUpdateModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const [instance, setInstance] = useState<API.CabinetMember | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const schema = useMemo(
    () =>
      yup.object({
        first_name: yup.string().required(t.team.validation.firstNameRequired),
        last_name: yup.string().required(t.team.validation.lastNameRequired),
        email: yup.string().email(t.validation.invalidEmail).required(t.team.validation.emailRequired),
        phone: yup.string().required(t.team.validation.phoneRequired),
        is_active: yup.boolean().default(true),
        address: yup.string().required(t.team.validation.addressRequired),
        role: yup.string().oneOf(['OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER']).optional(),
      }),
    [t]
  );

  const mainForm = useForm<API.CabinetMemberUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.CabinetMemberUpdateForm>
  });

  const show = (member: API.CabinetMember) => {
    setInstance(member);
    mainForm.reset(member);
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

  const handleSubmit = async (data: API.CabinetMemberUpdateForm) => {
    if (!instance) return;
    setIsLoading(true);
    try {
      const routeId = getCabinetMemberRouteId(instance);
      const roleChanged = data.role != null && data.role !== instance.role;

      const profileRes = await apiUpdateCabinetMember({
        id: routeId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        is_active: data.is_active,
      });

      let merged = { ...instance, ...profileRes.data, id: instance.id } as API.CabinetMember;

      if (roleChanged && data.role) {
        const roleRes = await apiUpdateCabinetMemberRole({ id: routeId, role: data.role });
        merged = { ...merged, ...roleRes.data, id: instance.id } as API.CabinetMember;
      }

      onSuccess?.(merged);
      hide();
    } catch (err) {
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        Object.keys(remoteValidation).forEach((key) => {
          mainForm.setError(key as keyof API.CabinetMemberUpdateForm, { message: remoteValidation[key] });
        });
        const payload = err.response?.data as { error?: string; detail?: string } | undefined;
        const msg = payload?.error ?? payload?.detail;
        if (typeof msg === 'string' && msg && Object.keys(remoteValidation).length === 0) {
          mainForm.setError('role', { message: msg });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-br from-[#5b3d9e] via-[#4f46e5] to-[#0d9488] overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" />

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/30 hover:bg-black/40 backdrop-blur text-white border border-white/30 shadow-sm"
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
                  {t.team.modal.updateTitle}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {t.team.modal.updateDescription}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-8">
          <div className="space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#64499D] dark:text-[#E9E0FF]" />
              {t.team.modal.personalInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium  items-center gap-1">
                  <span>{t.team.modal.firstName} </span>
                  <Input className="h-10 rounded-lg" {...mainForm.register('first_name')} />
                  {
                    mainForm.formState.errors.first_name && (
                      <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.first_name.message}</p>
                    )
                  }
                </label>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium  items-center gap-1">
                  <span>{t.team.modal.lastName} </span>
                  <Input className="h-10 rounded-lg" {...mainForm.register('last_name')} />
                  {
                    mainForm.formState.errors.last_name && (
                      <p className="text-red-500 text-xs p-1">{mainForm.formState.errors.last_name.message}</p>
                    )
                  }
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#64499D] dark:text-[#E9E0FF]" />
              {t.team.modal.contactInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="">
                <label className="text-sm font-medium  flex items-center gap-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span >{t.team.modal.email} </span>

                </label>

                <Input className="h-10 rounded-lg" {...mainForm.register('email')} />
                {
                  mainForm.formState.errors.email && (
                    <p className="text-red-500 text-xs p-1">{mainForm.formState.errors.email.message}</p>
                  )
                }

              </div>
              <div className="">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{t.team.modal.phoneNumber} </span>

                </label>
                <PhoneInput
                  className="h-10 rounded-lg"
                  value={mainForm.watch('phone')}
                  onChange={(value) => mainForm.setValue('phone', value)}
                />
                {
                  mainForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs p-1">{mainForm.formState.errors.phone.message}</p>
                  )
                }

              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-[#64499D] dark:text-[#E9E0FF]" />
              {t.team.modal.otherInfo}
            </div>

            <div>
              <label className="text-sm flex font-medium">
                <MapPin className="w-4 h-4 text-gray-400 mb-1 mr-1" />
                <span> {t.team.modal.addressLabel} </span>
              </label>
            <Input className="h-10 rounded-lg" {...mainForm.register('address')} />
            {
              mainForm.formState.errors.address && (
                <p className="text-red-500 text-xs p-1">{mainForm.formState.errors.address.message}</p>
              )
            }
                     </div>
          </div>
          <div className="space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#64499D] dark:text-[#E9E0FF]" />
              {t.team.modal.roleAccess}
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1 mb-2">
                <span>{t.team.modal.role}</span>
              </label>
              <Select
                value={mainForm.watch('role') || instance?.role || 'VIEWER'}
                onValueChange={(value) => mainForm.setValue('role', value as API.Role)}
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder={t.team.modal.selectRole} />
                </SelectTrigger>
                <SelectContent>
                  {(['OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER'] as API.Role[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {t.team.roles[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mainForm.formState.errors.role && (
                <p className="text-red-500 text-xs mt-1">{mainForm.formState.errors.role.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={mainForm.watch('is_active')}
              onCheckedChange={(checked) => mainForm.setValue('is_active', checked as boolean)}
            />
            <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t.team.modal.isActive}
            </label>
          </div>
          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="bg-[#64499D] hover:bg-[#5a3f8a] min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.team.modal.updating}
                </>
              ) : (
                t.team.modal.update
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CabinetMemberUpdateModal.displayName = 'CabinetMemberUpdateModal';

export default CabinetMemberUpdateModal;
