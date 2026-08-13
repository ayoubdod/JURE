import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import MeshBackdrop from "@/components/landing/MeshBackdrop";
import { isMarketingLocale, localePath, type MarketingLocale } from "@/marketing/site";
import { getMarketingDict } from "@/marketing/i18n";
import { getRoute } from "@/marketing/routes";
import { swapLocaleInPath } from "@/marketing/MarketingLocale";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

export type MarketingLang = MarketingLocale;
export type MarketingNavKey =
  | "features"
  | "pricing"
  | "security"
  | "insights"
  | "about"
  | "contact"
  | "none";

/**
 * Legacy prop shape kept so existing pages keep compiling. The shell now
 * sources nav/footer labels from the central marketing dictionaries, which
 * guarantees consistent trilingual chrome everywhere.
 */
export type MarketingLabels = {
  nav?: Partial<Record<string, string>>;
  auth?: { signin: string };
  themeToggle?: { label: string; title: string };
  footer?: Partial<Record<string, string>>;
};

type MarketingShellProps = {
  lang: MarketingLang;
  onLangChange: (l: MarketingLang) => void;
  labels?: MarketingLabels;
  dir?: "ltr" | "rtl";
  activeNav?: MarketingNavKey;
  children: React.ReactNode;
};

const MARKETING_LANG_LABELS: Record<MarketingLang, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

const LangSwitcher: React.FC<{
  lang: MarketingLang;
  pathname: string;
  onNavigate: (to: string, next: MarketingLang) => void;
}> = ({ lang, pathname, onNavigate }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-[#64499D]/20 dark:border-[#8B6FD1]/30 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm shrink-0">
    {(["fr", "en", "ar"] as MarketingLang[]).map((code) => {
      const href = swapLocaleInPath(pathname, code);
      return (
        <Link
          key={code}
          to={href}
          title={MARKETING_LANG_LABELS[code]}
          aria-label={MARKETING_LANG_LABELS[code]}
          aria-current={lang === code ? "true" : undefined}
          onClick={(e) => {
            if (code === lang) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            onNavigate(href, code);
          }}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors whitespace-nowrap ${
            lang === code
              ? "bg-[#64499D] text-white"
              : "text-slate-700 dark:text-slate-200 hover:bg-[#F4F1FF] dark:hover:bg-[#64499D]/20"
          }`}
        >
          <span className="sm:hidden">{code.toUpperCase()}</span>
          <span className="hidden sm:inline">{MARKETING_LANG_LABELS[code]}</span>
        </Link>
      );
    })}
  </div>
);

const NAV_ITEMS: Array<{ key: Exclude<MarketingNavKey, "none">; slug: string }> = [
  { key: "features", slug: "features" },
  { key: "pricing", slug: "pricing" },
  { key: "security", slug: "security" },
  { key: "insights", slug: "insights" },
  { key: "about", slug: "about" },
  { key: "contact", slug: "contact" },
];

const FOOTER_PLATFORM_SLUGS = ["features", "pricing", "security", "demo", "docs"];
const FOOTER_SOLUTION_KEYS = [
  "solutionsLawFirms",
  "solutionsLegalDepartments",
  "juria",
  "legalAi",
  "legalCaseManagement",
  "legalPracticeManagement",
  "legalResearch",
  "legalDocumentManagement",
  "legalOperations",
  "legalKnowledgeManagement",
  "responsibleLegalAi",
];
const FOOTER_COMPANY_KEYS = ["about", "contact", "community", "insights"];

const MarketingShell: React.FC<MarketingShellProps> = ({
  lang: langProp,
  onLangChange,
  dir,
  activeNav = "none",
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ lang?: string }>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const year = new Date().getFullYear();

  // URL is the source of truth for the locale; fall back to the page prop
  // for any context still rendered outside the locale-prefixed tree.
  const lang: MarketingLang = isMarketingLocale(params.lang) ? params.lang : langProp;
  const dict = getMarketingDict(lang);
  const isRtl = (dir ?? (lang === "ar" ? "rtl" : "ltr")) === "rtl";

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleLangNavigate = (to: string, next: MarketingLang) => {
    track(MarketingEvents.LanguageSwitch, { from: lang, to: next });
    onLangChange(next);
    closeMobile();
    navigate(to);
  };

  const navCls = (key: MarketingNavKey) =>
    activeNav === key
      ? "text-[#64499D] dark:text-[#CFC2FF] font-semibold"
      : "hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors";

  const navLabel = (key: Exclude<MarketingNavKey, "none">) => dict.nav[key];

  const footerLink = (label: string, slug: string) => (
    <Link
      key={slug}
      to={localePath(lang, slug)}
      className="block text-sm text-slate-400 hover:text-white transition-colors text-start"
    >
      {label}
    </Link>
  );

  return (
    <div className="landing-root min-h-screen relative overflow-x-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-[#FBF9FF] to-slate-50 dark:from-slate-950 dark:via-[#0c0a14] dark:to-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#64499D] focus:shadow focus:outline-none focus:ring-2 focus:ring-[#64499D]"
      >
        Skip to content
      </a>
      <MeshBackdrop />

      <header className="relative z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3">
          <nav
            className="landing-glass rounded-2xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3"
            aria-label="main navigation"
          >
            <Link to={localePath(lang)} className="shrink-0 min-w-0" onClick={closeMobile}>
              <img
                src="/images/jure-logo.png"
                alt="JURE"
                className="w-[100px] sm:w-[140px] h-8 sm:h-10 object-contain"
                loading="eager"
                decoding="async"
              />
            </Link>

            <div className="hidden lg:flex items-center gap-5 text-sm font-medium">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  to={localePath(lang, item.slug)}
                  className={navCls(item.key)}
                >
                  {navLabel(item.key)}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LangSwitcher
                lang={lang}
                pathname={location.pathname}
                onNavigate={handleLangNavigate}
              />
              <ThemeToggle label={dict.themeToggle.label} title={dict.themeToggle.title} />
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20 hidden sm:inline-flex"
              >
                <Link to="/signin">{dict.auth.signin}</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden h-9 w-9 border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF]"
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
              className="lg:hidden mt-2 landing-glass rounded-2xl p-3 flex flex-col gap-1"
            >
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  to={localePath(lang, item.slug)}
                  onClick={closeMobile}
                  className={`w-full text-start px-3 py-3 rounded-xl text-sm font-medium hover:bg-[#64499D]/10 dark:hover:bg-[#64499D]/20 transition-colors ${
                    activeNav === item.key ? "text-[#64499D] dark:text-[#CFC2FF]" : ""
                  }`}
                >
                  {navLabel(item.key)}
                </Link>
              ))}
              <Button
                asChild
                className="mt-2 w-full bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white"
              >
                <Link to="/signin" onClick={closeMobile}>
                  {dict.auth.signin}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="relative z-10 min-w-0">
        {children}
      </main>

      <footer className="relative z-10 border-t border-[#64499D]/15 dark:border-[#8B6FD1]/20 bg-slate-950/95 dark:bg-black text-white py-10 sm:py-14 backdrop-blur-md mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`grid grid-cols-2 md:grid-cols-5 gap-8 ${isRtl ? "text-right" : ""}`}>
            <div className="col-span-2 md:col-span-1">
              <Link to={localePath(lang)}>
                <img
                  src="/images/jure-logo.png"
                  alt="JURE"
                  className="w-[120px] h-8 object-contain mb-3"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <p className="text-sm text-slate-400">{dict.footer.tagline}</p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-3">
                {dict.footer.platformHeading}
              </h2>
              <div className="space-y-2">
                {FOOTER_PLATFORM_SLUGS.map((slug) =>
                  footerLink(getRoute(slug === "features" ? "features" : slug).label[lang], slug)
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-3">
                {dict.footer.solutionsHeading}
              </h2>
              <div className="space-y-2">
                {FOOTER_SOLUTION_KEYS.map((key) => {
                  const route = getRoute(key);
                  return footerLink(route.label[lang], route.slug);
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-3">
                {dict.footer.companyHeading}
              </h2>
              <div className="space-y-2">
                {FOOTER_COMPANY_KEYS.map((key) => {
                  const route = getRoute(key);
                  return footerLink(route.label[lang], route.slug);
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-3">
                {dict.footer.legalHeading}
              </h2>
              <div className="space-y-2">
                {footerLink(dict.footer.privacy, "privacy")}
                {footerLink(dict.footer.terms, "terms")}
                {footerLink(dict.footer.status, "status")}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-slate-400 text-sm text-center md:text-start">
            © {year} JURE. {dict.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingShell;
