// src/lib/currency.ts
import { useState } from "react";
export type Currency =
  | "USD" | "EUR" | "GBP" | "MAD" | "CAD" | "AUD"
  | "INR" | "AED" | "SAR" | "EGP";

// ---------- helpers ----------
const isBrowser = typeof window !== "undefined";

function safeGetItem(key: string): string | null {
  try {
    return isBrowser ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeSetItem(key: string, val: string) {
  try {
    if (isBrowser) window.localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

// ---------- heuristics for default currency ----------
const TZ_TO_CURRENCY: Record<string, Currency> = {
  "Africa/Casablanca": "MAD",
  "Europe/Paris": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Berlin": "EUR",
  "Europe/London": "GBP",
  "America/New_York": "USD",
  "America/Los_Angeles": "USD",
  "Asia/Dubai": "AED",
  "Asia/Riyadh": "SAR",
  "Africa/Cairo": "EGP",
  "Asia/Kolkata": "INR",
  "Australia/Sydney": "AUD",
  "America/Toronto": "CAD",
};

const REGION_TO_CURRENCY: Record<string, Currency> = {
  US: "USD", CA: "CAD", GB: "GBP", FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  AE: "AED", SA: "SAR", EG: "EGP", IN: "INR", AU: "AUD", MA: "MAD",
};

export function autoDetectCurrency(): Currency {
  // 1) user override
  const saved = safeGetItem("currency") as Currency | null;
  if (saved) return saved;

  // 2) locale region (e.g. en-US -> US)
  if (isBrowser) {
    const loc = navigator.language || (Intl.DateTimeFormat().resolvedOptions().locale ?? "");
    const region = loc.split("-")[1]?.toUpperCase();
    if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];

    // 3) timezone hint
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_CURRENCY[tz]) return TZ_TO_CURRENCY[tz];
  }

  // 4) default
  return "USD";
}

// ---------- FX rates (USD base snapshot; override at runtime if you want) ----------
const FX_RATES_USD_SNAPSHOT: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  MAD: 9.95,
  CAD: 1.36,
  AUD: 1.52,
  INR: 83,
  AED: 3.67,
  SAR: 3.75,
  EGP: 49,
};

export function getFx(): Record<Currency, number> {
  const injected = isBrowser ? window.__FX_RATES : undefined;
  return injected ? { ...FX_RATES_USD_SNAPSHOT, ...injected } : FX_RATES_USD_SNAPSHOT;
}

export function convertFromUSD(amountUSD: number, to: Currency): number {
  const fx = getFx();
  return amountUSD * (fx[to] ?? 1);
}

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------- React hook ----------
export function useCurrency(): [Currency, (c: Currency) => void] {
  const [cur, setCur] = useState<Currency>(() => autoDetectCurrency());
  const set = (c: Currency) => {
    safeSetItem("currency", c);
    setCur(c);
  };
  return [cur, set];
}

export function currencyOptions(): Currency[] {
  return ["USD", "EUR", "GBP", "MAD", "CAD", "AUD", "INR", "AED", "SAR", "EGP"];
}

// USD baseline price points you convert from
export const USD_BASE = {
  monthly: { starter: 29, pro: 79, enterprise: 199 },
  yearly: { starter: 24, pro: 66, enterprise: 165 }, // per user / mo (billed yearly)
};

declare global {
  interface Window {
    __FX_RATES?: Partial<Record<Currency, number>>;
  }
}
