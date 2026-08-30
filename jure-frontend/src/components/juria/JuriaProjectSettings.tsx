import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { JURIA_JURISDICTIONS, type JuriaLang, type JuriaProject } from '@/types/juria';
import useJuriaStore from '@/stores/juriaStore';
import { useAppTranslation } from '@/i18n';

const LANGS: { id: JuriaLang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
  { id: 'darija', label: 'Darija' },
];

export function JuriaProjectSettings({ project }: { project: JuriaProject }) {
  const { t } = useAppTranslation();
  const s = t.juria.workspace.settings;
  const update = useJuriaStore((st) => st.updateProject);
  const setLang = useJuriaStore((st) => st.setProjectLanguage);
  const [instructions, setInstructions] = useState(project.instructions || '');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-400">{s.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-400">{s.description}</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-400">{s.projectLanguage}</label>
          <div className="flex flex-wrap gap-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLang(l.id);
                  void update(project.id, { preferred_language: l.id });
                }}
                className={`rounded-md px-2 py-1 text-[11px] ${
                  project.preferred_language === l.id ? 'bg-[#64499D] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-400">{s.jurisdiction}</label>
          <select
            defaultValue={project.jurisdiction_code}
            onChange={(e) => void update(project.id, { jurisdiction_code: e.target.value })}
            className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {JURIA_JURISDICTIONS.map((j) => (
              <option key={j.code} value={j.code}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-400">{s.aiInstructions}</label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            placeholder={s.instructionsPlaceholder}
          />
        </div>
        <Button
          className="bg-[#64499D] hover:bg-[#4D3680]"
          onClick={() => void update(project.id, { name, description, instructions })}
        >
          {s.save}
        </Button>
      </div>
    </div>
  );
}
