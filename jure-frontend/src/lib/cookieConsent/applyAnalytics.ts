import { clearAnalyticsProvider } from "@/lib/analytics";
import { initAnalyticsProvider } from "@/lib/initAnalytics";
import { analyticsMayLoad, type ConsentDecision } from "./logic";

/** Remove a previously injected GA4 tag. Safe to call when none was loaded. */
export function unloadAnalytics(): void {
  clearAnalyticsProvider();
  if (typeof document === "undefined") return;
  document.getElementById("ga4-gtag")?.remove();
  document
    .querySelectorAll('script[src*="googletagmanager.com/gtag"]')
    .forEach((node) => node.remove());
  if (typeof window !== "undefined") {
    delete window.gtag;
    delete window.dataLayer;
  }
}

export function applyAnalyticsConsent(args: {
  measurementId?: string | null;
  analyticsConfigured: boolean;
  decision: ConsentDecision | null | undefined;
}): void {
  if (analyticsMayLoad(args)) {
    initAnalyticsProvider();
    return;
  }
  unloadAnalytics();
}
