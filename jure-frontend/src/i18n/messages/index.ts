import type { Lang } from '../types';
import type { AppMessages } from './types';
import { en } from './en';
import { fr } from './fr';
import { ar } from './ar';

export const messages: Record<Lang, AppMessages> = { en, fr, ar };

export function getMessages(lang: Lang): AppMessages {
  return messages[lang] ?? messages.en;
}

export type { AppMessages };
