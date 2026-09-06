import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import UserAvatar from '@/components/common/UserAvatar';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import { CREATE_SELECT_CLASS } from '@/components/forms/CreateFormShell';
import useJuriaStore from '@/stores/juriaStore';
import { apiJuriaInviteMember, apiJuriaRemoveMember, apiJuriaUpdateMemberRole } from '@/services/juria/api';
import type { JuriaProject, JuriaProjectRole } from '@/types/juria';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const INVITE_ROLES: JuriaProjectRole[] = ['EDITOR', 'REVIEWER', 'VIEWER'];
const ROLES: JuriaProjectRole[] = ['OWNER', 'EDITOR', 'REVIEWER', 'VIEWER'];

export function JuriaTeamPanel({ project }: { project: JuriaProject }) {
  const { t } = useAppTranslation();
  const { toast } = useToast();
  const tp = t.juria.workspace.teamPanel;
  const load = useJuriaStore((s) => s.loadProjectDetail);
  const members = project.members ?? [];
  const [inviteIds, setInviteIds] = useState<number[]>([]);
  const [inviteRole, setInviteRole] = useState<JuriaProjectRole>('EDITOR');
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const existingUserIds = useMemo(
    () => members.map((m) => m.user.id).filter((id) => Number.isFinite(id) && id > 0),
    [members]
  );

  const invite = async () => {
    if (!inviteIds.length || inviting) return;
    setInviting(true);
    try {
      await Promise.all(inviteIds.map((id) => apiJuriaInviteMember(project.id, id, inviteRole)));
      setInviteIds([]);
      await load(project.id);
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tp.invite}</p>
          <div className="mt-3">
            <TeamMemberMultiSelect
              value={inviteIds}
              onChange={(ids) => setInviteIds(ids)}
              excludeIds={existingUserIds}
              placeholder={tp.invitePlaceholder}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[10.5rem] flex-1">
              <p className="mb-1 text-[11px] font-medium text-slate-500">{tp.inviteRole}</p>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as JuriaProjectRole)}>
                <SelectTrigger className={CREATE_SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tp.roles[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-10 bg-[#64499D] px-4 hover:bg-[#4D3680]"
              disabled={!inviteIds.length || inviting}
              onClick={() => void invite()}
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : tp.invite}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {members.map((m) => {
            const isOwner = m.role === 'OWNER';
            const rowBusy = busyId === m.id;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <UserAvatar image={m.user.image} firstName={m.user.first_name} lastName={m.user.last_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {m.user.first_name} {m.user.last_name}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{m.user.email}</p>
                </div>
                <Select
                  value={m.role}
                  disabled={isOwner || rowBusy}
                  onValueChange={(v) => {
                    setBusyId(m.id);
                    void apiJuriaUpdateMemberRole(project.id, m.id, v)
                      .then(() => load(project.id))
                      .catch(() => toast({ title: t.common.error, variant: 'destructive' }))
                      .finally(() => setBusyId(null));
                  }}
                >
                  <SelectTrigger className={cn(CREATE_SELECT_CLASS, 'h-9 w-[8.5rem] shrink-0')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} disabled={r === 'OWNER' && !isOwner}>
                        {tp.roles[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isOwner ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 shrink-0 text-xs text-red-600 hover:text-red-700"
                    disabled={rowBusy}
                    onClick={() => {
                      setBusyId(m.id);
                      void apiJuriaRemoveMember(project.id, m.id)
                        .then(() => load(project.id))
                        .catch(() => toast({ title: t.common.error, variant: 'destructive' }))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    {t.juria.workspace.actions.remove}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
