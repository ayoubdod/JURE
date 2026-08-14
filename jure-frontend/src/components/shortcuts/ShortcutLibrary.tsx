import { useMemo, useState } from 'react';
import { useAppTranslation } from '@/i18n';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { SHORTCUT_CATALOG, type ShortcutGroup } from '@/shortcuts/catalog';
import { KbdSequence } from './Kbd';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ShortcutLibraryProps = {
  searchPlaceholder?: string;
  emptyLabel?: string;
  searchable?: boolean;
  className?: string;
};

export default function ShortcutLibrary({
  searchPlaceholder,
  emptyLabel,
  searchable = false,
  className,
}: ShortcutLibraryProps) {
  const { t } = useAppTranslation();
  const s = t.shortcuts;
  const { mod } = useShortcuts();
  const { authorized: financeAuthorized } = useFinanceAccess();
  const [query, setQuery] = useState('');

  const labelOf = (id: string) =>
    (s.commands as Record<string, string>)[id] ?? id;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order: { key: ShortcutGroup; heading: string }[] = [
      { key: 'general', heading: s.groups.general },
      { key: 'navigation', heading: s.groups.navigation },
      { key: 'create', heading: s.groups.create },
      { key: 'page', heading: s.groups.page },
    ];
    return order
      .map((g) => ({
        ...g,
        items: SHORTCUT_CATALOG.filter((item) => {
          if (item.group !== g.key) return false;
          if (!item.keys.length) return false;
          if (item.finance && !financeAuthorized) return false;
          if (item.juria && !JURIA_ENABLED) return false;
          if (q && !labelOf(item.id).toLowerCase().includes(q) && !item.keys.join(' ').toLowerCase().includes(q)) {
            return false;
          }
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [financeAuthorized, query, s.groups, t.shortcuts.commands]);

  return (
    <div className={cn('space-y-5', className)}>
      {searchable ? (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9"
        />
      ) : null}
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.heading}
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-background px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-foreground">{labelOf(item.id)}</span>
                  <KbdSequence keys={item.keys} mod={mod} className="shrink-0" />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
