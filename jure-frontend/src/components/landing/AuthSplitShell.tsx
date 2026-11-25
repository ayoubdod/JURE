import React from 'react';
import { Link } from 'react-router';
import { Home } from 'lucide-react';
import LangSwitcher from '@/components/common/LangSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import JureLogo from '@/components/common/JureLogo';
import { Helmet } from 'react-helmet-async';
import '@/components/common/aurora.css';
import { useAppTranslation } from '@/i18n';

type AuthSplitShellProps = {
  eyebrow: string;
  heading: string;
  subtitle?: string;
  footer?: string;
  children: React.ReactNode;
};

const LOGIN_ART = "/images/landing-page/login-justice.jpg";

const AuthSplitShell = ({ eyebrow, heading, subtitle, footer, children }: AuthSplitShellProps) => {
  const { t } = useAppTranslation();

  return (
    <div className="auth-hero-page relative flex h-dvh min-h-screen w-full overflow-hidden">
      <Helmet>
        <title>{t.auth.signInButton} | JURE</title>
      </Helmet>
      <aside className="relative hidden h-full w-[46%] shrink-0 flex-col overflow-hidden p-10 text-white lg:flex xl:w-[50%] xl:p-14">
          <img
            src={LOGIN_ART}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[18%_center]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#20004d]/85 via-[#20004d]/20 to-[#20004d]/45"
            aria-hidden
          />

          <Link to="/" className="relative z-10 inline-flex items-center">
            <JureLogo inverted className="h-8 w-auto" />
          </Link>

          <div className="relative z-10 mt-16 max-w-sm">
            <p className="auth-hero-kicker">{eyebrow}</p>
            <h2 className="mt-3 font-display text-[2.35rem] font-bold leading-[1.15] tracking-tight">
              {heading}
            </h2>
            {subtitle && <p className="mt-4 text-sm leading-relaxed text-white/80">{subtitle}</p>}
          </div>

          {footer && (
            <p className="relative z-10 mt-auto text-xs font-medium tracking-wide text-white/70">{footer}</p>
          )}
        </aside>

        <section className="flex h-full min-w-0 flex-1 flex-col bg-white text-slate-900 dark:bg-card dark:text-slate-100">
          <div className="relative h-40 overflow-hidden sm:h-48 lg:hidden" aria-hidden>
            <img
              src={LOGIN_ART}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[22%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-[#20004d]/25 dark:from-card" />
          </div>
          <header className="flex items-center justify-between gap-2 px-5 pt-4 sm:px-8 sm:pt-5">
            <Link to="/" className="inline-flex items-center lg:hidden">
              <JureLogo className="h-7 w-auto" />
            </Link>
            <div className="ms-auto flex items-center gap-1.5">
              <LangSwitcher />
              <ThemeToggle />
              <Link
                to="/"
                className="hidden items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-[#2949e8] sm:inline-flex dark:text-slate-400 dark:hover:text-[#b968ff]"
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
  );
};

export default AuthSplitShell;
