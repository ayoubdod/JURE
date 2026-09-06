import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DOCUMENT_DRAFT_TYPES, type DocumentDraftTypeId } from '@/components/juria/juriaConstants';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation, type AppMessages } from '@/i18n';

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
}: {
  conversationId: string;
  compact?: boolean;
  linkedCaseId?: number | null;
}) {
  const { t } = useAppTranslation();
  const [selected, setSelected] = useState<DocumentDraftTypeId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const requestDraft = useJuriaStore((s) => s.requestDraft);
  const { toast } = useToast();

  const fields = useMemo(() => (selected ? extraFields(t.juria.draftFields)[selected] : []), [selected, t]);

  const handleGenerate = async () => {
    if (!selected) return;
    const def = DOCUMENT_DRAFT_TYPES.find((t) => t.id === selected);
    const apiType = def?.apiType ?? 'AUTRE';
    try {
      await requestDraft(conversationId, apiType, values, linkedCaseId ?? null);
      setSelected(null);
      setValues({});
    } catch (e) {
      toast({
        title: t.juria.toasts.draftFailed,
        description: getJuriaErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {t.juria.pickDraftType}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DOCUMENT_DRAFT_TYPES.map((def) => (
          <button
            key={def.id}
            type="button"
            onClick={() => {
              setSelected(def.id);
              setValues({});
            }}
            className={`rounded-xl border p-3 text-start text-xs transition ${
              selected === def.id
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <span className="text-lg">{def.icon}</span>
            <span className="mt-1 block font-medium text-slate-900 dark:text-slate-100">
              {t.juria.draftTypes[def.id]}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={values[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="h-9"
              />
            </div>
          ))}
          <Button type="button" className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleGenerate}>
            {t.juria.generateDocument}
          </Button>
        </div>
      )}
    </div>
  );
}
