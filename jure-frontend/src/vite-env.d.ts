/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE?: string;
  /** Set to "true" to show Juria in the app and landing page */
  readonly VITE_JURIA_ENABLED?: string;
  readonly REACT_APP_API_URL?: string;
  readonly NEXT_PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
