import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TrendingUp, Save, DollarSign, MousePointer, Users, ShoppingCart, BadgeCheck } from 'lucide-react';

// ─── tipos ────────────────────────────────────────────────────────────────────

interface DayRow {
  date: string;           // 'YYYY-MM-DD'
  clicks: number;
  leads: number;
  pedidos: number;
  pagos: number;
  receita: number;
  spend: number;          // vem do ad_spend; editável
  notes: string;
  // calculados
  cpc: number | null;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  roi: number | null;
}

// ─── helpers de data ──────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeFromPreset(preset: string): { from: string; to: string } {
  const today = new Date();
  const to = toDateStr(today);
  if (preset === 'hoje') return { from: to, to };
  if (preset === 'ontem') {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    const s = toDateStr(y); return { from: s, to: s };
  }
  const days = preset === '7d' ? 7 : preset === '14d' ? 14 : 30;
  const from = new Date(today); from.setDate(from.getDate() - (days - 1));
  return { from: toDateStr(from), to };
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to   + 'T00:00:00');
  while (cur <= end) {
    days.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtX(n: number | null) {
  if (n === null || !isFinite(n)) return '—';
  return n.toFixed(2) + 'x';
}

function fmtPct(n: number | null) {
  if (n === null || !isFinite(n)) return '—';
  return (n * 100).toFixed(0) + '%';
}

function fmtCur(n: number | null) {
  if (n === null || !isFinite(n) || n <= 0) return '—';
  return fmt(n);
}

const PRESETS = [
  { key: 'hoje',  label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7d',    label: '7 dias' },
  { key: '14d',   label: '14 dias' },
  { key: '30d',   label: '30 dias' },
];

// ─── componente ───────────────────────────────────────────────────────────────

export default function AdminTraffic() {
  const [preset, setPreset]   = useState('7d');
  const [from,   setFrom]     = useState(() => rangeFromPreset('7d').from);
  const [to,     setTo]       = useState(() => rangeFromPreset('7d').to);
  const [rows,   setRows]     = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});

  // ── carrega dados ─────────────────────────────────────────────────────────
  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);

    const tFrom = f + 'T00:00:00';
    const tTo   = t + 'T23:59:59';

    const [clicksRes, leadsRes, ordersRes, spendRes] = await Promise.all([
      supabase
        .from('whatsapp_clicks')
        .select('created_at')
        .gte('created_at', tFrom)
        .lte('created_at', tTo),
      supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', tFrom)
        .lte('created_at', tTo),
      supabase
        .from('orders')
        .select('created_at, payment_status, status, valor_total')
        .gte('created_at', tFrom)
        .lte('created_at', tTo),
      supabase
        .from('ad_spend')
        .select('date, spend, notes')
        .gte('date', f)
        .lte('date', t),
    ]);

    // índice de ad_spend por data
    const spendMap: Record<string, { spend: number; notes: string }> = {};
    for (const s of spendRes.data || []) {
      spendMap[s.date] = { spend: Number(s.spend || 0), notes: s.notes || '' };
    }

    // agregação por dia
    const clicksByDay:  Record<string, number> = {};
    const leadsByDay:   Record<string, number> = {};
    const pedidosByDay: Record<string, number> = {};
    const pagosByDay:   Record<string, number> = {};
    const receitaByDay: Record<string, number> = {};

    for (const r of clicksRes.data || []) {
      const d = r.created_at.slice(0, 10);
      clicksByDay[d] = (clicksByDay[d] || 0) + 1;
    }
    for (const r of leadsRes.data || []) {
      const d = r.created_at.slice(0, 10);
      leadsByDay[d] = (leadsByDay[d] || 0) + 1;
    }
    for (const r of ordersRes.data || []) {
      const d = r.created_at.slice(0, 10);
      pedidosByDay[d] = (pedidosByDay[d] || 0) + 1;
      const paid = r.payment_status === 'paid' || r.status === 'pago';
      if (paid) {
        pagosByDay[d]   = (pagosByDay[d]   || 0) + 1;
        receitaByDay[d] = (receitaByDay[d] || 0) + Number(r.valor_total || 0);
      }
    }

    const days = eachDay(f, t);
    const built: DayRow[] = days.map(date => {
      const spend   = spendMap[date]?.spend  || 0;
      const notes   = spendMap[date]?.notes  || '';
      const clicks  = clicksByDay[date]  || 0;
      const leads   = leadsByDay[date]   || 0;
      const pedidos = pedidosByDay[date] || 0;
      const pagos   = pagosByDay[date]   || 0;
      const receita = receitaByDay[date] || 0;

      return {
        date, clicks, leads, pedidos, pagos, receita, spend, notes,
        cpc:  spend > 0 && clicks  > 0 ? spend / clicks  : null,
        cpl:  spend > 0 && leads   > 0 ? spend / leads   : null,
        cpa:  spend > 0 && pagos   > 0 ? spend / pagos   : null,
        roas: spend > 0 ? receita / spend : null,
        roi:  spend > 0 ? (receita - spend) / spend : null,
      };
    });

    setRows(built.reverse()); // mais recente primeiro
    setLoading(false);
  }, []);

  useEffect(() => { load(from, to); }, [from, to, load]);

  // ── aplicar preset ────────────────────────────────────────────────────────
  const applyPreset = (key: string) => {
    setPreset(key);
    const { from: f, to: t } = rangeFromPreset(key);
    setFrom(f); setTo(t);
  };

  // ── salvar gasto de um dia ────────────────────────────────────────────────
  const saveSpend = async (row: DayRow) => {
    setSaving(s => ({ ...s, [row.date]: true }));
    const { error } = await supabase
      .from('ad_spend')
      .upsert({ date: row.date, spend: row.spend, notes: row.notes }, { onConflict: 'date' });
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success(`Gasto de ${row.date} salvo`);
      // recalcula métricas localmente
      setRows(prev => prev.map(r => r.date !== row.date ? r : {
        ...r,
        cpc:  r.spend > 0 && r.clicks  > 0 ? r.spend / r.clicks  : null,
        cpl:  r.spend > 0 && r.leads   > 0 ? r.spend / r.leads   : null,
        cpa:  r.spend > 0 && r.pagos   > 0 ? r.spend / r.pagos   : null,
        roas: r.spend > 0 ? r.receita / r.spend : null,
        roi:  r.spend > 0 ? (r.receita - r.spend) / r.spend : null,
      }));
    }
    setSaving(s => ({ ...s, [row.date]: false }));
  };

  const updateRow = (date: string, field: 'spend' | 'notes', value: string) => {
    setRows(prev => prev.map(r => r.date !== date ? r : { ...r, [field]: field === 'spend' ? Number(value) : value }));
  };

  // ── totais ────────────────────────────────────────────────────────────────
  const totals = rows.reduce((acc, r) => ({
    clicks:  acc.clicks  + r.clicks,
    leads:   acc.leads   + r.leads,
    pedidos: acc.pedidos + r.pedidos,
    pagos:   acc.pagos   + r.pagos,
    receita: acc.receita + r.receita,
    spend:   acc.spend   + r.spend,
  }), { clicks: 0, leads: 0, pedidos: 0, pagos: 0, receita: 0, spend: 0 });

  const totalRoas = totals.spend > 0 ? totals.receita / totals.spend : null;
  const totalRoi  = totals.spend > 0 ? (totals.receita - totals.spend) / totals.spend : null;
  const totalCpa  = totals.spend > 0 && totals.pagos > 0 ? totals.spend / totals.pagos : null;
  const totalCpl  = totals.spend > 0 && totals.leads > 0 ? totals.spend / totals.leads : null;

  return (
    <AdminLayout title="Tráfego & ROAS">

      {/* Filtro de período */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PRESETS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? 'default' : 'outline'}
            onClick={() => applyPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset(''); }} className="h-9 w-36 text-sm" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={to}   onChange={e => { setTo(e.target.value);   setPreset(''); }} className="h-9 w-36 text-sm" />
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Cliques', value: totals.clicks,  icon: MousePointer,  color: 'text-blue-500' },
          { label: 'Leads',   value: totals.leads,   icon: Users,         color: 'text-purple-500' },
          { label: 'Pedidos', value: totals.pedidos, icon: ShoppingCart,  color: 'text-orange-500' },
          { label: 'Pagos',   value: totals.pagos,   icon: BadgeCheck,    color: 'text-green-500' },
          { label: 'Receita', value: fmt(totals.receita), icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Gasto',   value: fmt(totals.spend),   icon: DollarSign, color: 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={15} className={c.color} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <div className="font-bold text-foreground text-lg">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Cards ROAS / ROI / CPA / CPL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'ROAS', value: fmtX(totalRoas),   desc: 'Retorno sobre gasto' },
          { label: 'ROI',  value: fmtPct(totalRoi),  desc: 'Retorno sobre investimento' },
          { label: 'CPA',  value: fmtCur(totalCpa),  desc: 'Custo por venda paga' },
          { label: 'CPL',  value: fmtCur(totalCpl),  desc: 'Custo por lead' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-xl bg-card border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{c.desc}</p>
            <p className="font-display text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela dia a dia */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              <th className="text-left p-3 font-semibold">Data</th>
              <th className="text-right p-3 font-semibold">Cliques</th>
              <th className="text-right p-3 font-semibold">Leads</th>
              <th className="text-right p-3 font-semibold">Pedidos</th>
              <th className="text-right p-3 font-semibold">Pagos</th>
              <th className="text-right p-3 font-semibold">Receita</th>
              <th className="text-right p-3 font-semibold text-red-400">Gasto Anúncio</th>
              <th className="text-right p-3 font-semibold">ROAS</th>
              <th className="text-right p-3 font-semibold">ROI</th>
              <th className="text-right p-3 font-semibold">CPA</th>
              <th className="text-right p-3 font-semibold">CPL</th>
              <th className="p-3 font-semibold">Notas</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">Nenhum dado neste período.</td></tr>
            ) : rows.map(row => {
              const dateLabel = new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
              const hasActivity = row.clicks > 0 || row.leads > 0 || row.pagos > 0 || row.spend > 0;
              return (
                <tr
                  key={row.date}
                  className={`border-t transition-colors ${hasActivity ? 'hover:bg-muted/40' : 'opacity-50 hover:opacity-100 hover:bg-muted/20'}`}
                >
                  <td className="p-3 font-medium text-foreground whitespace-nowrap">{dateLabel}</td>
                  <td className="p-3 text-right tabular-nums">{row.clicks}</td>
                  <td className="p-3 text-right tabular-nums">{row.leads}</td>
                  <td className="p-3 text-right tabular-nums">{row.pedidos}</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-green-600 dark:text-green-400">{row.pagos}</td>
                  <td className="p-3 text-right tabular-nums">{row.receita > 0 ? fmt(row.receita) : '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end">
                      <span className="text-muted-foreground mr-1 text-xs">R$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.spend || ''}
                        onChange={e => updateRow(row.date, 'spend', e.target.value)}
                        className="h-7 w-24 text-right text-xs p-1"
                        placeholder="0,00"
                      />
                    </div>
                  </td>
                  <td className={`p-3 text-right font-semibold tabular-nums ${row.roas !== null && row.roas >= 3 ? 'text-green-600 dark:text-green-400' : row.roas !== null && row.roas < 1 ? 'text-red-500' : ''}`}>
                    {fmtX(row.roas)}
                  </td>
                  <td className={`p-3 text-right tabular-nums ${row.roi !== null && row.roi > 0 ? 'text-green-600 dark:text-green-400' : row.roi !== null ? 'text-red-500' : ''}`}>
                    {fmtPct(row.roi)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">{fmtCur(row.cpa)}</td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">{fmtCur(row.cpl)}</td>
                  <td className="p-3">
                    <Input
                      value={row.notes}
                      onChange={e => updateRow(row.date, 'notes', e.target.value)}
                      className="h-7 text-xs p-1 min-w-[8rem]"
                      placeholder="observações…"
                    />
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveSpend(row)}
                      disabled={saving[row.date]}
                      className="h-7 px-2"
                      title="Salvar gasto"
                    >
                      <Save size={13} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {!loading && rows.length > 1 && (
            <tfoot className="bg-muted/80 border-t-2 border-border text-xs font-bold">
              <tr>
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-right">{totals.clicks}</td>
                <td className="p-3 text-right">{totals.leads}</td>
                <td className="p-3 text-right">{totals.pedidos}</td>
                <td className="p-3 text-right text-green-600 dark:text-green-400">{totals.pagos}</td>
                <td className="p-3 text-right">{fmt(totals.receita)}</td>
                <td className="p-3 text-right text-red-400">{fmt(totals.spend)}</td>
                <td className={`p-3 text-right ${totalRoas !== null && totalRoas >= 3 ? 'text-green-600 dark:text-green-400' : ''}`}>{fmtX(totalRoas)}</td>
                <td className={`p-3 text-right ${totalRoi !== null && totalRoi > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>{fmtPct(totalRoi)}</td>
                <td className="p-3 text-right">{fmtCur(totalCpa)}</td>
                <td className="p-3 text-right">{fmtCur(totalCpl)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        ROAS = Receita ÷ Gasto · ROI = (Receita − Gasto) ÷ Gasto · CPA = Gasto ÷ Vendas pagas · CPL = Gasto ÷ Leads
      </p>
    </AdminLayout>
  );
}
