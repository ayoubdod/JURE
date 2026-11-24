import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/messages/en';
import { fr } from '@/i18n/messages/fr';
import { ar } from '@/i18n/messages/ar';

function leafPaths(value: unknown, prefix = ''): string[] {
  if (value == null || typeof value !== 'object') return prefix ? [prefix] : [];
  if (Array.isArray(value)) return prefix ? [prefix] : [];
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return prefix ? [prefix] : [];
  return keys.flatMap((k) =>
    leafPaths((value as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k)
  );
}

describe('cases.workspaces i18n key parity', () => {
  // en/fr/ar are typed as AppMessages from types.ts; tsc fails on missing/extra typed keys.
  // Leaf-path parity catches structural drift (e.g. empty nested objects) across locales.
  const enKeys = new Set(leafPaths(en.cases.workspaces));
  const frKeys = new Set(leafPaths(fr.cases.workspaces));
  const arKeys = new Set(leafPaths(ar.cases.workspaces));

  it('en workspaces keys exist (types.ts contract via AppMessages)', () => {
    expect(enKeys.size).toBeGreaterThan(0);
  });

  it('fr matches en under cases.workspaces', () => {
    const missing = [...enKeys].filter((k) => !frKeys.has(k));
    const extra = [...frKeys].filter((k) => !enKeys.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('ar matches en under cases.workspaces', () => {
    const missing = [...enKeys].filter((k) => !arKeys.has(k));
    const extra = [...arKeys].filter((k) => !enKeys.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});
