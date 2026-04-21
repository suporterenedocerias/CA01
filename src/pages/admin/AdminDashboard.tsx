import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { isOrderPaid } from '@/lib/whatsapp-employee-stats';
import { Users, MousePointer, MessageCircle, Package, TrendingUp, BadgeCheck, DollarSign, CalendarDays } from 'lucide-react';
import { calcLiquido } from '@/lib/fastsoft-fees';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface NumberRow { id: string; label: string; number: string; click_count: number; order_index: number; }

interface ClickStat {
  number_id: string;
  number_label: string;
  number_value: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

interface PixStat {
  number_id: string;
  number_label: string;
  pix_confirmados: number;
  receita_pix: number;
}

const UNASSIGNED_ID = '__nao_atribuido__';

type DailyRow = { date: string; leads: number; clicks: number; pix: number; receita: number };
type DayRange = '7' | '14' | '30' | 'all';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ leads: 0, clicks: 0, numbers: 0, sizes: 0, pixConfirmados: 0, receitaTotal: 0, receitaLiquida: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [clickStats, setClickStats] = useState<ClickStat[]>([]);
  const [pixStats, setPixStats] = useState<PixStat[]>([]);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [dayRange, setDayRange] = useState<DayRange>('14');

  useEffect(() => {
    async function fetchData() {
      const [
        leadsRes, clicksRes, numbersRes, sizesRes,
        recentRes, clickStatsRes, numbersListRes, ordersRes, settingsRes,
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('whatsapp_clicks').select('id', { count: 'exact', head: true }),
        supabase.from('whatsapp_numbers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('dumpster_sizes').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.rpc('get_click_stats'),
        supabase.from('whatsapp_numbers').select('id, label, number, click_count, order_index').order('order_index'),
        supabase.from('orders').select('whatsapp_number_id, payment_status, status, valor_total')
          .order('created_at', { ascending: false }).limit(8000),
        supabase.from('site_settings').select('taxa_gateway_pct, taxa_gateway_fixa').limit(1).single(),
      ]);

      const taxaPct  = Number((settingsRes.data as any)?.taxa_gateway_pct  ?? 6.99);
      const taxaFixa = Number((settingsRes.data as any)?.taxa_gateway_fixa ?? 2.29);

      const numbersList = (numbersListRes.data || []) as NumberRow[];
      const orders = ordersRes.data || [];

      // ── Click stats: prefere RPC, fallback para dados directos ─────────────
      let resolvedClickStats: ClickStat[] = (clickStatsRes.data as ClickStat[]) || [];

      if (resolvedClickStats.length === 0 && numbersList.length > 0) {
        // RPC vazia ou falhou → usa click_count do número + 0 para hoje/semana
        resolvedClickStats = numbersList.map(n => ({
          number_id: n.id,
          number_label: n.label || `Nº ${n.order_index}`,
          number_value: n.number,
          total_clicks: n.click_count || 0,
          clicks_today: 0,
          clicks_week: 0,
        })).filter(n => n.total_clicks > 0 || numbersList.length <= 5); // mostra todos se poucos
      }

      // ── PIX por número (inclui "Não atribuído") ──────────────────────────
      let pixConfirmadosTotal = 0;
      let receitaTotal = 0;
      const agg = new Map<string, { count: number; receita: number }>();

      for (const n of numbersList) agg.set(n.id, { count: 0, receita: 0 });
      agg.set(UNASSIGNED_ID, { count: 0, receita: 0 });

      for (const o of orders) {
        if (!isOrderPaid(o.payment_status, o.status)) continue;
        pixConfirmadosTotal += 1;
        const bruto = Number(o.valor_total || 0);
        receitaTotal += bruto;

        const key = (o.whatsapp_number_id && agg.has(o.whatsapp_number_id))
          ? o.whatsapp_number_id
          : UNASSIGNED_ID;

        const cur = agg.get(key)!;
        cur.count += 1;
        cur.receita += Number(o.valor_total || 0);
      }

      const pixRows: PixStat[] = [
        ...numbersList.map(n => ({
          number_id: n.id,
          number_label: n.label || `Nº ${n.order_index}`,
          pix_confirmados: agg.get(n.id)?.count || 0,
          receita_pix: agg.get(n.id)?.receita || 0,
        })),
        ...(agg.get(UNASSIGNED_ID)!.count > 0 ? [{
          number_id: UNASSIGNED_ID,
          number_label: 'Não atribuído',
          pix_confirmados: agg.get(UNASSIGNED_ID)!.count,
          receita_pix: agg.get(UNASSIGNED_ID)!.receita,
        }] : []),
      ];

      const receitaLiquida = orders
        .filter(o => isOrderPaid(o.payment_status, o.status))
        .reduce((s, o) => s + calcLiquido(Number(o.valor_total || 0), taxaPct, taxaFixa), 0);

      // ── Evolução diária: últimos 90 dias (cliente filtra por range) ──────
      const since90 = new Date(); since90.setDate(since90.getDate() - 90);
      const since90Iso = since90.toISOString();

      const [allLeadsDaily, allClicksDaily, allOrdersDaily] = await Promise.all([
        supabase.from('leads').select('created_at').gte('created_at', since90Iso),
        supabase.from('whatsapp_clicks').select('created_at').gte('created_at', since90Iso),
        supabase.from('orders').select('created_at, payment_status, status, valor_total').gte('created_at', since90Iso),
      ]);

      const dayMap = new Map<string, DailyRow>();
      const toDate = (iso: string) => iso.slice(0, 10);
      const ensureDay = (d: string) => {
        if (!dayMap.has(d)) dayMap.set(d, { date: d, leads: 0, clicks: 0, pix: 0, receita: 0 });
        return dayMap.get(d)!;
      };
      for (const r of allLeadsDaily.data || []) ensureDay(toDate(r.created_at)).leads++;
      for (const r of allClicksDaily.data || []) ensureDay(toDate(r.created_at)).clicks++;
      for (const r of (allOrdersDaily.data || [])) {
        if (!isOrderPaid((r as any).payment_status, (r as any).status)) continue;
        const row = ensureDay(toDate(r.created_at));
        row.pix++;
        row.receita += Number((r as any).valor_total || 0);
      }
      const sortedDaily = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setDailyData(sortedDaily);

      setStats({
        leads: leadsRes.count || 0,
        clicks: clicksRes.count || 0,
        numbers: numbersRes.count || 0,
        sizes: sizesRes.count || 0,
        pixConfirmados: pixConfirmadosTotal,
        receitaTotal,
        receitaLiquida,
      });
      setRecentLeads(recentRes.data || []);
      setClickStats(resolvedClickStats);
      setPixStats(pixRows);
    }
    fetchData();
  }, []);

  const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredDaily = useMemo(() => {
    if (dayRange === 'all') return dailyData;
    const days = parseInt(dayRange);
    return dailyData.slice(-days);
  }, [dailyData, dayRange]);

  const fmtDay = (d: string) => {
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
  };

  const statCards = [
    { label: 'Total de Leads',    value: stats.leads,          icon: Users,        color: 'bg-accent/10 text-accent' },
    { label: 'Cliques WhatsApp',  value: stats.clicks,         icon: MousePointer, color: 'bg-whatsapp/10 text-whatsapp' },
    { label: 'PIX confirmados',   value: stats.pixConfirmados, icon: BadgeCheck,   color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    { label: 'Receita Bruta',     value: fmt(stats.receitaTotal),   icon: DollarSign, color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    { label: 'Receita Líquida',   value: fmt(stats.receitaLiquida), icon: DollarSign, color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
    { label: 'Números Ativos',    value: stats.numbers,        icon: MessageCircle,color: 'bg-primary/10 text-primary' },
    { label: 'Tamanhos Ativos',   value: stats.sizes,          icon: Package,      color: 'bg-accent/10 text-accent' },
  ];

  const temPixPorNumero = pixStats.some(p => p.pix_confirmados > 0);

  return (
    <AdminLayout title="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium leading-tight">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon size={16} />
              </div>
            </div>
            <span className="font-display text-2xl font-bold text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Click chart */}
        <div className="rounded-xl bg-card border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-accent" />
            <h2 className="font-display text-lg font-bold text-foreground">Cliques por Número</h2>
          </div>
          {clickStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={clickStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="number_label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="total_clicks" fill="hsl(var(--accent))" radius={[4,4,0,0]} name="Total" />
                <Bar dataKey="clicks_today" fill="hsl(var(--whatsapp))" radius={[4,4,0,0]} name="Hoje" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center">
              <MousePointer size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Nenhum clique registado ainda.</p>
              <p className="text-muted-foreground text-xs mt-1">Os cliques aparecem quando visitantes clicam no WhatsApp.</p>
            </div>
          )}
        </div>

        {/* Click details */}
        <div className="rounded-xl bg-card border shadow-sm p-5">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Detalhes por Número</h2>
          <div className="space-y-3">
            {clickStats.length > 0 ? clickStats.map((cs) => (
              <div key={cs.number_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">{cs.number_label}</p>
                  <p className="text-xs text-muted-foreground">{cs.number_value}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{cs.total_clicks} total</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{cs.clicks_today} hoje</span>
                    <span>{cs.clicks_week} semana</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados disponíveis.</p>
            )}
          </div>
        </div>
      </div>

      {/* PIX por número */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl bg-card border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-lg font-bold text-foreground">PIX confirmados por número</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            "Não atribuído" = pedidos pagos sem número de funcionário gravado.
          </p>
          {temPixPorNumero ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pixStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="number_label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v} pedido(s)`, 'PIX confirmados']}
                />
                <Bar dataKey="pix_confirmados" fill="hsl(142 71% 45%)" radius={[4,4,0,0]} name="PIX confirmados" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center">
              <BadgeCheck size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Nenhum pedido PIX confirmado ainda.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card border shadow-sm p-5">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Receita PIX por número</h2>
          <div className="space-y-3">
            {temPixPorNumero ? (
              pixStats
                .filter(p => p.pix_confirmados > 0)
                .sort((a, b) => b.receita_pix - a.receita_pix)
                .map(p => (
                  <div key={p.number_id} className={`flex items-center justify-between p-3 rounded-lg ${p.number_id === UNASSIGNED_ID ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-muted/50'}`}>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.number_label}</p>
                      <p className="text-xs text-muted-foreground">{p.pix_confirmados} pedido(s)</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {fmt(p.receita_pix)}
                    </p>
                  </div>
                ))
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem receita PIX ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo por funcionário */}
      <div className="rounded-xl bg-card border shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b">
          <h2 className="font-display text-lg font-bold text-foreground">Resumo por funcionário</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Leads: número atribuído ao formulário (<code className="bg-muted px-1 rounded">numero_atribuido</code>).
            Pedidos PIX: número gravado no pedido no checkout.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Funcionário</th>
                <th className="text-right p-3 font-medium">Cliques</th>
                <th className="text-right p-3 font-medium">Leads</th>
                <th className="text-right p-3 font-medium text-green-600 dark:text-green-400">PIX pagos</th>
                <th className="text-right p-3 font-medium text-green-600 dark:text-green-400">Receita PIX</th>
                <th className="text-right p-3 font-medium">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {pixStats.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem dados.</td></tr>
              ) : pixStats.map(p => {
                const cs = clickStats.find(c => c.number_id === p.number_id);
                const clicks = cs?.total_clicks || 0;
                const conv = clicks > 0 ? ((p.pix_confirmados / clicks) * 100).toFixed(1) + '%' : '—';
                return (
                  <tr key={p.number_id} className={`border-t ${p.number_id === UNASSIGNED_ID ? 'bg-orange-500/5' : 'hover:bg-muted/30'}`}>
                    <td className="p-3 font-medium">{p.number_label}</td>
                    <td className="p-3 text-right tabular-nums">{clicks}</td>
                    <td className="p-3 text-right tabular-nums">0</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-green-600 dark:text-green-400">{p.pix_confirmados}</td>
                    <td className="p-3 text-right tabular-nums text-green-600 dark:text-green-400">{fmt(p.receita_pix)}</td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">{conv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evolução diária */}
      <div className="rounded-xl bg-card border shadow-sm p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-accent" />
            <h2 className="font-display text-lg font-bold text-foreground">Evolução Diária</h2>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['7','14','30','all'] as DayRange[]).map(r => (
              <button
                key={r}
                onClick={() => setDayRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${dayRange === r ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:bg-muted'}`}
              >
                {r === 'all' ? 'Tudo' : `${r}d`}
              </button>
            ))}
          </div>
        </div>

        {filteredDaily.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={filteredDaily.map(r => ({ ...r, date: fmtDay(r.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number, name: string) => {
                    if (name === 'receita') return [fmt(v), 'Receita'];
                    return [v, name === 'leads' ? 'Leads' : name === 'clicks' ? 'Cliques' : 'PIX pagos'];
                  }}
                />
                <Legend formatter={(v) => v === 'leads' ? 'Leads' : v === 'clicks' ? 'Cliques' : v === 'pix' ? 'PIX pagos' : 'Receita'} />
                <Bar dataKey="clicks" fill="hsl(var(--whatsapp))" radius={[4,4,0,0]} name="clicks" />
                <Bar dataKey="leads" fill="hsl(var(--accent))" radius={[4,4,0,0]} name="leads" />
                <Bar dataKey="pix" fill="hsl(142 71% 45%)" radius={[4,4,0,0]} name="pix" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium">Data</th>
                    <th className="text-right p-2 font-medium">Cliques</th>
                    <th className="text-right p-2 font-medium">Leads</th>
                    <th className="text-right p-2 font-medium text-emerald-600 dark:text-emerald-400">PIX pagos</th>
                    <th className="text-right p-2 font-medium text-emerald-600 dark:text-emerald-400">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredDaily].reverse().map(row => (
                    <tr key={row.date} className="border-t hover:bg-muted/30">
                      <td className="p-2 font-medium tabular-nums">{new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-2 text-right tabular-nums">{row.clicks}</td>
                      <td className="p-2 text-right tabular-nums">{row.leads}</td>
                      <td className="p-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{row.pix}</td>
                      <td className="p-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(row.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <CalendarDays size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Sem dados no período.</p>
          </div>
        )}
      </div>

      {/* Últimos leads */}
      <div className="rounded-xl bg-card border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-display text-lg font-bold text-foreground">Últimos Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold">Nome</th>
                <th className="text-left p-4 text-sm font-semibold">Telefone</th>
                <th className="text-left p-4 text-sm font-semibold">Tamanho</th>
                <th className="text-left p-4 text-sm font-semibold">Data</th>
                <th className="text-left p-4 text-sm font-semibold">Nº WhatsApp</th>
                <th className="text-left p-4 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead recebido ainda.</td></tr>
              ) : recentLeads.map(lead => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-sm font-medium">{lead.nome}</td>
                  <td className="p-4 text-sm text-muted-foreground">{lead.whatsapp}</td>
                  <td className="p-4 text-sm text-muted-foreground">{lead.tamanho}</td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-sm text-muted-foreground">{lead.numero_atribuido || '—'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      lead.status === 'Novo' ? 'bg-accent/20 text-accent-foreground' :
                      lead.status === 'Em atendimento' ? 'bg-whatsapp/20 text-whatsapp' :
                      'bg-muted text-muted-foreground'
                    }`}>{lead.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
