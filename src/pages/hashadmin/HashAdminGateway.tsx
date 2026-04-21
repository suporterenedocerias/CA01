import { useEffect, useState, useCallback } from 'react';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { loadStoredClients } from '@/lib/hashadmin-clients-store';
import { resolveApiBase } from '@/lib/resolve-api-base';
import { Button } from '@/components/ui/button';
import {
  Loader2, CreditCard, CheckCircle2, Clock, XCircle, RefreshCw, Plus, AlertCircle,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TxFee = { fixedAmount: number; spreadPercentage: number; estimatedFee: number; netAmount: number };
type TxItem = { title?: string };
type Transaction = {
  id: string;
  status: string;
  amount: number;
  paymentMethod?: string;
  createdAt?: string;
  paidAt?: string | null;
  customer?: { document?: { number?: string; type?: string } };
  items?: TxItem[];
  fee?: TxFee;
  pix?: { qrcode?: string; expirationDate?: string };
  _clientLabel?: string; // injetado localmente
};
type ApiResponse = { status?: number; message?: string; data?: Transaction[]; total?: number; error?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBrl(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}
function fmtDate(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function txName(tx: Transaction): string { return tx.items?.[0]?.title?.trim() || '—'; }
function txDoc(tx: Transaction): string { return tx.customer?.document?.number ?? '—'; }

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function today() { return toDateStr(new Date()); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toDateStr(d); }

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PAID:            { label: 'Pago',        cls: 'text-green-400 bg-green-950 border-green-800',    icon: <CheckCircle2 className="h-3 w-3" /> },
  APPROVED:        { label: 'Aprovado',    cls: 'text-green-400 bg-green-950 border-green-800',    icon: <CheckCircle2 className="h-3 w-3" /> },
  WAITING_PAYMENT: { label: 'Aguardando', cls: 'text-yellow-400 bg-yellow-950 border-yellow-800', icon: <Clock className="h-3 w-3" /> },
  PENDING:         { label: 'Pendente',   cls: 'text-yellow-400 bg-yellow-950 border-yellow-800', icon: <Clock className="h-3 w-3" /> },
  FAILED:          { label: 'Falhou',     cls: 'text-red-400 bg-red-950 border-red-800',          icon: <XCircle className="h-3 w-3" /> },
  CANCELLED:       { label: 'Cancelado',  cls: 'text-zinc-400 bg-zinc-900 border-zinc-700',       icon: <XCircle className="h-3 w-3" /> },
  EXPIRED:         { label: 'Expirado',   cls: 'text-zinc-400 bg-zinc-900 border-zinc-700',       icon: <XCircle className="h-3 w-3" /> },
  REFUNDED:        { label: 'Reembolsado',cls: 'text-blue-400 bg-blue-950 border-blue-800',       icon: <XCircle className="h-3 w-3" /> },
};
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status.toUpperCase()] ?? { label: status, cls: 'text-zinc-400 bg-zinc-900 border-zinc-700', icon: null };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.icon} {s.label}</span>;
}

function isPaid(tx: Transaction) { return ['PAID','APPROVED'].includes(tx.status.toUpperCase()); }
function isWaiting(tx: Transaction) { return ['WAITING_PAYMENT','PENDING'].includes(tx.status.toUpperCase()); }
function isFailed(tx: Transaction) { return ['FAILED','CANCELLED','EXPIRED'].includes(tx.status.toUpperCase()); }

// ─── Modal nova transação ─────────────────────────────────────────────────────

const EMPTY_FORM = { description: '', amount: '', payer_name: '', payer_document: '', payer_email: '' };

function CreateModal({ gatewayKey, onClose, onCreated }: { gatewayKey: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Transaction | null>(null);
  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const base = resolveApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (gatewayKey) headers['X-Gateway-Key'] = gatewayKey;
      const centavos = Math.round(Number(form.amount.replace(',', '.')) * 100);
      const body = { description: form.description, amount: centavos, payer: { name: form.payer_name, document: form.payer_document.replace(/\D/g, ''), email: form.payer_email || undefined }, type: 'PIX' };
      const res = await fetch(`${resolveApiBase()}/fastsoft/transactions`, { method: 'POST', headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? `Erro ${res.status}`);
      setResult((json.data ?? json) as Transaction);
      onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-bold text-white">Nova Transação PIX</h2>
        {result ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-green-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Criada com sucesso</p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 space-y-1">
              <p><span className="text-zinc-500">ID:</span> {result.id}</p>
              <p><span className="text-zinc-500">Status:</span> {result.status}</p>
              {result.pix?.qrcode && <p className="break-all"><span className="text-zinc-500">QR:</span> {result.pix.qrcode}</p>}
            </div>
            <Button className="w-full" onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="flex flex-col gap-1"><span className="text-xs text-zinc-400">Descrição *</span>
              <input value={form.description} onChange={set('description')} required className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-zinc-400">Valor (R$) *</span>
              <input value={form.amount} onChange={set('amount')} placeholder="200,00" required className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-400">Nome *</span>
                <input value={form.payer_name} onChange={set('payer_name')} required className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500" /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-400">CPF/CNPJ *</span>
                <input value={form.payer_document} onChange={set('payer_document')} placeholder="000.000.000-00" required className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500" /></label>
            </div>
            <label className="flex flex-col gap-1"><span className="text-xs text-zinc-400">E-mail (opcional)</span>
              <input value={form.payer_email} onChange={set('payer_email')} type="email" className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500" /></label>
            {error && <p className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar transação'}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

const STATUSES = ['', 'PAID', 'WAITING_PAYMENT', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'];
const STATUS_LABELS: Record<string, string> = {
  '': 'Todos', PAID: 'Pagos', WAITING_PAYMENT: 'Aguardando',
  FAILED: 'Falhou', CANCELLED: 'Cancelado', EXPIRED: 'Expirado', REFUNDED: 'Reembolsado',
};

const SHORTCUTS = [
  { label: 'Hoje',    start: () => today(),      end: () => today() },
  { label: 'Ontem',   start: () => daysAgo(1),   end: () => daysAgo(1) },
  { label: '7 dias',  start: () => daysAgo(6),   end: () => today() },
  { label: '14 dias', start: () => daysAgo(13),  end: () => today() },
  { label: '30 dias', start: () => daysAgo(29),  end: () => today() },
  { label: 'Tudo',    start: () => '',            end: () => '' },
];

export default function HashAdminGateway() {
  const { clientId, instances } = useHashAdminClientFilter();

  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [activeShortcut, setActiveShortcut] = useState('Tudo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Chave para o modal de criar (usa o cliente selecionado ou o primeiro disponível)
  const singleStored = clientId !== 'all'
    ? loadStoredClients().find((c) => c.id === clientId)
    : null;
  const createKey = singleStored?.gatewaySecretKey?.trim() ?? '';

  // Filtragem
  const txs = allTxs.filter((t) => {
    if (statusFilter && t.status.toUpperCase() !== statusFilter) return false;
    if (dateStart || dateEnd) {
      const d = t.createdAt ? t.createdAt.slice(0, 10) : '';
      if (dateStart && d < dateStart) return false;
      if (dateEnd && d > dateEnd) return false;
    }
    return true;
  });

  const paidTxs    = txs.filter(isPaid);
  const waitingTxs = txs.filter(isWaiting);
  const failedTxs  = txs.filter(isFailed);
  const paidVolume    = paidTxs.reduce((s, t) => s + t.amount, 0);
  const paidLiquido   = paidTxs.reduce((s, t) => s + (t.fee?.netAmount ?? t.amount), 0);
  const waitingVolume = waitingTxs.reduce((s, t) => s + t.amount, 0);

  // Busca: todos os clientes ou cliente específico
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const base = resolveApiBase();
      const stored = loadStoredClients();

      let targets: { id: string; label: string; key: string }[] = [];

      if (clientId === 'all') {
        // Todos os clientes com gateway key configurada
        targets = instances
          .map((inst) => {
            const s = stored.find((c) => c.id === inst.id);
            return { id: inst.id, label: inst.label, key: s?.gatewaySecretKey?.trim() ?? '' };
          })
          .filter((t) => t.key); // só os que têm chave
        // Se nenhum tem chave configurada, usa a padrão do servidor (sem X-Gateway-Key)
        if (targets.length === 0) {
          targets = [{ id: 'default', label: 'Padrão', key: '' }];
        }
      } else {
        const s = stored.find((c) => c.id === clientId);
        const label = instances.find((i) => i.id === clientId)?.label ?? clientId;
        targets = [{ id: clientId, label, key: s?.gatewaySecretKey?.trim() ?? '' }];
      }

      const results = await Promise.all(
        targets.map(async ({ label, key }) => {
          const headers: Record<string, string> = {};
          if (key) headers['X-Gateway-Key'] = key;
          const res = await fetch(`${base}/fastsoft/transactions`, { headers });
          const json: ApiResponse = await res.json();
          if (!res.ok) throw new Error(json.error ?? `Erro ${res.status} (${label})`);
          return (json.data ?? []).map((tx) => ({ ...tx, _clientLabel: label }));
        }),
      );

      // Mescla e ordena por data desc
      const merged = results.flat().sort((a, b) => {
        const da = a.createdAt ?? '';
        const db = b.createdAt ?? '';
        return db.localeCompare(da);
      });
      setAllTxs(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally { setLoading(false); }
  }, [clientId, instances]);

  useEffect(() => { setStatusFilter(''); }, [clientId]);
  useEffect(() => { load(); }, [load]);

  function applyShortcut(s: typeof SHORTCUTS[0]) {
    setDateStart(s.start());
    setDateEnd(s.end());
    setActiveShortcut(s.label);
  }

  const isMulti = clientId === 'all' && instances.length > 1;

  return (
    <HashAdminLayout>
      {showCreate && (
        <CreateModal
          gatewayKey={createKey}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Fluxxo Pay</h1>
            <p className="mt-1 text-sm text-zinc-400">Transações PIX direto da API do gateway.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="text-zinc-400 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-zinc-100 text-zinc-900 hover:bg-white">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova transação
          </Button>
        </div>
      </div>

      {/* Filtro de datas */}
      <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Período</span>
        <div className="flex flex-wrap gap-1.5">
          {SHORTCUTS.map((s) => (
            <button key={s.label} type="button" onClick={() => applyShortcut(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeShortcut === s.label
                  ? 'border-zinc-400 bg-zinc-700 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setActiveShortcut(''); }}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500" />
          <span className="text-zinc-600 text-xs">até</span>
          <input type="date" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setActiveShortcut(''); }}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Volume Pago
          </p>
          <p className="text-2xl font-bold text-green-400">{fmtBrl(paidVolume)}</p>
          <p className="mt-1 text-xs text-zinc-500">{paidTxs.length} confirmadas nesta página</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Líquido (após taxa)
          </p>
          <p className="text-2xl font-bold text-emerald-400">{fmtBrl(paidLiquido)}</p>
          <p className="mt-1 text-xs text-zinc-500">taxas descontadas pelo gateway</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <Clock className="h-4 w-4 text-yellow-500" /> Aguardando
          </p>
          <p className="text-2xl font-bold text-yellow-400">{fmtBrl(waitingVolume)}</p>
          <p className="mt-1 text-xs text-zinc-500">{waitingTxs.length} PIX não pagos ainda</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <XCircle className="h-4 w-4 text-red-500" /> Falhou / Cancelado
          </p>
          <p className="text-2xl font-bold text-zinc-400">{failedTxs.length}</p>
          <p className="mt-1 text-xs text-zinc-500">transações não concluídas</p>
        </div>
      </div>

      {/* Filtro de status */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'border-zinc-400 bg-zinc-700 text-white'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >{STATUS_LABELS[s] ?? s}</button>
        ))}
        <span className="ml-auto text-xs text-zinc-600">{txs.length} de {allTxs.length} transações</span>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-300">
          <p className="font-semibold">Erro ao consultar Fluxxo Pay</p>
          <p className="mt-1 font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Aviso: "todos" mas nenhum cliente tem chave */}
      {clientId === 'all' && !loading && !error && allTxs.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-800 bg-yellow-950/40 px-4 py-3 text-sm text-yellow-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Mostrando dados da chave padrão do servidor. Configure a Secret Key de cada cliente em <strong>Clientes</strong> para ver dados separados por conta.</p>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : txs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
          <p className="text-zinc-500 text-sm">Nenhuma transação encontrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                {isMulti && <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Cliente</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Descrição / CPF</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">Bruto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400">Líquido</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Criado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={`${tx._clientLabel}-${tx.id}`} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  {isMulti && (
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{tx._clientLabel}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-200 truncate max-w-[180px]">{txName(tx)}</p>
                    <p className="text-xs text-zinc-500 font-mono">{txDoc(tx)}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{fmtBrl(tx.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                    {tx.fee?.netAmount != null ? fmtBrl(tx.fee.netAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(tx.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(tx.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HashAdminLayout>
  );
}
