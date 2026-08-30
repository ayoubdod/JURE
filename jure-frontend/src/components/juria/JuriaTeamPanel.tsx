import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/common/UserAvatar';
import useJuriaStore from '@/stores/juriaStore';
import { apiJuriaInviteMember, apiJuriaRemoveMember, apiJuriaUpdateMemberRole } from '@/services/juria/api';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import type { JuriaProject, JuriaProjectRole } from '@/types/juria';

const ROLES: JuriaProjectRole[] = ['OWNER', 'EDITOR', 'REVIEWER', 'VIEWER'];

export function JuriaTeamPanel({ project }: { project: JuriaProject }) {
  const load = useJuriaStore((s) => s.loadProjectDetail);
  const members = project.members ?? [];
  const [directory, setDirectory] = useState<API.CabinetMember[]>([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    void apiGetCabinetMembers()
      .then((r) => setDirectory(r.data ?? []))
      .catch(() => setDirectory([]));
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex gap-2">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Inviter un membre du cabinet…</option>
            {directory.map((m) => {
              const uid = typeof m.user === 'object' && m.user ? String((m.user as API.User).id) : String(m.id);
              return (
                <option key={m.id} value={uid}>
                  {m.first_name} {m.last_name}
                </option>
              );
            })}
          </select>
          <Button
            size="sm"
            className="bg-[#64499D] hover:bg-[#4D3680]"
            disabled={!userId}
            onClick={() => {
              void apiJuriaInviteMember(project.id, Number(userId), 'EDITOR').then(() => load(project.id));
              setUserId('');
            }}
          >
            Inviter
          </Button>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <UserAvatar image={m.user.image} firstName={m.user.first_name} lastName={m.user.last_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {m.user.first_name} {m.user.last_name}
                </p>
                <p className="text-[11px] text-slate-400">{m.user.email}</p>
              </div>
              <select
                value={m.role}
                disabled={m.role === 'OWNER'}
                onChange={(e) => {
                  void apiJuriaUpdateMemberRole(project.id, m.id, e.target.value).then(() => load(project.id));
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-1 text-[11px] dark:border-slate-700 dark:bg-slate-900"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {m.role !== 'OWNER' && (
                <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600" onClick={() => void apiJuriaRemoveMember(project.id, m.id).then(() => load(project.id))}>
                  Retirer
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
