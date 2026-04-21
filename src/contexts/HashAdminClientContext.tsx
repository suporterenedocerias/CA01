import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { getHashAdminInstances, type HashAdminInstance } from '@/lib/hashadmin-config';
import { loadStoredClients, syncClientsFromServer } from '@/lib/hashadmin-clients-store';

const STORAGE_KEY = 'hashadmin_selected_client_id';

export type HashAdminClientContextValue = {
  /** `all` = todos os projetos; senão o `id` da instância. */
  clientId: string;
  setClientId: (id: string) => void;
  /** Lista completa configurada (.env + localStorage). */
  instances: HashAdminInstance[];
  /** Instâncias visíveis consoante o filtro. */
  visibleInstances: HashAdminInstance[];
  /** Força re-leitura dos clientes do localStorage (chamar após salvar). */
  refreshInstances: () => void;
};

const HashAdminClientContext = createContext<HashAdminClientContextValue | null>(null);

function buildInstances(): HashAdminInstance[] {
  const base = getHashAdminInstances();
  const stored = loadStoredClients();
  const storedMap = new Map(stored.map((c) => [c.id, c]));

  const merged: HashAdminInstance[] = base.map((inst) => {
    const override = storedMap.get(inst.id);
    if (!override) return inst;
    return { ...inst, label: override.label || inst.label };
  });

  const baseIds = new Set(base.map((i) => i.id));
  for (const c of stored) {
    if (baseIds.has(c.id)) continue;
    if (!c.supabaseUrl || !c.supabaseAnonKey) continue;
    merged.push({
      id: c.id,
      label: c.label,
      siteOrigin: c.siteOrigin?.replace(/\/$/, '') ?? '',
      supabaseUrl: c.supabaseUrl,
      supabaseAnonKey: c.supabaseAnonKey,
      supabaseServiceRoleKey: c.supabaseServiceRoleKey,
    });
  }
  return merged;
}

export function HashAdminClientFilterProvider({ children }: { children: ReactNode }) {
  // rev muda apenas quando refreshInstances é chamado — força buildInstances a re-executar
  const [rev, setRev] = useState(0);
  const instances = useMemo(() => buildInstances(), [rev]);

  const [clientId, setClientIdState] = useState<string>(() => {
    if (typeof sessionStorage === 'undefined') return 'all';
    return sessionStorage.getItem(STORAGE_KEY) || 'all';
  });

  const setClientId = (id: string) => {
    setClientIdState(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  };

  const refreshInstances = useCallback(() => {
    setRev((r) => r + 1);
  }, []);

  // Na inicialização, sincroniza clientes do servidor (qualquer dispositivo)
  useEffect(() => {
    syncClientsFromServer().then(() => refreshInstances());
  }, [refreshInstances]);

  // Escuta evento disparado ao salvar/apagar clientes
  useEffect(() => {
    const handler = () => refreshInstances();
    window.addEventListener('hashadmin-clients-changed', handler);
    return () => window.removeEventListener('hashadmin-clients-changed', handler);
  }, [refreshInstances]);

  const visibleInstances = useMemo(() => {
    if (clientId === 'all') return instances;
    return instances.filter((i) => i.id === clientId);
  }, [instances, clientId]);

  useEffect(() => {
    if (clientId === 'all' || instances.length === 0) return;
    if (!instances.some((i) => i.id === clientId)) {
      setClientIdState('all');
      sessionStorage.setItem(STORAGE_KEY, 'all');
    }
  }, [instances, clientId]);

  const value = useMemo(
    (): HashAdminClientContextValue => ({
      clientId,
      setClientId,
      instances,
      visibleInstances,
      refreshInstances,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, instances, visibleInstances, refreshInstances],
  );

  return <HashAdminClientContext.Provider value={value}>{children}</HashAdminClientContext.Provider>;
}

export function useHashAdminClientFilter(): HashAdminClientContextValue {
  const ctx = useContext(HashAdminClientContext);
  if (!ctx) {
    const instances = getHashAdminInstances();
    return {
      clientId: 'all',
      setClientId: () => {},
      instances,
      visibleInstances: instances,
      refreshInstances: () => {},
    };
  }
  return ctx;
}
