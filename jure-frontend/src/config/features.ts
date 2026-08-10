/**
 * Feature flags. Juria is off by default until the product is ready to ship.
 * Enable with VITE_JURIA_ENABLED=true in the frontend env.
 */
export const JURIA_ENABLED = import.meta.env.VITE_JURIA_ENABLED === 'true';

/**
 * Explicit demo environment only. When false (default / production), the app must
 * never seed or display sample matters, clients, tasks, or activity as if they
 * belonged to the authenticated cabinet.
 * Enable with VITE_DEMO_MODE=true for local demos.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
