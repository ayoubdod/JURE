import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import { isMarketingLocale, localePath, type MarketingLocale } from "@/marketing/site";
import { getMarketingDict } from "@/marketing/i18n";
import { getRoute } from "@/marketing/routes";
import { swapLocaleInPath } from "@/marketing/MarketingLocale";
import { track, MarketingEvents } from "@/lib/analytics";
import JureLogo from "@/components/common/JureLogo";
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
  /** Transparent-on-purple nav that sits on a full-bleed dark hero (homepage). */
  darkHero?: boolean;
  /** Homepage closing CTA fused into the footer wash. */
  closingCta?: React.ReactNode;
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
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="landing-nav-icon h-9 w-9 shrink-0 hover:bg-[#20004D]/5 dark:hover:bg-white/10"
        aria-label={MARKETING_LANG_LABELS[lang]}
        title={MARKETING_LANG_LABELS[lang]}
      >
        <Globe className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-[9rem]">
      {(["fr", "en", "ar"] as MarketingLang[]).map((code) => (
        <DropdownMenuItem
          key={code}
          onClick={() => {
            if (code === lang) return;
            onNavigate(swapLocaleInPath(pathname, code), code);
          }}
          className={code === lang ? "font-medium text-[var(--jure-blue)]" : ""}
        >
          {MARKETING_LANG_LABELS[code]}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const NAV_ITEMS: Array<{ key: Exclude<MarketingNavKey, "none">; slug: string }> = [
  { key: "features", slug: "features" },
  { key: "pricing", slug: "pricing" },
  { key: "security", slug: "security" },
  { key: "insights", slug: "insights" },
  { key: "about", slug: "about" },
  { key: "contact", slug: "contact" },
];

const FOOTER_PLATFORM_SLUGS = ["features", "pricing", "security"];
const FOOTER_DOCS_LABEL: Record<MarketingLang, string> = {
  en: "Documentation",
  fr: "Documentation",
  ar: "الوثائق",
};
const FOOTER_SOLUTION_KEYS = [
  "solutionsLawFirms",
  "juria",
  "legalAi",
  "legalCaseManagement",
  "legalPracticeManagement",
  "legalDocumentManagement",
  "legalOperations",
  "legalKnowledgeManagement",
  "responsibleLegalAi",
];
const FOOTER_COMPANY_KEYS = ["about", "contact", "community", "insights"];

const MarketingShell: React.FC<MarketingShellProps> = ({
  lang: langProp,
  onLangChange,
  activeNav = "none",
  darkHero = false,
  closingCta,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ lang?: string }>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const year = new Date().getFullYear();

  // URL is the source of truth for the locale; fall back to the page prop
  // for any context still rendered outside the locale-prefixed tree.
  const lang: MarketingLang = isMarketingLocale(params.lang) ? params.lang : langProp;
  const dict = getMarketingDict(lang);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const handleLangNavigate = (to: string, next: MarketingLang) => {
    track(MarketingEvents.LanguageSwitch, { from: lang, to: next });
    onLangChange(next);
    closeMobile();
    navigate(to);
  };

  const overlayNav = darkHero && !navScrolled;

  const navCls = (key: MarketingNavKey) =>
    `landing-nav-link ${activeNav === key ? "landing-nav-link--active" : ""}`;

  const navLabel = (key: Exclude<MarketingNavKey, "none">) => dict.nav[key];

  const footerLink = (label: string, slug: string) => (
    <Link
      key={slug}
      to={localePath(lang, slug)}
      className="landing-close__link"
    >
      {label}
    </Link>
  );

  return (
    <div
      className={`landing-root min-h-screen relative overflow-x-hidden text-[var(--landing-ink)] bg-[var(--landing-canvas)] ${
        darkHero ? "landing-root--dark-hero" : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--jure-blue)] focus:shadow focus:outline-none focus:ring-2 focus:ring-[var(--jure-blue)]"
      >
        {dict.a11y.skipToContent}
      </a>

      <header
        className={`landing-nav fixed top-0 inset-x-0 z-30 px-4 sm:px-8 lg:px-10 pt-3 sm:pt-4 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          navScrolled ? "landing-nav--scrolled" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <nav
            className={`landing-nav__bar flex items-center justify-between gap-2 sm:gap-3 transition-[min-height,padding,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              navScrolled
                ? "min-h-14 py-1.5 sm:py-2"
                : "min-h-[3.75rem] py-2 sm:py-2.5"
            }`}
            aria-label={dict.a11y.mainNav}
          >
            <Link to={localePath(lang)} className="shrink-0 min-w-0" onClick={closeMobile}>
              <JureLogo inverted={overlayNav} className="h-7 sm:h-8 w-auto" />
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
              <span className="landing-nav-icon-wrap inline-flex">
                <ThemeToggle label={dict.themeToggle.label} title={dict.themeToggle.title} />
              </span>
              <Button
                asChild
                size="sm"
                className="landing-btn-primary hidden sm:inline-flex"
              >
                <Link to="/signin">{dict.auth.signin}</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="landing-nav-icon lg:hidden h-9 w-9"
                aria-expanded={mobileOpen}
                aria-controls="marketing-mobile-menu"
                aria-label={mobileOpen ? dict.a11y.closeMenu : dict.a11y.openMenu}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </nav>

          {mobileOpen && (
            <div
              id="marketing-mobile-menu"
              className="lg:hidden mt-2 landing-nav-mobile p-3 flex flex-col gap-1"
            >
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  to={localePath(lang, item.slug)}
                  onClick={closeMobile}
                  className={`w-full text-start px-3 py-3 rounded-xl text-sm font-medium hover:bg-[#20004D]/5 dark:hover:bg-white/8 transition-colors ${
                    activeNav === item.key ? "landing-nav-link--active" : "landing-nav-link"
                  }`}
                >
                  {navLabel(item.key)}
                </Link>
              ))}
              <Button
                asChild
                className="mt-2 w-full landing-btn-primary"
              >
                <Link to="/signin" onClick={closeMobile}>
                  {dict.auth.signin}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main
        id="main-content"
        className={`relative z-10 min-w-0 ${darkHero ? "" : "landing-main-offset"}`}
      >
        {children}
      </main>

      <footer
        className={`landing-close ${closingCta ? "landing-close--cta" : ""}`}
      >
        <div className="landing-close__glow" aria-hidden />

        {closingCta ? (
          <div className="landing-close__cta-wrap">{closingCta}</div>
        ) : null}

        <div className="landing-close__body">
          <div className="landing-close__grid">
            <div className="landing-close__brand">
              <Link to={localePath(lang)} className="inline-flex">
                <JureLogo inverted className="h-7 w-auto" />
              </Link>
              <p className="landing-close__tagline">{dict.footer.tagline}</p>
            </div>

            <div>
              <h2 className="landing-close__heading">{dict.footer.platformHeading}</h2>
              <div className="landing-close__links">
                {FOOTER_PLATFORM_SLUGS.map((slug) =>
                  footerLink(getRoute(slug === "features" ? "features" : slug).label[lang], slug)
                )}
                <a
                  href=""
                  className="landing-close__link"
                  onClick={(e) => e.preventDefault()}
                >
                  {FOOTER_DOCS_LABEL[lang]}
                </a>
              </div>
            </div>

            <div>
              <h2 className="landing-close__heading">{dict.footer.solutionsHeading}</h2>
              <div className="landing-close__links">
                {FOOTER_SOLUTION_KEYS.map((key) => {
                  const route = getRoute(key);
                  return footerLink(route.label[lang], route.slug);
                })}
              </div>
            </div>

            <div>
              <h2 className="landing-close__heading">{dict.footer.companyHeading}</h2>
              <div className="landing-close__links">
                {FOOTER_COMPANY_KEYS.map((key) => {
                  const route = getRoute(key);
                  return footerLink(route.label[lang], route.slug);
                })}
              </div>
            </div>

            <div>
              <h2 className="landing-close__heading">{dict.footer.legalHeading}</h2>
              <div className="landing-close__links">
                {footerLink(dict.footer.privacy, "privacy")}
                {footerLink(dict.footer.terms, "terms")}
                {footerLink(dict.footer.status, "status")}
              </div>
            </div>
          </div>

          <p className="landing-close__rights">
            © {year} JURE. {dict.footer.rights}
          </p>
        </div>

        <div className="landing-close__monument" dir="ltr" aria-hidden="true">
          <JureLogo inverted alt="" className="landing-close__wordmark" />
        </div>
      </footer>
    </div>
  );
};

export default MarketingShell;
