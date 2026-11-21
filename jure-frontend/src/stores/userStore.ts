import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearDismissedAnnouncements } from '@/utils/announcementDismiss';
import { clearIdleSessionMarkers } from '@/utils/idleSession';
import { clearSessionValidationCache } from '@/utils/sessionValidationCache';

interface UserStore {
    user: API.User | null;
    isLoggedIn: boolean;
    logout: () => void;
    setUser: (user: API.User) => void;
}

const useUserStore = create<UserStore>()(persist(
    (set) => ({
        user: null,
        isLoggedIn: false,
        logout: () => {
            clearDismissedAnnouncements();
            clearIdleSessionMarkers();
            clearSessionValidationCache();
            set({
                user: null,
                isLoggedIn: false,
            })
        },
        setUser: (user: API.User) => {
            set({
                user,
                isLoggedIn: true
            })
        },
    }),
    {
        name: 'user-storage',
        version: 1,
        partialize: (state) => ({
            user: state.user,
            isLoggedIn: state.isLoggedIn,
        }),
        migrate: (persisted) => {
            const p = (persisted ?? {}) as { user?: API.User | null; isLoggedIn?: boolean };
            return {
                user: p.user ?? null,
                isLoggedIn: Boolean(p.isLoggedIn),
            };
        },
    }
))


export default useUserStore;
