import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

const noopMobileNav: MobileNavContextValue = {
  open: false,
  setOpen: () => {},
  toggle: () => {},
  close: () => {},
};

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, setOpen, toggle, close }),
    [open, toggle, close]
  );

  return (
    <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext) ?? noopMobileNav;
}
