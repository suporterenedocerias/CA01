import { useEffect, useMemo, useState } from 'react';
import { HashAdminLayout, ExternalPanelLink } from '@/pages/hashadmin/HashAdminLayout';
import { HashAdminProjectQuickLinks } from '@/components/hashadmin/HashAdminProjectQuickLinks';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, getHashAdminWriteClient, type HashAdminInstance } from '@/lib/hashadmin-config';
import { Loader2, Plus, Pencil, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OfferRow = {
  id: string;
  title: string;
  badge: string;
  price_current: number;
  active: boolean;
  order_index: number;
};

type BlockState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isTableMissing: boolean }
  | { status: 'ok'; offers: OfferRow[]; canWrite: boolean };

type EditDraft = {
  title: string;
  badge: string;
  price_current: string;
  active: boolean;
};

const BLANK_DRAFT: EditDraft = { title: '', badge: '', price_current: '', active: true };

function isTableMissingError(msg: string) {
  return (
    msg.includes('site_offers') ||
    msg.includes('schema cache') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

function OfferBlock({ inst }: { inst: HashAdminInstance }) {
  const [state, setState] = useState<BlockState>({ status: 'loading' });
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const writeClient = useMemo(() => getHashAdminWriteClient(inst), [inst]);

  const reload = async () => {
    setState({ status: 'loading' });
    try {
      const sb = createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey);
      const { data, error } = await sb
        .from('site_offers')
        .select('id,title,badge,price_current,active,order_index')
        .order('order_index');
      if (error) {
        setState({
          status: 'error',
          message: error.message,
          isTableMissing: isTableMissingError(error.message),
        });
        return;
      }
      setState({ status: 'ok', offers: (data as OfferRow[]) ?? [], canWrite: writeClient !== null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro';
      setState({ status: 'error', message: msg, isTableMissing: isTableMissingError(msg) });
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst]);

  const startEdit = (o: OfferRow) => {
    setEditId(o.id);
    setDraft({ title: o.title, badge: o.badge, price_current: String(o.price_current), active: o.active });
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditId(null);
    setDraft(BLANK_DRAFT);
  };

  const cancelEdit = () => {
    setEditId(null);
    setCreating(false);
  };

  const saveEdit = async () => {
    if (!writeClient) return;
    setSaving(true);
    try {
      if (creating) {
        const maxIdx =
          state.status === 'ok' && state.offers.length > 0
            ? Math.max(...state.offers.map((o) => o.order_index)) + 1
            : 0;
        await writeClient.from('site_offers').insert({
          title: draft.title,
          badge: draft.badge,
          price_current: parseFloat(draft.price_current) || 0,
          active: draft.active,
          order_index: maxIdx,
        });
      } else if (editId) {
        await writeClient.from('site_offers').update({
          title: draft.title,
          badge: draft.badge,
          price_current: parseFloat(draft.price_current) || 0,
          active: draft.active,
        }).eq('id', editId);
      }
      setEditId(null);
      setCreating(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (o: OfferRow) => {
    if (!writeClient) return;
    await writeClient.from('site_offers').update({ active: !o.active }).eq('id', o.id);
    await reload();
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{inst.label}</h2>
            <p className="mt-1 text-xs text-zinc-500">{inst.supabaseUrl}</p>
          </div>
          <ExternalPanelLink href={`${inst.siteOrigin}/admin/offers`}>Painel do cliente</ExternalPanelLink>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Acesso rápido</p>
          <HashAdminProjectQuickLinks inst={inst} variant="compact" />
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-4 rounded-lg border border-zinc-700/60 bg-zinc-950/40 p-4 text-sm">
          {state.isTableMissing ? (
            <>
              <p className="font-semibold text-amber-400">Tabela <code>site_offers</code> não encontrada neste projeto.</p>
              <p className="mt-2 text-zinc-400">
                Execute a migration SQL no painel Supabase deste cliente para criar a tabela. Exemplo mínimo:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-300">{`create table public.site_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  badge text default '',
  price_current numeric(10,2) not null default 0,
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz default now()
);
alter table public.site_offers enable row level security;
create policy "anon read active" on public.site_offers
  for select using (active = true);`}</pre>
            </>
          ) : (
            <p className="text-red-400">{state.message}</p>
          )}
        </div>
      )}

      {state.status === 'ok' && (
        <div className="mt-4">
          {state.canWrite && !creating && (
            <div className="mb-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                onClick={startCreate}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Nova oferta
              </Button>
            </div>
          )}

          {creating && (
            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4">
              <p className="mb-3 text-sm font-semibold text-zinc-200">Nova oferta</p>
              <OfferForm draft={draft} setDraft={setDraft} saving={saving} onSave={saveEdit} onCancel={cancelEdit} />
            </div>
          )}

          {!state.canWrite && (
            <p className="mb-3 text-xs text-zinc-500">
              Somente leitura — configure <code className="text-zinc-400">VITE_HASHADMIN_SERVICE_ROLE_KEY</code> para editar.
            </p>
          )}

          {state.offers.length === 0 && !creating ? (
            <p className="text-sm text-zinc-500">Nenhuma oferta encontrada neste projeto.</p>
          ) : state.offers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Título</th>
                    <th className="pb-2 pr-3 font-medium">Badge</th>
                    <th className="pb-2 pr-3 font-medium">Preço</th>
                    <th className="pb-2 pr-3 font-medium">Ativa</th>
                    {state.canWrite && <th className="pb-2 font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {state.offers.map((o) => (
                    <tr key={o.id} className="border-b border-zinc-800/80 text-zinc-300">
                      {editId === o.id ? (
                        <td colSpan={state.canWrite ? 5 : 4} className="py-3">
                          <OfferForm draft={draft} setDraft={setDraft} saving={saving} onSave={saveEdit} onCancel={cancelEdit} />
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-3 text-white">{o.title}</td>
                          <td className="py-2 pr-3 text-xs">{o.badge}</td>
                          <td className="py-2 pr-3">
                            R$ {Number(o.price_current).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-2 pr-3">
                            {state.canWrite ? (
                              <button
                                onClick={() => void toggleActive(o)}
                                className="flex items-center gap-1 text-xs"
                                title="Clique para alternar"
                              >
                                {o.active ? (
                                  <ToggleRight className="h-4 w-4 text-green-400" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-zinc-500" />
                                )}
                                <span className={o.active ? 'text-green-400' : 'text-zinc-500'}>
                                  {o.active ? 'sim' : 'não'}
                                </span>
                              </button>
                            ) : (
                              <span className={o.active ? 'text-green-400' : 'text-zinc-500'}>
                                {o.active ? 'sim' : 'não'}
                              </span>
                            )}
                          </td>
                          {state.canWrite && (
                            <td className="py-2">
                              <button
                                onClick={() => startEdit(o)}
                                className="text-zinc-400 hover:text-zinc-200"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function OfferForm({
  draft,
  setDraft,
  saving,
  onSave,
  onCancel,
}: {
  draft: EditDraft;
  setDraft: (d: EditDraft) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Título"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        className="h-8 w-44 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-600"
      />
      <Input
        placeholder="Badge (ex: Mais popular)"
        value={draft.badge}
        onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
        className="h-8 w-36 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-600"
      />
      <Input
        type="number"
        placeholder="Preço (R$)"
        value={draft.price_current}
        onChange={(e) => setDraft({ ...draft, price_current: e.target.value })}
        className="h-8 w-28 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-600"
      />
      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          className="rounded"
        />
        Ativa
      </label>
      <Button
        size="sm"
        disabled={saving || !draft.title.trim()}
        onClick={onSave}
        className="h-8 bg-green-700 px-3 text-xs hover:bg-green-600"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        <span className="ml-1">Guardar</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-200"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function HashAdminOffers() {
  const { visibleInstances: instances } = useHashAdminClientFilter();

  return (
    <HashAdminLayout>
      <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Ofertas por cliente</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-400">
        Visualize e edite ofertas de cada cliente. Para criar ou editar, é necessária a{' '}
        <strong className="text-zinc-300">service role key</strong> configurada no .env.
      </p>

      <div className="mt-8 space-y-10">
        {instances.length === 0 ? (
          <p className="text-sm text-zinc-500">Configure instâncias no .env.</p>
        ) : (
          instances.map((inst) => <OfferBlock key={inst.id} inst={inst} />)
        )}
      </div>
    </HashAdminLayout>
  );
}
