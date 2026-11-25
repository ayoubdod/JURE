import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAppTranslation } from "@/i18n";
import { localePath } from "@/marketing/site";
import { fetchConsent, saveConsent } from "@/lib/cookieConsent/api";
import { applyAnalyticsConsent } from "@/lib/cookieConsent/applyAnalytics";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/lib/cookieConsent/events";
import "@/components/common/aurora.css";
import {
  bannerRequired,
  optionalSelection,
  writeForAcceptAll,
  writeForCustom,
  writeForReject,
  type ConsentEnvelope,
} from "@/lib/cookieConsent/logic";

function isMarketingPath(pathname: string): boolean {
  return /^\/(en|fr|ar)(\/|$)/.test(pathname);
}

export default function CookieConsentHost() {
  const { lang, t } = useAppTranslation();
  const location = useLocation();
  const copy = t.cookies;
  const [envelope, setEnvelope] = useState<ConsentEnvelope | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bannerOpen, setBannerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchConsent()
      .then((next) => {
        if (cancelled) return;
        setEnvelope(next);
        setStatus("ready");
        setBannerOpen(bannerRequired(next.decision));
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setBannerOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    applyAnalyticsConsent({
      measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
      analyticsConfigured: envelope?.analytics_configured === true,
      decision: status === "error" ? null : envelope?.decision,
    });
  }, [status, envelope]);

  useEffect(() => {
    const open = () => {
      const selection = optionalSelection(
        envelope?.decision,
        envelope?.analytics_configured === true,
      );
      setFunctional(selection.functional);
      setAnalytics(selection.analytics);
      setSaveError(false);
      setDialogOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
  }, [envelope]);

  const applySaved = (next: ConsentEnvelope) => {
    setEnvelope(next);
    setStatus("ready");
    setBannerOpen(false);
    setDialogOpen(false);
    setSaveError(false);
  };

  const persist = async (body: Parameters<typeof saveConsent>[0]) => {
    setSaving(true);
    setSaveError(false);
    try {
      applySaved(await saveConsent(body));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const openCustomize = () => {
    const selection = optionalSelection(
      envelope?.decision,
      envelope?.analytics_configured === true,
    );
    setFunctional(selection.functional);
    setAnalytics(selection.analytics);
    setSaveError(false);
    setDialogOpen(true);
  };

  const analyticsConfigured = envelope?.analytics_configured === true;
  const policyHref = localePath(lang, "cookies");
  const showLauncher = !bannerOpen && status !== "loading" && !isMarketingPath(location.pathname);

  return (
    <>
      {bannerOpen ? (
        <div
          className="auth-hero-stage fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-white/10 p-4 text-white shadow-[0_-18px_50px_-24px_rgba(41,73,232,0.65)] sm:p-5"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          role="region"
          aria-labelledby="cookie-banner-title"
        >
          <div className="auth-hero-aurora" aria-hidden />
          <div className="auth-hero-grid" aria-hidden />
          <div className="relative z-[1] mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 id="cookie-banner-title" className="font-display text-base font-semibold text-white">
                {copy.bannerTitle}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                {copy.bannerBody}{" "}
                <Link to={policyHref} className="font-semibold text-[#b968ff] underline underline-offset-2">
                  {copy.policyLink}
                </Link>
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto">
              <Button
                type="button"
                className="auth-hero-btn"
                disabled={saving}
                onClick={() => persist(writeForAcceptAll())}
              >
                {copy.acceptAll}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                disabled={saving}
                onClick={() => persist(writeForReject())}
              >
                {copy.reject}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                disabled={saving}
                onClick={openCustomize}
              >
                {copy.customize}
              </Button>
            </div>
          </div>
          {saveError ? <p className="relative z-[1] mx-auto mt-3 max-w-5xl text-sm text-red-200">{copy.saveError}</p> : null}
        </div>
      ) : null}

      {showLauncher ? (
        <button
          type="button"
          className="auth-hero-btn fixed bottom-4 end-4 z-40 rounded-full px-3 py-2 text-xs font-semibold"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          onClick={openCustomize}
        >
          {copy.launcher}
        </button>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#2949e8]/20 md:max-w-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2949e8] via-[#5b4ef0] to-[#a855f7]" aria-hidden />
          <DialogHeader>
            <DialogTitle className="text-[#20004d] dark:text-white">{copy.preferencesTitle}</DialogTitle>
            <DialogDescription>{copy.preferencesIntro}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-4">
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{copy.essentialTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.essentialBody}</p>
              </div>
              <Switch checked disabled aria-label={copy.essentialLocked} className="data-[state=checked]:bg-[#2949e8]" />
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{copy.functionalTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.functionalBody}</p>
              </div>
              <Switch
                checked={functional}
                onCheckedChange={setFunctional}
                aria-label={copy.functionalTitle}
                className="data-[state=checked]:bg-[#2949e8]"
              />
            </li>
            <li className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{copy.analyticsTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analyticsConfigured ? copy.analyticsBody : copy.analyticsUnused}
                </p>
              </div>
              <Switch
                checked={analyticsConfigured && analytics}
                disabled={!analyticsConfigured}
                onCheckedChange={setAnalytics}
                aria-label={copy.analyticsTitle}
                className="data-[state=checked]:bg-[#2949e8]"
              />
            </li>
          </ul>
          <p className="text-sm">
            <Link to={policyHref} className="font-semibold text-[#2949e8] underline underline-offset-2 dark:text-[#b968ff]" onClick={() => setDialogOpen(false)}>
              {copy.policyLink}
            </Link>
          </p>
          {saveError ? <p className="text-sm text-red-700 dark:text-red-300">{copy.saveError}</p> : null}
          <Button
            type="button"
            className="auth-hero-btn"
            disabled={saving}
            onClick={() =>
              persist(
                writeForCustom(
                  { functional, analytics },
                  analyticsConfigured,
                  envelope?.decision != null,
                ),
              )
            }
          >
            {saving ? copy.saving : copy.save}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
