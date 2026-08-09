/**
 * Structural i18n audit: ensures en/fr/ar message trees have the same keys.
 * Run: npm run i18n:audit
 */
import { messages } from '../src/i18n/messages/index.ts';

function collectKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];
  if (obj === null || typeof obj !== 'object') {
    keys.push(prefix);
    return keys;
  }
  if (Array.isArray(obj)) {
    keys.push(prefix);
    return keys;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function diff(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((k) => !setB.has(k));
}

const locales = Object.keys(messages) as Array<keyof typeof messages>;
const keySets = Object.fromEntries(
  locales.map((l) => [l, collectKeys(messages[l]).sort()]),
) as Record<string, string[]>;

const base = 'en';
let failed = false;

console.log('JURE i18n audit');
console.log('Locales:', locales.join(', '));
console.log(`Base: ${base} (${keySets[base].length} leaf keys)\n`);

for (const locale of locales) {
  if (locale === base) continue;
  const missing = diff(keySets[base], keySets[locale]);
  const extra = diff(keySets[locale], keySets[base]);
  if (missing.length || extra.length) {
    failed = true;
    console.log(`[${locale}] mismatches vs ${base}`);
    if (missing.length) {
      console.log(`  Missing (${missing.length}):`);
      missing.slice(0, 40).forEach((k) => console.log(`    - ${k}`));
      if (missing.length > 40) console.log(`    … +${missing.length - 40} more`);
    }
    if (extra.length) {
      console.log(`  Extra (${extra.length}):`);
      extra.slice(0, 40).forEach((k) => console.log(`    - ${k}`));
    }
    console.log('');
  } else {
    console.log(`[${locale}] OK — ${keySets[locale].length} keys match ${base}`);
  }
}

if (failed) {
  console.error('\ni18n:audit failed — catalogs are out of sync.');
  process.exit(1);
}

console.log('\ni18n:audit passed.');
