import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Grid3X3,
  Users,
  Briefcase,
  UserCheck,
  CheckSquare,
  MessageSquare,
  Settings,
  Headphones,
  LogOut,
  ChevronDown,
  Calendar,
  Building2,
  Coins,
  User,
  CalendarClock,
  BookOpen,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import LogoutModal, { LogoutModalRef } from './layout/LogoutModal';
import useChatStore from '@/stores/chatStore';
import { useAppTranslation } from '@/i18n';
import LangSwitcher from '@/components/common/LangSwitcher';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { useMobileNav } from '@/context/MobileNavContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { NAV_SHORTCUT_BY_PATH } from '@/shortcuts/catalog';
import { HintKbd } from '@/components/shortcuts/Kbd';
import { useShortcutAction } from '@/context/ShortcutsContext';
import { JURIA_ENABLED } from '@/config/features';
import JureLogo from '@/components/common/JureLogo';

/** Collapsed desktop rail width. Keep in sync with DashboardLayout `--sidebar-rail-width`. */
export const SIDEBAR_RAIL_WIDTH = '3rem'; // 48px
/** Expanded desktop sidebar width. */
export const SIDEBAR_EXPANDED_WIDTH = '11rem'; // 176px
export const SIDEBAR_EXPANDED_STORAGE_KEY = 'jure.sidebar.expanded';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

type NavChild = {
  id: string;
  label: string;
  path: string;
  icon?: React.ElementType;
  requiresFinance?: boolean;
};

type NavItem = {
  id: string;
  icon?: React.ElementType;
  imgSrc?: string;
  label: string;
  /** When set, clicking the row navigates here. Omitted for menu-only groups (Office). */
  path?: string;
  badge?: number | string | null;
  children?: NavChild[];
};

const mobileSecondaryActionClass =
  'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground dark:text-white transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:text-white';

const railIconButtonClass = (active: boolean, expanded: boolean) =>
  cn(
    'flex h-8 w-full items-center rounded-lg transition-colors duration-200',
    expanded ? 'justify-start gap-2 px-2.5' : 'justify-center px-0',
    active
      ? 'bg-jure-600 dark:bg-jure-500 text-white'
      : 'text-muted-foreground dark:text-white hover:text-jure-600 dark:hover:text-white hover:bg-jure-50 dark:hover:bg-jure-600/10',
  );

function NavGlyph({ item, size = 16 }: { item: Pick<NavItem, 'icon' | 'imgSrc' | 'label'>; size?: number }) {
  if (item.imgSrc) {
    return (
      <img
        src={item.imgSrc}
        alt=""
        className="shrink-0 rounded-[3px] object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const Icon = item.icon;
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.75} className="shrink-0" />;
}

const Sidebar = ({ activeTab, setActiveTab, expanded, onExpandedChange }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [casesPopoverOpen, setCasesPopoverOpen] = useState(false);
  const [officePopoverOpen, setOfficePopoverOpen] = useState(false);
  const chatStore = useChatStore();
  const { t, dir } = useAppTranslation();
  const isRTL = dir === 'rtl';
  const { authorized: financeAuthorized } = useFinanceAccess();
  const { open: mobileNavOpen, setOpen: setMobileNavOpen, close: closeMobileNav } = useMobileNav();
  const flyoutSide = isRTL ? 'left' : 'right';

  const recentMessages = chatStore.notifications.filter((m) => m.is_message);
  const unreadMessagesCount = recentMessages.filter((m) => m.unread).length;
  const railExpanded = expanded;

  const menuItems = useMemo<NavItem[]>(() => {
    return [
      { id: 'dashboard', icon: Grid3X3, label: t.sidebar.dashboard, path: '/dashboard', badge: null },
      { id: 'team', icon: Users, label: t.sidebar.team, path: '/dashboard/team', badge: null },
      { id: 'clients', icon: UserCheck, label: t.sidebar.clients, path: '/dashboard/clients', badge: null },
      {
        id: 'cases',
        icon: Briefcase,
        label: t.sidebar.cases,
        path: '/dashboard/cases',
        badge: null,
        children: [
          { id: 'cases-consultation', label: t.sidebar.consultation, path: '/dashboard/cases/consultations' },
          { id: 'cases-litigation', label: t.sidebar.litigation, path: '/dashboard/cases/litigation' },
          { id: 'cases-administrative', label: t.sidebar.administrative, path: '/dashboard/cases/administrative' },
        ],
      },
      { id: 'library', icon: BookOpen, label: t.sidebar.library, path: '/dashboard/library', badge: null },
      ...(JURIA_ENABLED
        ? [
            {
              id: 'juria',
              imgSrc: '/images/juria-icon.png',
              label: t.sidebar.legalAi,
              path: '/dashboard/juria',
              badge: null,
            } satisfies NavItem,
          ]
        : []),
      { id: 'calendar', icon: Calendar, label: t.sidebar.calendar, path: '/dashboard/calendar', badge: null },
      { id: 'tasks', icon: CheckSquare, label: t.sidebar.tasks, path: '/dashboard/tasks', badge: null },
      {
        id: 'appointment',
        icon: CalendarClock,
        label: t.sidebar.appointment,
        path: '/dashboard/appointments',
        badge: null,
      },
      {
        id: 'chat',
        icon: MessageSquare,
        label: t.sidebar.chat,
        path: '/dashboard/conversations',
        badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      },
    ];
  }, [t, unreadMessagesCount]);

  const officeChildren = useMemo<NavChild[]>(() => {
    const items: NavChild[] = [
      { id: 'office-account', label: t.sidebar.account, path: '/dashboard/account', icon: User },
    ];
    if (financeAuthorized) {
      items.push({
        id: 'office-finance',
        label: t.sidebar.finance,
        path: '/dashboard/finance',
        icon: Coins,
        requiresFinance: true,
      });
    }
    items.push(
      { id: 'office-settings', label: t.sidebar.settings, path: '/dashboard/settings', icon: Settings },
      { id: 'office-support', label: t.sidebar.support, path: '/dashboard/support', icon: Headphones },
    );
    return items;
  }, [t, financeAuthorized]);

  const isCasesChildPath = (path: string) =>
    path.startsWith('/dashboard/cases/consultation') ||
    path.startsWith('/dashboard/cases/consultations') ||
    path.startsWith('/dashboard/cases/litigation') ||
    path.startsWith('/dashboard/cases/administrative');

  const isCasesSectionPath = (path: string) =>
    path === '/dashboard/cases' || path === '/dashboard/cases/' || isCasesChildPath(path);

  const isOfficeSectionPath = (path: string) =>
    path.startsWith('/dashboard/account') ||
    path.startsWith('/dashboard/finance') ||
    path.startsWith('/dashboard/settings') ||
    path.startsWith('/dashboard/support');

  // Keep Cases / Office open only while their own routes are active.
  useEffect(() => {
    const path = location.pathname;
    setExpandedIds((prev) => ({
      cases: isCasesSectionPath(path),
      office: isOfficeSectionPath(path),
    }));
    setCasesPopoverOpen(false);
    setOfficePopoverOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      setExpandedIds((prev) => ({ ...prev, office: false }));
    }
  }, [mobileNavOpen]);

  // Close compact flyouts when the rail expands so we don't stack two UIs.
  useEffect(() => {
    if (railExpanded) {
      setCasesPopoverOpen(false);
      setOfficePopoverOpen(false);
    }
  }, [railExpanded]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const opening = !prev[id];
      if (!opening) return { ...prev, [id]: false };
      return {
        cases: id === 'cases',
        office: id === 'office',
      };
    });
  };

  const handleNavigate = (id: string, path: string, options?: { closeMobile?: boolean }) => {
    setActiveTab(id);
    setExpandedIds((prev) => ({
      cases: isCasesSectionPath(path),
      office: isOfficeSectionPath(path),
    }));
    setCasesPopoverOpen(false);
    setOfficePopoverOpen(false);
    navigate(path, { flushSync: true });
    if (options?.closeMobile !== false) {
      closeMobileNav();
    }
  };

  const isPathActive = (path?: string) => {
    if (!path) return false;
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    if (path === '/dashboard/cases') {
      return location.pathname === '/dashboard/cases' || location.pathname === '/dashboard/cases/';
    }
    if (path === '/dashboard/conversations') {
      return (
        location.pathname.startsWith('/dashboard/conversations') ||
        location.pathname.startsWith('/dashboard/messages')
      );
    }
    if (path === '/dashboard/finance') {
      return location.pathname.startsWith('/dashboard/finance');
    }
    if (path === '/dashboard/calendar') {
      return location.pathname.startsWith('/dashboard/calendar');
    }
    if (path === '/dashboard/tasks') {
      return (
        location.pathname === '/dashboard/tasks' ||
        location.pathname === '/dashboard/tasks/' ||
        /^\/dashboard\/tasks\/\d+\/edit/.test(location.pathname)
      );
    }
    if (path === '/dashboard/appointments') {
      return (
        location.pathname.startsWith('/dashboard/appointments') ||
        location.pathname.startsWith('/dashboard/appointment')
      );
    }
    if (path === '/dashboard/juria') {
      return (
        location.pathname.startsWith('/dashboard/juria') ||
        location.pathname.startsWith('/dashboard/legal-ai')
      );
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isItemActive = (item: NavItem) => {
    if (item.children?.some((child) => isPathActive(child.path))) return true;
    if (item.path && isPathActive(item.path)) return true;
    return activeTab === item.id;
  };

  const isChildActive = (child: NavChild) => isPathActive(child.path) || activeTab === child.id;

  const logoutModalRef = useRef<LogoutModalRef>(null);
  useShortcutAction('logout', () => logoutModalRef.current?.show());

  const navShortcut = (path?: string) => (path ? NAV_SHORTCUT_BY_PATH[path] : undefined);

  const renderBadge = (badge: number | string, className?: string) => (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-xs',
        badge.toString() === 'Beta'
          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        className,
      )}
    >
      {typeof badge === 'number' && badge > 99 ? '99+' : badge}
    </span>
  );

  const renderMobileNavButton = (item: NavItem) => {
    const active = isItemActive(item);
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = Boolean(expandedIds[item.id]);
    const showChildren = hasChildren && isExpanded;

    return (
      <div key={item.id} className="flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              if (item.path) {
                handleNavigate(item.id, item.path);
              } else if (hasChildren) {
                toggleExpanded(item.id);
              }
            }}
            className={cn(
              'flex min-h-10 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-jure-600 text-white dark:bg-jure-500'
                : 'text-muted-foreground dark:text-white hover:bg-jure-50 hover:text-jure-600 dark:hover:bg-jure-600/10 dark:hover:text-white',
            )}
            aria-current={active && !hasChildren ? 'page' : undefined}
          >
            <NavGlyph item={item} size={16} />
            <span className="flex-1 text-start">{item.label}</span>
            {item.badge != null && renderBadge(item.badge)}
          </button>
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/70',
                active && 'text-white hover:bg-white/10',
              )}
              aria-expanded={isExpanded}
              aria-label={`Toggle ${item.label}`}
            >
              <ChevronDown
                size={14}
                className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
              />
            </button>
          )}
        </div>

        {showChildren && item.children && (
          <div className="ms-4 flex flex-col gap-0.5">
            {item.children.map((child) => {
              const childActive = isChildActive(child);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleNavigate(child.id, child.path)}
                  className={cn(
                    'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                    childActive
                      ? 'bg-jure-100 text-jure-700 dark:bg-jure-900/40 dark:text-jure-300'
                      : 'text-muted-foreground dark:text-white/80 hover:bg-muted/70',
                  )}
                  aria-current={childActive ? 'page' : undefined}
                >
                  <span className="text-start truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMobileOffice = () => {
    const isExpanded = Boolean(expandedIds.office);
    const officeActive = officeChildren.some((child) => isChildActive(child));

    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => toggleExpanded('office')}
          className={cn(
            'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
            officeActive
              ? 'bg-jure-50 text-jure-700 dark:bg-jure-600/10 dark:text-jure-300'
              : 'text-muted-foreground dark:text-white hover:bg-muted/70 hover:text-foreground dark:hover:text-white',
          )}
          aria-expanded={isExpanded}
        >
          <Building2 size={16} className="shrink-0" />
          <span className="flex-1 text-start">{t.sidebar.office}</span>
          <ChevronDown
            size={14}
            className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
          />
        </button>

        {isExpanded && (
          <div className="flex flex-col gap-0.5">
            {officeChildren.map((child) => {
              const ChildIcon = child.icon;
              const childActive = isChildActive(child);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleNavigate(child.id, child.path)}
                  className={cn(mobileSecondaryActionClass, childActive && 'bg-muted text-foreground')}
                  aria-current={childActive ? 'page' : undefined}
                >
                  {ChildIcon ? (
                    <ChildIcon
                      size={17}
                      className="shrink-0 text-muted-foreground/70 dark:text-white/80"
                    />
                  ) : null}
                  {child.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                closeMobileNav();
                logoutModalRef.current?.show();
              }}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut size={15} className="shrink-0" />
              {t.sidebar.logout}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderFlyoutMenuItem = (
    child: NavChild,
    onSelect: () => void,
  ) => {
    const ChildIcon = child.icon;
    const childActive = isChildActive(child);
    return (
      <button
        key={child.id}
        type="button"
        onClick={() => {
          handleNavigate(child.id, child.path, { closeMobile: false });
          onSelect();
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
          childActive
            ? 'bg-jure-100 text-jure-700 dark:bg-jure-900/40 dark:text-jure-300'
            : 'text-foreground hover:bg-muted',
        )}
        aria-current={childActive ? 'page' : undefined}
      >
        {ChildIcon ? <ChildIcon size={15} className="shrink-0" /> : null}
        <span className="truncate text-start">{child.label}</span>
      </button>
    );
  };

  const renderDesktopNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item);
    const hasChildren = Boolean(item.children?.length);
    const isSectionOpen = Boolean(expandedIds[item.id]);

    // Cases — collapsed: icon + tooltip + flyout popover (no inline submenu).
    if (hasChildren && !railExpanded) {
      return (
        <Popover key={item.id} open={casesPopoverOpen} onOpenChange={setCasesPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={railIconButtonClass(active, false)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            {!casesPopoverOpen && (
              <TooltipContent side={flyoutSide} sideOffset={10} className="flex items-center gap-2">
                {item.label}
                {navShortcut(item.path) ? <HintKbd keys={navShortcut(item.path)!} /> : null}
              </TooltipContent>
            )}
          </Tooltip>
          <PopoverContent
            side={flyoutSide}
            align="start"
            sideOffset={10}
            className="w-52 p-1.5"
          >
            {item.path && (
              <button
                type="button"
                onClick={() => {
                  handleNavigate(item.id, item.path!, { closeMobile: false });
                  setCasesPopoverOpen(false);
                }}
                className={cn(
                  'mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                  isPathActive(item.path)
                    ? 'bg-jure-100 text-jure-700 dark:bg-jure-900/40 dark:text-jure-300'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )}
            <div className="my-1 h-px bg-border" />
            {item.children?.map((child) =>
              renderFlyoutMenuItem(child, () => setCasesPopoverOpen(false)),
            )}
          </PopoverContent>
        </Popover>
      );
    }

    // Cases — expanded: inline label + chevron + submenu.
    if (hasChildren && railExpanded) {
      return (
        <div key={item.id} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (item.path) {
                  handleNavigate(item.id, item.path, { closeMobile: false });
                }
              }}
              className={cn(railIconButtonClass(active, true), 'flex-1')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-start text-xs font-medium">
                {item.label}
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleExpanded(item.id)}
              className={cn(
                'flex h-8 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-jure-50 dark:hover:bg-jure-600/10',
                active && 'text-white hover:bg-white/10',
              )}
              aria-expanded={isSectionOpen}
              aria-label={`Toggle ${item.label}`}
            >
              <ChevronDown
                size={14}
                className={cn('transition-transform duration-200', isSectionOpen && 'rotate-180')}
              />
            </button>
          </div>
          {isSectionOpen && item.children && (
            <div className="ms-3 flex flex-col gap-0.5 border-s border-border ps-2">
              {item.children.map((child) => {
                const childActive = isChildActive(child);
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => handleNavigate(child.id, child.path, { closeMobile: false })}
                    className={cn(
                      'flex min-h-9 w-full items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      childActive
                        ? 'bg-jure-100 text-jure-700 dark:bg-jure-900/40 dark:text-jure-300'
                        : 'text-muted-foreground dark:text-white/80 hover:bg-jure-50 dark:hover:bg-jure-600/10',
                    )}
                    aria-current={childActive ? 'page' : undefined}
                  >
                    <span className="truncate text-start">{child.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Standard items.
    const button = (
      <button
        type="button"
        onClick={() => {
          if (item.path) {
            handleNavigate(item.id, item.path, { closeMobile: false });
          }
        }}
        className={railIconButtonClass(active, railExpanded)}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
      >
        <NavGlyph item={item} size={16} />
        {railExpanded && (
          <>
            <span className="min-w-0 flex-1 truncate text-start text-xs font-medium">
              {item.label}
            </span>
            {item.badge != null && renderBadge(item.badge, 'ms-auto shrink-0')}
          </>
        )}
      </button>
    );

    if (railExpanded) {
      return (
        <div key={item.id} className="w-full">
          {button}
        </div>
      );
    }

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={flyoutSide} sideOffset={10} className="flex items-center gap-2">
          {item.label}
          {navShortcut(item.path) ? <HintKbd keys={navShortcut(item.path)!} /> : null}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderDesktopOffice = () => {
    const officeActive = officeChildren.some((child) => isChildActive(child));
    const isSectionOpen = Boolean(expandedIds.office);

    if (!railExpanded) {
      return (
        <Popover open={officePopoverOpen} onOpenChange={setOfficePopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={railIconButtonClass(officeActive, false)}
                  aria-label={t.sidebar.office}
                  aria-expanded={officePopoverOpen}
                >
                  <Building2 size={16} strokeWidth={1.75} className="shrink-0" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            {!officePopoverOpen && (
              <TooltipContent side={flyoutSide} sideOffset={10}>
                {t.sidebar.office}
              </TooltipContent>
            )}
          </Tooltip>
          <PopoverContent
            side={flyoutSide}
            align="end"
            sideOffset={10}
            className="w-52 p-1.5"
          >
            {officeChildren.map((child) =>
              renderFlyoutMenuItem(child, () => setOfficePopoverOpen(false)),
            )}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                setOfficePopoverOpen(false);
                logoutModalRef.current?.show();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut size={15} className="shrink-0" />
              {t.sidebar.logout}
            </button>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => toggleExpanded('office')}
          className={cn(railIconButtonClass(officeActive, true))}
          aria-expanded={isSectionOpen}
        >
          <Building2 size={16} strokeWidth={1.75} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-start text-xs font-medium">
            {t.sidebar.office}
          </span>
          <ChevronDown
            size={14}
            className={cn(
              'shrink-0 transition-transform duration-200',
              isSectionOpen && 'rotate-180',
            )}
          />
        </button>

        {isSectionOpen && (
          <div className="ms-3 flex flex-col gap-0.5 border-s border-border ps-2">
            {officeChildren.map((child) => {
              const ChildIcon = child.icon;
              const childActive = isChildActive(child);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleNavigate(child.id, child.path, { closeMobile: false })}
                  className={cn(
                    'flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                    childActive
                      ? 'bg-jure-100 text-jure-700 dark:bg-jure-900/40 dark:text-jure-300'
                      : 'text-muted-foreground dark:text-white/80 hover:bg-jure-50 dark:hover:bg-jure-600/10',
                  )}
                  aria-current={childActive ? 'page' : undefined}
                >
                  {ChildIcon ? <ChildIcon size={14} className="shrink-0" /> : null}
                  <span className="truncate text-start">{child.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => logoutModalRef.current?.show()}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut size={14} className="shrink-0" />
              <span className="truncate text-start">{t.sidebar.logout}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile navigation drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side={isRTL ? 'right' : 'left'}
          className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 sm:max-w-sm"
        >
          <SheetHeader className="shrink-0 border-b border-border px-3 py-3 text-start">
            <div className="flex items-center gap-2.5 pe-8">
              <JureLogo className="h-7 w-auto" />
            </div>
            <SheetTitle className="sr-only">{t.sidebar.dashboard}</SheetTitle>
            <SheetDescription className="sr-only">{t.sidebar.office}</SheetDescription>
          </SheetHeader>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Primary">
            <div className="flex flex-col gap-0.5">
              {menuItems.map((item) => renderMobileNavButton(item))}
            </div>
          </nav>

          <div className="shrink-0 border-t border-border px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="mb-1.5 flex h-9 items-center justify-center px-2">
              <LangSwitcher />
            </div>
            {renderMobileOffice()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop rail — open/close via edge-mounted toggle */}
      <div className="fixed top-0 start-0 z-50 hidden h-full lg:block">
        <TooltipProvider delayDuration={280} skipDelayDuration={0}>
          <div
            className="relative h-full transition-[width] duration-300 ease-in-out"
            style={{
              width: railExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_RAIL_WIDTH,
            }}
          >
            <aside
              className={cn(
                'flex h-full w-full flex-col border-e border-border bg-background py-3 shadow-lg',
                'overflow-x-hidden overflow-y-hidden',
              )}
              aria-label="Main navigation"
              data-state={railExpanded ? 'expanded' : 'collapsed'}
            >
              {/* Logo — full wordmark when expanded, J mark when collapsed */}
              <div
                className={cn(
                  'mb-3 flex shrink-0 items-center',
                  railExpanded ? 'h-10 justify-start px-2' : 'h-9 justify-center px-0',
                )}
              >
                {railExpanded ? (
                  <JureLogo className="h-7 w-auto" />
                ) : (
                  <JureLogo mark className="h-7 w-7" />
                )}
              </div>

              <nav
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5"
                aria-label="Primary"
              >
                {menuItems.map((item) => renderDesktopNavItem(item))}
              </nav>

              <div className="mt-1.5 shrink-0 space-y-1.5 border-t border-border px-1.5 pt-2">
                <div className="flex h-8 items-center justify-center">
                  <LangSwitcher
                    menuSide={flyoutSide}
                    menuAlign={railExpanded ? 'center' : 'end'}
                    tooltip={railExpanded ? undefined : t.settings.nav.language}
                  />
                </div>

                {renderDesktopOffice()}

                {railExpanded && (
                  <div className="rounded-lg bg-gradient-to-r from-jure-50 to-jure-100 p-2 dark:from-jure-900/20 dark:to-jure-800/20">
                    <div className="mb-0.5 text-xs font-medium text-foreground">
                      {t.sidebar.upgradeTitle}
                    </div>
                    <div className="mb-1 text-xs leading-tight text-muted-foreground">
                      {t.sidebar.upgradeSubtitle}
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-jure-600 hover:text-jure-700 dark:text-jure-400 dark:hover:text-jure-300"
                    >
                      {t.sidebar.upgradeCta}
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* Floating edge toggle — bottom of content-facing edge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onExpandedChange(!railExpanded)}
                  className={cn(
                    'absolute bottom-6 start-full z-[60] flex h-8 w-5 items-center justify-center',
                    'bg-jure-600 text-white shadow-[0_2px_8px_rgba(100,73,157,0.35)]',
                    'hover:bg-jure-700 hover:shadow-[0_3px_10px_rgba(100,73,157,0.45)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jure-400 focus-visible:ring-offset-2',
                    'active:scale-95 active:bg-jure-800',
                    'transition-[background-color,transform,box-shadow] duration-200 ease-out',
                    // Logical radii: always flush on the sidebar (`start`) side, rounded toward content.
                    'rounded-e-xl rounded-s-none',
                  )}
                  aria-label={railExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                  aria-expanded={railExpanded}
                >
                  <ChevronLeft
                    size={13}
                    strokeWidth={2.5}
                    className={cn(
                      'transition-transform duration-300 ease-out',
                      // Point toward the sidebar when expanded (collapse), toward content when collapsed (expand).
                      // Extra 180° in RTL so "left" maps to the right-docked rail.
                      (railExpanded ? isRTL : !isRTL) && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side={flyoutSide} sideOffset={12} className="flex items-center gap-2">
                {railExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                <HintKbd keys={['mod', 'B']} />
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <LogoutModal ref={logoutModalRef} />
    </>
  );
};

export default Sidebar;
