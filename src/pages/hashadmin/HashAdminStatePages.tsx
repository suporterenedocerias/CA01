import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ExternalLink, Copy, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { slugifyStateName } from '@/lib/slugify-state';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, getHashAdminWriteClient, type HashAdminInstance } from '@/lib/hashadmin-config';
import { HashAdminProjectQuickLinks } from '@/components/hashadmin/HashAdminProjectQuickLinks';

type StatePageRow = {
  id: string;
  slug: string;
  name: string;
  uf: string | null;
  notes: string | null;
  active: boolean;
  isNew?: boolean;
};

function StatePagesBlock({ inst }: { inst: HashAdminInstance }) {
  const readClient = useMemo(
    () => createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey),
    [inst.supabaseAnonKey, inst.supabaseUrl],
  );
  const writeClient = useMemo(() => getHashAdminWriteClient(inst), [inst]);

  const [rows, setRows] = useState<StatePageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [ufInput, setUfInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await readClient.from('state_pages').select('*').order('name');
    if (error) {
      console.error(error);
      toast.error(`${inst.label}: erro ao carregar state_pages (rode a migration no Supabase?).`);
      setRows([]);
    } else if (data) {
      setRows(data as StatePageRow[]);
    }
    setLoading(false);
  }, [readClient, inst.label]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addRow = () => {
    if (!writeClient) {
      toast.error('Configure a service role para criar subpáginas (ver .env.example).');
      return;
    }
    const name = nameInput.trim();
    if (!name) {
      toast.error('Digite o nome do estado ou região.');
      return;
    }
    const slug = slugifyStateName(name);
    if (!slug) {
      toast.error('Não foi possível gerar o slug.');
      return;
    }
    if (rows.some((r) => r.slug === slug && !r.isNew)) {
      toast.error('Já existe uma página com esse slug.');
      return;
    }
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        slug,
        name,
        uf: ufInput.trim().toUpperCase().slice(0, 2) || null,
        notes: notesInput.trim() || null,
        active: true,
        isNew: true,
      },
    ]);
    setNameInput('');
    setUfInput('');
    setNotesInput('');
    toast.success('Adicionado à lista — clique em Salvar.');
  };

  const removeRow = async (id: string, isNew?: boolean) => {
    if (!writeClient) {
      toast.error('Service role necessária para remover.');
      return;
    }
    if (!isNew) {
      await writeClient.from('state_pages').delete().eq('id', id);
    }
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success('Removido');
  };

  const handleSave = async () => {
    if (!writeClient) {
      toast.error('Defina VITE_HASHADMIN_SERVICE_ROLE_KEY (instalação local) ou supabaseServiceRoleKey no JSON de clientes.');
      return;
    }
    setSaving(true);
    try {
      for (const r of rows) {
        const payload = {
          name: r.name,
          slug: r.slug,
          uf: r.uf,
          notes: r.notes,
          active: r.active,
        };
        if (r.isNew) {
          await writeClient.from('state_pages').insert({ ...payload, id: r.id });
        } else {
          await writeClient.from('state_pages').update(payload).eq('id', r.id);
        }
      }
      setRows(rows.map((r) => ({ ...r, isNew: false })));
      toast.success(`${inst.label}: subpáginas salvas.`);
      void reload();
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  const copyUrl = (slug: string) => {
    const url = `${inst.siteOrigin}/e/${slug}`;
    void navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{inst.label}</h2>
            <p className="text-xs text-zinc-500">{inst.supabaseUrl}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Resolver neste projeto — abrir noutro separador
          </p>
          <HashAdminProjectQuickLinks inst={inst} variant="compact" />
        </div>
        {!writeClient ? (
          <p className="max-w-md rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100/90">
            Só leitura nas subpáginas: defina <code className="font-mono text-amber-50">VITE_HASHADMIN_SERVICE_ROLE_KEY</code>{' '}
            (projeto local) ou <code className="font-mono text-amber-50">supabaseServiceRoleKey</code> neste cliente no
            JSON para poder gravar aqui.
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">A carregar…</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-200">Nova subpágina</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-500">Nome do estado / região</label>
                <Input
                  className="border-zinc-700 bg-zinc-900 text-zinc-100"
                  placeholder='Ex.: "São Paulo", "Grande ABC"'
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRow()}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">UF (opcional)</label>
                <Input
                  className="border-zinc-700 bg-zinc-900 text-zinc-100"
                  placeholder="SP"
                  maxLength={2}
                  value={ufInput}
                  onChange={(e) => setUfInput(e.target.value.toUpperCase())}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-500">Notas internas</label>
                <Textarea
                  className="border-zinc-700 bg-zinc-900 text-zinc-100"
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                />
              </div>
            </div>
            <Button type="button" variant="secondary" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar à lista
            </Button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-200">Páginas</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma subpágina.</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-zinc-100">{r.name}</p>
                      <p className="font-mono text-xs text-zinc-500">
                        /e/{r.slug}
                        {r.uf ? ` · ${r.uf}` : ''}
                        {!r.active ? ' · inativa' : ''}
                      </p>
                      {r.notes ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{r.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="border-zinc-600 bg-transparent" asChild>
                        <a href={`${inst.siteOrigin}/e/${r.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-zinc-600 bg-transparent"
                        onClick={() => copyUrl(r.slug)}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Copiar URL
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                        onClick={() => removeRow(r.id, r.isNew)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white"
            size="lg"
            onClick={() => void handleSave()}
            disabled={saving || !writeClient}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'A gravar…' : 'Salvar no Supabase'}
          </Button>
        </div>
      )}
    </section>
  );
}

export default function HashAdminStatePages() {
  const { visibleInstances: instances } = useHashAdminClientFilter();

  return (
    <HashAdminLayout>
      <div className="mb-8 flex items-start gap-2">
        <Layers className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Subpáginas por projeto</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Os <strong className="text-zinc-200">projetos que gere</strong> vêm do{' '}
            <code className="rounded bg-zinc-800 px-1 font-mono text-xs text-zinc-300">.env</code> (instalação atual ou{' '}
            <code className="rounded bg-zinc-800 px-1 font-mono text-xs text-zinc-300">VITE_HASHADMIN_INSTANCES</code>).
            Abaixo, cada bloco é um projeto: use os atalhos para entrar no painel dele e, na mesma secção, gere as landings{' '}
            <span className="font-mono text-zinc-300">/e/:slug</span> (pedidos ficam com{' '}
            <span className="font-mono text-zinc-300">page_slug</span>).
          </p>
        </div>
      </div>

      {instances.length === 0 ? (
        <p className="text-sm text-zinc-500">Configure instâncias no .env.</p>
      ) : (
        <div className="space-y-10">
          {instances.map((inst) => (
            <StatePagesBlock key={inst.id} inst={inst} />
          ))}
        </div>
      )}
    </HashAdminLayout>
  );
}
