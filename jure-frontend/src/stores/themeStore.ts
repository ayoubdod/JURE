'use client'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
    theme: 'light' | 'dark';
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
}

// export const updateDocumentClass = (theme: 'light' | 'dark') => {
//     if(typeof window != 'undefined'){
//         if (theme === 'dark') {
//             document.documentElement.classList.add('dark');
//         } else {
//             document.documentElement.classList.remove('dark');
//         }
//     }
// };

const useThemeStore = create<ThemeStore>()(persist(
    (set) => ({
        theme: 'light',
        isDark: false,
        toggleTheme: () => {
            set((state) => {
                const newTheme = state.theme === 'light' ? 'dark' : 'light';
                // updateDocumentClass(newTheme);
                return { theme: newTheme, isDark: newTheme == 'dark' };
            });
        },
        setTheme: (theme) => {
            // updateDocumentClass(theme);
            set({ theme,isDark: theme == 'dark' });
        },
    }),
    {
        name: 'theme-storage',
        // onRehydrateStorage: () => (state) => {
        //     if (state) {
        //         updateDocumentClass(state.theme);
        //     }
        // },
    }
))

// if(useThemeStore.getState().theme){
//     updateDocumentClass(useThemeStore.getState().theme)
// }

export default useThemeStore;
