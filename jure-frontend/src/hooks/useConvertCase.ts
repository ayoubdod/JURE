'use client';

import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import { apiConvertCase } from '@/services/case/api';

export function useConvertCase() {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        setSubmitError('Something went wrong, please try again.');
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
            setSubmitError('This consultation has already been converted.');
          } else if (status === 400 && msg) {
            setSubmitError(msg);
          } else if (status === 404) {
            setSubmitError('Consultation not found.');
          } else {
            setSubmitError('Something went wrong, please try again.');
          }
        } else {
          setSubmitError('Something went wrong, please try again.');
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { convert, loading, submitError, setSubmitError, clearError };
}
