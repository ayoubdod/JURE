'use client';

import { useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { apiCreateCase, apiUpdateCase } from '@/services/case/api';
import { toBackendCaseCreatePayload, toBackendCaseUpdatePayload } from '@/services/case/payloadBuilder';
import { getCaseValidationErrors } from '@/services/case/validationErrors';
import { useToast } from '@/hooks/use-toast';
import type { UseFormSetError } from 'react-hook-form';

export type CaseFormSetError = UseFormSetError<Record<string, unknown>>;

export function useCaseForm(
  setError: CaseFormSetError,
  onSuccess?: (caseItem: API.Case) => void,
  onHide?: () => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = useCallback(
    async (data: API.CaseCreatePayload) => {
      setIsLoading(true);
      try {
        const payload = toBackendCaseCreatePayload(data);
        const res = await apiCreateCase(payload);
        onSuccess?.(res.data);
        onHide?.();
      } catch (err) {
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 403) {
            setError('case_specific_data' as never, { type: 'server', message: 'No cabinet or insufficient permissions.' });
            return;
          }
          if (status === 401) {
            setError('case_specific_data' as never, { type: 'server', message: 'Please sign in again.' });
            return;
          }
          const mapped = getCaseValidationErrors(err);
          Object.entries(mapped).forEach(([key, message]) => {
            if (message) setError(key as never, { type: 'server', message });
          });
          const messages = Object.values(mapped).filter(Boolean);
          if (messages.length > 0 && !mapped.case_specific_data) {
            setError('case_specific_data' as never, { type: 'server', message: messages.join(' ') });
          }
          if (messages.length > 0) {
            toast({ title: 'Could not save', description: messages[0], variant: 'destructive' });
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setError, onSuccess, onHide, toast]
  );

  const handleUpdate = useCallback(
    async (data: API.CaseUpdatePayload) => {
      setIsLoading(true);
      try {
        const payload = toBackendCaseUpdatePayload(data);
        const res = await apiUpdateCase(payload);
        onSuccess?.(res.data);
        onHide?.();
      } catch (err) {
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 403) {
            setError('case_specific_data' as never, { type: 'server', message: 'No cabinet or insufficient permissions.' });
            return;
          }
          if (status === 401) {
            setError('case_specific_data' as never, { type: 'server', message: 'Please sign in again.' });
            return;
          }
          const mapped = getCaseValidationErrors(err);
          Object.entries(mapped).forEach(([key, message]) => {
            if (message) setError(key as never, { type: 'server', message });
          });
          const messages = Object.values(mapped).filter(Boolean);
          if (messages.length > 0 && !mapped.case_specific_data) {
            setError('case_specific_data' as never, { type: 'server', message: messages.join(' ') });
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setError, onSuccess, onHide]
  );

  return { handleCreate, handleUpdate, isLoading };
}
