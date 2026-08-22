import { createContext, useContext } from 'react';

export const FilterPanelContext = createContext(false);

export function useInFilterPanel() {
  return useContext(FilterPanelContext);
}
