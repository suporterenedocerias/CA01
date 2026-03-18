import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface SiteOffer {
  id: string;
  title: string;
  description: string;
  badge: string;
  price_current: number;
  price_original: number | null;
  active: boolean;
  order_index: number;
  isNew?: boolean;
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<SiteOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase.from('site_offers').select('*').order('order_index');
      if (error) {
        console.error(error);
        toast.error(
          'Não foi possível carregar ofertas. Rode a migration no Supabase (site_offers) se ainda não existir a tabela.',
        );
        setOffers([]);
      } else if (data) {
        setOffers(
          (data as SiteOffer[]).map((o) => ({
            ...o,
            price_original: o.price_original != null ? Number(o.price_original) : null,
            price_current: Number(o.price_current),
          })),
        );
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const toggleActive = (id: string) => {
    setOffers(offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));
  };

  const removeOffer = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('site_offers').delete().eq('id', id);
    }
    setOffers(offers.filter((o) => o.id !== id));
    toast.success('Removido');
  };

  const addOffer = () => {
    setOffers([
      ...offers,
      {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        badge: 'Oferta',
        price_current: 0,
        price_original: null,
        active: true,
        order_index: offers.length + 1,
        isNew: true,
      },
    ]);
  };

  const updateField = (id: string, field: keyof SiteOffer, value: unknown) => {
    setOffers(offers.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < offers.length; i++) {
        const o = offers[i];
        const orig =
          o.price_original != null && !Number.isNaN(Number(o.price_original)) && Number(o.price_original) > 0
            ? Number(o.price_original)
            : null;
        const data = {
          title: o.title,
          description: o.description || '',
          badge: o.badge || 'Oferta',
          price_current: Number(o.price_current) || 0,
          price_original: orig,
          active: o.active,
          order_index: i + 1,
        };

        if (o.isNew) {
          await supabase.from('site_offers').insert({ ...data, id: o.id });
        } else {
          await supabase.from('site_offers').update(data).eq('id', o.id);
        }
      }
      setOffers(offers.map((o) => ({ ...o, isNew: false })));
      toast.success('Ofertas salvas!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Ofertas"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Ofertas do site">
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        As ofertas ativas aparecem na página inicial, antes da seção de tamanhos. Clientes podem solicitar pelo
        WhatsApp com a mensagem da oferta.
      </p>
      <div className="space-y-4">
        {offers.map((offer) => (
          <div key={offer.id} className="p-4 rounded-xl bg-card border shadow-sm">
            <div className="flex items-start gap-4">
              <GripVertical className="text-muted-foreground mt-3 cursor-grab shrink-0" size={20} />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <Input
                  placeholder="Título (ex: Caçamba 5m³)"
                  value={offer.title}
                  onChange={(e) => updateField(offer.id, 'title', e.target.value)}
                />
                <Input
                  placeholder="Selo (ex: OFERTA, DESTAQUE)"
                  value={offer.badge}
                  onChange={(e) => updateField(offer.id, 'badge', e.target.value)}
                />
                <Input
                  placeholder="Preço promocional (R$)"
                  type="number"
                  step="0.01"
                  value={offer.price_current || ''}
                  onChange={(e) => updateField(offer.id, 'price_current', parseFloat(e.target.value) || 0)}
                />
                <Input
                  placeholder="Preço de (riscado, opcional)"
                  type="number"
                  step="0.01"
                  value={offer.price_original ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateField(offer.id, 'price_original', v === '' ? null : parseFloat(v));
                  }}
                />
                <div className="flex items-center gap-3 lg:col-span-1">
                  <Switch checked={offer.active} onCheckedChange={() => toggleActive(offer.id)} />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {offer.active ? 'Ativa' : 'Inativa'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOffer(offer.id, offer.isNew)}
                    className="text-destructive ml-auto"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <Textarea
                  className="sm:col-span-2 lg:col-span-6 min-h-[72px]"
                  placeholder="Descrição curta da oferta"
                  value={offer.description}
                  onChange={(e) => updateField(offer.id, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addOffer} className="w-full">
          <Plus size={18} className="mr-2" /> Adicionar oferta
        </Button>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar ofertas'}
        </Button>
      </div>
    </AdminLayout>
  );
}
