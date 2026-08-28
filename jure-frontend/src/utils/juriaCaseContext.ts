import { getCaseData } from '@/utils/caseCardHelpers';
import type { JuriaCaseContextPayload } from '@/types/juria';

function partiesLine(c: API.Case): string | null {
  const client = c.client as { first_name?: string; last_name?: string } | undefined;
  const name = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '';
  const opp = getCaseData(c, 'opposing_party') ?? getCaseData(c, 'defendant');
  const parts = [name && `Client: ${name}`, opp && `Autre partie: ${String(opp)}`].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Builds JSON context for Juria when embedded in a case. */
export function buildJuriaCaseContextPayload(c: API.Case): JuriaCaseContextPayload {
  const t = c.caseType ?? c.case_type;
  return {
    reference: c.reference ?? null,
    title: c.title ?? null,
    caseType: t ?? null,
    status: c.status ?? null,
    description:
      t === 'CONSULTATION'
        ? [
            getCaseData(c, 'legal_question'),
            getCaseData(c, 'facts_context'),
            getCaseData(c, 'advice_summary'),
          ]
            .filter((v) => typeof v === 'string' && v.trim())
            .join('\n\n') || ((getCaseData(c, 'description') as string) ?? null)
        : ((getCaseData(c, 'description') as string) ?? (getCaseData(c, 'summary') as string) ?? null),
    court: (getCaseData(c, 'court') as string) ?? null,
    jurisdiction: (getCaseData(c, 'jurisdiction') as string) ?? (getCaseData(c, 'legal_domain') as string) ?? null,
    legalArguments: (getCaseData(c, 'legal_arguments') as string) ?? (getCaseData(c, 'legal_question') as string) ?? null,
    parties: partiesLine(c),
  };
}
