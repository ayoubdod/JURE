/** Moroccan litigation court hierarchy used by create/edit forms. */

export const COURT_SPECIALTIES = ['NORMAL', 'COMMERCIAL', 'ADMINISTRATIVE'] as const;
export type CourtSpecialty = (typeof COURT_SPECIALTIES)[number];

export const JURISDICTION_LEVELS = ['FIRST_INSTANCE', 'APPEAL', 'CASSATION'] as const;
export type JurisdictionLevel = (typeof JURISDICTION_LEVELS)[number];

export const FIRST_INSTANCE_CHAMBERS = [
  'FAMILY',
  'LOCAL_JUSTICE',
  'CIVIL',
  'COMMERCIAL',
  'REAL_ESTATE',
  'SOCIAL',
  'CRIMINAL',
  'APPEAL',
] as const;

export const APPEAL_CHAMBERS = [
  'CIVIL',
  'FAMILY',
  'CRIMINAL',
  'SOCIAL',
  'COMMERCIAL',
  'CRIMINAL_SERIOUS',
] as const;

export const CASSATION_CHAMBERS = [
  'CIVIL',
  'PERSONAL_STATUS',
  'COMMERCIAL',
  'ADMINISTRATIVE',
  'SOCIAL',
  'CRIMINAL',
] as const;

export type ChamberCode =
  | (typeof FIRST_INSTANCE_CHAMBERS)[number]
  | (typeof APPEAL_CHAMBERS)[number]
  | (typeof CASSATION_CHAMBERS)[number];

export const CHAMBERS_BY_JURISDICTION: Record<JurisdictionLevel, readonly string[]> = {
  FIRST_INSTANCE: FIRST_INSTANCE_CHAMBERS,
  APPEAL: APPEAL_CHAMBERS,
  CASSATION: CASSATION_CHAMBERS,
};

export function isJurisdictionLevel(value: unknown): value is JurisdictionLevel {
  return typeof value === 'string' && (JURISDICTION_LEVELS as readonly string[]).includes(value);
}

export function isCourtSpecialty(value: unknown): value is CourtSpecialty {
  return typeof value === 'string' && (COURT_SPECIALTIES as readonly string[]).includes(value);
}

export function chambersForJurisdiction(jurisdiction: string | null | undefined): readonly string[] {
  if (!isJurisdictionLevel(jurisdiction)) return [];
  return CHAMBERS_BY_JURISDICTION[jurisdiction];
}

export function isChamberValidForJurisdiction(
  jurisdiction: string | null | undefined,
  chamber: string | null | undefined
): boolean {
  if (!chamber) return true;
  if (!isJurisdictionLevel(jurisdiction)) return true;
  return CHAMBERS_BY_JURISDICTION[jurisdiction].includes(chamber);
}

/** Split legacy free-text jurisdiction (often a city) from the new court-level enum. */
export function splitLegacyJurisdiction(
  storedJurisdiction?: string | null,
  storedCity?: string | null
): { jurisdiction: JurisdictionLevel | ''; city: string } {
  const city = (storedCity ?? '').trim();
  const raw = (storedJurisdiction ?? '').trim();
  if (isJurisdictionLevel(raw)) {
    return { jurisdiction: raw, city };
  }
  if (!raw) return { jurisdiction: '', city };
  return { jurisdiction: '', city: city || raw };
}
