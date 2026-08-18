import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearDismissedAnnouncements } from '@/utils/announcementDismiss';
import { clearIdleSessionMarkers } from '@/utils/idleSession';

interface UserStore {
    user: API.User | null;
    accessToken: string | null
    refreshToken: string | null
    isLoggedIn: boolean;
    logout: () => void;
    setUser: (user: API.User) => void;
}

const useUserStore = create<UserStore>()(persist(
    (set,get) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoggedIn: false,
        logout: () => {
            clearDismissedAnnouncements();
            clearIdleSessionMarkers();
            set({
                user: null,
                isLoggedIn: false,
                accessToken: null,
                refreshToken: null,
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
    }
))


export default useUserStore;
