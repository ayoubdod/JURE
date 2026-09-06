'use client';

import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import { apiConvertCase } from '@/services/case/api';
import { useAppTranslation, localizeApiMessage } from '@/i18n';

export function useConvertCase() {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { t } = useAppTranslation();
  const cw = t.cases.modal.consultationWorkflow;

  const clearError = useCallback(() => setSubmitError(null), []);

  const convert = useCallback(
    async (
      consultationId: number,
      body: Record<string, unknown>
    ): Promise<{ newCase: API.Case; originalConsultation?: API.Case } | null> => {
      setLoading(true);
      setSubmitError(null);
      try {
        const res = await apiConvertCase(consultationId, body);
        const data = res.data;
        const newCase = data.newCase;
        const originalConsultation = data.originalConsultation;
        if (newCase && typeof newCase === 'object' && 'id' in newCase) {
          return {
            newCase,
            ...(originalConsultation && typeof originalConsultation === 'object' && 'id' in originalConsultation
              ? { originalConsultation }
              : {}),
          };
        }
        setSubmitError(t.errors.generic);
        return null;
      } catch (e: unknown) {
        if (isAxiosError(e)) {
          const status = e.response?.status;
          const errData = e.response?.data as
            | { detail?: string | string[]; message?: string; non_field_errors?: string[] }
            | undefined;
          const detailRaw = errData?.detail;
          const detailStr =
            typeof detailRaw === 'string'
              ? detailRaw
              : Array.isArray(detailRaw)
                ? detailRaw[0]
                : null;
          const msg =
            detailStr ||
            (typeof errData?.message === 'string' && errData.message) ||
            (Array.isArray(errData?.non_field_errors) && errData.non_field_errors[0]) ||
            null;
          if (status === 409) {
            setSubmitError(cw.alreadyConverted);
          } else if (status === 400 && msg) {
            setSubmitError(localizeApiMessage(msg, msg));
          } else if (status === 404) {
            setSubmitError(cw.convertNotFound);
          } else {
            setSubmitError(t.errors.generic);
          }
        } else {
          setSubmitError(t.errors.generic);
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cw, t.errors.generic]
  );

  return { convert, loading, submitError, setSubmitError, clearError };
}
