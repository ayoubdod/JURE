import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import MeshBackdrop from "@/components/landing/MeshBackdrop";
import "@/components/landing/landing.css";

export type MarketingLang = "fr" | "en" | "ar";
export type MarketingNavKey = "features" | "about" | "contact" | "none";

export type MarketingLabels = {
  nav: { features: string; about: string; contact: string };
  auth: { signin: string };
  themeToggle?: { label: string; title: string };
  footer: { privacy: string; terms: string; status: string; rights: string };
};

type MarketingShellProps = {
  lang: MarketingLang;
  onLangChange: (l: MarketingLang) => void;
  labels: MarketingLabels;
  dir?: "ltr" | "rtl";
  activeNav?: MarketingNavKey;
  children: React.ReactNode;
};

const LangSwitcher: React.FC<{
  lang: MarketingLang;
  onChange: (l: MarketingLang) => void;
}> = ({ lang, onChange }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-[#64499D]/20 dark:border-[#8B6FD1]/30 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm shrink-0">
    {(["fr", "en", "ar"] as MarketingLang[]).map((code) => (
      <button
        key={code}
        type="button"
        onClick={() => onChange(code)}
        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors ${
          lang === code
            ? "bg-[#64499D] text-white"
            : "text-slate-700 dark:text-slate-200 hover:bg-[#F4F1FF] dark:hover:bg-[#64499D]/20"
        }`}
      >
        {code.toUpperCase()}
      </button>
    ))}
  </div>
);

const MarketingShell: React.FC<MarketingShellProps> = ({
  lang,
  onLangChange,
  labels,
  dir = "ltr",
  activeNav = "none",
  children,
}) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const year = new Date().getFullYear();
  const isRtl = dir === "rtl";
  const t = labels;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const go = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  const navCls = (key: MarketingNavKey) =>
    activeNav === key
      ? "text-[#64499D] dark:text-[#CFC2FF] font-semibold"
      : "hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors";

  return (
    <div className="landing-root min-h-screen relative overflow-x-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-[#FBF9FF] to-slate-50 dark:from-slate-950 dark:via-[#0c0a14] dark:to-slate-900">
      <MeshBackdrop />

      <header className="relative z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3">
          <nav
            className="landing-glass rounded-2xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3"
            aria-label="main navigation"
          >
            <button type="button" onClick={() => go("/")} className="shrink-0 min-w-0">
              <img
                src="/images/Jure logo.png"
                alt="JURE"
                className="w-[100px] sm:w-[140px] h-8 sm:h-10 object-contain"
                loading="eager"
                decoding="async"
              />
            </button>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <button type="button" onClick={() => go("/features")} className={navCls("features")}>
                {t.nav.features}
              </button>
              <button type="button" onClick={() => go("/about")} className={navCls("about")}>
                {t.nav.about}
              </button>
              <button type="button" onClick={() => go("/contact")} className={navCls("contact")}>
                {t.nav.contact}
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LangSwitcher lang={lang} onChange={onLangChange} />
              <ThemeToggle
                label={t.themeToggle?.label}
                title={t.themeToggle?.title}
              />
              <Button
                onClick={() => go("/signin")}
                variant="outline"
                size="sm"
                className="border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20 hidden sm:inline-flex"
              >
                {t.auth.signin}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden h-9 w-9 border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF]"
                aria-expanded={mobileOpen}
                aria-controls="marketing-mobile-menu"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </nav>

          {mobileOpen && (
            <div
              id="marketing-mobile-menu"
              className="md:hidden mt-2 landing-glass rounded-2xl p-3 flex flex-col gap-1"
            >
              {[
                { to: "/features", label: t.nav.features, key: "features" as const },
                { to: "/about", label: t.nav.about, key: "about" as const },
                { to: "/contact", label: t.nav.contact, key: "contact" as const },
              ].map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  className={`w-full text-start px-3 py-3 rounded-xl text-sm font-medium hover:bg-[#64499D]/10 dark:hover:bg-[#64499D]/20 transition-colors ${
                    activeNav === item.key ? "text-[#64499D] dark:text-[#CFC2FF]" : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <Button
                onClick={() => go("/signin")}
                className="mt-2 w-full bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white"
              >
                {t.auth.signin}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 min-w-0">{children}</main>

      <footer className="relative z-10 border-t border-[#64499D]/15 dark:border-[#8B6FD1]/20 bg-slate-950/95 dark:bg-black text-white py-8 sm:py-10 backdrop-blur-md mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className={`flex flex-col md:flex-row justify-between items-center gap-5 sm:gap-6 text-center md:text-start ${
              isRtl ? "md:flex-row-reverse" : ""
            }`}
          >
            <img
              src="/images/Jure logo.png"
              alt="JURE"
              className="w-[120px] h-8 object-contain"
              loading="lazy"
              decoding="async"
            />
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-300">
              <button type="button" onClick={() => go("/privacy")} className="hover:text-white transition-colors">
                {t.footer.privacy}
              </button>
              <button type="button" onClick={() => go("/terms")} className="hover:text-white transition-colors">
                {t.footer.terms}
              </button>
              <button type="button" onClick={() => go("/status")} className="hover:text-white transition-colors">
                {t.footer.status}
              </button>
            </div>
            <div className="text-slate-400 text-sm">
              © {year} JURE. {t.footer.rights}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingShell;
