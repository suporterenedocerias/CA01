/**
 * Em modo desenvolvimento (npm run dev), o painel /admin pode ser acessado sem exigir
 * sessão em localhost, 127.0.0.1 ou IP privado da rede (192.168.x, 10.x, 172.16–31.x).
 * Para forçar em outros hosts em dev: VITE_ADMIN_LOCAL_BYPASS=true
 *
 * Em build de produção (npm run build) isto NUNCA fica ativo.
 */
function isPrivateLanHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = hostname.match(ipv4);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isAdminLocalBypass(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.VITE_ADMIN_LOCAL_BYPASS === 'true') return true;
  if (typeof window === 'undefined') return false;
  return isPrivateLanHostname(window.location.hostname);
}
