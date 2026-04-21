import { useState } from 'react';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { loadStoredClients, upsertStoredClient, deleteStoredClient, type StoredClient } from '@/lib/hashadmin-clients-store';
import { getHashAdminInstances } from '@/lib/hashadmin-config';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Pencil, Trash2, Eye, EyeOff, KeyRound, Check, X, Download, Upload } from 'lucide-react';

const EMPTY_FORM: StoredClient = {
  id: '',
  label: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceRoleKey: '',
  siteOrigin: '',
  gatewayApiKey: '',
  gatewaySecretKey: '',
  gatewayFeePct: undefined,
  gatewayFeeFixed: undefined,
};

function mask(s: string) {
  if (!s) return '—';
  return s.slice(0, 8) + '••••••••' + s.slice(-4);
}

function ClientCard({
  client,
  isEnv,
  onEdit,
  onDelete,
}: {
  client: StoredClient;
  isEnv: boolean;
  onEdit: (c: StoredClient) => void;
  onDelete: (id: string) => void;
}) {
  const [showKeys, setShowKeys] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 shrink-0 text-zinc-400" />
          <div>
            <p className="font-semibold text-white text-sm">{client.label || '(sem nome)'}</p>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{client.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isEnv && (
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300 font-medium">.env</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(client)} className="text-zinc-400 hover:text-white">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!isEnv && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(client.id)}
              className="text-zinc-500 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!isEnv && (
        <div className="text-xs space-y-1.5 border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-28 text-zinc-600">URL Supabase</span>
            <span className="font-mono truncate max-w-[240px]">{client.supabaseUrl || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-28 text-zinc-600">Chave anon (pk)</span>
            <span className="font-mono">{showKeys ? (client.supabaseAnonKey || '—') : mask(client.supabaseAnonKey)}</span>
          </div>
          {client.supabaseServiceRoleKey && (
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-28 text-zinc-600">Service role (sk)</span>
              <span className="font-mono">{showKeys ? client.supabaseServiceRoleKey : mask(client.supabaseServiceRoleKey)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-28 text-zinc-600">Gateway PK</span>
            <span className="font-mono text-xs">
              {client.gatewayApiKey
                ? (showKeys ? client.gatewayApiKey : mask(client.gatewayApiKey))
                : <span className="text-zinc-600 italic">não configurada</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-28 text-zinc-600">Gateway SK</span>
            <span className="font-mono text-xs">
              {client.gatewaySecretKey
                ? (showKeys ? client.gatewaySecretKey : mask(client.gatewaySecretKey))
                : <span className="text-zinc-600 italic">não configurada</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-28 text-zinc-600">Taxa gateway</span>
            <span className="text-xs">
              {(client.gatewayFeePct != null || client.gatewayFeeFixed != null)
                ? <span className="text-zinc-300">{client.gatewayFeePct != null ? `${client.gatewayFeePct}%` : '—'} + R$ {client.gatewayFeeFixed != null ? Number(client.gatewayFeeFixed).toFixed(2) : '—'}</span>
                : <span className="text-zinc-600 italic">não configurada</span>}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowKeys((v) => !v)}
            className="mt-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showKeys ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showKeys ? 'Ocultar chaves' : 'Mostrar chaves'}
          </button>
        </div>
      )}
    </div>
  );
}

function ClientForm({
  initial,
  isEnv,
  onSave,
  onCancel,
}: {
  initial: StoredClient;
  isEnv: boolean;
  onSave: (c: StoredClient) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<StoredClient>(initial);
  const [showPk, setShowPk] = useState(false);
  const [showSk, setShowSk] = useState(false);
  const [showGw, setShowGw] = useState(false);

  const set = (k: keyof StoredClient) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const valid = form.label.trim() && (isEnv || (form.supabaseUrl.trim() && form.supabaseAnonKey.trim()));

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      <p className="text-sm font-semibold text-zinc-200">
        {initial.id ? `Editar cliente — ${initial.label}` : 'Novo cliente'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400 font-medium">Nome do cliente *</span>
          <input
            value={form.label}
            onChange={set('label')}
            placeholder="Ex: CLIENTE OP1"
            className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400 font-medium">URL do site (opcional)</span>
          <input
            value={form.siteOrigin || ''}
            onChange={set('siteOrigin')}
            placeholder="https://cliente.com"
            className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </label>
      </div>

      {!isEnv && (
        <>
          <div className="border-t border-zinc-800 pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Chaves Supabase
              </p>
              {/* Preenche automaticamente com as credenciais do .env atual */}
              {(import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
                      supabaseAnonKey:
                        ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
                          (import.meta.env.VITE_SUPABASE_ANON_KEY as string)) ?? '',
                    }))
                  }
                  className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Usar as do .env atual
                </button>
              )}
            </div>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500">URL do projeto Supabase *</span>
                <input
                  value={form.supabaseUrl}
                  onChange={set('supabaseUrl')}
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500 flex items-center justify-between">
                  Chave anon / publishable (pk) *
                  <button type="button" onClick={() => setShowPk((v) => !v)} className="text-zinc-600 hover:text-zinc-300">
                    {showPk ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </span>
                <input
                  type={showPk ? 'text' : 'password'}
                  value={form.supabaseAnonKey}
                  onChange={set('supabaseAnonKey')}
                  placeholder="eyJhbGci..."
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500 flex items-center justify-between">
                  Service role key (sk) — opcional, para criar subpáginas
                  <button type="button" onClick={() => setShowSk((v) => !v)} className="text-zinc-600 hover:text-zinc-300">
                    {showSk ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </span>
                <input
                  type={showSk ? 'text' : 'password'}
                  value={form.supabaseServiceRoleKey || ''}
                  onChange={set('supabaseServiceRoleKey')}
                  placeholder="eyJhbGci... (service role)"
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-3">
            <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Chaves Gateway de Pagamento (opcional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500 flex items-center justify-between">
                  API Key (pública)
                  <button type="button" onClick={() => setShowGw((v) => !v)} className="text-zinc-600 hover:text-zinc-300">
                    {showGw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </span>
                <input
                  type={showGw ? 'text' : 'password'}
                  value={form.gatewayApiKey || ''}
                  onChange={set('gatewayApiKey')}
                  placeholder="pk_live_..."
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500">Secret Key</span>
                <input
                  type={showGw ? 'text' : 'password'}
                  value={form.gatewaySecretKey || ''}
                  onChange={set('gatewaySecretKey')}
                  placeholder="sk_live_..."
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500">Taxa % (ex: 6.99)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.gatewayFeePct ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, gatewayFeePct: e.target.value === '' ? undefined : Number(e.target.value) }))}
                  placeholder="6.99"
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500">Taxa fixa R$ (ex: 2.29)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.gatewayFeeFixed ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, gatewayFeeFixed: e.target.value === '' ? undefined : Number(e.target.value) }))}
                  placeholder="2.29"
                  className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
              </label>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 border-t border-zinc-800 pt-4">
        <Button
          onClick={() => onSave(form)}
          disabled={!valid}
          size="sm"
          className="bg-zinc-100 text-zinc-900 hover:bg-white"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-400">
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function ExportImportBar({ onImported }: { onImported: () => void }) {
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState('');

  function doExport() {
    const data = loadStoredClients();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ceo-clientes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport() {
    setImportErr('');
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error('Formato inválido — deve ser um array JSON');
      for (const c of parsed) {
        if (!c.id || !c.label) throw new Error(`Cliente sem id/label: ${JSON.stringify(c)}`);
        upsertStoredClient(c as StoredClient);
      }
      setImporting(false);
      setImportText('');
      onImported();
    } catch (e) {
      setImportErr((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={doExport} className="text-zinc-400 hover:text-white border border-zinc-700">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setImporting(true)} className="text-zinc-400 hover:text-white border border-zinc-700">
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar
        </Button>
      </div>

      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <p className="text-sm font-bold text-white">Importar clientes</p>
            <p className="text-xs text-zinc-400">Cole o JSON exportado do outro dispositivo. Os clientes existentes serão mesclados (não apagados).</p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={10}
              placeholder='[{"id": "...", "label": "...", ...}]'
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            {importErr && <p className="text-xs text-red-400">{importErr}</p>}
            <div className="flex gap-2">
              <Button onClick={doImport} disabled={!importText.trim()} className="bg-zinc-100 text-zinc-900 hover:bg-white" size="sm">
                <Check className="h-3.5 w-3.5 mr-1.5" /> Importar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setImporting(false); setImportErr(''); }} className="text-zinc-400">
                <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HashAdminClients() {
  const { instances, refreshInstances } = useHashAdminClientFilter();
  const envIds = new Set(getHashAdminInstances().map((i) => i.id));
  const stored = loadStoredClients();

  // Monta lista exibida: para cada instância (env + extras)
  const displayList: StoredClient[] = instances.map((inst) => {
    const s = stored.find((c) => c.id === inst.id);
    return {
      id: inst.id,
      label: inst.label,
      supabaseUrl: s?.supabaseUrl ?? (envIds.has(inst.id) ? '(via .env)' : ''),
      supabaseAnonKey: s?.supabaseAnonKey ?? (envIds.has(inst.id) ? '(via .env)' : ''),
      supabaseServiceRoleKey: s?.supabaseServiceRoleKey,
      siteOrigin: s?.siteOrigin ?? inst.siteOrigin,
      gatewayApiKey: s?.gatewayApiKey,
      gatewaySecretKey: s?.gatewaySecretKey,
      gatewayFeePct: s?.gatewayFeePct,
      gatewayFeeFixed: s?.gatewayFeeFixed,
    };
  });

  const [editing, setEditing] = useState<StoredClient | null>(null);
  const [adding, setAdding] = useState(false);

  const handleSave = (c: StoredClient) => {
    upsertStoredClient(c);
    refreshInstances();
    setEditing(null);
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remover este cliente do painel CEO?')) return;
    deleteStoredClient(id);
    refreshInstances();
  };

  return (
    <HashAdminLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Building2 className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Clientes</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gerencie os projetos monitorados. As chaves ficam salvas só neste navegador.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ExportImportBar onImported={() => { refreshInstances(); }} />
          {!adding && !editing && (
            <Button
              size="sm"
              onClick={() => setAdding(true)}
              className="bg-zinc-100 text-zinc-900 hover:bg-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar cliente
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {adding && (
          <ClientForm
            initial={{ ...EMPTY_FORM, id: `client-${Date.now()}` }}
            isEnv={false}
            onSave={handleSave}
            onCancel={() => setAdding(false)}
          />
        )}

        {displayList.map((client) =>
          editing?.id === client.id ? (
            <ClientForm
              key={client.id}
              initial={editing}
              isEnv={envIds.has(client.id)}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ClientCard
              key={client.id}
              client={client}
              isEnv={envIds.has(client.id)}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ),
        )}

        {displayList.length === 0 && !adding && (
          <p className="text-sm text-zinc-500">Nenhum cliente configurado.</p>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500 space-y-1.5">
        <p className="font-semibold text-zinc-400">Segurança</p>
        <p>As chaves são salvas em <code className="text-zinc-400">localStorage</code> apenas neste navegador, protegidas pela senha do painel CEO.</p>
        <p>Nunca compartilhe a service role key — ela tem acesso total ao banco de dados.</p>
      </div>
    </HashAdminLayout>
  );
}
