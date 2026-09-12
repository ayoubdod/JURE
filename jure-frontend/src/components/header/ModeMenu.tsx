'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Minus, Circle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppTranslation, interpolate } from '@/i18n';
import useUserStore from '@/stores/userStore';
import { apiUpdateUser } from '@/services/auth/api';
import { useToast } from '@/hooks/use-toast';
import {
  type ModeDurationId,
  type PresenceMode,
  computeModeUntil,
  effectivePresenceMode,
  formatModeUntilLabel,
  normalizePresenceMode,
} from '@/lib/presenceMode';

type ModeMenuProps = {
  variant?: 'profile' | 'inline';
  className?: string;
  onChanged?: () => void;
};

const MODE_ORDER: PresenceMode[] = ['AVAILABLE', 'DND', 'AWAY', 'INVISIBLE'];

function ModeDot({ mode, className }: { mode: PresenceMode; className?: string }) {
  if (mode === 'DND') {
    return (
      <span
        className={cn(
          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400',
          className
        )}
        aria-hidden
      >
        <Minus className="h-2.5 w-2.5 stroke-[3]" />
      </span>
    );
  }
  if (mode === 'AWAY') {
    return (
      <span
        className={cn(
          'inline-flex h-3.5 w-3.5 items-center justify-center text-amber-600 dark:text-amber-400',
          className
        )}
        aria-hidden
      >
        <Circle className="h-3 w-3" />
      </span>
    );
  }
  if (mode === 'INVISIBLE') {
    return (
      <span
        className={cn('inline-flex h-3.5 w-3.5 items-center justify-center text-slate-400', className)}
        aria-hidden
      >
        <Circle className="h-3 w-3 opacity-40" />
      </span>
    );
  }
  return (
    <span className={cn('inline-block h-2.5 w-2.5 rounded-full bg-emerald-500', className)} aria-hidden />
  );
}

export default function ModeMenu({ variant = 'profile', className, onChanged }: ModeMenuProps) {
  const { t, lang } = useAppTranslation();
  const { toast } = useToast();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDnd, setPendingDnd] = useState(false);
  const [durationId, setDurationId] = useState<ModeDurationId>('1h');

  const mode = effectivePresenceMode(user?.mode, user?.mode_until);
  const untilLabel = formatModeUntilLabel(
    mode !== 'AVAILABLE' ? user?.mode_until : null,
    lang,
    t.mode.until,
    interpolate
  );

  const labels = t.mode.options;

  useEffect(() => {
    if (!user?.mode_until) return;
    const until = new Date(user.mode_until).getTime();
    if (Number.isNaN(until)) return;
    const delay = until - Date.now();
    if (delay <= 0) {
      if (normalizePresenceMode(user.mode) !== 'AVAILABLE') {
        setUser({ ...user, mode: 'AVAILABLE', mode_until: null });
      }
      return;
    }
    const id = window.setTimeout(() => {
      const current = useUserStore.getState().user;
      if (!current) return;
      setUser({ ...current, mode: 'AVAILABLE', mode_until: null });
    }, delay);
    return () => window.clearTimeout(id);
  }, [user?.mode_until, user?.mode, setUser, user]);

  const applyMode = async (next: PresenceMode, until: string | null) => {
    if (!user) return;
    setSaving(true);
    const prev = { mode: user.mode, mode_until: user.mode_until };
    setUser({ ...user, mode: next, mode_until: until });
    try {
      const res = await apiUpdateUser({ mode: next, mode_until: until });
      const data = res.data as API.User;
      setUser({
        ...user,
        ...data,
        mode: normalizePresenceMode(data.mode ?? next),
        mode_until: data.mode_until ?? until,
      });
      setOpen(false);
      setPendingDnd(false);
      onChanged?.();
    } catch {
      setUser({ ...user, mode: prev.mode, mode_until: prev.mode_until });
      toast({ title: t.mode.updateFailed, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onSelectMode = (next: PresenceMode) => {
    if (next === 'DND') {
      setPendingDnd(true);
      return;
    }
    void applyMode(next, null);
  };

  const activateDnd = () => {
    void applyMode('DND', computeModeUntil(durationId));
  };

  const triggerClass = cn(
    'group flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-start transition-colors',
    'hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
    'dark:hover:bg-slate-800/60',
    variant === 'inline' && 'px-2',
    className
  );

  const triggerInner = (
    <>
      <ModeDot mode={mode} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
          {labels[mode].label}
        </span>
        {untilLabel ? (
          <span className="block truncate text-[10.5px] text-slate-500 dark:text-slate-400">{untilLabel}</span>
        ) : null}
      </span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </>
  );

  const panel = (
    <div className="space-y-1">
      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t.mode.title}</p>
      {MODE_ORDER.map((m) => {
        const selected = !pendingDnd && mode === m;
        const opt = labels[m];
        return (
          <button
            key={m}
            type="button"
            aria-pressed={selected}
            disabled={saving}
            onClick={() => onSelectMode(m)}
            className={cn(
              'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
              selected
                ? 'bg-[#64499D]/10 text-slate-900 dark:bg-[#64499D]/20 dark:text-slate-50'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70',
              pendingDnd && m === 'DND' && 'bg-[#64499D]/10'
            )}
          >
            <ModeDot mode={m} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-slate-900 dark:text-slate-100">{opt.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {opt.description}
              </span>
            </span>
            {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#64499D]" /> : null}
          </button>
        );
      })}

      {pendingDnd ? (
        <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{t.mode.duration}</p>
          <div className="grid gap-1">
            {(
              [
                ['until_off', t.mode.durations.untilOff],
                ['30m', t.mode.durations.m30],
                ['1h', t.mode.durations.h1],
                ['2h', t.mode.durations.h2],
                ['today', t.mode.durations.today],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDurationId(id)}
                className={cn(
                  'min-h-10 rounded-lg px-2.5 py-1.5 text-start text-[12px] transition-colors sm:min-h-0',
                  durationId === id
                    ? 'bg-white font-semibold text-[#64499D] shadow-sm ring-1 ring-[#64499D]/25 dark:bg-slate-800'
                    : 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" className="h-9 flex-1" onClick={() => setPendingDnd(false)}>
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 bg-[#64499D] hover:bg-[#553d86]"
              disabled={saving}
              onClick={activateDnd}
            >
              {t.mode.activate}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setPendingDnd(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-label={t.mode.title}
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={saving}
        >
          {triggerInner}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          // Floating card (same family as profile / notifications) — not a full-screen sheet.
          'z-[310] max-h-[min(70dvh,520px)] overflow-y-auto rounded-2xl border border-slate-200 p-2',
          'shadow-[0_4px_6px_rgba(0,0,0,0.04),0_12px_40px_rgba(15,23,42,0.12)]',
          'dark:border-slate-700 dark:bg-slate-950',
          variant === 'inline'
            ? 'w-[min(100vw-1.5rem,400px)]'
            : 'w-[min(100vw-1.5rem,14rem)]'
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

export { ModeDot };
