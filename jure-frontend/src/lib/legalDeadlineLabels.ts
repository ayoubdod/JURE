import { interpolate } from '@/i18n/format';
import { getMessages } from '@/i18n/messages';
import { translateEnum } from '@/i18n/enums';
import type { Lang } from '@/i18n/types';

type RuleLike = {
  procedure_type?: string;
  legal_domain?: string;
  name?: string;
  event_type?: string;
  duration_value?: number;
  duration_unit?: string;
  computation_method?: string;
} | null | undefined;

export function deadlineDomainLabel(lang: Lang, value?: string | null, fallback = '') {
  return translateEnum(lang, 'deadlineLegalDomain', value) || fallback;
}

export function deadlineProcedureLabel(lang: Lang, value?: string | null, fallback = '') {
  return translateEnum(lang, 'deadlineProcedure', value) || fallback;
}

export function deadlineEventLabel(lang: Lang, value?: string | null, fallback = '') {
  return translateEnum(lang, 'deadlineEvent', value) || fallback;
}

export function deadlineComputationLabel(lang: Lang, value?: string | null, fallback = '') {
  return translateEnum(lang, 'deadlineComputation', value) || fallback;
}

export function deadlineDurationLabel(lang: Lang, value?: number, unit?: string) {
  if (value == null || !unit) return '';
  const t = getMessages(lang).dashboard.deadlines;
  return interpolate(t.durationLabel, {
    value,
    unit: translateEnum(lang, 'deadlineDurationUnit', unit) || unit,
  });
}

export function deadlineRuleTitle(lang: Lang, rule: RuleLike, fallback = '') {
  const procedure = deadlineProcedureLabel(lang, rule?.procedure_type);
  const domain = deadlineDomainLabel(lang, rule?.legal_domain);
  if (!procedure) return rule?.name || fallback;
  const t = getMessages(lang).dashboard.deadlines;
  if (!domain) return procedure;
  return interpolate(t.ruleName, { procedure, domain });
}
