import React from "react";
import { Link } from "react-router";
import { Home } from "lucide-react";
import LangSwitcher from "@/components/common/LangSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import AuroraBackground from "@/components/common/AuroraBackground";
import JureLogo from "@/components/common/JureLogo";
import "@/components/landing/landing.css";

type AuthShellProps = {
  children: React.ReactNode;
  /** Optional label under the logo area (e.g. back home) */
  homeLabel?: string;
  /** Wider layout for multi-step signup */
  wide?: boolean;
};

const AuthShell: React.FC<AuthShellProps> = ({
  children,
  homeLabel,
  wide = false,
}) => {
  return (
    <div className="landing-root min-h-screen relative overflow-x-hidden text-slate-900 dark:text-slate-100 bg-background">
      <AuroraBackground intensity="medium" />

      <div className="relative z-10 min-h-screen flex flex-col min-w-0">
        <header className="px-3 sm:px-6 pt-3 sm:pt-4">
          <div
            className={`mx-auto landing-glass rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 ${
              wide ? "max-w-5xl" : "max-w-md"
            }`}
          >
            <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0">
              <JureLogo className="h-7 sm:h-8 w-auto" />
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LangSwitcher />
              <ThemeToggle />
              {homeLabel && (
                <Link
                  to="/"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-[#A58CF4] dark:hover:text-[#A58CF4] transition-colors ms-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  {homeLabel}
                </Link>
              )}
            </div>
          </div>
        </header>

        <div
          className={`flex-1 flex flex-col justify-center px-3 sm:px-6 py-6 sm:py-8 mx-auto w-full min-w-0 ${
            wide ? "max-w-5xl" : "max-w-md"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
