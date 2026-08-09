import type { MarketingLocale } from "../site";
import type { FaqEntry } from "../structuredData";

/**
 * Content contract for the 8 high-intent landing pages. Each page must be
 * genuinely useful (definition + education + product) — not a thin doorway
 * page — and must only describe capabilities JURE actually ships.
 */
export interface IntentContent {
  /** One meaningful H1 (differs from the <title>). */
  h1: string;
  /** 2–3 sentence plain-language opening under the H1. */
  intro: string;
  /** "What is X?" — educational definition, brand-independent. */
  definition: { title: string; body: string };
  /** The problem this category of software solves. */
  problem: { title: string; body: string };
  /** How JURE approaches it — truthful capabilities only. */
  approach: { title: string; body: string; points: string[] };
  /** Workflow shown as an animated diagram (4–5 steps). */
  workflow: { title: string; steps: string[] };
  /** 3 concrete use cases. */
  useCases: { title: string; items: Array<{ title: string; body: string }> };
  /** Security note (links to /security). */
  security: { title: string; body: string };
  /** 4–6 page-specific FAQs (rendered visibly + FAQPage JSON-LD). */
  faqs: FaqEntry[];
  /** Route keys of related pages for internal linking. */
  related: string[];
  /** Closing CTA copy. */
  cta: { title: string; body: string };
}

export type IntentContentMap = Record<string, Record<MarketingLocale, IntentContent>>;
