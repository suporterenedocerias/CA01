import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { loadStoredClients } from '@/lib/hashadmin-clients-store';
import { resolveApiBase } from '@/lib/resolve-api-base';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { TrendingUp, RefreshCw, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtBrl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtPct(v: number) {
  if (!isFinite(v) || v === 0) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}
function fmtX(v: number) {
  if (!isFinite(v) || v <= 0) return '—';
  return v.toFixed(2) + 'x';
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + 'T12:00:00Z');
  const end = new Date(to + 'T12:00:00Z');
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
function fmtDate(d: string) {
  return d.split('-').reverse().join('/');
}

// ─── types ──────────────────────────────────────────────────────────────────

type DayRow = {
  date: string;
  cliques: number;
  leads: number;
  pedidos: number;
  pagos: number;
  faturamento: number;
  spend: number;
};

type InstResult = {
  instId: string;
  label: string;
  rows: DayRow[];
  error?: string;
};

// ─── shortcuts ──────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { label: 'Hoje',    from: () => todayStr(),  to: () => todayStr()  },
  { label: 'Ontem',   from: () => daysAgo(1),  to: () => daysAgo(1)  },
  { label: '7 dias',  from: () => daysAgo(6),  to: () => todayStr()  },
  { label: '14 dias', from: () => daysAgo(13), to: () => todayStr()  },
  { label: '30 dias', from: () => daysAgo(29), to: () => todayStr()  },
];

// ─── fetch por instância ─────────────────────────────────────────────────────

async function fetchRows(
  supabaseUrl: string,
  serviceKey: string,
  from: string,
  to: string,
): Promise<DayRow[]> {
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tFrom = `${from}T00:00:00`;
  const tTo   = `${to}T23:59:59`;

  const [clicksRes, leadsRes, ordersRes, spendRes] = await Promise.all([
    sb.from('whatsapp_clicks').select('created_at').gte('created_at', tFrom).lte('created_at', tTo),
    sb.from('leads').select('created_at').gte('created_at', tFrom).lte('created_at', tTo),
    sb.from('orders')
      .select('created_at, payment_status, status, valor_total')
      .gte('created_at', tFrom).lte('created_at', tTo),
    sb.from('ad_spend').select('date, spend').gte('date', from).lte('date', to),
  ]);

  const spendMap: Record<string, number> = {};
  for (const s of spendRes.data ?? []) spendMap[s.date] = Number(s.spend || 0);

  const clicks: Record<string, number> = {};
  const leads:  Record<string, number> = {};
  const ped:    Record<string, number> = {};
  const pagos:  Record<string, number> = {};
  const fat:    Record<string, number> = {};

  for (const r of clicksRes.data ?? []) { const d = r.created_at.slice(0, 10); clicks[d] = (clicks[d] || 0) + 1; }
  for (const r of leadsRes.data  ?? []) { const d = r.created_at.slice(0, 10); leads[d]  = (leads[d]  || 0) + 1; }
  for (const r of ordersRes.data ?? []) {
    const d = r.created_at.slice(0, 10);
    ped[d] = (ped[d] || 0) + 1;
    if (r.payment_status === 'paid' || r.status === 'pago') {
      pagos[d] = (pagos[d] || 0) + 1;
      fat[d]   = (fat[d]   || 0) + Number(r.valor_total || 0);
    }
  }

  return eachDay(from, to).map(date => ({
    date,
    cliques:     clicks[date] ?? 0,
    leads:       leads[date]  ?? 0,
    pedidos:     ped[date]    ?? 0,
    pagos:       pagos[date]  ?? 0,
    faturamento: fat[date]    ?? 0,
    spend:       spendMap[date] ?? 0,
  }));
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'white' }: {
  label: string; value: string; sub: string; color?: string;
}) {
  const c = { green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400', white: 'text-white' }[color] ?? 'text-white';
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold ${c}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function HashAdminTraffic() {
  const { clientId, instances } = useHashAdminClientFilter();
  const [dateFrom, setDateFrom] = useState(daysAgo(6));
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [activeShortcut, setActiveShortcut] = useState('7 dias');
  const [results,  setResults]  = useState<InstResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [editCell, setEditCell] = useState<string | null>(null); // date being edited
  const [editVal,  setEditVal]  = useState('');
  const [saving,   setSaving]   = useState(false);

  // ── Identifica instância e credenciais para escrita ──
  const isSingle     = clientId !== 'all';
  const singleStored = isSingle ? loadStoredClients().find(c => c.id === clientId) : null;

  // ── Carrega dados ────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setResults([]);
    const targets = clientId === 'all' ? instances : instances.filter(i => i.id === clientId);
    const stored  = loadStoredClients();
    const base    = resolveApiBase();

    const tasks = targets.map(async inst => {
      const sc  = stored.find(c => c.id === inst.id);
      const url = sc?.supabaseUrl?.trim() || '';
      const key = sc?.supabaseServiceRoleKey?.trim() || '';

      try {
        let rows: DayRow[];

        if (key && url) {
          // Tem service role key no localStorage — consulta direto
          rows = await Promise.race([
            fetchRows(url, key, dateFrom, dateTo),
            new Promise<DayRow[]>((_, rej) => setTimeout(() => rej(new Error('Timeout 15s')), 15000)),
          ]);
        } else if (inst.id === 'local') {
          // Instância local sem chave no localStorage — usa backend (tem a chave no .env)
          const res = await fetch(`${base}/hashadmin/traffic?from=${dateFrom}&to=${dateTo}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
          rows = json.rows ?? [];
        } else {
          // Cliente externo sem service role key configurada
          return { instId: inst.id, label: inst.label, rows: [], error: 'Service role key não configurada — acesse Clientes para adicionar' };
        }

        return { instId: inst.id, label: inst.label, rows };
      } catch (e) {
        return { instId: inst.id, label: inst.label, rows: [], error: (e as Error).message };
      }
    });
    setResults(await Promise.all(tasks));
    setLoading(false);
  }, [clientId, instances, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // ── Agrega dados por dia ─────────────────────────────
  const days = eachDay(dateFrom, dateTo).reverse(); // mais recente primeiro
  const aggregated: DayRow[] = days.map(date => ({
    date,
    ...results.reduce((acc, r) => {
      const row = r.rows.find(d => d.date === date);
      if (!row) return acc;
      return {
        cliques:     acc.cliques     + row.cliques,
        leads:       acc.leads       + row.leads,
        pedidos:     acc.pedidos     + row.pedidos,
        pagos:       acc.pagos       + row.pagos,
        faturamento: acc.faturamento + row.faturamento,
        spend:       acc.spend       + row.spend,
      };
    }, { cliques: 0, leads: 0, pedidos: 0, pagos: 0, faturamento: 0, spend: 0 }),
  }));

  // ── Totais ───────────────────────────────────────────
  const T = aggregated.reduce((a, r) => ({
    cliques:     a.cliques     + r.cliques,
    leads:       a.leads       + r.leads,
    pedidos:     a.pedidos     + r.pedidos,
    pagos:       a.pagos       + r.pagos,
    faturamento: a.faturamento + r.faturamento,
    spend:       a.spend       + r.spend,
  }), { cliques: 0, leads: 0, pedidos: 0, pagos: 0, faturamento: 0, spend: 0 });

  const roas = T.spend > 0 ? T.faturamento / T.spend : 0;
  const roi  = T.spend > 0 ? ((T.faturamento - T.spend) / T.spend) * 100 : 0;
  const cpl  = T.leads > 0 ? T.spend / T.leads : 0;
  const cpv  = T.pagos > 0 ? T.spend / T.pagos : 0;

  // ── Salva gasto do dia ───────────────────────────────
  async function saveSpend(date: string) {
    if (!isSingle) return;
    setSaving(true);
    try {
      const value = parseFloat(editVal.replace(',', '.')) || 0;
      const url = singleStored?.supabaseUrl?.trim() || '';
      const key = singleStored?.supabaseServiceRoleKey?.trim() || '';

      if (key && url) {
        // Tem chave local — salva direto
        const sb = createClient(url, key, { auth: { persistSession: false } });
        await sb.from('ad_spend').upsert({ date, spend: value }, { onConflict: 'date' });
      } else {
        // Usa backend (instância local do .env)
        const base = resolveApiBase();
        const res = await fetch(`${base}/hashadmin/traffic/spend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, spend: value }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao salvar');
      }

      setEditCell(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  function pickShortcut(s: typeof SHORTCUTS[0]) {
    setActiveShortcut(s.label);
    setDateFrom(s.from());
    setDateTo(s.to());
  }

  // ── Render ───────────────────────────────────────────
  return (
    <HashAdminLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-zinc-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Tráfego & ROAS</h1>
            <p className="text-sm text-zinc-400">Dia a dia com ROAS, ROI, CPL e CPV. Clique no gasto para editar.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="text-zinc-400 hover:text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Date filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {SHORTCUTS.map(s => (
          <button
            key={s.label}
            onClick={() => pickShortcut(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeShortcut === s.label
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setActiveShortcut(''); }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none"
          />
          <span className="text-zinc-600 text-xs">até</span>
          <input
            type="date" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setActiveShortcut(''); }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:outline-none"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Faturamento" value={fmtBrl(T.faturamento)} sub={`${T.pagos} vendas no período`} color="green" />
        <KpiCard label="Gasto em Anúncio" value={fmtBrl(T.spend)} sub="soma do período" color="yellow" />
        <KpiCard
          label="ROAS"
          value={fmtX(roas)}
          sub="retorno sobre gasto"
          color={roas >= 3 ? 'green' : roas >= 1 ? 'yellow' : roas > 0 ? 'red' : 'white'}
        />
        <KpiCard
          label="ROI"
          value={T.spend > 0 ? fmtPct(roi) : '—'}
          sub="lucro sobre gasto"
          color={roi >= 100 ? 'green' : roi >= 0 ? 'yellow' : roi !== 0 ? 'red' : 'white'}
        />
        <KpiCard label="Leads" value={T.leads.toString()} sub={cpl > 0 ? `CPL ${fmtBrl(cpl)}` : 'sem gasto registrado'} />
        <KpiCard label="Cliques WhatsApp" value={T.cliques.toString()} sub="total período" />
        <KpiCard label="CPV" value={cpv > 0 ? fmtBrl(cpv) : '—'} sub="custo por venda" />
        <KpiCard label="Pedidos" value={T.pedidos.toString()} sub={`${T.pagos} pagos`} />
      </div>

      {/* Erros por instância */}
      {results.filter(r => r.error).map(r => (
        <div key={r.instId} className="mb-3 rounded-lg border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-400">
          <strong>{r.label}:</strong> {r.error}
        </div>
      ))}

      {/* Aviso modo "todos" */}
      {!isSingle && (
        <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-xs text-zinc-500">
          Selecione um cliente específico para editar o gasto em anúncio de cada dia.
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-right">Cliques</th>
              <th className="px-4 py-3 text-right">Leads</th>
              <th className="px-4 py-3 text-right">Pedidos</th>
              <th className="px-4 py-3 text-right">Pagos</th>
              <th className="px-4 py-3 text-right">Faturamento</th>
              <th className="px-4 py-3 text-right">Gasto Ads</th>
              <th className="px-4 py-3 text-right">CPL</th>
              <th className="px-4 py-3 text-right">CPV</th>
              <th className="px-4 py-3 text-right">ROAS</th>
              <th className="px-4 py-3 text-right">ROI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-zinc-500">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Carregando dados…
                </td>
              </tr>
            ) : aggregated.length === 0 ? (
              <tr><td colSpan={11} className="py-12 text-center text-zinc-600">Nenhum dado no período</td></tr>
            ) : aggregated.map(row => {
              const rowRoas = row.spend > 0 ? row.faturamento / row.spend : 0;
              const rowRoi  = row.spend > 0 ? ((row.faturamento - row.spend) / row.spend) * 100 : 0;
              const rowCpl  = row.leads > 0 ? row.spend / row.leads : 0;
              const rowCpv  = row.pagos > 0 ? row.spend / row.pagos : 0;
              const isEditing = editCell === row.date;
              const hasAnyData = row.cliques || row.leads || row.pedidos || row.faturamento || row.spend;

              return (
                <tr
                  key={row.date}
                  className={`border-b border-zinc-800/40 transition-colors ${
                    hasAnyData ? 'hover:bg-zinc-800/30' : 'opacity-40 hover:opacity-60'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">
                    {fmtDate(row.date)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">{row.cliques || '—'}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{row.leads || '—'}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{row.pedidos || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{row.pagos || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-400">
                    {row.faturamento ? fmtBrl(row.faturamento) : '—'}
                  </td>

                  {/* Gasto Ads — editável */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveSpend(row.date);
                            if (e.key === 'Escape') setEditCell(null);
                          }}
                          placeholder="0,00"
                          className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-right text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                        <button
                          onClick={() => saveSpend(row.date)}
                          disabled={saving}
                          className="text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditCell(null)} className="text-zinc-500 hover:text-zinc-300">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!isSingle) return;
                          setEditCell(row.date);
                          setEditVal(row.spend > 0 ? String(row.spend) : '');
                        }}
                        className={`flex w-full items-center justify-end gap-1 ${
                          isSingle ? 'cursor-pointer hover:text-yellow-300' : 'cursor-default'
                        } ${row.spend ? 'text-yellow-400' : 'text-zinc-600'}`}
                      >
                        {row.spend ? fmtBrl(row.spend) : isSingle ? <span className="text-[11px]">+ gasto</span> : '—'}
                        {isSingle && <Edit3 className="h-3 w-3 opacity-40 shrink-0" />}
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{rowCpl > 0 ? fmtBrl(rowCpl) : '—'}</td>
                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{rowCpv > 0 ? fmtBrl(rowCpv) : '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold text-xs ${
                    rowRoas >= 3 ? 'text-green-400' : rowRoas >= 1 ? 'text-yellow-400' : rowRoas > 0 ? 'text-red-400' : 'text-zinc-600'
                  }`}>
                    {rowRoas > 0 ? fmtX(rowRoas) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold text-xs ${
                    rowRoi >= 100 ? 'text-green-400' : rowRoi >= 0 ? 'text-yellow-400' : row.spend > 0 ? 'text-red-400' : 'text-zinc-600'
                  }`}>
                    {row.spend > 0 ? fmtPct(rowRoi) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Linha de totais */}
          {!loading && aggregated.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-700 bg-zinc-900/60 text-sm font-bold text-white">
                <td className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-400">Total período</td>
                <td className="px-4 py-3 text-right text-zinc-300">{T.cliques || '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{T.leads || '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{T.pedidos || '—'}</td>
                <td className="px-4 py-3 text-right text-white">{T.pagos || '—'}</td>
                <td className="px-4 py-3 text-right text-green-400">{fmtBrl(T.faturamento)}</td>
                <td className="px-4 py-3 text-right text-yellow-400">{fmtBrl(T.spend)}</td>
                <td className="px-4 py-3 text-right text-zinc-300 text-xs">{cpl > 0 ? fmtBrl(cpl) : '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-300 text-xs">{cpv > 0 ? fmtBrl(cpv) : '—'}</td>
                <td className={`px-4 py-3 text-right text-xs ${roas >= 3 ? 'text-green-400' : roas >= 1 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {fmtX(roas)}
                </td>
                <td className={`px-4 py-3 text-right text-xs ${roi >= 100 ? 'text-green-400' : roi >= 0 ? 'text-yellow-400' : T.spend > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {T.spend > 0 ? fmtPct(roi) : '—'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Legenda de cores ROAS */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
        <span><span className="text-green-400">■</span> ROAS ≥ 3x · ROI ≥ 100% — excelente</span>
        <span><span className="text-yellow-400">■</span> ROAS ≥ 1x · ROI ≥ 0% — positivo</span>
        <span><span className="text-red-400">■</span> ROAS &lt; 1x — prejuízo</span>
      </div>
    </HashAdminLayout>
  );
}

export default HashAdminTraffic;
