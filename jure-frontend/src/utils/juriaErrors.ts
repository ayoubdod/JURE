import type { AxiosError } from 'axios';
import type { JuriaApiErrorBody } from '@/services/juria/types';
import { detectInitialLanguage, tFor } from '@/i18n';

function juriaErrorCopy() {
  return tFor(detectInitialLanguage()).juria.errors;
}

export function juriaMissingIdError(): Error {
  return new Error(juriaErrorCopy().missingId);
}

export function juriaInvalidIdError(): Error {
  return new Error(juriaErrorCopy().invalidId);
}

export function getJuriaErrorMessage(err: unknown): string {
  const ax = err as AxiosError<JuriaApiErrorBody>;
  const status = ax.response?.status;
  const data = ax.response?.data;
  const copy = juriaErrorCopy();

  if (status === 503) {
    return typeof data?.detail === 'string' ? data.detail : copy.unavailable;
  }
  if (status === 500) {
    return copy.server;
  }
  if (status === 401 || status === 402 || status === 429 || status === 502) {
    return data?.error ?? copy.apiUnavailable;
  }
  if (status === 504) {
    return data?.error ?? copy.timeout;
  }
  if (status === 400) {
    if (typeof data?.detail === 'string') return data.detail;
    return copy.invalidRequest;
  }
  if (ax.message === 'canceled' || ax.code === 'ERR_CANCELED') {
    return '';
  }
  return tFor(detectInitialLanguage()).errors.generic;
}

export function isJuriaDisabledError(err: unknown): boolean {
  const ax = err as AxiosError;
  return ax.response?.status === 503;
}
