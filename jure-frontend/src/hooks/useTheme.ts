import { useEffect, useState } from 'react';

type ThemeChoice = 'light' | 'dark' | 'system';

const prefersDark = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getStoredTheme = (): ThemeChoice => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('theme') as ThemeChoice) || 'system';
};

const applyTheme = (choice: ThemeChoice) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  let shouldBeDark = false;
  
  if (choice === 'system') {
    shouldBeDark = prefersDark();
  } else {
    shouldBeDark = choice === 'dark';
  }
  
  root.classList.toggle('dark', shouldBeDark);
};

/**
 * Centralized theme hook that:
 * - Initializes theme from localStorage on mount
 * - Listens to localStorage changes (from Settings page)
 * - Handles system preference changes
 * - Applies theme to document.documentElement
 */
export const useTheme = () => {
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(getStoredTheme);

  // Initialize theme on mount
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeChoice(stored);
    applyTheme(stored);
  }, []);

  // Listen to localStorage changes (when Settings page updates theme)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as ThemeChoice;
        setThemeChoice(newTheme);
        applyTheme(newTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen to custom storage event (for same-tab updates)
  useEffect(() => {
    const handleCustomStorage = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; newValue: string }>;
      if (customEvent.detail?.key === 'theme') {
        const newTheme = customEvent.detail.newValue as ThemeChoice;
        setThemeChoice(newTheme);
        applyTheme(newTheme);
      }
    };

    window.addEventListener('theme-change', handleCustomStorage as EventListener);
    return () => window.removeEventListener('theme-change', handleCustomStorage as EventListener);
  }, []);

  // Watch system preference changes when theme is 'system'
  useEffect(() => {
    if (themeChoice !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeChoice]);

  const setTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    localStorage.setItem('theme', choice);
    applyTheme(choice);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(
      new CustomEvent('theme-change', {
        detail: { key: 'theme', newValue: choice },
      })
    );
  };

  return { themeChoice, setTheme };
};







