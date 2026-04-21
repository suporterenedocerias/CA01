import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ExternalLink, Copy, FileText, Pencil, Globe, X } from 'lucide-react';
import { toast } from 'sonner';

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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function PageEditor({
  page,
  onSave,
  onCancel,
  saving,
}: {
  page: CustomPage;
  onSave: (p: CustomPage) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CustomPage>(page);
  const set = (key: keyof CustomPage, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const siteOrigin = window.location.origin;
  const slugPreview = form.slug ? `${siteOrigin}/p/${form.slug}` : '—';
  const checkoutPreview = form.slug ? `${siteOrigin}/p/${form.slug}/checkout` : '—';

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Título principal <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder='Ex.: "Caçamba em São Paulo"'
            value={form.title}
            onChange={(e) => {
              set('title', e.target.value);
              if (!page.slug || page.isNew) set('slug', slugify(e.target.value));
            }}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtítulo</label>
          <Input
            placeholder='Ex.: "Atendemos toda a Grande SP com agilidade"'
            value={form.subtitle ?? ''}
            onChange={(e) => set('subtitle', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Texto da página (corpo)</label>
          <Textarea
            rows={6}
            placeholder="Descreva o serviço, diferenciais, área de atendimento, etc."
            value={form.body ?? ''}
            onChange={(e) => set('body', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Texto do botão</label>
          <Input
            placeholder='Ex.: "Pedir caçamba agora"'
            value={form.cta_label ?? ''}
            onChange={(e) => set('cta_label', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Link do botão</label>
          <Input
            placeholder='/checkout ou https://...'
            value={form.cta_url ?? ''}
            onChange={(e) => set('cta_url', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Slug (URL da página) <span className="text-red-500">*</span>
          </label>
          <Input
            className="font-mono"
            placeholder='ex: cacamba-sao-paulo'
            value={form.slug}
            onChange={(e) => set('slug', slugify(e.target.value))}
          />
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{slugPreview}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Domínio personalizado</label>
          <Input
            className="font-mono"
            placeholder='cacambasp.com.br  (sem https://)'
            value={form.custom_domain ?? ''}
            onChange={(e) =>
              set('custom_domain', e.target.value.replace(/^https?:\/\//, '').replace(/\/$/, '').trim())
            }
          />
          {form.custom_domain ? (
            <p className="mt-1 text-[11px] text-amber-500">
              Aponte o DNS deste domínio para o IP da VPS: <span className="font-mono">187.77.252.82</span>
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">Opcional — deixe vazio para usar só o slug.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">SEO — Título</label>
          <Input
            placeholder='Ex.: "Caçamba em SP | Entulho Hoje"'
            value={form.seo_title ?? ''}
            onChange={(e) => set('seo_title', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">SEO — Descrição</label>
          <Input
            placeholder='Descrição curta para Google (até 160 chars)'
            value={form.seo_description ?? ''}
            maxLength={160}
            onChange={(e) => set('seo_description', e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active-toggle"
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          <label htmlFor="active-toggle" className="text-sm text-foreground">
            Página ativa (visível publicamente)
          </label>
        </div>

        {/* Gateway de pagamento */}
        <div className="sm:col-span-2 rounded-lg border bg-muted/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Gateway de pagamento</p>
          <p className="text-xs text-muted-foreground">
            Checkout desta página: <span className="font-mono text-foreground">{checkoutPreview}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Gateway</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.gateway_type ?? 'fastsoft'}
                onChange={(e) => set('gateway_type', e.target.value)}
              >
                <option value="fastsoft">FastSoft / Fluxxopay</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Chave pública (PK)</label>
              <Input
                className="font-mono text-xs"
                placeholder="pk_..."
                value={form.gateway_pk ?? ''}
                onChange={(e) => set('gateway_pk', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Chave secreta (SK)</label>
              <Input
                className="font-mono text-xs"
                placeholder="sk_... (nunca exposta ao visitante)"
                type="password"
                value={form.gateway_sk ?? ''}
                onChange={(e) => set('gateway_sk', e.target.value)}
              />
            </div>
          </div>
          {!form.gateway_sk && (
            <p className="text-xs text-amber-500">⚠️ Sem SK configurada, o checkout usará a chave global do servidor.</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t pt-4">
        <Button onClick={() => onSave(form)} disabled={saving || !form.title || !form.slug}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'A gravar…' : 'Salvar página'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default function AdminCustomPages() {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CustomPage | null>(null);
  const [creating, setCreating] = useState(false);

  const siteOrigin = window.location.origin;

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_pages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setPages((data as CustomPage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const handleSave = async (page: CustomPage) => {
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
      ? await supabase.from('custom_pages').insert({ ...payload, id: page.id })
      : await supabase.from('custom_pages').update(payload).eq('id', page.id);

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
    if (!confirm('Apagar esta página permanentemente?')) return;
    await supabase.from('custom_pages').delete().eq('id', id);
    toast.success('Página apagada');
    void reload();
  };

  const copyUrl = (page: CustomPage) => {
    const url = page.custom_domain
      ? `https://${page.custom_domain}`
      : `${siteOrigin}/p/${page.slug}`;
    void navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  return (
    <AdminLayout title="Páginas personalizadas">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Páginas personalizadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie landing pages com checkout e gateway de pagamento independentes.
          </p>
        </div>
        {!creating && !editing && (
          <Button
            onClick={() => {
              setCreating(true);
              setEditing({ ...EMPTY_PAGE, id: crypto.randomUUID(), isNew: true });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova página
          </Button>
        )}
      </div>

      {creating && editing && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-foreground">Nova página</p>
          <PageEditor
            page={editing}
            onSave={handleSave}
            onCancel={() => { setCreating(false); setEditing(null); }}
            saving={saving}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : pages.length === 0 && !creating ? (
        <p className="text-sm text-muted-foreground">Nenhuma página criada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.id} className="rounded-lg border bg-card">
              {editing?.id === page.id && !creating ? (
                <div className="p-4">
                  <p className="mb-3 text-sm font-semibold text-foreground">Editar página</p>
                  <PageEditor
                    page={editing}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{page.title}</p>
                      {!page.active && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          inativa
                        </span>
                      )}
                      {page.gateway_sk && (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700 dark:bg-green-950 dark:text-green-400">
                          gateway próprio
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                      {page.custom_domain
                        ? `https://${page.custom_domain}`
                        : `${siteOrigin}/p/${page.slug}`}
                    </p>
                    {page.custom_domain && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-500 mt-0.5">
                        <Globe className="h-3 w-3" />
                        Domínio próprio — aponte DNS para 187.77.252.82
                      </p>
                    )}
                    {page.subtitle && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{page.subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing({ ...page })}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={page.custom_domain ? `https://${page.custom_domain}` : `${siteOrigin}/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Abrir
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyUrl(page)}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copiar URL
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      onClick={() => handleDelete(page.id)}
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
    </AdminLayout>
  );
}
