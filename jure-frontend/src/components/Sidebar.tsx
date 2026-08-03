import React, { useMemo, useRef, useState } from 'react';
import {
  Grid3X3,
  Users,
  BookOpen,
  Briefcase,
  UserCheck,
  CheckSquare,
  MessageSquare,
  Settings,
  Sparkles,
  Headphones,
  LogOut,
  User,
  ChevronUp,
  UserCog,
  Bell,
  HelpCircle,
  Coins,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import LogoutModal, { LogoutModalRef } from './layout/LogoutModal';
import useChatStore from '@/stores/chatStore';
import { useAppTranslation } from '@/i18n';
import LangSwitcher from '@/components/common/LangSwitcher';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { useMobileNav } from '@/context/MobileNavContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

type MenuItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
  badge: number | string | null;
};

const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const chatStore = useChatStore();
  const { t, dir } = useAppTranslation();
  const isRTL = dir === 'rtl';
  const { authorized: financeAuthorized } = useFinanceAccess();
  const { open: mobileNavOpen, setOpen: setMobileNavOpen, close: closeMobileNav } = useMobileNav();

  const recentMessages = chatStore.notifications.filter((m) => m.is_message);
  const unreadMessagesCount = recentMessages.filter((m) => m.unread).length;

  const menuItems = useMemo(() => {
    const financeItem = {
      id: 'finance',
      icon: Coins,
      label: 'Finance',
      path: '/dashboard/finance',
      badge: null as number | string | null,
    };
    const base = [
      { id: 'dashboard', icon: Grid3X3, label: t.sidebar.dashboard, path: '/dashboard', badge: null },
      { id: 'team', icon: Users, label: t.sidebar.team, path: '/dashboard/team', badge: null },
      { id: 'library', icon: BookOpen, label: t.sidebar.library, path: '/dashboard/library', badge: 3 },
      { id: 'cases', icon: Briefcase, label: t.sidebar.cases, path: '/dashboard/cases', badge: null },
    ] as MenuItem[];
    const afterCases = financeAuthorized ? [...base, financeItem] : base;
    const items: MenuItem[] = [
      ...afterCases,
      { id: 'clients', icon: UserCheck, label: t.sidebar.clients, path: '/dashboard/clients', badge: null },
      { id: 'tasks', icon: CheckSquare, label: t.sidebar.calendar, path: '/dashboard/tasks', badge: null },
      {
        id: 'conversations',
        icon: MessageSquare,
        label: t.sidebar.conversations,
        path: '/dashboard/conversations',
        badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      },
      { id: 'settings', icon: Settings, label: t.sidebar.settings, path: '/dashboard/settings', badge: null },
    ];
    if (JURIA_ENABLED) {
      items.push({
        id: 'legal-ai',
        icon: Sparkles,
        label: t.sidebar.legalAi,
        path: '/dashboard/juria',
        badge: 'Beta',
      });
    }
    return items;
  }, [t, financeAuthorized, unreadMessagesCount]);

  const handleMenuClick = (item: MenuItem, options?: { closeMobile?: boolean }) => {
    setActiveTab(item.id);
    navigate(item.path);
    if (options?.closeMobile !== false) {
      closeMobileNav();
    }
  };

  const isActive = (item: MenuItem) => {
    if (item.id === 'finance') {
      return location.pathname.startsWith('/dashboard/finance') || activeTab === 'finance';
    }
    if (item.id === 'legal-ai') {
      return (
        location.pathname === '/dashboard/juria' ||
        location.pathname === '/dashboard/legal-ai' ||
        activeTab === 'legal-ai'
      );
    }
    return location.pathname === item.path || activeTab === item.id;
  };

  const logoutModalRef = useRef<LogoutModalRef>(null);

  const navigateAndClose = (path: string) => {
    navigate(path);
    closeMobileNav();
  };

  return (
    <>
      {/* Mobile navigation drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side={isRTL ? 'right' : 'left'}
          className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0 sm:max-w-sm"
        >
          <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
            <div className="flex items-center gap-3 pr-8">
              <img src="/images/Jure logo.png" alt="JURE" className="h-9 w-auto" />
            </div>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Main application navigation
            </SheetDescription>
          </SheetHeader>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <div className="flex flex-col gap-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMenuClick(item)}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-jure-600 text-white dark:bg-jure-500'
                        : 'text-muted-foreground hover:bg-jure-50 hover:text-jure-600 dark:hover:bg-jure-600/10 dark:hover:text-jure-400'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge != null && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-xs',
                          item.badge.toString() === 'Beta'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        )}
                      >
                        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="shrink-0 space-y-1 border-t border-border px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex justify-center px-2">
              <LangSwitcher />
            </div>
            <button
              type="button"
              onClick={() => navigateAndClose('/dashboard/profile')}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <UserCog size={18} className="shrink-0" />
              {t.sidebar.myProfile}
            </button>
            <button
              type="button"
              onClick={() => navigateAndClose('/dashboard/notifications')}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Bell size={18} className="shrink-0" />
              {t.sidebar.notifications}
            </button>
            <button
              type="button"
              onClick={() => navigateAndClose('/dashboard/help')}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <HelpCircle size={18} className="shrink-0" />
              {t.sidebar.help}
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Headphones size={18} className="shrink-0" />
              {t.sidebar.contactSupport}
            </button>
            <button
              type="button"
              onClick={() => {
                closeMobileNav();
                logoutModalRef.current?.show();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut size={18} className="shrink-0" />
              {t.sidebar.logout}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Fixed side with Hover Expansion (right in RTL, left otherwise) */}
      <div
        className={`hidden lg:block fixed top-0 h-full z-50 group ${
          isRTL ? 'right-0' : 'left-0'
        }`}
      >
        <div
          className={`w-14 hover:w-56 bg-background shadow-lg flex flex-col py-4 h-full transition-all duration-300 ease-in-out overflow-hidden border-border ${
            isRTL ? 'border-l' : 'border-r'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center justify-center px-3 mb-6">
            <img
              src="/favicon.ico"
              alt="JURE Logo"
              className="w-8 h-8 flex-shrink-0 group-hover:opacity-0 transition-opacity duration-300"
            />
            <img
              src="/images/Jure logo.png"
              alt="JURE Logo"
              className="h-10 w-auto absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </div>

          {/* Menu Items */}
          <nav className="flex flex-col space-y-0.5 px-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item, { closeMobile: false })}
                  className={`flex items-center p-2.5 rounded-lg transition-all duration-200 relative ${
                    active
                      ? 'bg-jure-600 dark:bg-jure-500 text-white'
                      : 'text-muted-foreground hover:text-jure-600 dark:hover:text-jure-400 hover:bg-jure-50 dark:hover:bg-jure-600/10'
                  }`}
                  title={item.label}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="ml-2.5 hidden group-hover:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-xs font-medium">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs px-1.5 py-0.5 rounded-full ${
                        item.badge.toString() === 'Beta'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Section */}
          <div className="px-2 space-y-0.5 border-t border-border pt-3 mt-2 relative">
            <div className="flex items-center justify-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <LangSwitcher />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center p-2.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-jure-600 dark:hover:text-jure-400 hover:bg-jure-50 dark:hover:bg-jure-600/10 w-full"
              >
                <User size={16} className="flex-shrink-0" />
                <span className="ml-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-xs font-medium flex-1 text-left">
                  {t.sidebar.profile}
                </span>
                <ChevronUp
                  size={14}
                  className={`opacity-0 group-hover:opacity-100 transition-all duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/dashboard/profile');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs text-foreground hover:bg-muted hover:text-jure-600 dark:hover:text-jure-400"
                    >
                      <UserCog size={14} className="mr-2" />
                      {t.sidebar.myProfile}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/dashboard/notifications');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs text-foreground hover:bg-muted hover:text-jure-600 dark:hover:text-jure-400"
                    >
                      <Bell size={14} className="mr-2" />
                      {t.sidebar.notifications}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/dashboard/help');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs text-foreground hover:bg-muted hover:text-jure-600 dark:hover:text-jure-400"
                    >
                      <HelpCircle size={14} className="mr-2" />
                      {t.sidebar.help}
                    </button>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => {
                        logoutModalRef.current?.show();
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <LogOut size={14} className="mr-2" />
                      {t.sidebar.logout}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="flex items-center p-2.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-jure-600 dark:hover:text-jure-400 hover:bg-jure-50 dark:hover:bg-jure-600/10 w-full">
              <Headphones size={16} className="flex-shrink-0" />
              <span className="ml-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap text-xs font-medium">
                {t.sidebar.contactSupport}
              </span>
            </button>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2.5 bg-gradient-to-r from-jure-50 to-jure-100 dark:from-jure-900/20 dark:to-jure-800/20 rounded-lg">
              <div className="flex items-center text-xs text-foreground mb-1">
                <span className="font-medium">{t.sidebar.upgradeTitle}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-1.5 leading-tight">
                {t.sidebar.upgradeSubtitle}
              </div>
              <button className="text-xs text-jure-600 dark:text-jure-400 hover:text-jure-700 dark:hover:text-jure-300 font-medium">
                {t.sidebar.upgradeCta}
              </button>
            </div>
          </div>
        </div>
      </div>
      <LogoutModal ref={logoutModalRef} />
    </>
  );
};

export default Sidebar;
