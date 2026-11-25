import React from 'react';
import { Link } from 'react-router';
import { Check, Home } from 'lucide-react';
import LangSwitcher from '@/components/common/LangSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import JureLogo from '@/components/common/JureLogo';
import { cn } from '@/lib/utils';
import '@/components/common/aurora.css';
import { Helmet } from 'react-helmet-async';
import { useAppTranslation } from '@/i18n';

export type SignupShellStep = {
  number: number;
  title: string;
  description: string;
};

type SignupShellProps = {
  currentStep: number;
  steps: SignupShellStep[];
  wide?: boolean;
  children: React.ReactNode;
};

const SignupShell = ({ currentStep, steps, wide = false, children }: SignupShellProps) => {
  const { t } = useAppTranslation();
  const shell = t.auth.signup.shell;
  const inFlow = currentStep >= 1 && currentStep <= steps.length;
  const active = inFlow ? steps[currentStep - 1] : null;

  return (
    <div className="auth-hero-page relative flex h-dvh min-h-screen w-full overflow-hidden">
      <Helmet>
        <title>{inFlow ? t.auth.signUp : t.auth.verifyWaitingTitle} | JURE</title>
      </Helmet>
      <aside className="auth-hero-stage relative hidden h-full w-[42%] shrink-0 flex-col overflow-hidden p-10 text-white lg:flex xl:w-[46%] xl:p-14">
          <div className="auth-hero-aurora" aria-hidden />
          <div className="auth-hero-grid" aria-hidden />

          <Link to="/" className="relative z-10 inline-flex items-center gap-2">
            <JureLogo inverted className="h-8 w-auto" />
          </Link>

          <div className="relative z-10 mt-14 max-w-sm">
            <span className="inline-flex rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-medium text-white/90">
              {shell.badge}
            </span>
            <h2 className="mt-5 font-display text-[2.4rem] font-bold leading-[1.15] tracking-tight">
              {shell.heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{shell.subtitle}</p>
          </div>

          <div className="relative z-10 mt-8 space-y-1.5 overflow-y-auto">
            {steps.map((step) => {
              const isActive = currentStep === step.number;
              const isDone = currentStep > step.number;
              return (
                <div
                  key={step.number}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2',
                    isActive ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-white ring-1 ring-white/10'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      isActive
                        ? 'bg-gradient-to-br from-[#2949e8] to-[#a855f7] text-white'
                        : isDone
                          ? 'bg-white text-[#2949e8]'
                          : 'bg-white/15 text-white'
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : step.number}
                  </div>
                  <p className={cn('text-sm font-medium', isActive ? 'text-slate-800' : 'text-white/90')}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex h-full min-w-0 flex-1 flex-col bg-white text-slate-900 dark:bg-card dark:text-slate-100">
          <header className="flex items-center justify-between gap-2 px-5 pt-4 sm:px-8 sm:pt-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 lg:hidden"
            >
              <JureLogo className="h-7 w-auto" />
            </Link>
            <div className="ms-auto flex items-center gap-1.5">
              <LangSwitcher />
              <ThemeToggle />
              <Link
                to="/signin"
                className="text-xs font-semibold text-[#2949e8] transition-colors hover:underline dark:text-[#b968ff]"
              >
                {shell.signIn}
              </Link>
              <Link
                to="/"
                className="hidden items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-[#2949e8] sm:inline-flex dark:text-slate-400 dark:hover:text-[#b968ff]"
              >
                <Home className="h-3.5 w-3.5" />
                {t.auth.backToHome}
              </Link>
            </div>
          </header>

          {inFlow && (
            <div className="flex gap-1.5 overflow-x-auto px-5 pb-1 pt-4 lg:hidden sm:px-8">
              {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isDone = currentStep > step.number;
                return (
                  <div
                    key={step.number}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      isDone || isActive
                        ? 'bg-gradient-to-br from-[#2949e8] to-[#a855f7] text-white'
                        : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : step.number}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-8 pt-4 sm:px-10 sm:pt-6">
            <div className={cn('mx-auto flex w-full flex-1 flex-col', wide ? 'max-w-[860px]' : 'max-w-[520px]')}>
              {inFlow && active && (
                <div className="mb-6 text-center">
                  <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white">
                    {active.title}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {active.description}
                  </p>
                </div>
              )}
              <div className="flex-1">{children}</div>
              {inFlow && (
                <p className="mt-6 text-center text-sm text-slate-500">
                  {shell.alreadyHaveAccount}{' '}
                  <Link to="/signin" className="font-semibold text-[#2949e8] hover:underline dark:text-[#b968ff]">
                    {shell.signIn}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>
    </div>
  );
};

export default SignupShell;
