/**
 * Armazena clientes CEO no servidor (via API) + localStorage como cache.
 * O cliente "local" (vindo do .env) pode ter o label sobrescrito aqui.
 * Clientes adicionais ficam no servidor, protegidos pela senha CEO.
 */

import { resolveApiBase } from '@/lib/resolve-api-base';

export const CLIENTS_STORAGE_KEY = 'hashadmin_clients_v1';

function getSecret(): string {
  return (import.meta.env.VITE_HASHADMIN_SECRET as string | undefined)?.trim() ?? '';
}

/** Carrega clientes do servidor e sincroniza com localStorage */
export async function syncClientsFromServer(): Promise<StoredClient[]> {
  try {
    const base = resolveApiBase();
    const secret = getSecret();
    const res = await fetch(`${base}/hashadmin/clients`, {
      headers: { 'X-Hashadmin-Secret': secret },
    });
    if (!res.ok) return loadStoredClients();
    const data: StoredClient[] = await res.json();
    // Grava cache local
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('hashadmin-clients-changed'));
    return data;
  } catch {
    return loadStoredClients();
  }
}

/** Salva lista completa no servidor e no localStorage */
async function persistToServer(clients: StoredClient[]): Promise<void> {
  try {
    const base = resolveApiBase();
    const secret = getSecret();
    await fetch(`${base}/hashadmin/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hashadmin-Secret': secret },
      body: JSON.stringify(clients),
    });
  } catch { /* falha silenciosa — localStorage já foi atualizado */ }
}

export type StoredClient = {
  /** 'local' = instância do .env; outros = clientes adicionais */
  id: string;
  label: string;
  /** Vazio para id='local' (usa as do .env) */
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  siteOrigin?: string;
  /** Chaves do gateway de pagamento (FastSoft ou outro) */
  gatewayApiKey?: string;
  gatewaySecretKey?: string;
  /** Taxa do gateway: percentual (ex: 6.99) e fixa em R$ (ex: 2.29) */
  gatewayFeePct?: number;
  gatewayFeeFixed?: number;
};

export function loadStoredClients(): StoredClient[] {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is StoredClient =>
        c != null &&
        typeof c.id === 'string' &&
        typeof c.label === 'string' &&
        typeof c.supabaseUrl === 'string' &&
        typeof c.supabaseAnonKey === 'string',
    );
  } catch {
    return [];
  }
}

export function saveStoredClients(clients: StoredClient[]): void {
  localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  window.dispatchEvent(new Event('hashadmin-clients-changed'));
  persistToServer(clients);
}

export function upsertStoredClient(client: StoredClient): void {
  const all = loadStoredClients();
  const idx = all.findIndex((c) => c.id === client.id);
  if (idx >= 0) all[idx] = client;
  else all.push(client);
  saveStoredClients(all);
}

export function deleteStoredClient(id: string): void {
  saveStoredClients(loadStoredClients().filter((c) => c.id !== id));
}
