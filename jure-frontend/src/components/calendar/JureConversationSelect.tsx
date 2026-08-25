'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiListConversations } from '@/services/conversations/api';
import { cn } from '@/lib/utils';
import { CREATE_INPUT_CLASS } from '@/components/forms/CreateFormShell';
import { useAppTranslation } from '@/i18n';

export type ConversationOption = {
  id: number;
  title: string;
  display_name?: string;
  type: 'direct' | 'group';
};

function labelOf(c: ConversationOption) {
  return (c.display_name || c.title || '').trim() || `Conversation #${c.id}`;
}

export default function JureConversationSelect({
  id,
  value,
  onChange,
  disabled,
  error,
}: {
  id?: string;
  value?: number | null;
  onChange: (id: number | null, option: ConversationOption | null) => void;
  disabled?: boolean;
  error?: string;
}) {
  const { t } = useAppTranslation();
  const c = t.calendar.conversationPicker;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ConversationOption[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiListConversations()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setItems(
          list
            .filter((conv) => conv.type === 'group' && !conv.is_temporary)
            .map((conv) => ({
              id: conv.id,
              title: conv.title || '',
              display_name: conv.display_name,
              type: conv.type,
            }))
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(() => items.find((i) => i.id === value) || null, [items, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => labelOf(i).toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          CREATE_INPUT_CLASS,
          'flex w-full items-center gap-2 px-3 text-start'
        )}
      >
        <Video className="h-4 w-4 shrink-0 text-[#64499D]" />
        <span className={cn('truncate flex-1', !selected && 'text-slate-400')}>
          {selected ? labelOf(selected) : c.placeholder}
        </span>
      </button>

      {selected ? (
        <p className="text-[12px] text-slate-500">
          {c.selected}: <span className="font-medium text-slate-700 dark:text-zinc-200">{labelOf(selected)}</span>
        </p>
      ) : null}

      {open ? (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="relative border-b border-slate-200 dark:border-zinc-800 p-2">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={c.searchPlaceholder}
              className={cn(CREATE_INPUT_CLASS, 'ps-9')}
              disabled={disabled}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.common.loading}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-slate-500">{c.empty}</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(item.id, item);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-start text-[13px] hover:bg-slate-50 dark:hover:bg-zinc-900/60',
                    value === item.id && 'bg-[#F7F4FF] dark:bg-[#64499D]/15 font-medium'
                  )}
                >
                  <Video className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{labelOf(item)}</span>
                </button>
              ))
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
