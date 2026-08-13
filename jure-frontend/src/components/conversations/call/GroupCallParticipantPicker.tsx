import React, { useMemo, useState } from 'react';
import { Phone, Search, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UserAvatar from '@/components/common/UserAvatar';
import type { CallRemoteUser } from '@/stores/callSessionStore';
import { cn } from '@/lib/utils';

export type GroupCallKind = 'voice' | 'video';

interface GroupCallParticipantPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: GroupCallKind;
  participants: CallRemoteUser[];
  title: string;
  description: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onSelect: (user: CallRemoteUser) => void;
}

export function GroupCallParticipantPicker({
  open,
  onOpenChange,
  kind,
  participants,
  title,
  description,
  searchPlaceholder,
  emptyLabel,
  onSelect,
}: GroupCallParticipantPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => {
      const hay = `${p.name} ${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [participants, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[400px] gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-1 border-b border-slate-100 px-4 py-3.5 text-left dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            {kind === 'video' ? (
              <Video className="h-4 w-4 text-indigo-600" aria-hidden />
            ) : (
              <Phone className="h-4 w-4 text-indigo-600" aria-hidden />
            )}
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">{description}</DialogDescription>
        </DialogHeader>

        {participants.length > 4 ? (
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-950"
              />
            </div>
          </div>
        ) : null}

        <div className="max-h-[min(360px,55dvh)] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQuery('');
                  onOpenChange(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  'hover:bg-slate-50 dark:hover:bg-slate-900/50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400',
                  'dark:hover:bg-slate-900/70 dark:focus-visible:bg-slate-900/70'
                )}
              >
                <UserAvatar
                  image={p.avatar ?? undefined}
                  firstName={p.firstName}
                  lastName={p.lastName}
                  size="md"
                  className="h-9 w-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{p.name}</p>
                </div>
                {kind === 'video' ? (
                  <Video className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                ) : (
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
