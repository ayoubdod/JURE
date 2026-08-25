/** Deduplicate /api/me across remounted route guards for the same token. */
let validatedToken: string | null = null;
let validationPromise: Promise<boolean> | null = null;

export function getValidatedToken(): string | null {
  return validatedToken;
}

export function setValidatedToken(token: string | null): void {
  validatedToken = token;
}

export function getValidationPromise(): Promise<boolean> | null {
  return validationPromise;
}

export function setValidationPromise(promise: Promise<boolean> | null): void {
  validationPromise = promise;
}

export function clearSessionValidationCache(): void {
  validatedToken = null;
  validationPromise = null;
}
