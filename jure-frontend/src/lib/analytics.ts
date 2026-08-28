/**
 * Lightweight, provider-agnostic analytics event bus.
 *
 * No tracker is bundled: events are buffered until a provider is attached
 * (GA4, Plausible, PostHog, ...). This keeps the marketing site tracker-free
 * today while giving every CTA a stable event name for later.
 */

export type AnalyticsProps = Record<string, string | number | boolean>;

export interface AnalyticsEvent {
  name: string;
  props?: AnalyticsProps;
  timestamp: number;
}

type AnalyticsProvider = (event: AnalyticsEvent) => void;

const BUFFER_LIMIT = 100;
const buffer: AnalyticsEvent[] = [];
let provider: AnalyticsProvider | null = null;

export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next;
  while (buffer.length > 0) {
    const event = buffer.shift();
    if (event) provider(event);
  }
}

export function track(name: string, props?: AnalyticsProps): void {
  const event: AnalyticsEvent = { name, props, timestamp: Date.now() };
  if (provider) {
    provider(event);
    return;
  }
  if (buffer.length < BUFFER_LIMIT) buffer.push(event);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, props ?? {});
  }
}

/** Canonical marketing event names — keep stable for reporting. */
export const MarketingEvents = {
  HeroPrimaryCta: "marketing.hero.primary_cta",
  HeroSecondaryCta: "marketing.hero.secondary_cta",
  DemoOpened: "marketing.demo.opened",
  ContactCta: "marketing.contact.cta",
  SecurityCta: "marketing.security.cta",
  SignupCta: "marketing.signup.cta",
  LanguageSwitch: "marketing.language.switch",
  IntentPageCta: "marketing.intent_page.cta",
  InsightOpened: "marketing.insight.opened",
  SitelinkClick: "marketing.sitelink.click",
} as const;
