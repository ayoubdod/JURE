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

export function NotificationPreferences({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { preferences, setPreferences } = useNotifications();
  const { authorized: canFinance } = useFinanceAccess();
  const [local, setLocal] = useState<NotificationPrefs>(preferences);

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
          <DialogTitle>Préférences de notifications</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PrefRow
            id="tasks"
            label="Tâches et rappels"
            checked={local.tasks}
            onCheckedChange={(v) => update('tasks', v)}
          />
          <PrefRow
            id="cases"
            label="Dossiers"
            checked={local.cases}
            onCheckedChange={(v) => update('cases', v)}
          />
          <PrefRow
            id="appointments"
            label="Rendez-vous"
            checked={local.appointments}
            onCheckedChange={(v) => update('appointments', v)}
          />
          <PrefRow
            id="messages"
            label="Messages et appels"
            checked={local.messages}
            onCheckedChange={(v) => update('messages', v)}
          />
          {canFinance ? (
            <PrefRow
              id="finance"
              label="Finance"
              checked={local.finance}
              onCheckedChange={(v) => update('finance', v)}
            />
          ) : null}
          <PrefRow
            id="team"
            label="Équipe et profil"
            checked={local.team}
            onCheckedChange={(v) => update('team', v)}
          />
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700" />
          <PrefRow
            id="email"
            label="Notifications par email"
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
