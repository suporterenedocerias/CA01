import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { aggregateEmployeeStats } from '@/lib/whatsapp-employee-stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, MousePointerClick, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WhatsAppNumber {
  id: string;
  number: string;
  label: string;
  active: boolean;
  click_count: number;
  order_index: number;
  isNew?: boolean;
}

interface ClickStats {
  number_id: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

export default function AdminFuncionarios() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clickStats, setClickStats] = useState<Record<string, ClickStats>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [rotateEvery, setRotateEvery] = useState(5);
  const [leadsRows, setLeadsRows] = useState<{ numero_atribuido: string | null }[]>([]);
  const [ordersRows, setOrdersRows] = useState<
    { whatsapp_number_id: string | null; payment_status: string; status: string; valor_total: number }[]
  >([]);

  const load = useCallback(async () => {
    const [
      numbersRes,
      clicksRes,
      statsRes,
      settingsRes,
      leadsRes,
      ordersRes,
    ] = await Promise.all([
      supabase.from('whatsapp_numbers').select('*').order('order_index'),
      supabase.from('whatsapp_clicks').select('id', { count: 'exact', head: true }),
      supabase.rpc('get_click_stats'),
      supabase.from('site_settings').select('id, whatsapp_rotate_every').limit(1).maybeSingle(),
      supabase.from('leads').select('numero_atribuido').limit(5000),
      supabase
        .from('orders')
        .select('whatsapp_number_id, payment_status, status, valor_total')
        .order('created_at', { ascending: false })
        .limit(5000),
    ]);

    if (numbersRes.data) {
      setNumbers(
        numbersRes.data.map((n) => ({
          id: n.id,
          number: n.number,
          label: n.label,
          active: n.active,
          click_count: n.click_count,
          order_index: n.order_index,
        })),
      );
    }
    setTotalClicks(clicksRes.count || 0);

    if (statsRes.data) {
      const map: Record<string, ClickStats> = {};
      for (const s of statsRes.data) {
        map[s.number_id] = s as ClickStats;
      }
      setClickStats(map);
    }

    if (settingsRes.data) {
      setSettingsId(settingsRes.data.id);
      const r = settingsRes.data.whatsapp_rotate_every;
      setRotateEvery(typeof r === 'number' && r >= 1 ? r : 5);
    }

    setLeadsRows(leadsRes.error ? [] : (leadsRes.data as typeof leadsRows) ?? []);
    setOrdersRows(ordersRes.error ? [] : (ordersRes.data as typeof ordersRows) ?? []);

    if (leadsRes.error) console.warn('[admin] leads por funcionário:', leadsRes.error.message);
    if (ordersRes.error) console.warn('[admin] pedidos por funcionário:', ordersRes.error.message);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();

    // actualiza stats em tempo real quando um pedido muda de estado
    const channel = supabase
      .channel('funcionarios-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const statsByEmployee = useMemo(() => {
    const nums = numbers.map((n) => ({ id: n.id, number: n.number }));
    return aggregateEmployeeStats(nums, leadsRows, ordersRows);
  }, [numbers, leadsRows, ordersRows]);

  const toggleActive = (id: string) => {
    setNumbers(numbers.map((n) => (n.id === id ? { ...n, active: !n.active } : n)));
  };

  const removeNumber = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('whatsapp_numbers').delete().eq('id', id);
    }
    setNumbers(numbers.filter((n) => n.id !== id));
    toast.success('Removido');
  };

  const addNumber = () => {
    setNumbers([
      ...numbers,
      {
        id: crypto.randomUUID(),
        number: '',
        label: '',
        active: true,
        click_count: 0,
        order_index: numbers.length + 1,
        isNew: true,
      },
    ]);
  };

  const updateField = (id: string, field: keyof WhatsAppNumber, value: string | boolean) => {
    setNumbers(numbers.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const handleSave = async () => {
    const nVal = Math.max(1, Math.floor(Number(rotateEvery)) || 5);
    setRotateEvery(nVal);

    setSaving(true);
    try {
      if (settingsId) {
        const { error: se } = await supabase
          .from('site_settings')
          .update({ whatsapp_rotate_every: nVal })
          .eq('id', settingsId);
        if (se) throw se;
      }

      for (let i = 0; i < numbers.length; i++) {
        const n = numbers[i];
        const data = {
          number: n.number,
          label: n.label,
          active: n.active,
          peso_distribuicao: 1,
          order_index: i + 1,
        };

        if (n.isNew) {
          await supabase.from('whatsapp_numbers').insert({ ...data, id: n.id });
        } else {
          await supabase.from('whatsapp_numbers').update(data).eq('id', n.id);
        }
      }
      setNumbers(numbers.map((n) => ({ ...n, isNew: false })));
      toast.success('Salvo com sucesso!');
      await load();
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Funcionários (WhatsApp)">
        <p>Carregando...</p>
      </AdminLayout>
    );
  }

  const activeCount = numbers.filter((n) => n.active).length;

  return (
    <AdminLayout title="Funcionários (WhatsApp)">
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Rotação no site</AlertTitle>
        <AlertDescription>
          Cada <strong>novo visitante</strong> que clica no WhatsApp conta uma atribuição. A cada{' '}
          {Math.max(1, Math.floor(Number(rotateEvery)) || 5)} atribuição(ões), o site passa ao{' '}
          <strong>próximo número ativo</strong> na ordem da lista abaixo (e volta ao primeiro em
          ciclo). Visitantes que já clicaram antes continuam com o mesmo número.
        </AlertDescription>
      </Alert>

      <div className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
        <label htmlFor="rotate-every" className="text-sm font-medium text-foreground">
          Trocar de número a cada quantos novos visitantes?
        </label>
        <Input
          id="rotate-every"
          type="number"
          min={1}
          className="mt-2 max-w-[12rem]"
          value={rotateEvery}
          onChange={(e) => setRotateEvery(Number(e.target.value))}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Ex.: com 3 e 5 aqui, os primeiros 5 novos visitantes usam o 1.º número da lista, os
          próximos 5 o 2.º, e assim por diante.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <span className="text-sm text-muted-foreground">Total de cliques (histórico)</span>
          <div className="mt-1 font-display text-3xl font-bold text-foreground">{totalClicks}</div>
          <Link to="/admin/whatsapp" className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
            Ver detalhes em WhatsApp
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <span className="text-sm text-muted-foreground">Números ativos na rotação</span>
          <div className="mt-1 font-display text-3xl font-bold text-foreground">{activeCount}</div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Resumo por funcionário</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Leads: número atribuído ao formulário (<code className="rounded bg-muted px-1 text-xs">numero_atribuido</code>
          ). Pedidos PIX: número gravado no pedido no checkout.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-3 font-semibold">Funcionário</th>
                <th className="p-3 font-semibold text-right">Cliques</th>
                <th className="p-3 font-semibold text-right">Leads</th>
                <th className="p-3 font-semibold text-right">PIX pagos</th>
                <th className="p-3 font-semibold text-right">Receita PIX</th>
                <th className="p-3 font-semibold text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((n) => {
                const s = statsByEmployee[n.id] ?? { leads: 0, pixPagos: 0, receita: 0 };
                const cs = clickStats[n.id];
                const clicks = cs?.total_clicks ?? n.click_count;
                const conv = s.leads > 0 ? ((s.pixPagos / s.leads) * 100).toFixed(1) : '—';
                return (
                  <tr key={n.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{n.label || '—'}</td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">{clicks}</td>
                    <td className="p-3 text-right tabular-nums">{s.leads}</td>
                    <td className="p-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                      {s.pixPagos}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      R$ {s.receita.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {conv}
                      {conv !== '—' ? '%' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        {numbers.map((num) => {
          const stats = clickStats[num.id];
          const agg = statsByEmployee[num.id] ?? { leads: 0, pixPagos: 0, receita: 0 };
          return (
            <div key={num.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  placeholder="Nome (ex: João)"
                  value={num.label}
                  onChange={(e) => updateField(num.id, 'label', e.target.value)}
                />
                <Input
                  placeholder="WhatsApp (ex: 5511999999901)"
                  value={num.number}
                  onChange={(e) => updateField(num.id, 'number', e.target.value)}
                />
                <div className="flex items-center gap-3 text-sm">
                  <MousePointerClick size={14} className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {stats?.total_clicks ?? num.click_count} cliques total
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats?.clicks_today ?? 0} hoje · {stats?.clicks_week ?? 0} semana
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Leads {agg.leads} · PIX {agg.pixPagos} · R$ {agg.receita.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={num.active} onCheckedChange={() => toggleActive(num.id)} />
                  <span className="text-sm text-muted-foreground">{num.active ? 'Ativo' : 'Inativo'}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNumber(num.id, num.isNew)}
                    className="ml-auto text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        <Button variant="outline" onClick={addNumber} className="w-full">
          <Plus size={18} className="mr-2" /> Adicionar funcionário / número
        </Button>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </AdminLayout>
  );
}
