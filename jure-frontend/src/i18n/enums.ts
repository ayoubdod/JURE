import { getMessages } from './messages';
import type { Lang } from './types';
import type { AppMessages } from './messages/types';

type EnumGroup = keyof AppMessages['enums'];

function lookupInMap(map: Record<string, string>, value: string): string | undefined {
  return map[value] ?? map[value.toUpperCase()] ?? map[value.toLowerCase()];
}

/** Translate a stable enum identifier at presentation time. Never store the result. */
export function translateEnum(
  lang: Lang,
  group: EnumGroup,
  value: string | null | undefined,
): string {
  if (!value) return '';
  return lookupInMap(getMessages(lang).enums[group], value) ?? value;
}

/**
 * Translate any known case/task enum token (status, priority, type, role, …).
 * Falls back to a humanized token if the id is not in the catalogs.
 */
export function translateKnownEnum(lang: Lang, value: string | null | undefined): string {
  if (value == null || value === '') return '';
  const str = String(value);
  const t = getMessages(lang);
  const maps: Array<Record<string, string>> = [
    t.enums.caseStatus,
    t.enums.caseType,
    t.enums.taskStatus,
    t.enums.taskPriority,
    t.enums.caseCategory,
    t.enums.invoiceStatus,
    t.enums.documentCategory,
    t.enums.documentLegalArea,
    t.enums.announcementType,
    t.enums.announcementStatus,
    t.enums.documentStatus,
    t.enums.libraryResourceType,
    ...Object.values(t.cases.modal.options),
  ];
  for (const map of maps) {
    const found = lookupInMap(map, str);
    if (found) return found;
  }
  return str.replace(/_/g, ' ');
}

export function enumOptions(
  lang: Lang,
  group: EnumGroup,
): Array<{ value: string; label: string }> {
  const map = getMessages(lang).enums[group];
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}
