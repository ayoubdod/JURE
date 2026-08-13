/// <reference types="vite/client" />

declare module "*.md?raw" {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE?: string;
  /** Set to "true" to show Juria in the app and landing page */
  readonly VITE_JURIA_ENABLED?: string;
  readonly REACT_APP_API_URL?: string;
  readonly NEXT_PUBLIC_API_URL?: string;
  /** Canonical site origin for SEO (defaults to https://jure.ma) */
  readonly VITE_SITE_URL?: string;
  /** Google Search Console HTML tag verification token */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string;
  /** GA4 measurement ID (e.g. G-XXXXXXXX). When unset, analytics stay buffered only. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
