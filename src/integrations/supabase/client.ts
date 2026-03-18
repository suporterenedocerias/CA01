import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

declare global {
  interface Window {
    __CACAMBAJA_ENV__?: { supabaseUrl: string; supabaseAnonKey: string };
  }
}

function getSupabaseConfig(): { url: string; key: string } {
  const w = typeof window !== "undefined" ? window.__CACAMBAJA_ENV__ : undefined;
  const url =
    (import.meta.env.VITE_SUPABASE_URL as string) ||
    w?.supabaseUrl ||
    "";
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
    w?.supabaseAnonKey ||
    "";
  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "[CaçambaJá] Falta Supabase: faça npm run build com .env (VITE_*) ou coloque env.js no site — node deploy/write-env-js.mjs"
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid",
  {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});