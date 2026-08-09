import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotifications } from '@/context/NotificationContext';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import type { NotificationPrefs } from '@/types/notification';
import { useAppTranslation } from '@/i18n';

export function NotificationPreferences({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useAppTranslation();
  const { preferences, setPreferences } = useNotifications();
  const { authorized: canFinance } = useFinanceAccess();
  const [local, setLocal] = useState<NotificationPrefs>(preferences);
  const p = t.notifications.preferences;

  useEffect(() => {
    if (open) setLocal(preferences);
  }, [open, preferences]);

  const update = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    setPreferences(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{p.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PrefRow
            id="tasks"
            label={p.tasks}
            checked={local.tasks}
            onCheckedChange={(v) => update('tasks', v)}
          />
          <PrefRow
            id="cases"
            label={p.cases}
            checked={local.cases}
            onCheckedChange={(v) => update('cases', v)}
          />
          <PrefRow
            id="appointments"
            label={p.appointments}
            checked={local.appointments}
            onCheckedChange={(v) => update('appointments', v)}
          />
          <PrefRow
            id="messages"
            label={p.messages}
            checked={local.messages}
            onCheckedChange={(v) => update('messages', v)}
          />
          {canFinance ? (
            <PrefRow
              id="finance"
              label={p.finance}
              checked={local.finance}
              onCheckedChange={(v) => update('finance', v)}
            />
          ) : null}
          <PrefRow
            id="team"
            label={p.team}
            checked={local.team}
            onCheckedChange={(v) => update('team', v)}
          />
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700" />
          <PrefRow
            id="email"
            label={p.email}
            checked={local.email}
            onCheckedChange={(v) => update('email', v)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrefRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm font-normal leading-snug">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
