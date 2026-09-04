import type { JuriaProjectSource } from '@/types/juria';

export type LibraryScopeId = 'PERSONAL' | 'LOCAL' | 'INTERNATIONAL';

export type LibraryDocRow =
  | { type: 'header'; scope: LibraryScopeId; sources: JuriaProjectSource[]; key: string }
  | { type: 'doc'; source: JuriaProjectSource; key: string };

const LIBRARY_KINDS = new Set(['LIBRARY', 'LIBRARY_LOCAL', 'LIBRARY_INTERNATIONAL']);
const SCOPE_ORDER: LibraryScopeId[] = ['PERSONAL', 'LOCAL', 'INTERNATIONAL'];

export function isLibrarySource(source: JuriaProjectSource): boolean {
  return LIBRARY_KINDS.has(source.kind);
}

export function libraryScopeFromSource(source: JuriaProjectSource): LibraryScopeId {
  const meta = source.metadata?.library_scope;
  if (meta === 'PERSONAL' || meta === 'LOCAL' || meta === 'INTERNATIONAL') return meta;
  if (source.kind === 'LIBRARY_INTERNATIONAL') return 'INTERNATIONAL';
  if (source.kind === 'LIBRARY_LOCAL') return 'LOCAL';
  return 'PERSONAL';
}

export function groupLibrarySources(sources: JuriaProjectSource[]): LibraryDocRow[] {
  const grouped = new Map<LibraryScopeId, JuriaProjectSource[]>();
  const selected: JuriaProjectSource[] = [];
  for (const source of sources) {
    if (!isLibrarySource(source)) continue;
    if (source.metadata?.linked_as === 'scope') {
      const scope = libraryScopeFromSource(source);
      const current = grouped.get(scope) ?? [];
      current.push(source);
      grouped.set(scope, current);
    } else {
      selected.push(source);
    }
  }

  const rows: LibraryDocRow[] = [];
  for (const scope of SCOPE_ORDER) {
    const items = grouped.get(scope);
    if (!items?.length) continue;
    rows.push({ type: 'header', scope, sources: items, key: `lib-${scope}` });
    for (const source of items) {
      rows.push({ type: 'doc', source, key: source.id });
    }
  }
  for (const source of selected) {
    rows.push({ type: 'doc', source, key: source.id });
  }
  return rows;
}
