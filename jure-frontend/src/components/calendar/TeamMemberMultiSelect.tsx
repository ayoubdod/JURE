'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { apiGetAllCabinetMembers } from '@/services/cabinet-member/api';
import { cn } from '@/lib/utils';
import { CREATE_INPUT_CLASS } from '@/components/forms/CreateFormShell';
import { useAppTranslation } from '@/i18n';

export type TeamMemberOption = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  image?: string;
};

function memberUserId(member: API.CabinetMember): number {
  const u = member.user;
  if (typeof u === 'object' && u != null && 'id' in u) return Number((u as API.User).id);
  if (typeof u === 'number') return u;
  return Number(member.id);
}

function toOption(member: API.CabinetMember): TeamMemberOption {
  return {
    id: memberUserId(member),
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email,
    image: getPersonImage(member),
  };
}

function displayName(m: TeamMemberOption) {
  return `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email;
}

function asMemberList(data: unknown): API.CabinetMember[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: API.CabinetMember[] }).results;
  }
  return [];
}

export default function TeamMemberMultiSelect({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  error,
  excludeIds,
}: {
  id?: string;
  value: number[];
  onChange: (ids: number[], selected: TeamMemberOption[]) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  excludeIds?: number[];
}) {
  const { t, tf } = useAppTranslation();
  const m = t.calendar.teamPicker;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMemberOption[]>([]);

  const excluded = useMemo(
    () => new Set((excludeIds ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0)),
    [excludeIds]
  );

  const selectedIds = useMemo(
    () =>
      value
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0 && !excluded.has(n)),
    [value, excluded]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGetAllCabinetMembers({ expand: 'user' })
      .then((res) => {
        if (!alive) return;
        const opts = asMemberList(res.data).map(toOption).filter((o) => o.id > 0);
        const seen = new Set<number>();
        setMembers(opts.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true))));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds]
  );

  const filtered = useMemo(() => {
    const available = members.filter((member) => !excluded.has(member.id));
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (member) =>
        displayName(member).toLowerCase().includes(q) || member.email.toLowerCase().includes(q)
    );
  }, [members, search, excluded]);

  const emit = (nextIds: number[]) => {
    const unique = Array.from(new Set(nextIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)));
    onChange(
      unique,
      members.filter((member) => unique.includes(member.id))
    );
  };

  const toggle = (memberId: number) => {
    if (disabled) return;
    emit(
      selectedIds.includes(memberId)
        ? selectedIds.filter((id) => id !== memberId)
        : [...selectedIds, memberId]
    );
  };

  const remove = (memberId: number) => {
    if (disabled) return;
    emit(selectedIds.filter((id) => id !== memberId));
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 dark:bg-zinc-950',
          error
            ? 'border-red-300 dark:border-red-800'
            : 'border-slate-200 dark:border-zinc-700'
        )}
      >
        {selected.length === 0 ? (
          <button
            type="button"
            id={id}
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className="px-1 text-[13px] text-slate-400"
          >
            {placeholder || m.searchPlaceholder}
          </button>
        ) : (
          selected.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#F7F4FF] px-1.5 py-0.5 text-[12px] text-[#4D3680] ring-1 ring-[#64499D]/20 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]"
            >
              <UserAvatar
                size="xs"
                image={member.image}
                firstName={member.first_name}
                lastName={member.last_name}
                email={member.email}
              />
              <span className="max-w-[120px] truncate">{displayName(member)}</span>
              <button
                type="button"
                aria-label={m.remove}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(member.id);
                }}
                className="rounded-full p-0.5 hover:bg-white/70 dark:hover:bg-zinc-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <button
          type="button"
          id={selected.length > 0 ? id : undefined}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="ms-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64499D] hover:bg-[#F7F4FF] dark:hover:bg-[#64499D]/20"
          aria-expanded={open}
          aria-label={m.open}
        >
          +
        </button>
      </div>

      {selected.length > 1 ? (
        <p className="text-[12px] text-slate-500 dark:text-zinc-400">
          {tf(m.assignedCount, { count: selected.length })}
        </p>
      ) : null}

      {open ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
          <div className="relative border-b border-slate-200 p-2 dark:border-zinc-800">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={m.searchPlaceholder}
              className={cn(CREATE_INPUT_CLASS, 'ps-9')}
              disabled={disabled}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.common.loading}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-slate-500">{m.empty}</p>
            ) : (
              filtered.map((member) => {
                const checked = selectedIds.includes(member.id);
                const optionId = `${id || 'assignee'}-${member.id}`;
                return (
                  <label
                    key={member.id}
                    htmlFor={optionId}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-start hover:bg-slate-50 dark:hover:bg-zinc-900/60',
                      checked && 'bg-[#F7F4FF]/70 dark:bg-[#64499D]/10',
                      disabled && 'pointer-events-none opacity-60'
                    )}
                  >
                    <Checkbox
                      id={optionId}
                      checked={checked}
                      onCheckedChange={() => toggle(member.id)}
                      disabled={disabled}
                      className="data-[state=checked]:border-[#64499D] data-[state=checked]:bg-[#64499D]"
                    />
                    <UserAvatar
                      size="sm"
                      image={member.image}
                      firstName={member.first_name}
                      lastName={member.last_name}
                      email={member.email}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                        {displayName(member)}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">{member.email}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
