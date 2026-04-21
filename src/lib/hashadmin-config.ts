import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Painel CEO (HASH2011) — separado do /admin do cliente:
 * - O cliente usa apenas login Supabase em /admin (sessão `supabase.auth`).
 * - O CEO usa URL oculta + `VITE_HASHADMIN_SECRET` e `sessionStorage` (`hashadmin_ok`);
 *   não há ligação com a sessão do admin: saber a password do /admin não abre o painel CEO.
 * - Não existe link no UI do /admin para /HASH2011 (só quem conhece o caminho acede).
 * Nota: variáveis `VITE_*` vão no bundle; use senha longa e não commite o .env.
 */
export type HashAdminInstance = {
  id: string;
  label: string;
  /** URL base do site (ex.: https://cliente.com ou http://localhost:5174) */
  siteOrigin: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  /**
   * Opcional: service role do mesmo projeto — necessária para criar/editar/apagar subpáginas no mestre.
   * Nunca em repositório público; só no teu PC ou CI privado.
   */
  supabaseServiceRoleKey?: string;
};

/** Caminho do painel mestre (sem links no site; só quem conhece a URL). */
export const HASHADMIN_BASE_PATH = '/HASH2011';
export const HASHADMIN_LOGIN_PATH = `${HASHADMIN_BASE_PATH}/entrar` as const;

const STORAGE_KEY = 'hashadmin_ok';

export function isHashAdminConfigured(): boolean {
  return Boolean((import.meta.env.VITE_HASHADMIN_SECRET as string | undefined)?.trim());
}

export function isHashAdminUnlocked(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function unlockHashAdmin(plain: string): boolean {
  const expected = (import.meta.env.VITE_HASHADMIN_SECRET as string | undefined)?.trim();
  if (!expected || plain.trim() !== expected) return false;
  sessionStorage.setItem(STORAGE_KEY, '1');
  return true;
}

export function lockHashAdmin(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Clientes a monitorar. Sem JSON no .env, usa o próprio projeto do .env atual. */
export function getHashAdminInstances(): HashAdminInstance[] {
  const raw = (import.meta.env.VITE_HASHADMIN_INSTANCES as string | undefined)?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (row): row is HashAdminInstance =>
            row != null &&
            typeof row === 'object' &&
            typeof (row as HashAdminInstance).id === 'string' &&
            typeof (row as HashAdminInstance).label === 'string' &&
            typeof (row as HashAdminInstance).siteOrigin === 'string' &&
            typeof (row as HashAdminInstance).supabaseUrl === 'string' &&
            typeof (row as HashAdminInstance).supabaseAnonKey === 'string',
        )
        .map((r) => ({
          ...r,
          siteOrigin: r.siteOrigin.replace(/\/$/, ''),
          supabaseServiceRoleKey:
            typeof r.supabaseServiceRoleKey === 'string' ? r.supabaseServiceRoleKey : undefined,
        }));
    } catch {
      return [];
    }
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!supabaseUrl || !key) return [];

  const origin =
    typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : 'http://localhost:8080';

  return [
    {
      id: 'local',
      label: 'Instalação atual (este .env)',
      siteOrigin: origin,
      supabaseUrl,
      supabaseAnonKey: key,
    },
  ];
}

/** Cache de clientes por URL+key — evita múltiplos GoTrueClient no mesmo contexto. */
const _clientCache = new Map<string, SupabaseClient>();

export function createHashAdminSupabase(url: string, anonKey: string): SupabaseClient {
  const key = `${url}::${anonKey}`;
  if (_clientCache.has(key)) return _clientCache.get(key)!;
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  _clientCache.set(key, client);
  return client;
}

/** Cliente com service role para mutações (subpáginas). null se não configurado. */
export function getHashAdminWriteClient(inst: HashAdminInstance): SupabaseClient | null {
  const fromRow = inst.supabaseServiceRoleKey?.trim();
  const global = (import.meta.env.VITE_HASHADMIN_SERVICE_ROLE_KEY as string | undefined)?.trim();
  const svc = fromRow || (inst.id === 'local' ? global : undefined);
  if (!svc) return null;
  return createClient(inst.supabaseUrl, svc, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
