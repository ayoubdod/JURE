import { getUserIdFromCabinetMember } from '@/utils/cabinetMemberHelpers';

export function isOnlineUserId(
  id: number | null | undefined,
  onlineIds: readonly number[]
): boolean {
  return typeof id === 'number' && onlineIds.includes(id);
}

/** Django auth user id used by chat presence. Cabinet member records are User rows. */
export function cabinetMemberPresenceId(member: API.CabinetMember): number {
  return getUserIdFromCabinetMember(member) ?? member.id;
}

export function isCabinetMemberOnline(
  member: API.CabinetMember,
  onlineIds: readonly number[]
): boolean {
  return isOnlineUserId(cabinetMemberPresenceId(member), onlineIds);
}

export function personPresenceId(
  person: { id?: number; pk?: number } | null | undefined
): number | undefined {
  if (!person) return undefined;
  if (typeof person.id === 'number') return person.id;
  if (typeof person.pk === 'number') return person.pk;
  return undefined;
}
