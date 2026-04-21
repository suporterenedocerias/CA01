import { Link } from 'react-router-dom';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { HashAdminProjectQuickLinks } from '@/components/hashadmin/HashAdminProjectQuickLinks';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { HASHADMIN_BASE_PATH } from '@/lib/hashadmin-config';
import { BarChart2, FolderKanban, Users, Wallet } from 'lucide-react';

export default function HashAdminHome() {
  const { visibleInstances: instances } = useHashAdminClientFilter();

  return (
    <HashAdminLayout>
      <div className="mb-6 flex items-start gap-2">
        <FolderKanban className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Área CEO — Projetos</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Cada cartão é um site (ex.: Entulho Hoje). Os atalhos abrem o painel do cliente noutro separador — esse
            painel usa <strong className="text-zinc-300">login Supabase do próprio projeto</strong>, independente da
            senha que usou aqui.
          </p>
          <p className="mt-3 max-w-2xl rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-2 text-xs leading-relaxed text-zinc-400">
            <strong className="text-zinc-300">Privacidade:</strong> o painel <code className="text-zinc-500">/admin</code>{' '}
            do cliente <strong className="text-zinc-300">não</strong> desbloqueia esta área. São sessões diferentes: lá
            é a conta de admin do site; aqui só entra quem conhece o URL{' '}
            <code className="text-zinc-500">{HASHADMIN_BASE_PATH}</code> e a chave{' '}
            <code className="text-zinc-500">VITE_HASHADMIN_SECRET</code> no servidor.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`${HASHADMIN_BASE_PATH}/dashboard`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              <BarChart2 className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <Link
              to={`${HASHADMIN_BASE_PATH}/faturamento`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              <Wallet className="h-3.5 w-3.5" /> Faturamento
            </Link>
            <Link
              to={`${HASHADMIN_BASE_PATH}/equipa`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-900/80 bg-emerald-950/50 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-600 hover:text-white"
            >
              <Users className="h-3.5 w-3.5" /> Funcionários
            </Link>
          </div>
        </div>
      </div>

      {instances.length === 0 ? (
        <p className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          Nenhum projeto. Preencha <code className="text-zinc-300">VITE_SUPABASE_URL</code> e chave anon no{' '}
          <code className="text-zinc-300">.env</code>, ou defina <code className="text-zinc-300">VITE_HASHADMIN_INSTANCES</code>{' '}
          (JSON) com vários clientes.
        </p>
      ) : (
        <ul className="mt-6 grid gap-6 lg:grid-cols-2">
          {instances.map((c) => (
            <li key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
              <p className="font-display text-lg font-semibold text-white">{c.label}</p>
              <p className="mt-1 truncate text-xs text-zinc-500" title={c.supabaseUrl}>
                {c.supabaseUrl}
              </p>
              <p className="mb-3 mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Acesso rápido
              </p>
              <HashAdminProjectQuickLinks inst={c} variant="grid" />
            </li>
          ))}
        </ul>
      )}
    </HashAdminLayout>
  );
}
