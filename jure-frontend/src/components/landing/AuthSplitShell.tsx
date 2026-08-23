import React from 'react';
import { Link } from 'react-router';
import { Home } from 'lucide-react';
import LangSwitcher from '@/components/common/LangSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import JureLogo from '@/components/common/JureLogo';
import { useAppTranslation } from '@/i18n';

type AuthSplitShellProps = {
  eyebrow: string;
  heading: string;
  subtitle?: string;
  footer?: string;
  children: React.ReactNode;
};

const AuthSplitShell = ({ eyebrow, heading, subtitle, footer, children }: AuthSplitShellProps) => {
  const { t } = useAppTranslation();

  return (
    <div className="min-h-screen bg-[#ece8f4] p-3 sm:p-5 lg:p-8 dark:bg-[#0c0a14]">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1100px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_-24px_rgba(62,45,113,0.45)] dark:bg-zinc-950 sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[min(720px,calc(100vh-4rem))]">
        <aside className="relative hidden w-[46%] shrink-0 flex-col overflow-hidden bg-gradient-to-br from-[#9B7FD9] via-[#64499D] to-[#3E2D71] p-8 text-white lg:flex xl:p-10">
          <div className="pointer-events-none absolute -end-24 -top-16 h-[22rem] w-[22rem] rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -start-16 top-1/3 h-64 w-64 rounded-full bg-[#CFC2FF]/20 blur-sm" />
          <div className="pointer-events-none absolute bottom-10 end-8 h-40 w-40 rounded-full bg-[#3E2D71]/50" />
          <div className="pointer-events-none absolute bottom-[-4rem] start-1/4 h-56 w-56 rounded-full bg-white/10" />

          <Link to="/" className="relative z-10 inline-flex items-center">
            <JureLogo inverted className="h-8 w-auto" />
          </Link>

          <div className="relative z-10 mt-16 max-w-sm">
            <p className="text-sm font-medium text-white/75">{eyebrow}</p>
            <h2 className="mt-3 font-display text-[2.35rem] font-bold leading-[1.15] tracking-tight">
              {heading}
            </h2>
            {subtitle && <p className="mt-4 text-sm leading-relaxed text-white/80">{subtitle}</p>}
          </div>

          {footer && (
            <p className="relative z-10 mt-auto text-xs font-medium tracking-wide text-white/70">{footer}</p>
          )}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 px-5 pt-4 sm:px-8 sm:pt-5">
            <Link to="/" className="inline-flex items-center lg:hidden">
              <JureLogo className="h-7 w-auto" />
            </Link>
            <div className="ms-auto flex items-center gap-1.5">
              <LangSwitcher />
              <ThemeToggle />
              <Link
                to="/"
                className="hidden items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-[#64499D] sm:inline-flex dark:text-slate-400"
              >
                <Home className="h-3.5 w-3.5" />
                {t.auth.backToHome}
              </Link>
            </div>
          </header>

          <div className="flex flex-1 flex-col justify-center overflow-y-auto px-5 pb-8 pt-4 sm:px-12 sm:pt-6">
            <div className="mx-auto w-full max-w-[400px]">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthSplitShell;
