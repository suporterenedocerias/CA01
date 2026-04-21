import { useEffect, useState } from 'react';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, getHashAdminWriteClient, type HashAdminInstance } from '@/lib/hashadmin-config';
import { Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

type TaskRow = {
  id: string;
  created_at: string;
  title: string;
  details: string;
  site_offer_id: string | null;
  status: string;
};

const STATUSES = ['aberto', 'em_andamento', 'concluido', 'cancelado'] as const;

const statusPt: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function Block({
  inst,
  tasks,
  loading,
  error,
  onStatusChange,
  canWrite,
}: {
  inst: HashAdminInstance;
  tasks: TaskRow[];
  loading: boolean;
  error: string | null;
  onStatusChange: (id: string, status: string) => void;
  canWrite: boolean;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6">
      <h2 className="font-display text-lg font-semibold text-white">{inst.label}</h2>
      <p className="mt-1 text-xs text-zinc-500">{inst.supabaseUrl}</p>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          A carregar…
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Nenhum pedido neste projeto.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-medium text-zinc-100">{t.title}</p>
                {canWrite ? (
                  <select
                    className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                    value={t.status}
                    onChange={(e) => onStatusChange(t.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusPt[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {statusPt[t.status] ?? t.status}
                  </span>
                )}
              </div>
              {t.details ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{t.details}</p>
              ) : null}
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(t.created_at).toLocaleString('pt-BR')}
                {t.site_offer_id ? (
                  <span className="ml-2 font-mono text-zinc-400">oferta: {t.site_offer_id.slice(0, 8)}…</span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!canWrite ? (
        <p className="mt-4 text-xs text-amber-200/80">
          Para alterar estados aqui, configure <code className="rounded bg-zinc-800 px-1">VITE_HASHADMIN_SERVICE_ROLE_KEY</code> ou{' '}
          <code className="rounded bg-zinc-800 px-1">supabaseServiceRoleKey</code> no cliente.
        </p>
      ) : null}
    </section>
  );
}

export default function HashAdminPartnerTasks() {
  const { visibleInstances: instances } = useHashAdminClientFilter();
  const [blocks, setBlocks] = useState<Record<string, { tasks: TaskRow[]; loading: boolean; error: string | null }>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    const empty: Record<string, { tasks: TaskRow[]; loading: boolean; error: string | null }> = {};
    instances.forEach((i) => {
      empty[i.id] = { tasks: [], loading: true, error: null };
    });
    setBlocks(empty);

    void Promise.all(
      instances.map(async (inst) => {
        const sb = createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey);
        const { data, error } = await sb
          .from('partner_task_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (cancelled) return;
        setBlocks((prev) => ({
          ...prev,
          [inst.id]: {
            tasks: (data as TaskRow[]) ?? [],
            loading: false,
            error: error ? error.message : null,
          },
        }));
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [instances]);

  const handleStatus = async (inst: HashAdminInstance, id: string, status: string) => {
    const write = getHashAdminWriteClient(inst);
    if (!write) {
      toast.error('Service role necessária para atualizar.');
      return;
    }
    const { error } = await write.from('partner_task_requests').update({ status }).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Estado atualizado.');
    setBlocks((prev) => ({
      ...prev,
      [inst.id]: {
        ...prev[inst.id],
        tasks: (prev[inst.id]?.tasks ?? []).map((t) => (t.id === id ? { ...t, status } : t)),
      },
    }));
  };

  return (
    <HashAdminLayout>
      <div className="mb-6 flex items-start gap-2">
        <ClipboardList className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Pedidos dos clientes</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">
            Solicitações feitas na área <strong className="text-zinc-200">Ofertas → Pedido ao parceiro</strong> de cada
            site. Para mudar o estado (aberto / em andamento / concluído), use a service role no .env (ver documentação do
            painel mestre).
          </p>
        </div>
      </div>

      {instances.length === 0 ? (
        <p className="text-sm text-zinc-500">Configure instâncias no .env.</p>
      ) : (
        <div className="space-y-10">
          {instances.map((inst) => {
            const b = blocks[inst.id] ?? { tasks: [], loading: true, error: null };
            const canWrite = Boolean(getHashAdminWriteClient(inst));
            return (
              <Block
                key={inst.id}
                inst={inst}
                tasks={b.tasks}
                loading={b.loading}
                error={b.error}
                canWrite={canWrite}
                onStatusChange={(id, status) => void handleStatus(inst, id, status)}
              />
            );
          })}
        </div>
      )}
    </HashAdminLayout>
  );
}
