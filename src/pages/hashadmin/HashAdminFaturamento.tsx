import { useEffect, useMemo, useState } from 'react';
import { HashAdminLayout, ExternalPanelLink } from '@/pages/hashadmin/HashAdminLayout';
import { HashAdminProjectQuickLinks } from '@/components/hashadmin/HashAdminProjectQuickLinks';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, type HashAdminInstance } from '@/lib/hashadmin-config';
import { Loader2, Wallet } from 'lucide-react';

type OrderRow = {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  valor_total: number;
  status: string;
  payment_status: string;
  page_slug: string | null;
  paid_at: string | null;
};

function isPaid(o: OrderRow): boolean {
  return o.payment_status === 'paid' || o.status === 'pago';
}

function formatBrl(n: number) {
  return `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
}

type FinTab = 'all' | 'paid' | 'pending';

function ClientRevenueBlock({
  inst,
  orders,
  loading,
  error,
  financialTab,
}: {
  inst: HashAdminInstance;
  orders: OrderRow[];
  loading: boolean;
  error: string | null;
  financialTab: FinTab;
}) {
  const paidOrders = orders.filter(isPaid);
  const totalPaid = paidOrders.reduce((s, o) => s + Number(o.valor_total || 0), 0);
  const pendingPayment = orders.filter(
    (o) => !isPaid(o) && (o.status === 'aguardando_pagamento' || o.payment_status !== 'paid'),
  );
  const pipelineValue = pendingPayment.reduce((s, o) => s + Number(o.valor_total || 0), 0);

  const tableOrders = useMemo(() => {
    if (financialTab === 'paid') return orders.filter(isPaid);
    if (financialTab === 'pending') return orders.filter((o) => !isPaid(o));
    return orders;
  }, [orders, financialTab]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{inst.label}</h2>
            <p className="text-xs text-zinc-500">{inst.supabaseUrl}</p>
          </div>
          <ExternalPanelLink href={`${inst.siteOrigin}/admin/orders`}>Só pedidos PIX</ExternalPanelLink>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Acesso rápido ao projeto</p>
          <HashAdminProjectQuickLinks inst={inst} variant="compact" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          A carregar pedidos…
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Faturamento pago</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">{formatBrl(totalPaid)}</p>
              <p className="mt-1 text-xs text-zinc-500">{paidOrders.length} pedido(s) pago(s) (até 500 na amostra)</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Em aberto (valor)</p>
              <p className="mt-1 font-display text-2xl font-bold text-zinc-200">{formatBrl(pipelineValue)}</p>
              <p className="mt-1 text-xs text-zinc-500">{pendingPayment.length} pedido(s) não pagos na amostra</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pedidos na amostra</p>
              <p className="mt-1 font-display text-2xl font-bold text-zinc-300">{orders.length}</p>
              <p className="mt-1 text-xs text-zinc-500">Ordenados do mais recente</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-xs text-zinc-500">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Origem</th>
                  <th className="pb-2 pr-3 font-medium">Cliente</th>
                  <th className="pb-2 pr-3 font-medium">Valor</th>
                  <th className="pb-2 pr-3 font-medium">Pagamento</th>
                  <th className="pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tableOrders.slice(0, 40).map((o) => (
                  <tr key={o.id} className="border-b border-zinc-800/90 text-zinc-300">
                    <td className="py-2 pr-3 whitespace-nowrap text-zinc-400">
                      {new Date(o.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {o.page_slug ? (
                        <span className="font-mono text-zinc-200">/e/{o.page_slug}</span>
                      ) : (
                        <span className="text-zinc-500">Site principal</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-zinc-100">{o.nome}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{o.whatsapp}</span>
                    </td>
                    <td className="py-2 pr-3 font-medium text-white">{formatBrl(Number(o.valor_total))}</td>
                    <td className="py-2 pr-3 text-xs">{o.payment_status === 'paid' ? 'Pago' : 'Pendente'}</td>
                    <td className="py-2 text-xs capitalize text-zinc-400">{o.status.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tableOrders.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                Nenhum pedido neste filtro financeiro{financialTab !== 'all' ? ' — tente «Todos»' : ''}.
              </p>
            ) : null}
            {tableOrders.length > 40 ? (
              <p className="mt-3 text-xs text-zinc-500">
                Mostrando 40 de {tableOrders.length} no filtro — use o painel do cliente para filtrar o restante.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

type BlockState = { orders: OrderRow[]; loading: boolean; error: string | null };

export default function HashAdminFaturamento() {
  const { visibleInstances: instances } = useHashAdminClientFilter();
  const [financialTab, setFinancialTab] = useState<FinTab>('all');
  const [blocks, setBlocks] = useState<Record<string, BlockState>>({});

  useEffect(() => {
    let cancelled = false;
    const init: Record<string, BlockState> = {};
    instances.forEach((i) => {
      init[i.id] = { orders: [], loading: true, error: null };
    });
    setBlocks(init);

    void Promise.all(
      instances.map(async (inst) => {
        const client = createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey);
        const { data, error } = await client
          .from('orders')
          .select('id, created_at, nome, whatsapp, valor_total, status, payment_status, page_slug, paid_at')
          .order('created_at', { ascending: false })
          .limit(500);
        if (cancelled) return;
        setBlocks((prev) => ({
          ...prev,
          [inst.id]: {
            orders: (data as OrderRow[]) ?? [],
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

  const grandPaid = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const inst of instances) {
      const b = blocks[inst.id];
      if (!b || b.loading || b.error) continue;
      for (const o of b.orders) {
        if (isPaid(o)) {
          sum += Number(o.valor_total || 0);
          count += 1;
        }
      }
    }
    return { sum, count };
  }, [blocks, instances]);

  const allLoaded = instances.length > 0 && instances.every((i) => blocks[i.id] && !blocks[i.id].loading);

  return (
    <HashAdminLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-2">
          <Wallet className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Faturamento e operações</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Por <strong className="font-medium text-zinc-300">cliente</strong> (filtro em cima) e por{' '}
              <strong className="font-medium text-zinc-300">situação financeira</strong> (abaixo): pago, em aberto ou
              todos. Origem <span className="font-mono text-zinc-300">/e/…</span> quando existir.
            </p>
          </div>
        </div>
        {instances.length > 0 ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-5 py-4 md:min-w-[240px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total pago (todos os clientes)</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {allLoaded ? formatBrl(grandPaid.sum) : '—'}
            </p>
            {allLoaded ? (
              <p className="mt-1 text-xs text-zinc-500">
                {grandPaid.count} pedido(s) pago(s) na amostra (até 500 por cliente)
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">A calcular…</p>
            )}
          </div>
        ) : null}
      </div>

      {instances.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum cliente neste filtro ou configure instâncias no .env.</p>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap gap-2">
            {(
              [
                { id: 'all' as const, label: 'Todos (financeiro)' },
                { id: 'paid' as const, label: 'Só pagos / confirmados' },
                { id: 'pending' as const, label: 'Só pendentes / em aberto' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFinancialTab(t.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  financialTab === t.id
                    ? 'border-emerald-600 bg-emerald-950/50 text-emerald-200'
                    : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-10">
            {instances.map((inst) => {
              const b = blocks[inst.id] ?? { orders: [], loading: true, error: null };
              return (
                <ClientRevenueBlock
                  key={inst.id}
                  inst={inst}
                  orders={b.orders}
                  loading={b.loading}
                  error={b.error}
                  financialTab={financialTab}
                />
              );
            })}
          </div>
        </>
      )}
    </HashAdminLayout>
  );
}
