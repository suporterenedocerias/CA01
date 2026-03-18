/** Mensagens em português para erros comuns do login Supabase */
export function mapSupabaseAuthError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos. No Supabase: Authentication → Users — confira se o usuário existe e a senha.';
  }
  if (m.includes('email not confirmed')) {
    return 'Confirme o e-mail do usuário no Supabase (Users → confirme manualmente ou desative “Confirm email” em Auth).';
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return 'Não foi possível conectar ao Supabase. Verifique VITE_SUPABASE_URL / env.js no site e o firewall.';
  }
  if (m.includes('invalid api key') || m.includes('jwt') || m.includes('apikey')) {
    return 'Chave API inválida: no Supabase → Settings → API, copie a chave anon/public (JWT longo, começa com eyJ). Não use service_role. Atualize .env, rode node deploy/write-env-js.mjs e suba o env.js + novo build.';
  }
  return message || 'Não foi possível entrar. Tente de novo.';
}
