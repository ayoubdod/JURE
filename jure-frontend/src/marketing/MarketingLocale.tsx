import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import {
  DEFAULT_LOCALE,
  dirForLocale,
  isMarketingLocale,
  localePath,
  type MarketingLocale,
} from "./site";
import { getMarketingDict, type MarketingDict } from "./i18n";

const LANG_STORAGE_KEY = "lang";

export function readStoredLocale(): MarketingLocale {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isMarketingLocale(stored ?? undefined)) return stored as MarketingLocale;
  } catch {
    // localStorage unavailable (SSR/privacy mode) — fall through to browser detection
  }
  if (typeof navigator !== "undefined") {
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("ar")) return "ar";
  }
  return DEFAULT_LOCALE;
}

interface MarketingLocaleContextValue {
  lang: MarketingLocale;
  dir: "ltr" | "rtl";
  dict: MarketingDict;
  /** Locale-prefixed path for a marketing slug ("" = home). */
  path: (slug?: string) => string;
}

const MarketingLocaleContext = createContext<MarketingLocaleContextValue | null>(null);

export function useMarketingLang(): MarketingLocaleContextValue {
  const ctx = useContext(MarketingLocaleContext);
  if (!ctx) {
    throw new Error("useMarketingLang must be used inside MarketingLocaleLayout");
  }
  return ctx;
}

/** Swap the locale prefix of the current marketing pathname. */
export function swapLocaleInPath(pathname: string, next: MarketingLocale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isMarketingLocale(segments[0])) {
    segments[0] = next;
    return `/${segments.join("/")}`;
  }
  return localePath(next);
}

/**
 * Layout route mounted at "/:lang". Validates the locale, synchronizes the
 * legacy localStorage("lang") key and <html lang dir>, and provides the
 * marketing locale context to all nested marketing pages.
 */
const MarketingLocaleLayout: React.FC = () => {
  const params = useParams<{ lang: string }>();
  const location = useLocation();
  const rawLang = params.lang;
  const valid = isMarketingLocale(rawLang);
  const lang: MarketingLocale = valid ? (rawLang as MarketingLocale) : DEFAULT_LOCALE;

  // Synchronous write so children that read localStorage("lang") during their
  // first render (legacy pages) pick up the URL locale on deep links.
  if (valid) {
    try {
      if (localStorage.getItem(LANG_STORAGE_KEY) !== lang) {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      }
    } catch {
      // ignore storage failures
    }
  }

  useEffect(() => {
    if (!valid) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dirForLocale(lang);
  }, [lang, valid]);

  const value = useMemo<MarketingLocaleContextValue>(
    () => ({
      lang,
      dir: dirForLocale(lang),
      dict: getMarketingDict(lang),
      path: (slug = "") => localePath(lang, slug),
    }),
    [lang]
  );

  if (!valid) {
    // "/:lang" also catches unknown unprefixed paths like "/xyz". Re-prefix
    // them with the preferred locale; unknown slugs then hit the nested 404.
    const rest = location.pathname.split("/").filter(Boolean).join("/");
    const target = localePath(readStoredLocale(), rest);
    return <Navigate to={target} replace />;
  }

  return (
    <MarketingLocaleContext.Provider value={value}>
      <Outlet />
    </MarketingLocaleContext.Provider>
  );
};

/** Redirects a legacy unprefixed marketing URL to its locale-prefixed home. */
export const LegacyMarketingRedirect: React.FC<{ slug?: string }> = ({ slug = "" }) => {
  const target = localePath(readStoredLocale(), slug);
  return <Navigate to={target} replace />;
};

export default MarketingLocaleLayout;
