import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashAdminLayout, ExternalPanelLink } from '@/pages/hashadmin/HashAdminLayout';
import { HashAdminProjectQuickLinks } from '@/components/hashadmin/HashAdminProjectQuickLinks';
import { useHashAdminClientFilter } from '@/contexts/HashAdminClientContext';
import { createHashAdminSupabase, getHashAdminWriteClient, type HashAdminInstance } from '@/lib/hashadmin-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Save, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateEmployeeStats,
  employeeIdForLead,
} from '@/lib/whatsapp-employee-stats';

type WNum = {
  id: string;
  number: string;
  label: string;
  active: boolean;
  click_count: number;
  peso_distribuicao: number;
  order_index: number;
  isNew?: boolean;
};

function EquipaBlock({ inst }: { inst: HashAdminInstance }) {
  const readClient = useMemo(
    () => createHashAdminSupabase(inst.supabaseUrl, inst.supabaseAnonKey),
    [inst.supabaseAnonKey, inst.supabaseUrl],
  );
  const writeClient = useMemo(() => getHashAdminWriteClient(inst), [inst]);

  const [numbers, setNumbers] = useState<WNum[]>([]);
  const [leadsRows, setLeadsRows] = useState<{ numero_atribuido: string | null }[]>([]);
  const [ordersRows, setOrdersRows] = useState<
    { whatsapp_number_id: string | null; payment_status: string; status: string; valor_total: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadsNote, setLeadsNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLeadsNote(null);
    const numClient = writeClient ?? readClient;

    const [nRes, oRes] = await Promise.all([
      numClient.from('whatsapp_numbers').select('*').order('order_index'),
      readClient
        .from('orders')
        .select('whatsapp_number_id, payment_status, status, valor_total')
        .order('created_at', { ascending: false })
        .limit(2500),
    ]);

    if (nRes.error) {
      toast.error(`${inst.label}: ${nRes.error.message}`);
      setNumbers([]);
    } else {
      setNumbers((nRes.data as WNum[]) ?? []);
    }

    if (oRes.error) {
      setOrdersRows([]);
    } else {
      setOrdersRows((oRes.data as typeof ordersRows) ?? []);
    }

    if (writeClient) {
      const lRes = await writeClient.from('leads').select('numero_atribuido').limit(2500);
      if (lRes.error) {
        setLeadsRows([]);
        setLeadsNote('Não foi possível ler leads.');
      } else {
        setLeadsRows((lRes.data as typeof leadsRows) ?? []);
      }
    } else {
      setLeadsRows([]);
      setLeadsNote(
        'Defina VITE_HASHADMIN_SERVICE_ROLE_KEY ou supabaseServiceRoleKey no cliente para ver leads por funcionário.',
      );
    }

    setLoading(false);
  }, [inst.label, readClient, writeClient]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const statsById = useMemo(
    () => aggregateEmployeeStats(numbers, leadsRows, ordersRows),
    [numbers, leadsRows, ordersRows],
  );

  const addRow = () => {
    if (!writeClient) {
      toast.error('Service role necessária para adicionar funcionários.');
      return;
    }
    setNumbers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        number: '',
        label: '',
        active: true,
        click_count: 0,
        peso_distribuicao: 1,
        order_index: prev.length + 1,
        isNew: true,
      },
    ]);
  };

  const removeRow = async (id: string, isNew?: boolean) => {
    if (!writeClient) return;
    if (!isNew) {
      const { error } = await writeClient.from('whatsapp_numbers').delete().eq('id', id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setNumbers((prev) => prev.filter((n) => n.id !== id));
    toast.success('Removido');
  };

  const updateField = (id: string, field: keyof WNum, value: string | number | boolean) => {
    setNumbers((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const save = async () => {
    if (!writeClient) {
      toast.error('Sem permissão de escrita (service role).');
      return;
    }
    setSaving(true);
    try {
      for (let i = 0; i < numbers.length; i++) {
        const n = numbers[i];
        const row = {
          number: n.number.trim(),
          label: n.label.trim() || `Funcionário ${i + 1}`,
          active: n.active,
          peso_distribuicao: Number(n.peso_distribuicao) || 1,
          order_index: i + 1,
        };
        if (!row.number) {
          toast.error('Cada funcionário precisa de um número WhatsApp.');
          setSaving(false);
          return;
        }
        if (n.isNew) {
          const { error } = await writeClient.from('whatsapp_numbers').insert({ ...row, id: n.id });
          if (error) throw error;
        } else {
          const { error } = await writeClient.from('whatsapp_numbers').update(row).eq('id', n.id);
          if (error) throw error;
        }
      }
      setNumbers((prev) => prev.map((n) => ({ ...n, isNew: false })));
      toast.success('Equipa guardada.');
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar');
    }
    setSaving(false);
  };

  return (
    <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{inst.label}</h2>
          <p className="text-xs text-zinc-500">
            Funcionários = linhas em <code className="text-zinc-400">whatsapp_numbers</code>. Leads contam pelo campo{' '}
            <code className="text-zinc-400">numero_atribuido</code>; conversões PIX pelo pedido ligado ao número no checkout.
          </p>
        </div>
        <ExternalPanelLink href={`${inst.siteOrigin}/admin/whatsapp`}>Abrir no painel do site</ExternalPanelLink>
      </div>
      <div className="mb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Acesso rápido</p>
        <HashAdminProjectQuickLinks inst={inst} variant="compact" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
        </div>
      ) : (
        <>
          {leadsNote && <p className="mb-3 text-xs text-amber-400/90">{leadsNote}</p>}
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              onClick={addRow}
              disabled={!writeClient}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar funcionário
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-700 text-white hover:bg-emerald-600"
              onClick={() => void save()}
              disabled={!writeClient || saving || numbers.length === 0}
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Guardar alterações
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-xs text-zinc-500">
                  <th className="pb-2 pr-2 font-medium">Nome</th>
                  <th className="pb-2 pr-2 font-medium">WhatsApp</th>
                  <th className="pb-2 pr-2 font-medium">Peso</th>
                  <th className="pb-2 pr-2 font-medium text-center">Ativo</th>
                  <th className="pb-2 pr-2 font-medium text-right">Leads</th>
                  <th className="pb-2 pr-2 font-medium text-right">PIX pagos</th>
                  <th className="pb-2 pr-2 font-medium text-right">Receita PIX</th>
                  <th className="pb-2 font-medium text-right">Conv.</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {numbers.map((n) => {
                  const s = statsById[n.id] ?? { leads: 0, pixPagos: 0, receita: 0 };
                  const conv = s.leads > 0 ? ((s.pixPagos / s.leads) * 100).toFixed(1) : '—';
                  return (
                    <tr key={n.id} className="border-b border-zinc-800/90">
                      <td className="py-2 pr-2">
                        <Input
                          value={n.label}
                          onChange={(e) => updateField(n.id, 'label', e.target.value)}
                          className="h-9 border-zinc-700 bg-zinc-950 text-zinc-100"
                          placeholder="Nome"
                          disabled={!writeClient}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          value={n.number}
                          onChange={(e) => updateField(n.id, 'number', e.target.value)}
                          className="h-9 border-zinc-700 bg-zinc-950 font-mono text-xs text-zinc-100"
                          placeholder="5511999999999"
                          disabled={!writeClient}
                        />
                      </td>
                      <td className="py-2 pr-2 w-20">
                        <Input
                          type="number"
                          min={1}
                          value={n.peso_distribuicao}
                          onChange={(e) => updateField(n.id, 'peso_distribuicao', Number(e.target.value))}
                          className="h-9 border-zinc-700 bg-zinc-950 text-zinc-100"
                          disabled={!writeClient}
                        />
                      </td>
                      <td className="py-2 pr-2 text-center">
                        <Switch checked={n.active} onCheckedChange={(v) => updateField(n.id, 'active', v)} disabled={!writeClient} />
                      </td>
                      <td className="py-2 pr-2 text-right text-zinc-300">{s.leads}</td>
                      <td className="py-2 pr-2 text-right font-medium text-emerald-400">{s.pixPagos}</td>
                      <td className="py-2 pr-2 text-right text-zinc-200">
                        R$ {s.receita.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-2 pr-2 text-right text-zinc-400">{conv}{conv !== '—' ? '%' : ''}</td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-red-400"
                          onClick={() => void removeRow(n.id, n.isNew)}
                          disabled={!writeClient}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {numbers.length === 0 && <p className="text-sm text-zinc-500">Sem funcionários — adicione um número.</p>}
        </>
      )}
    </section>
  );
}

export default function HashAdminEquipa() {
  const { visibleInstances: instances } = useHashAdminClientFilter();

  return (
    <HashAdminLayout>
      <div className="mb-6 flex items-start gap-3">
        <Users className="mt-1 h-7 w-7 shrink-0 text-zinc-400" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Funcionários & WhatsApp</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cada funcionário é um número de WhatsApp. O site distribui cliques e grava no pedido PIX qual número estava
            atribuído. Leads antigos usam <code className="text-zinc-500">numero_atribuido</code> igual ao número (só
            dígitos, últimos 9 coincidem).
          </p>
        </div>
      </div>

      {instances.length === 0 ? (
        <p className="text-sm text-zinc-500">Configure instâncias no .env.</p>
      ) : (
        instances.map((inst) => <EquipaBlock key={inst.id} inst={inst} />)
      )}
    </HashAdminLayout>
  );
}
