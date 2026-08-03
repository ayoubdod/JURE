/**
 * Feature flags. Juria is off by default until the product is ready to ship.
 * Enable with VITE_JURIA_ENABLED=true in the frontend env.
 */
export const JURIA_ENABLED = import.meta.env.VITE_JURIA_ENABLED === 'true';
