import { Link } from "react-router";
import MarketingShell from "@/components/landing/MarketingShell";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/i18n";
import { openCookiePreferences } from "@/lib/cookieConsent/events";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import "@/components/common/aurora.css";

const Cookies = () => {
  const { lang, path, dict } = useMarketingLang();
  const { t } = useAppTranslation();
  const copy = t.cookies;

  return (
    <MarketingShell lang={lang} onLangChange={() => undefined} activeNav="none">
      <RouteSeo routeKey="cookies" lang={lang} />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="bg-gradient-to-r from-[#2949e8] via-[#5b4ef0] to-[#a855f7] bg-clip-text font-display text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          {copy.policyTitle}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          {copy.policyUpdated}: 1.0
        </p>
        <p className="mt-6 text-base leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.policyIntro}</p>

        <section className="mt-8 rounded-xl border border-amber-300/80 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          <h2 className="font-semibold">{copy.pendingTitle}</h2>
          <p className="mt-2">{copy.pendingBody}</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">{copy.lawTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.lawBody}</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">{copy.categoriesTitle}</h2>
          <h3 className="font-semibold">{copy.essentialTitle}</h3>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.essentialDetail}</p>
          <h3 className="font-semibold">{copy.functionalTitle}</h3>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.functionalDetail}</p>
          <h3 className="font-semibold">{copy.analyticsTitle}</h3>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.analyticsDetail}</p>
          <h3 className="font-semibold">{copy.marketingTitle}</h3>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.marketingBody}</p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="font-display text-xl font-semibold">{copy.cookiesTitle}</h2>
          <ul className="list-disc space-y-2 ps-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
            <li>{copy.cookieAccess}</li>
            <li>{copy.cookieRefresh}</li>
            <li>{copy.cookieCsrf}</li>
            <li>{copy.cookieSession}</li>
            <li>{copy.cookieConsentId}</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">{copy.retentionTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.retentionBody}</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">{copy.fontsTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.fontsBody}</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">{copy.rightsTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.rightsBody}</p>
          <Button type="button" className="auth-hero-btn" onClick={openCookiePreferences}>
            {copy.launcher}
          </Button>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-semibold">{copy.contactTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{copy.contactBody}</p>
          <p className="text-sm">
            <Link to={path("privacy")} className="font-semibold text-[#2949e8] underline underline-offset-2 dark:text-[#b968ff]">
              {dict.footer.privacy}
            </Link>
          </p>
        </section>
      </article>
    </MarketingShell>
  );
};

export default Cookies;
