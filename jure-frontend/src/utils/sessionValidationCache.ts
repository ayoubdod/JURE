/** Deduplicate /dj-rest-auth/user/ across remounted route guards for the same session. */
let sessionValidated = false;
let validationPromise: Promise<boolean> | null = null;

export function isSessionValidated(): boolean {
  return sessionValidated;
}

export function setSessionValidated(value: boolean): void {
  sessionValidated = value;
}

/** @deprecated Prefer isSessionValidated — kept for gradual call-site updates. */
export function getValidatedToken(): string | null {
  return sessionValidated ? 'cookie' : null;
}

/** @deprecated Prefer setSessionValidated */
export function setValidatedToken(token: string | null): void {
  sessionValidated = Boolean(token);
}

export function getValidationPromise(): Promise<boolean> | null {
  return validationPromise;
}

export function setValidationPromise(promise: Promise<boolean> | null): void {
  validationPromise = promise;
}

export function clearSessionValidationCache(): void {
  sessionValidated = false;
  validationPromise = null;
}
