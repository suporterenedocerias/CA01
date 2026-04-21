import { ReactNode, useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, Tag, LogOut, ExternalLink, Layers, Wallet, ClipboardList, BarChart2, Users, Globe, ChevronDown, CreditCard, ShieldCheck, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HASHADMIN_BASE_PATH, HASHADMIN_LOGIN_PATH, lockHashAdmin } from '@/lib/hashadmin-config';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { loadStoredClients } from '@/lib/hashadmin-clients-store';
import { resolveApiBase } from '@/lib/resolve-api-base';
import { cn } from '@/lib/utils';

/** Botão que gera magic link e abre o /admin do cliente */
function AdminAccessButton() {
  const { clientId, instances } = useHashAdminClientFilter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const active = clientId === 'all' ? null : instances.find((i) => i.id === clientId) ?? null;
  const stored = active ? loadStoredClients().find((c) => c.id === active.id) : null;

  // Usa service role do cliente se disponível, senão cai no .env do servidor
  const serviceKey = stored?.supabaseServiceRoleKey ?? '';
  const supabaseUrl = stored?.supabaseUrl ?? (import.meta.env.VITE_SUPABASE_URL as string ?? '');
  const anonKey = stored?.supabaseAnonKey ?? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string ?? '');

  // Se siteOrigin for localhost / vazio, usa o origin atual (produção)
  const rawOrigin = active?.siteOrigin ?? '';
  const isLocalhost = (o: string) => !o || /localhost|127\.0\.0\.1/.test(o);
  const normalizeOrigin = (o: string) => {
    const trimmed = o.replace(/\/$/, '');
    if (!trimmed) return window.location.origin;
    if (isLocalhost(trimmed)) return window.location.origin;
    // Garante protocolo
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  };
  const siteOrigin = normalizeOrigin(rawOrigin);

  const openAdmin = useCallback(async () => {
    setLoading(true); setErr('');
    // Abre a aba ANTES do await para não ser bloqueado pelo browser como popup
    const win = window.open('', '_blank');
    try {
      if (!win) throw new Error('Popup bloqueado. Permita popups para este site.');

      const base = resolveApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (serviceKey) headers['X-Service-Key'] = serviceKey;
      if (supabaseUrl) headers['X-Supabase-Url'] = supabaseUrl;

      const res = await fetch(`${base}/hashadmin/admin-link`, { method: 'POST', headers, body: JSON.stringify({}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar link');

      const tokenHash: string | null = json.token_hash ?? null;
      const adminUrl = `${siteOrigin}/admin/dashboard`;

      if (tokenHash && supabaseUrl && anonKey) {
        // Troca o token por sessão — bypassa restrição de redirect URL do Supabase
        const { createClient } = await import('@supabase/supabase-js');
        const tempSb = createClient(supabaseUrl, anonKey, {
          auth: { persistSession: true, autoRefreshToken: false, storage: localStorage },
        });
        const { data: otpData, error: otpErr } = await tempSb.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });
        if (otpErr) throw new Error(otpErr.message);
        const sess = otpData?.session;
        if (!sess) throw new Error('Sessão não obtida — verifique as credenciais do cliente');
        // Sessão já está no localStorage — navega a aba para o admin
        win.location.href = adminUrl;
      } else if (json.url) {
        win.location.href = json.url;
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (e) {
      win?.close();
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally { setLoading(false); }
  }, [serviceKey, supabaseUrl, anonKey, siteOrigin]);

  return (
    <div className="mx-2 mb-2">
      <button
        type="button"
        onClick={openAdmin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-60"
      >
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <ShieldCheck className="h-3.5 w-3.5 text-green-400" />}
        Acessar painel Admin
      </button>
      {err && <p className="mt-1 text-center text-[10px] text-red-400">{err}</p>}
    </div>
  );
}

/** Card no topo do sidebar mostrando o cliente selecionado */
function SidebarClientCard() {
  const { clientId, setClientId, instances } = useHashAdminClientFilter();
  if (instances.length === 0) return null;

  const active = clientId === 'all' ? null : instances.find((i) => i.id === clientId) ?? null;

  return (
    <div className="mx-2 mb-2 mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      {/* seletor compacto */}
      <div className="relative">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-3 pr-7 text-xs font-semibold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          aria-label="Selecionar cliente"
        >
          <option value="all">— Todos os clientes —</option>
          {instances.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
      </div>

      {/* Info do cliente selecionado */}
      {active && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <p className="text-xs font-bold text-white truncate">{active.label}</p>
          </div>
          {active.siteOrigin && (
            <a
              href={active.siteOrigin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors truncate"
            >
              <Globe className="h-3 w-3 shrink-0" />
              {active.siteOrigin.replace(/^https?:\/\//, '')}
            </a>
          )}
          <p className="text-[10px] text-zinc-600 font-mono truncate">{active.id}</p>
        </div>
      )}
      {!active && (
        <p className="mt-2 text-[11px] text-zinc-500">Mostrando todos os {instances.length} projeto(s)</p>
      )}
    </div>
  );
}

/** Barra de cliente no topo do conteúdo (mobile + contexto rápido) */
function ClientScopeBar() {
  const { clientId, setClientId, instances } = useHashAdminClientFilter();
  if (instances.length === 0) return null;
  const active = clientId !== 'all' ? instances.find((i) => i.id === clientId) : null;
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Building2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cliente</span>
      </div>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="h-10 min-w-[min(100%,280px)] rounded-lg border border-zinc-600 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        aria-label="Filtrar por cliente"
      >
        <option value="all">Todos os clientes (visão unificada)</option>
        {instances.map((i) => (
          <option key={i.id} value={i.id}>{i.label}</option>
        ))}
      </select>
      {active && active.siteOrigin && (
        <a
          href={active.siteOrigin}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <Globe className="h-3.5 w-3.5" />
          {active.siteOrigin.replace(/^https?:\/\//, '')}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      )}
    </div>
  );
}

const nav = [
  { to: `${HASHADMIN_BASE_PATH}/dashboard`, end: false, label: 'Dashboard', icon: BarChart2 },
  { to: `${HASHADMIN_BASE_PATH}/clientes`, end: false, label: 'Clientes', icon: Building2 },
  { to: `${HASHADMIN_BASE_PATH}/faturamento`, end: false, label: 'Faturamento', icon: Wallet },
  { to: `${HASHADMIN_BASE_PATH}/equipa`, end: false, label: 'Funcionários', icon: Users },
  { to: `${HASHADMIN_BASE_PATH}/ofertas`, end: false, label: 'Ofertas', icon: Tag },
  { to: `${HASHADMIN_BASE_PATH}/solicitacoes`, end: false, label: 'Pedidos', icon: ClipboardList },
  { to: `${HASHADMIN_BASE_PATH}/trafego`, end: false, label: 'Tráfego & ROAS', icon: TrendingUp },
  { to: `${HASHADMIN_BASE_PATH}/gateway`, end: false, label: 'Fluxxo Pay', icon: CreditCard },
  { to: `${HASHADMIN_BASE_PATH}/subpaginas`, end: false, label: 'Subpáginas', icon: Layers },
];

function HashAdminLayoutInner({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'CEO · Painel mestre';
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow');
    meta.setAttribute('data-hashadmin', '1');
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      document.head.querySelector('meta[data-hashadmin="1"]')?.remove();
    };
  }, []);

  const leave = () => {
    lockHashAdmin();
    navigate(HASHADMIN_LOGIN_PATH, { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        {/* Título CEO */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-zinc-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-700 text-xs font-black text-white">
            CEO
          </div>
          <span className="text-sm font-bold text-zinc-100">Painel Mestre</span>
        </div>

        {/* Card de cliente */}
        <SidebarClientCard />

        {/* Acesso direto ao /admin */}
        <AdminAccessButton />

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {nav.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            onClick={leave}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3 md:hidden">
          <p className="font-display text-sm font-bold text-zinc-100">CEO · Painel</p>
          <Button type="button" variant="ghost" size="sm" className="text-zinc-400" onClick={leave}>
            Sair
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-2 py-2 md:hidden">
          {nav.map(({ to, end, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-md px-3 py-2 text-xs font-medium',
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <ClientScopeBar />
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export function HashAdminLayout({ children }: { children?: ReactNode }) {
  return <HashAdminLayoutInner>{children}</HashAdminLayoutInner>;
}

export function ExternalPanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-zinc-300 underline-offset-2 hover:text-white hover:underline"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  );
}
