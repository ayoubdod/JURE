import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DOCUMENT_DRAFT_TYPES, type DocumentDraftTypeId } from '@/components/juria/juriaConstants';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation } from '@/i18n';

const EXTRA_FIELDS: Record<DocumentDraftTypeId, { key: string; label: string; placeholder?: string }[]> = {
  bail: [
    { key: 'bailleur', label: 'Bailleur', placeholder: 'Nom / raison sociale' },
    { key: 'preneur', label: 'Preneur' },
    { key: 'loyer', label: 'Loyer (MAD)' },
    { key: 'duree', label: 'Durée' },
  ],
  mise_en_demeure: [
    { key: 'destinataire', label: 'Destinataire' },
    { key: 'objet', label: 'Objet du litige' },
    { key: 'delai', label: 'Délai de régularisation' },
  ],
  statuts_sarl: [
    { key: 'denomination', label: 'Dénomination sociale' },
    { key: 'capital', label: 'Capital social' },
    { key: 'siege', label: 'Siège social' },
  ],
  procuration: [
    { key: 'mandant', label: 'Mandant' },
    { key: 'mandataire', label: 'Mandataire' },
    { key: 'pouvoirs', label: 'Pouvoirs conférés' },
  ],
  requete: [
    { key: 'juridiction', label: 'Juridiction' },
    { key: 'demandeur', label: 'Demandeur' },
    { key: 'defendeur', label: 'Défendeur' },
  ],
  contrat_travail: [
    { key: 'employeur', label: 'Employeur' },
    { key: 'salarie', label: 'Salarié' },
    { key: 'poste', label: 'Poste' },
  ],
  conclusions: [
    { key: 'affaire', label: 'Référence affaire' },
    { key: 'demandes', label: 'Demandes principales' },
  ],
  autre: [
    { key: 'objet', label: 'Objet du document' },
    { key: 'details', label: 'Détails / clauses souhaitées' },
  ],
};

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

  const fields = useMemo(() => (selected ? EXTRA_FIELDS[selected] : []), [selected]);

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
        title: 'Génération impossible',
        description: getJuriaErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        Quel type de document souhaitez-vous rédiger ?
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
            className={`rounded-xl border p-3 text-left text-xs transition ${
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
            Générer le document
          </Button>
        </div>
      )}
    </div>
  );
}
