import { createContext, useContext, type ReactNode } from 'react';

export type StatePageValue = {
  /** slug da URL (/e/:slug) ou null na home */
  slug: string | null;
  /** Nome amigável do estado/região */
  stateName: string | null;
  /** Prefixo para âncoras: "" ou "/e/sp" */
  basePath: string;
};

const defaultValue: StatePageValue = {
  slug: null,
  stateName: null,
  basePath: '',
};

const StatePageContext = createContext<StatePageValue>(defaultValue);

export function StatePageProvider({ value, children }: { value: StatePageValue; children: ReactNode }) {
  return <StatePageContext.Provider value={value}>{children}</StatePageContext.Provider>;
}

export function useStatePage(): StatePageValue {
  return useContext(StatePageContext);
}

/** Âncoras na mesma subpágina: na home `#contato`; em `/e/sp` → `/e/sp#contato` */
export function useLandingHash(hash: string): string {
  const { basePath } = useStatePage();
  if (!hash.startsWith('#')) return hash;
  return basePath ? `${basePath}${hash}` : hash;
}
