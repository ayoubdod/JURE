import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '@/hooks/useTheme';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import {
  hasBlockingDialog,
  isMacPlatform,
  isTypingTarget,
  modSymbol,
} from '@/lib/keyboard';
import { pageOwnsSlashSearch, SHORTCUT_CATALOG } from '@/shortcuts/catalog';
import type { ShortcutActionId, ShortcutHandler } from '@/shortcuts/types';

const CHORD_MS = 900;

export const SHOW_SHORTCUT_HINTS_KEY = 'jure.shortcuts.showOnButtons';

function readShowHintsOnButtons(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_SHORTCUT_HINTS_KEY);
    if (stored === null) return true;
    return stored === '1';
  } catch {
    return true;
  }
}

type ShortcutsContextValue = {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  togglePalette: () => void;
  toggleHelp: () => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  register: (action: ShortcutActionId, handler: ShortcutHandler) => () => void;
  runAction: (action: ShortcutActionId) => boolean;
  isMac: boolean;
  mod: string;
  showHintsOnButtons: boolean;
  setShowHintsOnButtons: (value: boolean) => void;
};

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

const noopUnregister = () => {};

export function ShortcutsProvider({
  children,
  onToggleSidebar,
}: {
  children: React.ReactNode;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const { themeChoice, setTheme } = useTheme();
  const { authorized: financeAuthorized } = useFinanceAccess();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showHintsOnButtons, setShowHintsOnButtonsState] = useState(readShowHintsOnButtons);
  const handlersRef = useRef<Map<ShortcutActionId, Set<ShortcutHandler>>>(new Map());
  const chordRef = useRef<{ prefix: string; at: number } | null>(null);
  const isMac = isMacPlatform();
  const mod = modSymbol(isMac);

  const register = useCallback((action: ShortcutActionId, handler: ShortcutHandler) => {
    let set = handlersRef.current.get(action);
    if (!set) {
      set = new Set();
      handlersRef.current.set(action, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }, []);

  const runAction = useCallback((action: ShortcutActionId) => {
    const set = handlersRef.current.get(action);
    if (!set || set.size === 0) return false;
    const handlers = [...set];
    handlers[handlers.length - 1]();
    return true;
  }, []);

  const setShowHintsOnButtons = useCallback((value: boolean) => {
    setShowHintsOnButtonsState(value);
    try {
      localStorage.setItem(SHOW_SHORTCUT_HINTS_KEY, value ? '1' : '0');
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const togglePalette = useCallback(() => {
    setHelpOpen(false);
    setPaletteOpen((v) => !v);
  }, []);

  const toggleHelp = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen((v) => !v);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeChoice === 'dark' ? 'light' : 'dark');
  }, [setTheme, themeChoice]);

  const runInternal = useCallback(
    (internal: 'palette' | 'help' | 'sidebar' | 'theme') => {
      if (internal === 'palette') togglePalette();
      else if (internal === 'help') toggleHelp();
      else if (internal === 'sidebar') onToggleSidebar();
      else if (internal === 'theme') toggleTheme();
    },
    [onToggleSidebar, toggleHelp, togglePalette, toggleTheme],
  );

  const itemAllowed = useCallback(
    (item: (typeof SHORTCUT_CATALOG)[number]) => {
      if (item.finance && !financeAuthorized) return false;
      if (item.juria && !JURIA_ENABLED) return false;
      return true;
    },
    [financeAuthorized],
  );

  const runItem = useCallback(
    (item: (typeof SHORTCUT_CATALOG)[number]) => {
      if (!itemAllowed(item) || item.docsOnly) return;
      if (item.kind === 'navigate' && item.path) {
        navigate(item.path);
        return;
      }
      if (item.kind === 'action' && item.action) {
        runAction(item.action);
        return;
      }
      if (item.kind === 'internal' && item.internal) {
        runInternal(item.internal);
      }
    },
    [itemAllowed, navigate, runAction, runInternal],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const withMod = e.metaKey || e.ctrlKey;
      const key = e.key;

      if (withMod && (key === 'k' || key === 'K') && !e.altKey) {
        e.preventDefault();
        togglePalette();
        return;
      }

      if (withMod && (key === 'b' || key === 'B') && !e.altKey && !e.shiftKey) {
        if (!isTypingTarget(e.target)) {
          e.preventDefault();
          onToggleSidebar();
        }
        return;
      }

      if (paletteOpen || helpOpen) {
        if (key === 'Escape') {
          setPaletteOpen(false);
          setHelpOpen(false);
        }
        return;
      }

      if (hasBlockingDialog()) {
        chordRef.current = null;
        return;
      }

      const typing = isTypingTarget(e.target);

      if (!typing && (key === '?' || (key === '/' && e.shiftKey && !withMod))) {
        e.preventDefault();
        toggleHelp();
        return;
      }

      if (!typing && key === '/' && !withMod && !e.altKey && !e.shiftKey) {
        if (!pageOwnsSlashSearch(window.location.pathname)) {
          e.preventDefault();
          setPaletteOpen(true);
        }
        return;
      }

      if (typing || withMod || e.altKey) {
        chordRef.current = null;
        return;
      }

      const now = Date.now();
      const pending = chordRef.current;
      if (pending && now - pending.at <= CHORD_MS) {
        const second = key.length === 1 ? key.toLowerCase() : key;
        const match = SHORTCUT_CATALOG.find(
          (item) =>
            item.chord &&
            item.chord.prefix === pending.prefix &&
            item.chord.key === second &&
            !item.docsOnly,
        );
        chordRef.current = null;
        if (match) {
          e.preventDefault();
          runItem(match);
        }
        return;
      }

      const lower = key.length === 1 ? key.toLowerCase() : key;
      if (lower === 'g' || lower === 'c') {
        e.preventDefault();
        chordRef.current = { prefix: lower, at: now };
        return;
      }

      chordRef.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [helpOpen, onToggleSidebar, paletteOpen, runItem, toggleHelp, togglePalette]);

  const value = useMemo<ShortcutsContextValue>(
    () => ({
      paletteOpen,
      setPaletteOpen,
      helpOpen,
      setHelpOpen,
      togglePalette,
      toggleHelp,
      toggleSidebar: onToggleSidebar,
      toggleTheme,
      register,
      runAction,
      isMac,
      mod,
      showHintsOnButtons,
      setShowHintsOnButtons,
    }),
    [
      helpOpen,
      isMac,
      mod,
      onToggleSidebar,
      paletteOpen,
      register,
      runAction,
      showHintsOnButtons,
      setShowHintsOnButtons,
      toggleHelp,
      togglePalette,
      toggleTheme,
    ],
  );

  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) {
    return {
      paletteOpen: false,
      setPaletteOpen: () => {},
      helpOpen: false,
      setHelpOpen: () => {},
      togglePalette: () => {},
      toggleHelp: () => {},
      toggleSidebar: () => {},
      toggleTheme: () => {},
      register: () => noopUnregister,
      runAction: () => false,
      isMac: false,
      mod: 'Ctrl',
      showHintsOnButtons: true,
      setShowHintsOnButtons: () => {},
    } satisfies ShortcutsContextValue;
  }
  return ctx;
}

/** Register a page-level handler. Last registered handler wins (page over fallback host). */
export function useShortcutAction(action: ShortcutActionId, handler: ShortcutHandler) {
  const { register } = useShortcuts();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return register(action, () => handlerRef.current());
  }, [action, register]);
}
