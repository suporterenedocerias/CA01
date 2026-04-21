import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashAdminLayout } from '@/pages/hashadmin/HashAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ExternalLink, Copy, FileText, Pencil, Globe, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, getHashAdminWriteClient, type HashAdminInstance } from '@/lib/hashadmin-config';

type CustomPage = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  custom_domain: string | null;
  active: boolean;
  gateway_type: string | null;
  gateway_pk: string | null;
  gateway_sk: string | null;
  isNew?: boolean;
};

const EMPTY_PAGE: Omit<CustomPage, 'id'> = {
  slug: '',
  title: '',
  subtitle: '',
  body: '',
  cta_label: 'Pedir caçamba agora',
  cta_url: '',
  seo_title: '',
  seo_description: '',
  custom_domain: '',
  active: true,
  gateway_type: 'fastsoft',
  gateway_pk: '',
  gateway_sk: '',
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ---------- Editor de uma página ---------- */
function PageEditor({
  page,
  onSave,
  onCancel,
  saving,
  siteOrigin,
}: {
  page: CustomPage;
  onSave: (p: CustomPage) => void;
  onCancel: () => void;
  saving: boolean;
  siteOrigin: string;
}) {
  const [form, setForm] = useState<CustomPage>(page);
  const set = (key: keyof CustomPage, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const slugPreview = form.slug
    ? `${siteOrigin || window.location.origin}/p/${form.slug}`
    : '—';
  const domainPreview = form.custom_domain
    ? `https://${form.custom_domain.replace(/^https?:\/\//, '')}`
    : null;

  return (
    <div className="space-y-5 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Título */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Título principal <span className="text-red-400">*</span>
          </label>
          <Input
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder='Ex.: "Caçamba em São Paulo"'
            value={form.title}
            onChange={(e) => {
              set('title', e.target.value);
              if (!page.slug || page.isNew) {
                set('slug', slugify(e.target.value));
              }
            }}
          />
        </div>

        {/* Subtítulo */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-400">Subtítulo</label>
          <Input
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder='Ex.: "Atendemos toda a Grande SP com agilidade"'
            value={form.subtitle ?? ''}
            onChange={(e) => set('subtitle', e.target.value)}
          />
        </div>

        {/* Corpo */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Texto da página (corpo)
          </label>
          <Textarea
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            rows={6}
            placeholder="Descreva o serviço, diferenciais, área de atendimento, etc."
            value={form.body ?? ''}
            onChange={(e) => set('body', e.target.value)}
          />
        </div>

        {/* CTA */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Texto do botão</label>
          <Input
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder='Ex.: "Pedir caçamba agora"'
            value={form.cta_label ?? ''}
            onChange={(e) => set('cta_label', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Link do botão</label>
          <Input
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder='/checkout ou https://...'
            value={form.cta_url ?? ''}
            onChange={(e) => set('cta_url', e.target.value)}
          />
        </div>

        {/* Slug / URL */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Slug (URL da página)
          </label>
          <Input
            className="border-zinc-700 bg-zinc-950 font-mono text-zinc-100"
            placeholder='ex: cacamba-sao-paulo'
            value={form.slug}
            onChange={(e) => set('slug', slugify(e.target.value))}
          />
          <p className="mt-1 truncate text-[11px] text-zinc-500">{slugPreview}</p>
        </div>

        {/* Domínio personalizado */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Domínio personalizado
          </label>
          <Input
            className="border-zinc-700 bg-zinc-950 font-mono text-zinc-100"
            placeholder='cacambasp.com.br  (sem https://)'
            value={form.custom_domain ?? ''}
            onChange={(e) =>
              set('custom_domain', e.target.value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim())
            }
          />
          {domainPreview ? (
            <p className="mt-1 text-[11px] text-amber-400">
              Aponte o DNS deste domínio para o IP da VPS: <span className="font-mono">187.77.252.82</span>
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-600">Opcional — deixe vazio para usar só o slug.</p>
          )}
        </div>

        {/* SEO */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">SEO — Título</label>
          <Input
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder='Ex.: "Caçamba em SP | Entulho Hoje"'
            value={form.seo_title ?? ''}
            onChange={(e) => set('seo_title', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">SEO — Descrição</label>
          <Input
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            placeholder='Descrição curta para Google (até 160 chars)'
            value={form.seo_description ?? ''}
            maxLength={160}
            onChange={(e) => set('seo_description', e.target.value)}
          />
        </div>

        {/* Ativa */}
        <div className="flex items-center gap-2">
          <input
            id="active-toggle"
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-600"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <label htmlFor="active-toggle" className="text-sm text-zinc-300">
            Página ativa (visível publicamente)
          </label>
        </div>

        {/* Gateway de pagamento */}
        <div className="sm:col-span-2 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Gateway de pagamento</p>
          <p className="text-xs text-zinc-500">
            Checkout desta página: <span className="font-mono text-zinc-400">{siteOrigin}/p/{form.slug || '[slug]'}/checkout</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Gateway</label>
              <select
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={form.gateway_type ?? 'fastsoft'}
                onChange={(e) => set('gateway_type', e.target.value)}
              >
                <option value="fastsoft">FastSoft / Fluxxopay</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Chave pública (PK)</label>
              <Input
                className="border-zinc-700 bg-zinc-950 font-mono text-zinc-100 text-xs"
                placeholder="pk_..."
                value={form.gateway_pk ?? ''}
                onChange={(e) => set('gateway_pk', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Chave secreta (SK) ⚠️</label>
              <Input
                className="border-zinc-700 bg-zinc-950 font-mono text-zinc-100 text-xs"
                placeholder="sk_... (nunca exposta ao visitante)"
                type="password"
                value={form.gateway_sk ?? ''}
                onChange={(e) => set('gateway_sk', e.target.value)}
              />
            </div>
          </div>
          {!form.gateway_sk && (
            <p className="text-xs text-amber-400">⚠️ Sem SK configurada, o checkout usará a chave global do servidor.</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-zinc-800 pt-4">
        <Button
          className="bg-zinc-100 text-zinc-900 hover:bg-white"
          onClick={() => onSave(form)}
          disabled={saving || !form.title || !form.slug}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'A gravar…' : 'Salvar página'}
        </Button>
        <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/* ---------- Bloco por instância ---------- */
function CustomPagesBlock({ inst }: { inst: HashAdminInstance }) {
  const readClient = useMemo(
    () => createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey),
    [inst.supabaseUrl, inst.supabaseAnonKey],
  );
  const writeClient = useMemo(() => getHashAdminWriteClient(inst), [inst]);

  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CustomPage | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await readClient
      .from('custom_pages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(`${inst.label}: ${error.message}`);
      setPages([]);
    } else {
      setPages((data as CustomPage[]) ?? []);
    }
    setLoading(false);
  }, [readClient, inst.label]);

  useEffect(() => { void reload(); }, [reload]);

  const handleSave = async (page: CustomPage) => {
    if (!writeClient) {
      toast.error('Service role necessária para gravar. Configure no cliente.');
      return;
    }
    setSaving(true);
    const payload = {
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle || null,
      body: page.body || null,
      cta_label: page.cta_label || null,
      cta_url: page.cta_url || null,
      seo_title: page.seo_title || null,
      seo_description: page.seo_description || null,
      custom_domain: page.custom_domain || null,
      active: page.active,
      gateway_type: page.gateway_type || 'fastsoft',
      gateway_pk: page.gateway_pk || null,
      gateway_sk: page.gateway_sk || null,
    };
    const { error } = page.isNew
      ? await writeClient.from('custom_pages').insert({ ...payload, id: page.id })
      : await writeClient.from('custom_pages').update(payload).eq('id', page.id);
    if (error) {
      if (error.code === '23505' || (error as any).status === 409) {
        toast.error(`Já existe uma página com o slug "${payload.slug}". Escolha outro slug.`);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Página salva!');
      setEditing(null);
      setCreating(false);
      void reload();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!writeClient) return;
    if (!confirm('Apagar esta página permanentemente?')) return;
    await writeClient.from('custom_pages').delete().eq('id', id);
    toast.success('Página apagada');
    void reload();
  };

  const copyUrl = (page: CustomPage) => {
    const url = page.custom_domain
      ? `https://${page.custom_domain}`
      : `${inst.siteOrigin}/p/${page.slug}`;
    void navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{inst.label}</h2>
          <p className="text-xs text-zinc-500">{inst.supabaseUrl}</p>
        </div>
        {!creating && !editing && (
          <Button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing({ ...EMPTY_PAGE, id: crypto.randomUUID(), isNew: true });
            }}
            disabled={!writeClient}
            className="bg-zinc-100 text-zinc-900 hover:bg-white"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova página
          </Button>
        )}
      </div>

      {!writeClient && (
        <p className="mb-4 max-w-md rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100/90">
          Modo leitura: configure <code className="font-mono text-amber-50">supabaseServiceRoleKey</code> neste cliente para criar/editar páginas.
        </p>
      )}

      {/* Formulário de criação */}
      {creating && editing && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-zinc-300">Nova página</p>
          <PageEditor
            page={editing}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setEditing(null); }}
            saving={saving}
            siteOrigin={inst.siteOrigin}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">A carregar…</p>
      ) : pages.length === 0 && !creating ? (
        <p className="text-sm text-zinc-500">Nenhuma página criada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50">
              {/* Modo edição */}
              {editing?.id === page.id && !creating ? (
                <div className="p-4">
                  <p className="mb-3 text-sm font-semibold text-zinc-300">Editar página</p>
                  <PageEditor
                    page={editing}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                    saving={saving}
                    siteOrigin={inst.siteOrigin}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-100 truncate">{page.title}</p>
                      {!page.active && (
                        <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                          inativa
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-zinc-500 mt-0.5 truncate">
                      {page.custom_domain
                        ? `https://${page.custom_domain}`
                        : `${inst.siteOrigin}/p/${page.slug}`}
                    </p>
                    {page.custom_domain && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-400 mt-0.5">
                        <Globe className="h-3 w-3" />
                        Domínio próprio — aponte DNS para 187.77.252.82
                      </p>
                    )}
                    {page.subtitle && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{page.subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-zinc-600 bg-transparent"
                      onClick={() => setEditing({ ...page })}
                      disabled={!writeClient}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-zinc-600 bg-transparent"
                      asChild
                    >
                      <a
                        href={
                          page.custom_domain
                            ? `https://${page.custom_domain}`
                            : `${inst.siteOrigin}/p/${page.slug}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Abrir
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-zinc-600 bg-transparent"
                      onClick={() => copyUrl(page)}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copiar URL
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                      onClick={() => handleDelete(page.id)}
                      disabled={!writeClient}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Página principal ---------- */
export default function HashAdminCustomPages() {
  const { visibleInstances: instances } = useHashAdminClientFilter();

  return (
    <HashAdminLayout>
      <div className="mb-8 flex items-start gap-3">
        <FileText className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
            Páginas personalizadas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Crie landing pages com conteúdo livre e, opcionalmente, associe um{' '}
            <strong className="text-zinc-200">domínio próprio</strong> a cada uma. O visitante
            acessa o domínio e vê a página — sem precisar saber da URL do projeto principal.
          </p>
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-300">Como funciona o domínio personalizado:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Crie a página aqui e coloque o domínio no campo "Domínio personalizado".</li>
              <li>
                No painel DNS do domínio (ex: Registro.br, Cloudflare), crie um{' '}
                <span className="font-mono text-zinc-300">Registro A</span> apontando para{' '}
                <span className="font-mono text-amber-400">187.77.252.82</span>.
              </li>
              <li>Pronto — em alguns minutos o domínio estará ativo.</li>
            </ol>
          </div>
        </div>
      </div>

      {instances.length === 0 ? (
        <p className="text-sm text-zinc-500">Configure instâncias no .env.</p>
      ) : (
        <div className="space-y-10">
          {instances.map((inst) => (
            <CustomPagesBlock key={inst.id} inst={inst} />
          ))}
        </div>
      )}
    </HashAdminLayout>
  );
}
