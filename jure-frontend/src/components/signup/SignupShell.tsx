import React from 'react';
import { Link } from 'react-router';
import { Check, Home } from 'lucide-react';
import LangSwitcher from '@/components/common/LangSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import JureLogo from '@/components/common/JureLogo';
import AuroraBackground from '@/components/common/AuroraBackground';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export type SignupShellStep = {
  number: number;
  title: string;
  description: string;
};

type SignupShellProps = {
  currentStep: number;
  steps: SignupShellStep[];
  children: React.ReactNode;
};

const SignupShell = ({ currentStep, steps, children }: SignupShellProps) => {
  const { t } = useAppTranslation();
  const shell = t.auth.signup.shell;
  const inFlow = currentStep >= 1 && currentStep <= steps.length;
  const active = inFlow ? steps[currentStep - 1] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAF9FD] p-3 sm:p-5 lg:p-8 dark:bg-[#0c0a14]">
      <AuroraBackground intensity="medium" />
      <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1180px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_-24px_rgba(62,45,113,0.45)] dark:bg-zinc-950 sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[min(820px,calc(100vh-4rem))]">
        <aside className="relative hidden w-[42%] shrink-0 flex-col overflow-hidden bg-gradient-to-br from-[#9B7FD9] via-[#64499D] to-[#3E2D71] p-8 text-white lg:flex xl:p-10">
          <div className="pointer-events-none absolute -end-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -start-10 bottom-24 h-48 w-48 rounded-full bg-[#3E2D71]/40" />
          <div className="pointer-events-none absolute end-10 bottom-40 h-24 w-24 rounded-full bg-white/10" />

          <Link to="/" className="relative z-10 inline-flex items-center gap-2">
            <JureLogo inverted className="h-8 w-auto" />
          </Link>

          <div className="relative z-10 mt-14 max-w-sm">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
              {shell.badge}
            </span>
            <h2 className="mt-5 font-display text-[2.4rem] font-bold leading-[1.15] tracking-tight">
              {shell.heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{shell.subtitle}</p>
          </div>

          <div className="relative z-10 mt-auto grid grid-cols-3 gap-2.5">
            {steps.map((step) => {
              const isActive = currentStep === step.number;
              const isDone = currentStep > step.number;
              return (
                <div
                  key={step.number}
                  className={cn(
                    'min-h-[108px] rounded-2xl p-3.5 transition-all',
                    isActive
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/12 text-white ring-1 ring-white/15'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                      isActive
                        ? 'bg-[#64499D] text-white'
                        : isDone
                          ? 'bg-white text-[#64499D]'
                          : 'bg-white/20 text-white'
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : step.number}
                  </div>
                  <p
                    className={cn(
                      'mt-3 text-[12px] font-medium leading-snug',
                      isActive ? 'text-slate-800' : 'text-white/90'
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
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
                to="/"
                className="hidden items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-[#64499D] sm:inline-flex dark:text-slate-400"
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
                        ? 'bg-[#64499D] text-white'
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
            <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col">
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SignupShell;
