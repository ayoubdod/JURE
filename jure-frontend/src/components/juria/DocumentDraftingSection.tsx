import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DOCUMENT_DRAFT_TYPES, type DocumentDraftTypeId } from '@/components/juria/juriaConstants';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation, type AppMessages } from '@/i18n';
import { cn } from '@/lib/utils';

type DraftFields = AppMessages['juria']['draftFields'];

function extraFields(f: DraftFields): Record<DocumentDraftTypeId, { key: string; label: string; placeholder?: string }[]> {
  return {
    bail: [
      { key: 'bailleur', label: f.bailleur, placeholder: f.bailleurPlaceholder },
      { key: 'preneur', label: f.preneur },
      { key: 'loyer', label: f.loyer },
      { key: 'duree', label: f.duree },
    ],
    mise_en_demeure: [
      { key: 'destinataire', label: f.destinataire },
      { key: 'objet', label: f.objetLitige },
      { key: 'delai', label: f.delai },
    ],
    statuts_sarl: [
      { key: 'denomination', label: f.denomination },
      { key: 'capital', label: f.capital },
      { key: 'siege', label: f.siege },
    ],
    procuration: [
      { key: 'mandant', label: f.mandant },
      { key: 'mandataire', label: f.mandataire },
      { key: 'pouvoirs', label: f.pouvoirs },
    ],
    requete: [
      { key: 'juridiction', label: f.juridiction },
      { key: 'demandeur', label: f.demandeur },
      { key: 'defendeur', label: f.defendeur },
    ],
    contrat_travail: [
      { key: 'employeur', label: f.employeur },
      { key: 'salarie', label: f.salarie },
      { key: 'poste', label: f.poste },
    ],
    conclusions: [
      { key: 'affaire', label: f.affaire },
      { key: 'demandes', label: f.demandes },
    ],
    autre: [
      { key: 'objet', label: f.objetDoc },
      { key: 'details', label: f.details },
    ],
  };
}

export function DocumentDraftingSection({
  conversationId,
  compact,
  linkedCaseId,
  threadId,
}: {
  conversationId: string;
  compact?: boolean;
  linkedCaseId?: number | null;
  threadId?: string | null;
}) {
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<DocumentDraftTypeId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const requestDraft = useJuriaStore((s) => s.requestDraft);
  const { toast } = useToast();

  const fields = useMemo(() => (selected ? extraFields(t.juria.draftFields)[selected] : []), [selected, t]);

  const handleGenerate = async () => {
    if (!selected || busy) return;
    const def = DOCUMENT_DRAFT_TYPES.find((d) => d.id === selected);
    const apiType = def?.apiType ?? 'AUTRE';
    const title = t.juria.draftTypes[selected];
    setBusy(true);
    try {
      await requestDraft(conversationId, apiType, values, linkedCaseId ?? null, title, threadId);
      setSelected(null);
      setValues({});
    } catch (e) {
      toast({
        title: t.juria.toasts.draftFailed,
        description: getJuriaErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('mx-auto w-full min-w-0 max-w-3xl', compact ? 'space-y-2.5' : 'space-y-3')}>
      <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{t.juria.pickDraftType}</p>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {DOCUMENT_DRAFT_TYPES.map((def) => {
          const Icon = def.Icon;
          const active = selected === def.id;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => {
                setSelected(def.id);
                setValues({});
              }}
              className={cn(
                'flex h-11 min-w-0 items-center gap-2 rounded-lg border px-2.5 text-start transition',
                active
                  ? 'border-[#64499D] bg-[#64499D]/10 dark:border-[#64499D] dark:bg-[#64499D]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  active
                    ? 'bg-[#64499D]/15 text-[#64499D]'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 truncate text-[11px] font-medium leading-tight text-slate-800 dark:text-slate-100">
                {t.juria.draftTypes[def.id]}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={cn('space-y-1', fields.length === 1 && 'sm:col-span-2')}>
                <Label className="text-[11px] text-slate-500">{f.label}</Label>
                <Input
                  value={values[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="h-9"
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="h-9 w-full bg-[#64499D] hover:bg-[#4D3680] sm:w-auto sm:min-w-[10rem]"
            disabled={busy}
            onClick={() => void handleGenerate()}
          >
            {busy ? t.juria.statusPreparing : t.juria.generateDocument}
          </Button>
        </div>
      )}
    </div>
  );
}
