import useChatStore from '@/stores/chatStore';
import { isCabinetMemberOnline } from '@/lib/presence';

export function useOnlineIds(): number[] {
  return useChatStore((s) => s.onlineIds ?? []);
}

export function useIsCabinetMemberOnline(member: API.CabinetMember | null | undefined): boolean {
  const onlineIds = useOnlineIds();
  if (!member) return false;
  return isCabinetMemberOnline(member, onlineIds);
}
