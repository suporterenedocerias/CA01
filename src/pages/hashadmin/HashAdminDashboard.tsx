import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  ComposedChart,
} from 'recharts';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, type HashAdminInstance } from '@/lib/hashadmin-config';
import { Loader2, TrendingUp, ShoppingCart, Wallet, Users, MousePointer, MessageCircle, Package, DollarSign, BarChart3 } from 'lucide-react';

type OrderRow = {
  id: string;
  created_at: string;
  valor_total: number;
  status: string;
  payment_status: string;
  paid_at: string | null;
  whatsapp_number_id: string | null;
};

type LeadRow = { id: string; created_at: string };

type ClickStatRow = {
  number_id: string;
  number_label: string;
  number_value: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
};

type EmployeeRow = { id: string; label: string };

type AdSpendRow = { spend: number | null };

type InstData = {
  loading: boolean;
  error: string | null;
  orders: OrderRow[];
  leads: LeadRow[];
  employees: EmployeeRow[];
  adSpend: number;
  /** Contagens exatas na base (não só a amostra carregada). */
  counts: {
    leadsTotal: number;
    ordersTotal: number;
    whatsappClicksTotal: number;
    numbersActive: number;
    sizesActive: number;
  } | null;
  clickStats: ClickStatRow[];
};

function formatBrl(n: number) {
  return `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
}

function isPaid(o: OrderRow) {
  return o.payment_status === 'paid' || o.status === 'pago';
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Last N days labels
function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  }
  return days;
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  }
  return days;
}

/** PIX confirmado: usa paid_at se existir, senão created_at. */
function pixPaidSeries(orders: OrderRow[], days: string[]) {
  const map: Record<string, { pix: number; receita: number }> = {};
  days.forEach((d) => (map[d] = { pix: 0, receita: 0 }));
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const src = o.paid_at || o.created_at;
    const d = new Date(src).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (d in map) {
      map[d].pix += 1;
      map[d].receita += Number(o.valor_total || 0);
    }
  }
  return days.map((d) => ({ day: d, pix: map[d].pix, receita: map[d].receita }));
}

function ordersByDay(orders: OrderRow[], label: string, days: string[]) {
  const map: Record<string, number> = {};
  days.forEach((d) => (map[d] = 0));
  orders.forEach((o) => {
    const d = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (d in map) map[d] += 1;
  });
  return days.map((d) => ({ day: d, [label]: map[d] }));
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-white',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="mb-3 flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function HashAdminDashboard() {
  // Usar allInstances + clientId como deps estáveis — evita re-renders em loop
  const { instances: allInstances, clientId } = useHashAdminClientFilter();

  // Instâncias visíveis derivadas localmente (para render)
  const instances = useMemo(
    () => (clientId === 'all' ? allInstances : allInstances.filter((i) => i.id === clientId)),
    [allInstances, clientId],
  );

  const [data, setData] = useState<Record<string, InstData>>({});
  const days = useMemo(() => last7Days(), []);
  const days14 = useMemo(() => lastNDays(14), []);

  useEffect(() => {
    // Calcula as instâncias ativas dentro do effect usando primitivos estáveis
    const activeInstances =
      clientId === 'all' ? allInstances : allInstances.filter((i) => i.id === clientId);

    if (activeInstances.length === 0) {
      setData({});
      return;
    }

    let cancelled = false;

    const init: Record<string, InstData> = {};
    activeInstances.forEach((i) => {
      init[i.id] = { loading: true, error: null, orders: [], leads: [], employees: [], adSpend: 0, counts: null, clickStats: [] };
    });
    setData(init);

    void Promise.all(
      activeInstances.map(async (inst: HashAdminInstance) => {
        // Valida credenciais antes de tentar conectar
        if (!inst.supabaseUrl || !inst.supabaseAnonKey) {
          if (!cancelled) {
            setData((prev) => ({
              ...prev,
              [inst.id]: { loading: false, error: `URL ou chave Supabase não configurada para "${inst.label}". Acesse Clientes e preencha os dados.`, orders: [], leads: [], employees: [], adSpend: 0, counts: null, clickStats: [] },
            }));
          }
          return;
        }
        try {
          const sb = createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey);

          // Timeout de 15s — evita travar indefinidamente se a URL for inválida
          const fetchWithTimeout = <T,>(p: Promise<T>): Promise<T> =>
            Promise.race([
              p,
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout (15s) — verifique URL/chave Supabase de "${inst.label}" (${inst.supabaseUrl})`)), 15000),
              ),
            ]);

          const [
            ordRes,
            leadRes,
            ordCountRes,
            leadCountRes,
            waClicksRes,
            numActiveRes,
            sizeActiveRes,
            empRes,
            adSpendRes,
          ] = await fetchWithTimeout(Promise.all([
            sb
              .from('orders')
              .select(
                'id, created_at, valor_total, status, payment_status, paid_at, whatsapp_number_id',
              )
              .order('created_at', { ascending: false })
              .limit(8000),
            sb
              .from('leads')
              .select('id, created_at')
              .order('created_at', { ascending: false })
              .limit(8000),
            sb.from('orders').select('id', { count: 'exact', head: true }),
            sb.from('leads').select('id', { count: 'exact', head: true }),
            sb.from('whatsapp_clicks').select('id', { count: 'exact', head: true }),
            sb.from('whatsapp_numbers').select('id', { count: 'exact', head: true }).eq('active', true),
            sb.from('dumpster_sizes').select('id', { count: 'exact', head: true }).eq('active', true),
            sb.from('whatsapp_numbers').select('id, label'),
            sb.from('ad_spend').select('spend'),
          ]));
          if (cancelled) return;
          const err = ordRes.error?.message ?? null;
          setData((prev) => ({
            ...prev,
            [inst.id]: {
              loading: false,
              error: err,
              orders: (ordRes.data as OrderRow[]) ?? [],
              leads: leadRes.error ? [] : ((leadRes.data as LeadRow[]) ?? []),
              employees: empRes.error ? [] : ((empRes.data as EmployeeRow[]) ?? []),
              adSpend: adSpendRes.error ? 0 : ((adSpendRes.data as AdSpendRow[]) ?? []).reduce((s, r) => s + Number(r.spend || 0), 0),
              counts: err
                ? null
                : {
                    leadsTotal: leadCountRes.count ?? 0,
                    ordersTotal: ordCountRes.count ?? 0,
                    whatsappClicksTotal: waClicksRes.count ?? 0,
                    numbersActive: numActiveRes.count ?? 0,
                    sizesActive: sizeActiveRes.count ?? 0,
                  },
              clickStats: [],
            },
          }));
        } catch (e) {
          if (cancelled) return;
          setData((prev) => ({
            ...prev,
            [inst.id]: {
              loading: false,
              error: e instanceof Error ? e.message : 'Erro',
              orders: [],
              leads: [],
              employees: [],
              adSpend: 0,
              counts: null,
              clickStats: [],
            },
          }));
        }
      }),
    );

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInstances, clientId]); // deps primitivos/estáveis — não o array derivado

  const allLoaded = instances.length > 0 && instances.every((i) => data[i.id] && !data[i.id].loading);

  // Grand totals
  const totals = useMemo(() => {
    let revenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let totalOrdersSample = 0;
    let totalLeadsSample = 0;
    let leadsTotalDb = 0;
    let ordersTotalDb = 0;
    let whatsappClicksDb = 0;
    let numbersActiveDb = 0;
    let sizesActiveDb = 0;
    let adSpendTotal = 0;
    for (const inst of instances) {
      const d = data[inst.id];
      if (!d || d.loading || d.error) continue;
      totalOrdersSample += d.orders.length;
      totalLeadsSample += d.leads.length;
      if (d.counts) {
        leadsTotalDb += d.counts.leadsTotal;
        ordersTotalDb += d.counts.ordersTotal;
        whatsappClicksDb += d.counts.whatsappClicksTotal;
        numbersActiveDb += d.counts.numbersActive;
        sizesActiveDb += d.counts.sizesActive;
      }
      adSpendTotal += d.adSpend;
      for (const o of d.orders) {
        if (isPaid(o)) {
          revenue += Number(o.valor_total || 0);
          paidCount += 1;
        } else {
          pendingCount += 1;
        }
      }
    }
    const roas = adSpendTotal > 0 ? revenue / adSpendTotal : null;
    return {
      revenue,
      paidCount,
      pendingCount,
      totalOrdersSample,
      totalLeadsSample,
      leadsTotalDb,
      ordersTotalDb,
      whatsappClicksDb,
      numbersActiveDb,
      sizesActiveDb,
      adSpendTotal,
      roas,
    };
  }, [data, instances]);

  // Revenue by client (bar chart)
  const revenueByClient = useMemo(() => {
    return instances
      .map((inst) => {
        const d = data[inst.id];
        if (!d || d.loading || d.error) return { name: inst.label, receita: 0 };
        const rev = d.orders.filter(isPaid).reduce((s, o) => s + Number(o.valor_total || 0), 0);
        return { name: inst.label.length > 14 ? inst.label.slice(0, 14) + '…' : inst.label, receita: rev };
      })
      .filter((r) => r.receita > 0);
  }, [data, instances]);

  // Orders by day across all instances (line chart)
  const ordersTrend = useMemo(() => {
    if (!allLoaded) return [];
    const combined: Record<string, number> = {};
    days.forEach((d) => (combined[d] = 0));
    for (const inst of instances) {
      const d = data[inst.id];
      if (!d || d.error) continue;
      d.orders.forEach((o) => {
        const day = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (day in combined) combined[day] += 1;
      });
    }
    return days.map((d) => ({ day: d, pedidos: combined[d] }));
  }, [allLoaded, data, days, instances]);

  // PIX confirmados (pagamento) — últimos 14 dias, todos os clientes
  const pixPaidTrend = useMemo(() => {
    if (!allLoaded) return [];
    const all: OrderRow[] = [];
    for (const inst of instances) {
      const d = data[inst.id];
      if (!d?.orders) continue;
      all.push(...d.orders);
    }
    return pixPaidSeries(all, days14);
  }, [allLoaded, data, days14, instances]);

  // Payment status pie
  const paymentPie = useMemo(() => {
    if (!allLoaded || totals.totalOrdersSample === 0) return [];
    return [
      { name: 'Pago', value: totals.paidCount },
      { name: 'Pendente', value: totals.pendingCount },
    ];
  }, [allLoaded, totals]);

  // Employee sales per instance
  const employeeSalesByInst = useMemo(() => {
    return instances.map((inst) => {
      const d = data[inst.id];
      if (!d || d.loading || d.error) return { instId: inst.id, instLabel: inst.label, rows: [] as { empId: string; name: string; vendas: number; receita: number }[] };
      const map: Record<string, { vendas: number; receita: number }> = {};
      for (const o of d.orders) {
        if (!isPaid(o)) continue;
        const key = o.whatsapp_number_id ?? '__none__';
        if (!map[key]) map[key] = { vendas: 0, receita: 0 };
        map[key].vendas += 1;
        map[key].receita += Number(o.valor_total || 0);
      }
      const empMap: Record<string, string> = {};
      for (const e of d.employees) empMap[e.id] = e.label?.trim() || e.id.slice(0, 8);
      const rows = Object.entries(map).map(([id, stats]) => ({
        empId: id,
        name: id === '__none__' ? '(sem funcionário)' : (empMap[id] ?? id.slice(0, 8)),
        ...stats,
      })).sort((a, b) => b.vendas - a.vendas);
      return { instId: inst.id, instLabel: inst.label, rows };
    }).filter((r) => r.rows.length > 0);
  }, [data, instances]);

  const anyLoading = instances.some((i) => data[i.id]?.loading);

  return (
    <HashAdminLayout>
      <div className="mb-6 flex items-start gap-3">
        <TrendingUp className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Visão completa da operação (Entulho Hoje e outros projetos no .env): contagens reais na base + amostra de até
            8000 linhas por instância para gráficos e receita.
          </p>
        </div>
        {anyLoading && <Loader2 className="ml-auto mt-1 h-5 w-5 animate-spin text-zinc-500" />}
      </div>

      {/* Erros por instância */}
      {instances.map((inst) => {
        const d = data[inst.id];
        if (!d || d.loading || !d.error) return null;
        return (
          <div key={inst.id} className="mb-4 rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-300">
            <p className="font-semibold">Erro ao carregar dados de "{inst.label}"</p>
            <p className="mt-1 font-mono text-xs text-red-400">{d.error}</p>
            <p className="mt-2 text-xs text-red-500">URL: {inst.supabaseUrl || '(vazia)'}</p>
            <p className="text-xs text-red-500">Chave: {inst.supabaseAnonKey ? inst.supabaseAnonKey.slice(0, 20) + '…' : '(vazia)'}</p>
            <p className="mt-2 text-xs text-zinc-400">→ Acesse <strong>Clientes</strong> e verifique a URL e a chave Supabase deste projeto.</p>
          </div>
        );
      })}

      {instances.length === 0 ? (
        <p className="text-sm text-zinc-500">Configure instâncias no .env para ver o dashboard.</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Receita (pedidos pagos carregados)"
              value={allLoaded ? formatBrl(totals.revenue) : '…'}
              sub={`${totals.paidCount} pagos na amostra · ${totals.pendingCount} pendentes`}
              color="text-green-400"
            />
            <StatCard
              icon={ShoppingCart}
              label="Pedidos na base"
              value={allLoaded ? String(totals.ordersTotalDb) : '…'}
              sub={`Amostra gráficos: ${totals.totalOrdersSample} linhas`}
            />
            <StatCard
              icon={Users}
              label="Leads na base"
              value={allLoaded ? String(totals.leadsTotalDb) : '…'}
              sub={`Amostra gráficos: ${totals.totalLeadsSample} linhas`}
            />
            <StatCard
              icon={TrendingUp}
              label="Conversão (indicativa)"
              value={
                allLoaded && totals.leadsTotalDb > 0
                  ? `${((totals.paidCount / totals.leadsTotalDb) * 100).toFixed(1)}%`
                  : '…'
              }
              sub="Pagos na amostra ÷ leads totais"
              color="text-blue-400"
            />
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={MousePointer}
              label="Cliques WhatsApp (base)"
              value={allLoaded ? String(totals.whatsappClicksDb) : '…'}
              sub="Total de cliques registados"
            />
            <StatCard
              icon={MessageCircle}
              label="Números WhatsApp ativos"
              value={allLoaded ? String(totals.numbersActiveDb) : '…'}
              sub="Por instância (soma se vários projetos)"
            />
            <StatCard
              icon={Package}
              label="Tamanhos de caçamba ativos"
              value={allLoaded ? String(totals.sizesActiveDb) : '…'}
              sub="Catálogo no site"
            />
            <StatCard
              icon={ShoppingCart}
              label="Pedidos pagos (amostra)"
              value={allLoaded ? String(totals.paidCount) : '…'}
              sub="Usado na receita e gráficos"
              color="text-zinc-200"
            />
          </div>

          {/* Tráfego & ROAS */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label="Investimento (ad spend)"
              value={allLoaded ? formatBrl(totals.adSpendTotal) : '…'}
              sub="Soma total registrada em ad_spend"
              color="text-orange-400"
            />
            <StatCard
              icon={BarChart3}
              label="ROAS"
              value={
                allLoaded
                  ? totals.roas != null
                    ? `${totals.roas.toFixed(2)}x`
                    : '—'
                  : '…'
              }
              sub={totals.adSpendTotal > 0 ? `Receita ÷ Investimento` : 'Sem invest. registrado'}
              color={totals.roas != null && totals.roas >= 3 ? 'text-green-400' : totals.roas != null ? 'text-yellow-400' : 'text-zinc-400'}
            />
            <StatCard
              icon={MousePointer}
              label="CPC médio (cliques WA)"
              value={
                allLoaded && totals.adSpendTotal > 0 && totals.whatsappClicksDb > 0
                  ? formatBrl(totals.adSpendTotal / totals.whatsappClicksDb)
                  : '—'
              }
              sub="Invest ÷ Cliques WA"
            />
            <StatCard
              icon={Users}
              label="CPL — Custo por lead"
              value={
                allLoaded && totals.adSpendTotal > 0 && totals.leadsTotalDb > 0
                  ? formatBrl(totals.adSpendTotal / totals.leadsTotalDb)
                  : '—'
              }
              sub="Invest ÷ Leads totais"
            />
          </div>

          {/* Charts row */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Orders trend line */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <p className="mb-4 text-sm font-semibold text-zinc-200">Pedidos — últimos 7 dias</p>
              {allLoaded ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={ordersTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                      labelStyle={{ color: '#e4e4e7' }}
                      itemStyle={{ color: '#a1a1aa' }}
                    />
                    <Line type="monotone" dataKey="pedidos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">A carregar…</div>
              )}
            </div>

            {/* Revenue by client bar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <p className="mb-4 text-sm font-semibold text-zinc-200">Receita paga por cliente</p>
              {allLoaded && revenueByClient.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueByClient} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v: number) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                      labelStyle={{ color: '#e4e4e7' }}
                      formatter={(value: number) => [formatBrl(value), 'Receita']}
                    />
                    <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                      {revenueByClient.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : allLoaded ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">Sem receita confirmada</div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">A carregar…</div>
              )}
            </div>
          </div>

          {/* PIX confirmados por dia */}
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="mb-1 text-sm font-semibold text-zinc-200">PIX confirmados (últimos 14 dias)</p>
            <p className="mb-4 text-xs text-zinc-500">
              Contagem e receita no dia em que o pagamento foi confirmado (campo paid_at, ou criação se paid_at vazio).
            </p>
            {allLoaded ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={pixPaidTrend} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={56} />
                  <YAxis yAxisId="left" tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    tickFormatter={(v: number) => `R$${Math.round(v)}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#e4e4e7' }}
                    formatter={(value: number, name: string) =>
                      name === 'receita' ? [formatBrl(value), 'Receita PIX'] : [value, 'PIX confirmados']
                    }
                  />
                  <Bar yAxisId="left" dataKey="pix" name="pix" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="receita" name="receita" stroke="#eab308" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-zinc-500">A carregar…</div>
            )}
          </div>

          {/* Payment status pie */}
          {allLoaded && paymentPie.length > 0 && totals.totalOrdersSample > 0 && (
            <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 lg:max-w-xs">
              <p className="mb-4 text-sm font-semibold text-zinc-200">Status de pagamento</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    <Cell fill="#22c55e" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    itemStyle={{ color: '#a1a1aa' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-instance summary table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="mb-4 text-sm font-semibold text-zinc-200">Resumo por cliente / projeto</p>
            <p className="mb-3 text-xs text-zinc-500">
              Colunas «BD» = contagens reais na base. Receita e «pagos» na última coluna vêm da amostra carregada (até 8000
              pedidos).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-xs text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Cliente</th>
                    <th className="pb-2 pr-3 font-medium">Pedidos (BD)</th>
                    <th className="pb-2 pr-3 font-medium">Leads (BD)</th>
                    <th className="pb-2 pr-3 font-medium">Cliques WA</th>
                    <th className="pb-2 pr-3 font-medium">Nº WA</th>
                    <th className="pb-2 pr-3 font-medium">Tamanhos</th>
                    <th className="pb-2 pr-3 font-medium">Pagos (amostra)</th>
                    <th className="pb-2 font-medium">Receita paga (amostra)</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((inst) => {
                    const d = data[inst.id];
                    if (!d || d.loading) {
                      return (
                        <tr key={inst.id} className="border-b border-zinc-800/80">
                          <td className="py-2 pr-3 text-zinc-300">{inst.label}</td>
                          <td colSpan={7} className="py-2 text-xs text-zinc-500">
                            <Loader2 className="inline h-3 w-3 animate-spin" /> Carregando…
                          </td>
                        </tr>
                      );
                    }
                    if (d.error) {
                      return (
                        <tr key={inst.id} className="border-b border-zinc-800/80">
                          <td className="py-2 pr-3 text-zinc-300">{inst.label}</td>
                          <td colSpan={7} className="py-2 text-xs text-red-400">{d.error}</td>
                        </tr>
                      );
                    }
                    const paid = d.orders.filter(isPaid);
                    const rev = paid.reduce((s, o) => s + Number(o.valor_total || 0), 0);
                    const c = d.counts;
                    return (
                      <tr key={inst.id} className="border-b border-zinc-800/80 text-zinc-300">
                        <td className="py-2 pr-3 font-medium text-white">{inst.label}</td>
                        <td className="py-2 pr-3 tabular-nums">{c?.ordersTotal ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums">{c?.leadsTotal ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums">{c?.whatsappClicksTotal ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums">{c?.numbersActive ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums">{c?.sizesActive ?? '—'}</td>
                        <td className="py-2 pr-3 text-green-400 tabular-nums">{paid.length}</td>
                        <td className="py-2 font-medium text-white tabular-nums">{formatBrl(rev)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendas por funcionário */}
          {allLoaded && employeeSalesByInst.length > 0 && (
            <div className="mt-8 space-y-6">
              <p className="text-sm font-semibold text-zinc-200">Vendas por funcionário (pedidos pagos)</p>
              {employeeSalesByInst.map((inst) => (
                <div key={`emp-${inst.instId}`} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <p className="mb-3 text-sm font-medium text-white">{inst.instLabel}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[360px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-700 text-zinc-500">
                          <th className="pb-2 pr-3 font-medium">Funcionário</th>
                          <th className="pb-2 pr-3 font-medium text-right">Vendas</th>
                          <th className="pb-2 font-medium text-right">Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inst.rows.map((row) => (
                          <tr key={row.empId} className="border-b border-zinc-800/80 text-zinc-300">
                            <td className="py-2 pr-3 font-medium text-white">{row.name}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-green-400 font-semibold">{row.vendas}</td>
                            <td className="py-2 text-right tabular-nums">{formatBrl(row.receita)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WhatsApp detail per instance */}
          <div className="mt-8 space-y-6">
            <p className="text-sm font-semibold text-zinc-200">WhatsApp — cliques por número (Entulho Hoje / cada projeto)</p>
            {allLoaded && instances.every((i) => (data[i.id]?.clickStats?.length ?? 0) === 0) && (
              <p className="text-sm text-zinc-500">
                Sem linhas em «cliques por número» (função <code className="text-zinc-600">get_click_stats</code> vazia ou
                indisponível).
              </p>
            )}
            {instances.map((inst) => {
              const d = data[inst.id];
              if (!d || d.loading || d.error || d.clickStats.length === 0) return null;
              return (
                <div key={`wa-${inst.id}`} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <p className="mb-3 text-sm font-medium text-white">{inst.label}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-700 text-zinc-500">
                          <th className="pb-2 pr-3 font-medium">Nome</th>
                          <th className="pb-2 pr-3 font-medium">Número</th>
                          <th className="pb-2 pr-3 font-medium text-right">Total</th>
                          <th className="pb-2 pr-3 font-medium text-right">Hoje</th>
                          <th className="pb-2 font-medium text-right">7 dias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.clickStats.map((row) => (
                          <tr key={row.number_id} className="border-b border-zinc-800/80 text-zinc-300">
                            <td className="py-2 pr-3">{row.number_label}</td>
                            <td className="py-2 pr-3 font-mono text-zinc-500">{row.number_value}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.total_clicks}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.clicks_today}</td>
                            <td className="py-2 text-right tabular-nums">{row.clicks_week}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </HashAdminLayout>
  );
}
