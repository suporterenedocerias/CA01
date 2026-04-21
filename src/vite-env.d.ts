/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_LOCAL_BYPASS?: string;
  readonly VITE_DEV_ADMIN_EMAIL?: string;
  readonly VITE_DEV_ADMIN_PASSWORD?: string;
  /** Senha do painel oculto /HASH2011 (obrigatória para aceder; não commite o valor real) */
  readonly VITE_HASHADMIN_SECRET?: string;
  /** JSON: [{ "id","label","siteOrigin","supabaseUrl","supabaseAnonKey" }, ...] — vários clientes */
  readonly VITE_HASHADMIN_INSTANCES?: string;
  /** Opcional: service role do projeto local — gravar subpáginas no mestre (nunca commitar) */
  readonly VITE_HASHADMIN_SERVICE_ROLE_KEY?: string;
}
