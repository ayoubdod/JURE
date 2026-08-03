import React from "react";
import { useNavigate } from "react-router";
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
  <div className="inline-flex rounded-lg overflow-hidden border border-[#64499D]/20 dark:border-[#8B6FD1]/30 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
    {(["fr", "en", "ar"] as MarketingLang[]).map((code) => (
      <button
        key={code}
        type="button"
        onClick={() => onChange(code)}
        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors ${
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
  const year = new Date().getFullYear();
  const isRtl = dir === "rtl";
  const t = labels;

  const navCls = (key: MarketingNavKey) =>
    activeNav === key
      ? "text-[#64499D] dark:text-[#CFC2FF] font-semibold"
      : "hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors";

  return (
    <div className="landing-root min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-[#FBF9FF] to-slate-50 dark:from-slate-950 dark:via-[#0c0a14] dark:to-slate-900">
      <MeshBackdrop />

      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
          <nav
            className="landing-glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
            aria-label="main navigation"
          >
            <button type="button" onClick={() => navigate("/")} className="shrink-0">
              <img
                src="/images/Jure logo.png"
                alt="JURE"
                className="w-[120px] sm:w-[140px] h-9 sm:h-10 object-contain"
                loading="eager"
                decoding="async"
              />
            </button>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <button type="button" onClick={() => navigate("/features")} className={navCls("features")}>
                {t.nav.features}
              </button>
              <button type="button" onClick={() => navigate("/about")} className={navCls("about")}>
                {t.nav.about}
              </button>
              <button type="button" onClick={() => navigate("/contact")} className={navCls("contact")}>
                {t.nav.contact}
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LangSwitcher lang={lang} onChange={onLangChange} />
              <ThemeToggle
                label={t.themeToggle?.label}
                title={t.themeToggle?.title}
              />
              <Button
                onClick={() => navigate("/signin")}
                variant="outline"
                className="border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20 hidden sm:inline-flex"
              >
                {t.auth.signin}
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-[#64499D]/15 dark:border-[#8B6FD1]/20 bg-slate-950/95 dark:bg-black text-white py-10 backdrop-blur-md mt-8">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`flex flex-col md:flex-row justify-between items-center gap-6 ${
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
            <div className="flex items-center gap-6 text-sm text-slate-300">
              <button type="button" onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">
                {t.footer.privacy}
              </button>
              <button type="button" onClick={() => navigate("/terms")} className="hover:text-white transition-colors">
                {t.footer.terms}
              </button>
              <button type="button" onClick={() => navigate("/status")} className="hover:text-white transition-colors">
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
