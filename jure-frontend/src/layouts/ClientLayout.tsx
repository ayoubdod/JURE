import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Helmet } from 'react-helmet-async';
import {
  Bell,
  Briefcase,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Scale,
  Sun,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import useUserStore from '@/stores/userStore';
import { useAppTranslation } from '@/i18n';
import { homePathForUser, isPortalClient } from '@/utils/portalAuth';
import LogoLoading from '@/components/common/LogoLoading';
import JureLogo from '@/components/common/JureLogo';
import LangSwitcher from '@/components/common/LangSwitcher';
import LogoutModal, { type LogoutModalRef } from '@/components/layout/LogoutModal';
import { NotificationProvider, useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/hooks/useTheme';

const NAV = [
  { to: '/client', end: true, key: 'home' as const, icon: Home },
  { to: '/client/cases', end: false, key: 'cases' as const, icon: Briefcase },
  { to: '/client/consultations', end: false, key: 'consultations' as const, icon: Scale },
  { to: '/client/messages', end: false, key: 'messages' as const, icon: MessageSquare },
  { to: '/client/documents', end: false, key: 'documents' as const, icon: FileText },
  { to: '/client/notifications', end: false, key: 'notifications' as const, icon: Bell },
  { to: '/client/profile', end: false, key: 'profile' as const, icon: User },
];

const navItemClass = (active: boolean) =>
  cn(
    'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-200 ease-out',
    active
      ? 'bg-[#F7F4FF] font-medium text-[#64499D] dark:bg-jure-900/50 dark:text-jure-200'
      : 'text-slate-600 hover:bg-[#F7F4FF] hover:text-[#64499D] dark:text-slate-300 dark:hover:bg-jure-900/30 dark:hover:text-jure-200',
  );

const ClientLayout = () => {
  const { user, isLoggedIn } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/signin', { replace: true, state: { from: location } });
      return;
    }
    if (user && !isPortalClient(user)) {
      navigate(homePathForUser(user), { replace: true });
    }
  }, [isLoggedIn, user, navigate, location]);

  if (!isLoggedIn || !user || !isPortalClient(user)) {
    return <LogoLoading />;
  }

  return (
    <NotificationProvider>
      <ClientShell />
    </NotificationProvider>
  );
};

const ClientShell = () => {
  const { t, dir } = useAppTranslation();
  const location = useLocation();
  const { themeChoice, setTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const logoutModalRef = useRef<LogoutModalRef>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const cp = t.clientPortal;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const labels = cp.nav;

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5" aria-label={labels.aria}>
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Icon size={16} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">{labels[item.key]}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  const requestAction = (
    <Button
      asChild
      className="h-auto min-h-8 w-full whitespace-normal bg-[#64499D] px-3 py-2 text-center text-[13px] leading-snug text-white transition-colors duration-200 ease-out hover:bg-[#4D3680]"
    >
      <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
    </Button>
  );

  return (
    <>
      <Helmet>
        <title>{cp.title} | JURE</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <aside className="fixed start-0 top-0 z-30 hidden h-full w-56 flex-col border-e border-border bg-background lg:flex">
          <div className="flex h-14 shrink-0 items-center px-4">
            <Link to="/client" aria-label="JURE">
              <JureLogo className="h-7 w-auto" />
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            <NavItems />
          </div>
          <div className="shrink-0 border-t border-border p-3">{requestAction}</div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-col lg:ms-56">
          <header className="sticky top-0 z-40 border-b border-border bg-background px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] sm:px-4 sm:py-2 lg:px-6">
            <div className="flex min-h-10 items-center justify-between gap-2 sm:h-12">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label={labels.openMenu}
                >
                  <Menu size={20} />
                </Button>
                <Link to="/client" className="flex min-w-0 items-center gap-2.5">
                  <JureLogo className="h-7 w-auto lg:hidden" />
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                    {cp.title}
                  </span>
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden h-8 w-8 text-muted-foreground hover:text-foreground md:inline-flex"
                  onClick={() => setTheme(themeChoice === 'dark' ? 'light' : 'dark')}
                  aria-label={t.common.toggleTheme}
                >
                  {themeChoice === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <LangSwitcher menuAlign="end" />
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Link
                    to="/client/notifications"
                    aria-label={
                      unreadCount > 0
                        ? `${labels.notifications} (${unreadCount})`
                        : labels.notifications
                    }
                  >
                    <Bell size={16} strokeWidth={1.75} />
                    {unreadCount > 0 ? (
                      <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#64499D]" />
                    ) : null}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    location.pathname.startsWith('/client/profile') &&
                      'bg-[#F7F4FF] text-[#64499D]',
                  )}
                >
                  <Link to="/client/profile" aria-label={labels.profile}>
                    <User size={16} strokeWidth={1.75} />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => logoutModalRef.current?.show()}
                  aria-label={labels.logout}
                >
                  <LogOut size={16} strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </header>

          <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="start" dir={dir} className="flex w-[min(100vw,20rem)] flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 border-b border-border px-4 py-3 text-start">
            <div className="flex items-center gap-2.5 pe-8">
              <JureLogo className="h-7 w-auto" />
            </div>
            <SheetTitle className="text-start text-sm font-medium text-muted-foreground">
              {cp.title}
            </SheetTitle>
            <SheetDescription className="sr-only">{labels.aria}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {requestAction}
          </div>
        </SheetContent>
      </Sheet>

      <LogoutModal ref={logoutModalRef} />
    </>
  );
};

export default ClientLayout;
