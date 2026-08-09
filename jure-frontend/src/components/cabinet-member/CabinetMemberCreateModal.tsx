'use client'
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, User, X } from 'lucide-react';
import { apiCreateCabinetMember } from '@/services/cabinet-member/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { PhoneInput } from '../ui/phone-input';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Label } from '@/components/ui/label';
import { useAppTranslation } from '@/i18n';

const ALL_ROLES: API.Role[] = ['VIEWER', 'ASSISTANT', 'LAWYER', 'MANAGER', 'ADMIN', 'OWNER'];

const roleToggleClass: Record<API.Role, string> = {
  VIEWER:
    'data-[state=on]:bg-slate-500 data-[state=on]:text-white data-[state=on]:border-slate-500 data-[state=on]:shadow-sm',
  ASSISTANT:
    'data-[state=on]:bg-teal-600 data-[state=on]:text-white data-[state=on]:border-teal-600 data-[state=on]:shadow-sm',
  LAWYER:
    'data-[state=on]:bg-indigo-600 data-[state=on]:text-white data-[state=on]:border-indigo-600 data-[state=on]:shadow-sm',
  MANAGER:
    'data-[state=on]:bg-purple-600 data-[state=on]:text-white data-[state=on]:border-purple-600 data-[state=on]:shadow-sm',
  ADMIN:
    'data-[state=on]:bg-slate-600 data-[state=on]:text-white data-[state=on]:border-slate-600 data-[state=on]:shadow-sm',
  OWNER:
    'data-[state=on]:bg-amber-600 data-[state=on]:text-white data-[state=on]:border-amber-600 data-[state=on]:shadow-sm',
};

export interface CabinetMemberCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface CabinetMemberCreateModalProps {
  onSuccess?: (_: API.CabinetMember) => void;
}

const CabinetMemberCreateModal = forwardRef<CabinetMemberCreateModalRef, CabinetMemberCreateModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
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
        send_invitation_email: yup.boolean().default(true),
      }),
    [t]
  );

  const mainForm = useForm<API.CabinetMemberCreateForm>({
    resolver: yupResolver(schema) as Resolver<API.CabinetMemberCreateForm>,
    defaultValues: {
      role: 'VIEWER',
      send_invitation_email: true,
    },
  });

  const show = () => {
    mainForm.reset({
      role: 'VIEWER',
      send_invitation_email: true,
    });
    setIsOpen(true);
  };

  const hide = () => {
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.CabinetMemberCreateForm) => {
    setIsLoading(true);
    await apiCreateCabinetMember(data)
      .then((res) => {
        onSuccess?.(res.data);
        hide();
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.CabinetMemberCreateForm, { message: remoteValidation[key] });
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const currentRole = mainForm.watch('role') || 'VIEWER';
  const displayRole = ALL_ROLES.includes(currentRole) ? currentRole : 'VIEWER';

  const sectionLabel = (text: string) => (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
        {text}
      </p>
      <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen} modal>
      <DialogContent
        className={cn(
          "sm:max-w-2xl max-h-[85vh] h-[min(640px,85vh)] overflow-hidden p-0 [&>button]:hidden",
          "border border-slate-200 dark:border-zinc-800",
          "bg-white dark:bg-zinc-950"
        )}
      >
        <div className="relative h-[100px] shrink-0 overflow-hidden bg-gradient-to-br from-[#5B3FA8] via-[#6D54B5] to-[#4B7BA8]">
          <div className="absolute inset-0 opacity-[0.12]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full bg-white/15 text-white hover:bg-white/25 border border-white/30"
            onClick={hide}
            disabled={isLoading}
            aria-label={t.common.close}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="relative flex items-center gap-3 px-6 pt-6 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                {t.team.modal.createTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/90 mt-1">
                {t.team.modal.createDescription}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form
          onSubmit={mainForm.handleSubmit(handleSubmit)}
          className="flex flex-col min-h-0 flex-1 overflow-y-auto"
        >
          <div className="px-6 py-5 space-y-6 flex-1">
            <div>
{sectionLabel(t.team.modal.personal)}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">{t.team.modal.firstName}</label>
                  <Input
                    {...mainForm.register('first_name')}
                    placeholder={t.team.modal.firstNamePlaceholder}
                    className="h-10 rounded-lg border border-slate-200 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-[#6D54B5] focus-visible:ring-offset-0"
                  />
                  {mainForm.formState.errors.first_name && (
                    <p className="text-red-500 text-xs">{mainForm.formState.errors.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">{t.team.modal.lastName}</label>
                  <Input
                    {...mainForm.register('last_name')}
                    placeholder={t.team.modal.lastNamePlaceholder}
                    className="h-10 rounded-lg border border-slate-200 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-[#6D54B5] focus-visible:ring-offset-0"
                  />
                  {mainForm.formState.errors.last_name && (
                    <p className="text-red-500 text-xs">{mainForm.formState.errors.last_name.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
{sectionLabel(t.team.modal.contact)}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">{t.team.modal.email}</label>
                  <Input
                    {...mainForm.register('email')}
                    placeholder={t.team.modal.emailPlaceholder}
                    type="email"
                    className="h-10 rounded-lg border border-slate-200 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-[#6D54B5] focus-visible:ring-offset-0"
                  />
                  {mainForm.formState.errors.email && (
                    <p className="text-red-500 text-xs">{mainForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">{t.team.modal.phone}</label>
                  <PhoneInput
                    value={mainForm.watch('phone')}
                    onChange={(value) => mainForm.setValue('phone', value)}
                    className="[&_button]:h-10 [&_button]:rounded-l-lg [&_input]:h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:dark:border-zinc-700 [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[#6D54B5] [&_input]:focus-visible:ring-offset-0"
                  />
                  {mainForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs">{mainForm.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
{sectionLabel(t.team.modal.address)}
              <div className="space-y-1.5">
                <Input
                  {...mainForm.register('address')}
                  placeholder={t.team.modal.addressPlaceholder}
                  className="h-10 rounded-lg border border-slate-200 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-[#6D54B5] focus-visible:ring-offset-0"
                />
                {mainForm.formState.errors.address && (
                  <p className="text-red-500 text-xs">{mainForm.formState.errors.address.message}</p>
                )}
              </div>
            </div>

            <div>
{sectionLabel(t.team.modal.access)}
              <ToggleGroup
                type="single"
                value={displayRole}
                onValueChange={(v) => v && mainForm.setValue('role', v as API.Role)}
                className="inline-flex flex-wrap gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/80 p-1"
              >
                {ALL_ROLES.map((role) => (
                  <ToggleGroupItem
                    key={role}
                    value={role}
                    className={cn(
                      "rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors",
                      "bg-white/80 dark:bg-zinc-950/50 text-slate-600 dark:text-zinc-400",
                      "hover:bg-slate-100 dark:hover:bg-zinc-800",
                      roleToggleClass[role]
                    )}
                  >
                    {t.team.roles[role]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p
                key={displayRole}
                className="mt-3 text-[12px] italic text-slate-500 dark:text-zinc-400 animate-in fade-in duration-200"
              >
{t.team.roleDescriptions[displayRole]}
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/50 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="is_active_switch" className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                  {t.team.modal.activeMember}
                </Label>
                <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                  {t.team.modal.activeMemberHint}
                </p>
              </div>
              <Switch
                id="is_active_switch"
                checked={mainForm.watch('is_active')}
                onCheckedChange={(checked) => mainForm.setValue('is_active', checked)}
                className="data-[state=checked]:bg-[#6D54B5]"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-4 border-t border-slate-200 dark:border-zinc-800 px-6 py-4 sm:flex-col">
            <div className="flex w-full flex-col gap-2 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="send_invite_switch" className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                  {t.team.modal.sendInvite}
                </Label>
                <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                  {t.team.modal.sendInviteHint}
                </p>
              </div>
              <Switch
                id="send_invite_switch"
                checked={mainForm.watch('send_invitation_email')}
                onCheckedChange={(checked) => mainForm.setValue('send_invitation_email', checked)}
                className="data-[state=checked]:bg-[#6D54B5] shrink-0"
              />
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={hide}
                disabled={isLoading}
                className="border-slate-200 dark:border-zinc-700"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px] bg-[#6D54B5] hover:bg-[#5a4699] text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.team.modal.creating}
                  </>
                ) : (
                  t.team.modal.create
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CabinetMemberCreateModal.displayName = 'CabinetMemberCreateModal';

export default CabinetMemberCreateModal;
