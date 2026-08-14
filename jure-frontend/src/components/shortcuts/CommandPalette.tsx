import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  BookOpenCheck,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CheckSquare,
  Coins,
  Flag,
  Grid3X3,
  Headphones,
  Keyboard,
  LogOut,
  MessageSquare,
  Moon,
  PanelLeft,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  User,
  UserPlus,
  Users,
  Bell,
  FileText,
  UserCheck,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAppTranslation } from '@/i18n';
import { useShortcuts } from '@/context/ShortcutsContext';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { SHORTCUT_CATALOG, type CatalogItem } from '@/shortcuts/catalog';
import { KbdSequence } from './Kbd';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  commandPalette: Search,
  showHelp: Keyboard,
  toggleSidebar: PanelLeft,
  toggleTheme: Moon,
  searchRecords: Search,
  logout: LogOut,
  goDashboard: Grid3X3,
  goTeam: Users,
  goClients: UserCheck,
  goCases: Briefcase,
  goConsultation: Briefcase,
  goLitigation: Briefcase,
  goAdministrative: Briefcase,
  goLibrary: BookOpen,
  goCalendar: Calendar,
  goTasks: CheckSquare,
  goAppointment: CalendarClock,
  goChat: MessageSquare,
  goFinance: Coins,
  goJuria: Sparkles,
  goSettings: Settings,
  goNotifications: Bell,
  goAccount: Building2,
  goSupport: Headphones,
  goProfile: User,
  newClient: UserPlus,
  newCase: Briefcase,
  newTask: CheckSquare,
  newAppointment: CalendarClock,
  newMember: Users,
  newDocument: FileText,
  newChat: MessageSquare,
  conflictCheck: ShieldAlert,
  clauseLibrary: BookOpenCheck,
  closeMatter: Flag,
};

export default function CommandPalette() {
  const { t } = useAppTranslation();
  const s = t.shortcuts;
  const navigate = useNavigate();
  const {
    paletteOpen,
    setPaletteOpen,
    setHelpOpen,
    runAction,
    toggleSidebar,
    toggleTheme,
    mod,
  } = useShortcuts();
  const { authorized: financeAuthorized } = useFinanceAccess();

  const items = useMemo(
    () =>
      SHORTCUT_CATALOG.filter((item) => {
        if (item.docsOnly) return false;
        if (item.internal === 'palette') return false;
        if (item.finance && !financeAuthorized) return false;
        if (item.juria && !JURIA_ENABLED) return false;
        return true;
      }),
    [financeAuthorized],
  );

  const run = (item: CatalogItem) => {
    setPaletteOpen(false);
    if (item.kind === 'navigate' && item.path) {
      navigate(item.path);
      return;
    }
    if (item.kind === 'action' && item.action) {
      runAction(item.action);
      return;
    }
    if (item.internal === 'help') {
      setHelpOpen(true);
      return;
    }
    if (item.internal === 'sidebar') {
      toggleSidebar();
      return;
    }
    if (item.internal === 'theme') {
      toggleTheme();
    }
  };

  const groups: { key: 'general' | 'navigation' | 'create'; heading: string }[] = [
    { key: 'general', heading: s.groups.general },
    { key: 'navigation', heading: s.groups.navigation },
    { key: 'create', heading: s.groups.create },
  ];

  const labelOf = (id: string) =>
    (s.commands as Record<string, string>)[id] ?? id;

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder={s.palettePlaceholder} />
        <CommandList className="max-h-[min(52vh,420px)]">
        <CommandEmpty>{s.paletteEmpty}</CommandEmpty>
        {groups.map((group, gi) => {
          const groupItems = items.filter((i) => i.group === group.key);
          if (!groupItems.length) return null;
          return (
            <div key={group.key}>
              {gi > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group.heading}>
                {groupItems.map((item) => {
                  const Icon = ICONS[item.id] ?? Search;
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${labelOf(item.id)} ${item.id} ${item.path ?? ''}`}
                      onSelect={() => run(item)}
                    >
                      <Icon className="me-2 h-4 w-4 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{labelOf(item.id)}</span>
                      {item.keys.length > 0 ? (
                        <CommandShortcut className="flex items-center">
                          <KbdSequence keys={item.keys} mod={mod} />
                        </CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span>{s.paletteHint}</span>
        <KbdSequence keys={['?']} mod={mod} />
      </div>
    </CommandDialog>
  );
}
