/**
 * Optional analytics provider wiring.
 *
 * Attach a tracker only when an env ID is present so the marketing site
 * stays tracker-free by default. Supports GA4 via gtag.
 */
import { setAnalyticsProvider, type AnalyticsEvent } from "./analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadGtag(measurementId: string): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("ga4-gtag")) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });

  const script = document.createElement("script");
  script.id = "ga4-gtag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export function initAnalyticsProvider(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!measurementId) return;

  loadGtag(measurementId);
  setAnalyticsProvider((event: AnalyticsEvent) => {
    window.gtag?.("event", event.name, event.props ?? {});
  });
}
