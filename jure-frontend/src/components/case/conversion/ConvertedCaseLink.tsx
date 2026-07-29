'use client';

import React from 'react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getStatusColor } from '@/utils/caseCardHelpers';

function typeLabel(link: API.CaseLinkSummary): string {
  const t = link.caseType ?? link.case_type ?? '';
  if (t === 'ADMINISTRATIVE_DUTY' || t === 'ADMINISTRATIVE') return 'ADMINISTRATIVE DUTY';
  return t || 'CASE';
}

function clientLine(link: API.CaseLinkSummary): string {
  const cl = link.client;
  if (!cl) return '';
  const name = [cl.first_name, cl.last_name].filter(Boolean).join(' ').trim();
  return name || cl.email || '';
}

type Props =
  | {
      variant: 'converted';
      link: API.CaseLinkSummary;
      onViewCase: (id: number) => void;
    }
  | {
      variant: 'origin';
      link: API.CaseLinkSummary;
      onViewConsultation: (id: number) => void;
    };

export function ConvertedCaseLink(props: Props) {
  const { link } = props;
  const title = link.title?.trim() || '—';
  const ref = link.reference?.trim();
  const statusRaw = link.status ?? '';
  const statusDisplay = String(statusRaw).replace(/_/g, ' ');

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <Link2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          {props.variant === 'converted' ? (
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
              Converted to case
              {ref ? (
                <>
                  {' '}
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{ref}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
              Originated from consultation
              {ref ? (
                <>
                  {' '}
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{ref}</span>
                </>
              ) : null}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-800 dark:text-slate-200">
              {typeLabel(link)}
            </span>
          </div>
          <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{title}</p>
          {props.variant === 'origin' && clientLine(link) && (
            <p className="text-[12px] text-slate-600 dark:text-slate-400">{clientLine(link)}</p>
          )}
          {props.variant === 'converted' && clientLine(link) && (
            <p className="text-[12px] text-slate-600 dark:text-slate-400">{clientLine(link)}</p>
          )}
          {statusRaw && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Status:{' '}
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                  getStatusColor(String(statusRaw))
                )}
              >
                {statusDisplay}
              </span>
            </p>
          )}
          {props.variant === 'converted' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1 h-8 text-[12px]"
              onClick={() => props.onViewCase(link.id)}
            >
              View Case →
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-1 h-8 text-[12px]"
              onClick={() => props.onViewConsultation(link.id)}
            >
              View Consultation →
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export function getConvertedToCase(c: API.Case): API.CaseLinkSummary | null {
  const r = c as Record<string, unknown>;
  const raw = r.convertedToCase ?? r.converted_to_case;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    return raw as API.CaseLinkSummary;
  }
  return null;
}

/** Source consultation when this LITIGATION/ADMINISTRATIVE case was converted from a consultation */
export function getConvertedFromCase(c: API.Case): API.CaseLinkSummary | null {
  const r = c as Record<string, unknown>;
  const raw =
    r.convertedFromCase ??
    r.converted_from_case ??
    r.convertedFromConsultation ??
    r.converted_from_consultation;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    return raw as API.CaseLinkSummary;
  }
  return null;
}

export function getConsultationWorkflowStatus(c: API.Case): string {
  if (c.status === 'CONVERTED_TO_CASE') return 'CONVERTED_TO_CASE';
  return (
    (getCaseData(c, 'outcome') as string) ??
    (getCaseData(c, 'status') as string) ??
    c.status
  ) as string;
}
