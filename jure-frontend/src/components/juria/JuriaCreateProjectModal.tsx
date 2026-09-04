import React, { useEffect, useState } from 'react';
import { Check, FolderOpen, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { JURIA_JURISDICTIONS, type JuriaLang } from '@/types/juria';
import {
  apiJuriaLookupCaseDocuments,
  apiJuriaLookupCases,
} from '@/services/juria/api';
import { apiGetLibrary, parseLibraryList, type LibraryTab } from '@/services/library/api';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { apiGetClients } from '@/services/client/api';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation } from '@/i18n';

const LANGS: { id: JuriaLang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
  { id: 'darija', label: 'Darija' },
];

type CaseOpt = { id: number; reference: string; title: string };
type DocOpt = { id: number; file_name: string };
type LibOpt = { id: number; title: string };
type ClientOpt = { id: number; label: string };

export function JuriaCreateProjectModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const { t } = useAppTranslation();
  const c = t.juria.workspace.create;
  const a = t.juria.workspace.actions;
  const createProject = useJuriaStore((s) => s.createProject);
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<JuriaLang>('fr');
  const [jurisdiction, setJurisdiction] = useState('MA');
  const [saving, setSaving] = useState(false);

  const [connectCase, setConnectCase] = useState(false);
  const [connectDocs, setConnectDocs] = useState(false);
  const [connectLib, setConnectLib] = useState(false);
  const [connectCal, setConnectCal] = useState(false);
  const [connectTasks, setConnectTasks] = useState(false);
  const [connectClient, setConnectClient] = useState(false);
  const [connectTeam, setConnectTeam] = useState(false);

  const [caseQuery, setCaseQuery] = useState('');
  const [cases, setCases] = useState<CaseOpt[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseOpt | null>(null);
  const [caseDocs, setCaseDocs] = useState<DocOpt[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [libQuery, setLibQuery] = useState('');
  const [libDocs, setLibDocs] = useState<LibOpt[]>([]);
  const [selectedLibIds, setSelectedLibIds] = useState<number[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOpt | null>(null);
  const [members, setMembers] = useState<API.CabinetMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
  }, [open]);

  useEffect(() => {
    if (!open || !connectCase) return;
    const t = window.setTimeout(() => {
      void apiJuriaLookupCases(caseQuery).then(setCases).catch(() => setCases([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, connectCase, caseQuery]);

  useEffect(() => {
    if (!selectedCase || !connectDocs) return;
    void apiJuriaLookupCaseDocuments(selectedCase.id)
      .then(setCaseDocs)
      .catch(() => setCaseDocs([]));
  }, [selectedCase, connectDocs]);

  useEffect(() => {
    if (!open || !connectLib) return;
    const t = window.setTimeout(() => {
      const tabs: LibraryTab[] = ['my', 'local', 'international'];
      void Promise.all(
        tabs.map((tab) =>
          apiGetLibrary(tab, { search: libQuery.trim() || undefined, all: true })
        )
      )
        .then((responses) => {
          const byId = new Map<number, LibOpt>();
          for (const res of responses) {
            for (const doc of parseLibraryList(res.data)) {
              byId.set(doc.id, { id: doc.id, title: doc.title || `#${doc.id}` });
            }
          }
          setLibDocs([...byId.values()]);
        })
        .catch(() => setLibDocs([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, connectLib, libQuery]);

  useEffect(() => {
    if (!open || !connectClient) return;
    const t = window.setTimeout(() => {
      void apiGetClients({ page: 1, page_size: 40 })
        .then((res) => {
          const q = clientQuery.trim().toLowerCase();
          const rows = (res.data?.results ?? []).map((c) => ({
            id: c.id,
            label:
              [c.first_name, c.last_name].filter(Boolean).join(' ') ||
              c.email ||
              `#${c.id}`,
          }));
          setClients(q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows);
        })
        .catch(() => setClients([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, connectClient, clientQuery]);

  useEffect(() => {
    if (!open || !connectTeam) return;
    void apiGetCabinetMembers()
      .then((res) => setMembers(res.data ?? []))
      .catch(() => setMembers([]));
  }, [open, connectTeam]);

  const reset = () => {
    setName('');
    setDescription('');
    setLanguage('fr');
    setJurisdiction('MA');
    setConnectCase(false);
    setConnectDocs(false);
    setConnectLib(false);
    setConnectCal(false);
    setConnectTasks(false);
    setConnectClient(false);
    setConnectTeam(false);
    setSelectedCase(null);
    setSelectedDocIds([]);
    setSelectedLibIds([]);
    setSelectedClient(null);
    setSelectedMemberIds([]);
    setStep(1);
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const id = await createProject({
        name: name.trim(),
        description: description.trim(),
        preferred_language: language,
        jurisdiction_code: jurisdiction,
        linked_case_id: connectCase ? selectedCase?.id ?? null : null,
        case_document_ids: connectDocs ? selectedDocIds : [],
        library_document_ids: connectLib ? selectedLibIds : [],
        connect_calendar: connectCal,
        connect_tasks: connectTasks,
        client_id: connectClient ? selectedClient?.id ?? null : null,
        member_ids: connectTeam ? selectedMemberIds : [],
        permissions: {
          CASE: connectCase ? 'READ' : 'NONE',
          DOCUMENTS: connectDocs || connectCase ? 'READ' : 'NONE',
          LIBRARY: connectLib ? 'READ' : 'NONE',
          CALENDAR: connectCal ? 'READ' : 'NONE',
          TASKS: connectTasks ? 'CREATE' : 'NONE',
          CLIENTS: connectClient ? 'READ' : 'NONE',
          TEAM: 'READ',
        },
      });
      reset();
      onOpenChange(false);
      if (id) onCreated?.(id);
    } catch (e) {
      toast({
        title: c.createFailed,
        description: getJuriaErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({
    checked,
    onChange,
    label,
    hint,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition',
        checked
          ? 'border-[#64499D]/40 bg-[#64499D]/[0.06]'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          checked ? 'border-[#64499D] bg-[#64499D] text-white' : 'border-slate-300'
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
      <span>
        <span className="block text-[13px] font-medium text-slate-900 dark:text-white">{label}</span>
        <span className="block text-[11px] text-slate-500">{hint}</span>
      </span>
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D]">
              <FolderOpen className="h-4 w-4" />
            </span>
            {c.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-3 flex gap-2 text-[11px] font-medium">
          <span
            className={cn(
              'rounded-full px-2 py-0.5',
              step === 1 ? 'bg-[#64499D] text-white' : 'bg-slate-100 text-slate-500'
            )}
          >
            {c.stepIdentity}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5',
              step === 2 ? 'bg-[#64499D] text-white' : 'bg-slate-100 text-slate-500'
            )}
          >
            {c.stepConnections}
          </span>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {c.name}
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={c.namePlaceholder}
                className="h-10"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {c.description}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={c.descriptionPlaceholder}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {c.language}
                </label>
                <div className="flex flex-wrap gap-1">
                  {LANGS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLanguage(l.id)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px]',
                        language === l.id ? 'bg-[#64499D] text-white' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {c.jurisdiction}
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  {JURIA_JURISDICTIONS.map((j) => (
                    <option key={j.code} value={j.code}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                className="bg-[#64499D] hover:bg-[#4D3680]"
                disabled={!name.trim()}
                onClick={() => setStep(2)}
              >
                {c.continue}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-600 dark:text-slate-300">{c.connectHint}</p>
            <Toggle
              checked={connectCase}
              onChange={setConnectCase}
              label={c.caseLabel}
              hint={c.caseHint}
            />
            {connectCase && (
              <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                <Input
                  value={caseQuery}
                  onChange={(e) => setCaseQuery(e.target.value)}
                  placeholder={c.searchCase}
                  className="h-8 text-xs"
                />
                <div className="mt-2 max-h-36 overflow-y-auto">
                  {cases.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCase(item)}
                      className={cn(
                        'mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs',
                        selectedCase?.id === item.id ? 'bg-[#64499D]/10' : 'hover:bg-slate-50'
                      )}
                    >
                      <span className="font-mono text-[10px] text-slate-400">{item.reference}</span>
                      <span className="block truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Toggle
              checked={connectDocs}
              onChange={setConnectDocs}
              label={c.docsLabel}
              hint={c.docsHint}
            />
            {connectDocs && (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-800">
                {!selectedCase ? (
                  <p className="py-3 text-center text-slate-400">Liez d’abord un dossier.</p>
                ) : caseDocs.length === 0 ? (
                  <p className="py-3 text-center text-slate-400">Aucun document sur ce dossier.</p>
                ) : (
                  caseDocs.map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(d.id)}
                        onChange={() =>
                          setSelectedDocIds((prev) =>
                            prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                          )
                        }
                      />
                      {d.file_name}
                    </label>
                  ))
                )}
              </div>
            )}
            <Toggle
              checked={connectLib}
              onChange={setConnectLib}
              label={c.libraryLabel}
              hint={c.libraryHint}
            />
            {connectLib && (
              <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                <Input
                  value={libQuery}
                  onChange={(e) => setLibQuery(e.target.value)}
                  placeholder={c.searchGeneric}
                  className="h-8 text-xs"
                />
                <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                  {libDocs.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1">
                      <input
                        type="checkbox"
                        checked={selectedLibIds.includes(d.id)}
                        onChange={() =>
                          setSelectedLibIds((prev) =>
                            prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                          )
                        }
                      />
                      {d.title}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Toggle
              checked={connectClient}
              onChange={setConnectClient}
              label={c.clientLabel}
              hint={c.clientHint}
            />
            {connectClient && (
              <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                <Input
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder={c.searchClient}
                  className="h-8 text-xs"
                />
                <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                  {clients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedClient(item)}
                      className={cn(
                        'mb-1 w-full rounded-lg px-2 py-1.5 text-left',
                        selectedClient?.id === item.id ? 'bg-[#64499D]/10' : 'hover:bg-slate-50'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Toggle checked={connectCal} onChange={setConnectCal} label={c.calendarLabel} hint={c.calendarHint} />
            <Toggle
              checked={connectTasks}
              onChange={setConnectTasks}
              label={c.tasksLabel}
              hint={c.tasksHint}
            />
            <Toggle
              checked={connectTeam}
              onChange={setConnectTeam}
              label={c.teamLabel}
              hint={c.teamHint}
            />
            {connectTeam && (
              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-800">
                {members.map((m) => {
                  const uid = typeof m.user === 'object' && m.user ? (m.user as API.User).id : m.id;
                  return (
                    <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(uid)}
                        onChange={() =>
                          setSelectedMemberIds((prev) =>
                            prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
                          )
                        }
                      />
                      {m.first_name} {m.last_name}
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                {c.back}
              </Button>
              <Button
                className="bg-[#64499D] hover:bg-[#4D3680]"
                disabled={saving}
                onClick={() => void submit()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : c.createProject}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
