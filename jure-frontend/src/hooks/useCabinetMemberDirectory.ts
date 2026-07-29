import { useCallback, useEffect, useState } from 'react';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { getPersonImage } from '@/components/common/UserAvatar';
import useUserStore from '@/stores/userStore';

export type CabinetMemberPublic = {
  image?: string;
  first_name: string;
  last_name: string;
  email: string;
};

let cache: Map<number, CabinetMemberPublic> | null = null;
let loadPromise: Promise<Map<number, CabinetMemberPublic>> | null = null;

function buildMap(members: API.CabinetMember[]): Map<number, CabinetMemberPublic> {
  const m = new Map<number, CabinetMemberPublic>();
  for (const mem of members) {
    const fromMember = getPersonImage(mem as unknown as Record<string, unknown>);
    const u = mem.user;
    const fromUser =
      typeof u === 'object' && u != null ? getPersonImage(u as unknown as Record<string, unknown>) : undefined;
    const image = fromMember || fromUser;
    const row: CabinetMemberPublic = {
      image,
      first_name: mem.first_name,
      last_name: mem.last_name,
      email: mem.email,
    };
    const userId =
      typeof u === 'object' && u != null && 'id' in u
        ? (u as API.User).id
        : typeof u === 'number'
          ? u
          : undefined;
    if (userId != null) m.set(userId, row);
    m.set(mem.id, row);
  }
  return m;
}

function loadDirectory(): Promise<Map<number, CabinetMemberPublic>> {
  if (cache) return Promise.resolve(cache);
  if (loadPromise) return loadPromise;
  loadPromise = apiGetCabinetMembers({ expand: 'user' })
    .then((res) => {
      const arr = Array.isArray(res.data) ? res.data : [];
      cache = buildMap(arr);
      return cache;
    })
    .catch(() => {
      cache = new Map();
      return cache;
    })
    .finally(() => {
      loadPromise = null;
    });
  return loadPromise;
}

/**
 * Resolves profile photo + name from `/cabinets/members/` when task/calendar payloads omit `image`.
 * Cached globally so list + detail panels share one request.
 */
export function useCabinetMemberDirectory() {
  const currentUser = useUserStore((s) => s.user);
  const [byKey, setByKey] = useState<Map<number, CabinetMemberPublic>>(() => cache ?? new Map());

  useEffect(() => {
    let alive = true;
    loadDirectory().then((map) => {
      if (alive) setByKey(map);
    });
    return () => {
      alive = false;
    };
  }, []);

  const lookup = useCallback(
    (id: number | undefined | null) => {
      if (id == null) return undefined;
      const fromMap = byKey.get(id);

      /** Current user / owner: `GET /cabinets/members/` may include them; merge session photo when missing. */
      if (currentUser?.id === id) {
        const sessionRow: CabinetMemberPublic = {
          image: getPersonImage(currentUser as unknown as Record<string, unknown>),
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          email: currentUser.email,
        };
        if (!fromMap) return sessionRow;
        return {
          ...fromMap,
          image: fromMap.image || sessionRow.image,
          first_name: fromMap.first_name || sessionRow.first_name,
          last_name: fromMap.last_name || sessionRow.last_name,
          email: fromMap.email || sessionRow.email,
        };
      }

      return fromMap;
    },
    [byKey, currentUser]
  );

  return lookup;
}
