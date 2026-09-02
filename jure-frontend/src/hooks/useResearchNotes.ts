import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  apiCreateResearchNote,
  apiDeleteResearchNote,
  apiGetResearchNotes,
  apiUpdateResearchNote,
  unwrapResearchNoteList,
  type ResearchNote,
  type ResearchNotePayload,
} from '@/services/research-notes/api';

type SaveErrorCopy = {
  connectionSave: string;
  save: string;
  connectionLoad: string;
  load: string;
  connectionDelete: string;
  delete: string;
};

type Options = {
  caseId?: number;
  errors: SaveErrorCopy;
};

export function useResearchNotes({ caseId, errors }: Options) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const saveErrorMessage = useCallback(
    (err: unknown): string => {
      if (isAxiosError(err)) {
        if (!err.response) return errors.connectionSave;
        const data = err.response.data as { detail?: string; title?: string[] } | undefined;
        if (typeof data?.detail === 'string') return data.detail;
        if (Array.isArray(data?.title) && data.title[0]) return data.title[0];
      }
      return errors.save;
    },
    [errors.connectionSave, errors.save]
  );

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiGetResearchNotes({
        ...(caseId != null ? { matter: caseId } : {}),
        page_size: 100,
      });
      setNotes(unwrapResearchNoteList(res.data));
    } catch (err) {
      setNotes([]);
      setLoadError(isAxiosError(err) && !err.response ? errors.connectionLoad : errors.load);
    } finally {
      setLoading(false);
    }
  }, [caseId, errors.connectionLoad, errors.load]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(
    async (payload: ResearchNotePayload) => {
      setSaving(true);
      try {
        const res = await apiCreateResearchNote({
          ...payload,
          matter: caseId != null ? caseId : payload.matter ?? null,
        });
        setNotes((prev) => [res.data, ...prev.filter((item) => item.id !== res.data.id)]);
        return res.data;
      } finally {
        setSaving(false);
      }
    },
    [caseId]
  );

  const updateNote = useCallback(async (id: number, payload: Partial<ResearchNotePayload>) => {
    setSaving(true);
    try {
      const res = await apiUpdateResearchNote(id, payload);
      setNotes((prev) => prev.map((item) => (item.id === id ? res.data : item)));
      return res.data;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteNote = useCallback(async (id: number) => {
    setDeleting(true);
    try {
      await apiDeleteResearchNote(id);
      setNotes((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setDeleting(false);
    }
  }, []);

  return {
    notes,
    loading,
    saving,
    deleting,
    loadError,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    saveErrorMessage,
  };
}
