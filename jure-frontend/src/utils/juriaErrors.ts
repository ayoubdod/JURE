import type { AxiosError } from 'axios';
import type { JuriaApiErrorBody } from '@/services/juria/types';

export function getJuriaErrorMessage(err: unknown): string {
  const ax = err as AxiosError<JuriaApiErrorBody>;
  const status = ax.response?.status;
  const data = ax.response?.data;

  if (status === 503) {
    return typeof data?.detail === 'string' ? data.detail : 'Juria est indisponible pour le moment.';
  }
  if (status === 500) {
    return "Le serveur Juria a renvoyé une erreur. Vérifiez JURIA_ENABLED et DEEPSEEK_API_KEY sur Railway.";
  }
  if (status === 401 || status === 402 || status === 429 || status === 502) {
    return data?.error ?? "Juria API indisponible. Réessayez plus tard.";
  }
  if (status === 504) {
    return data?.error ?? 'Juria met trop de temps à répondre. Réessayez.';
  }
  if (status === 400) {
    if (typeof data?.detail === 'string') return data.detail;
    return 'Requête invalide.';
  }
  if (ax.message === 'canceled' || ax.code === 'ERR_CANCELED') {
    return '';
  }
  return 'Une erreur est survenue. Réessayez.';
}

export function isJuriaDisabledError(err: unknown): boolean {
  const ax = err as AxiosError;
  return ax.response?.status === 503;
}
