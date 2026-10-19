import { createContext, useContext } from 'react';
import type { Unit } from '../../content/types';

export interface TermApi {
  unit: Unit | null;
  openTerm: (term: string) => void;
}

export const TermContext = createContext<TermApi>({ unit: null, openTerm: () => {} });
export const useTermApi = () => useContext(TermContext);

export const normTerm = (t: string) => t.replace(/[:：.。!?]+$/g, '').trim();
