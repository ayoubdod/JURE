import { getMessages } from './messages';
import type { Lang } from './types';
import type { AppMessages } from './messages/types';

type EnumGroup = keyof AppMessages['enums'];

/** Translate a stable enum identifier at presentation time. Never store the result. */
export function translateEnum(
  lang: Lang,
  group: EnumGroup,
  value: string | null | undefined,
): string {
  if (!value) return '';
  const map = getMessages(lang).enums[group];
  return map[value] ?? map[value.toUpperCase()] ?? map[value.toLowerCase()] ?? value;
}

export function enumOptions(
  lang: Lang,
  group: EnumGroup,
): Array<{ value: string; label: string }> {
  const map = getMessages(lang).enums[group];
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}
