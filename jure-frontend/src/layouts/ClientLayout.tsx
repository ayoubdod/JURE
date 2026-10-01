import { useEffect, useState } from 'react';
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
  Scale,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useUserStore from '@/stores/userStore';
import { useAppTranslation } from '@/i18n';
import { homePathForUser, isPortalClient } from '@/utils/portalAuth';
import LogoLoading from '@/components/common/LogoLoading';
import { NotificationProvider } from '@/context/NotificationContext';

const ClientLayout = () => {
  const { user, isLoggedIn, logout } = useUserStore();
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cp = t.clientPortal;

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/signin', { replace: true, state: { from: location } });
      return;
    }
    if (user && !isPortalClient(user)) {
      navigate(homePathForUser(user), { replace: true });
    }
  }, [isLoggedIn, user, navigate, location]);

  if (!isLoggedIn || !user) {
    return <LogoLoading />;
  }
  if (!isPortalClient(user)) {
    return <LogoLoading />;
  }

  const nav = [
    { to: '/client', end: true, label: cp.nav.home, icon: Home },
    { to: '/client/cases', end: false, label: cp.nav.cases, icon: Briefcase },
    { to: '/client/consultations', end: false, label: cp.nav.consultations, icon: Scale },
    { to: '/client/messages', end: false, label: cp.nav.messages, icon: MessageSquare },
    { to: '/client/documents', end: false, label: cp.nav.documents, icon: FileText },
    { to: '/client/notifications', end: false, label: cp.nav.notifications, icon: Bell },
    { to: '/client/profile', end: false, label: cp.nav.profile, icon: User },
  ];

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1" aria-label={cp.nav.aria}>
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-[#64499D]/12 text-[#64499D] font-medium'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-800',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <NotificationProvider>
      <Helmet>
        <title>{cp.title} · JURE</title>
      </Helmet>
      <div className="min-h-screen bg-[#F7F6F9] text-slate-900 dark:bg-zinc-950 dark:text-slate-100">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:hover:bg-zinc-800"
                onClick={() => setMobileOpen(true)}
                aria-label={cp.nav.openMenu}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link to="/client" className="font-serif text-xl tracking-tight text-[#2F2450]">
                JURE
              </Link>
              <span className="hidden text-xs text-slate-400 sm:inline">{cp.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                className="rounded-lg bg-[#64499D] text-white hover:bg-[#553d86]"
                size="sm"
              >
                <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                onClick={() => {
                  logout();
                  navigate('/signin');
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">{cp.nav.logout}</span>
              </Button>
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label={cp.nav.closeMenu}
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 start-0 w-72 bg-white p-4 shadow-xl dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-serif text-lg">JURE</span>
                <button type="button" onClick={() => setMobileOpen(false)} aria-label={cp.nav.closeMenu}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8 sm:px-6">
          <aside className="hidden w-56 shrink-0 lg:block">
            <NavItems />
          </aside>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
};

export default ClientLayout;
