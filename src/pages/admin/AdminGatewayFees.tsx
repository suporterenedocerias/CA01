import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Percent, DollarSign, Info } from 'lucide-react';
import { toast } from 'sonner';
import { calcLiquido, fmtBrl } from '@/lib/fastsoft-fees';

const PREVIEW_VALUES = [100, 200, 350, 500, 800, 1200];

export default function AdminGatewayFees() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [pct, setPct] = useState('6.99');
  const [fixa, setFixa] = useState('2.29');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('site_settings')
        .select('id, taxa_gateway_pct, taxa_gateway_fixa')
        .limit(1)
        .single();
      if (data) {
        setSettingsId(data.id);
        if (data.taxa_gateway_pct != null) setPct(String(data.taxa_gateway_pct));
        if (data.taxa_gateway_fixa != null) setFixa(String(data.taxa_gateway_fixa));
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    const pctNum = parseFloat(pct);
    const fixaNum = parseFloat(fixa);
    if (isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
      toast.error('Percentual inválido (0–100)');
      return;
    }
    if (isNaN(fixaNum) || fixaNum < 0) {
      toast.error('Taxa fixa inválida');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update({ taxa_gateway_pct: pctNum, taxa_gateway_fixa: fixaNum })
      .eq('id', settingsId!);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Taxa do gateway atualizada!');
    }
    setSaving(false);
  };

  const pctNum = parseFloat(pct) || 0;
  const fixaNum = parseFloat(fixa) || 0;

  if (loading) {
    return (
      <AdminLayout title="Taxa do Gateway">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
          A carregar…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Taxa do Gateway">
      <div className="max-w-xl space-y-8">

        {/* Formulário */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-semibold text-foreground mb-1">Configurar taxa do gateway de pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Estes valores são usados para calcular o valor líquido em todos os pedidos e no dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pct" className="flex items-center gap-1.5">
                <Percent size={14} />
                Percentual (%)
              </Label>
              <Input
                id="pct"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                placeholder="ex: 6.99"
              />
              <p className="text-xs text-muted-foreground">Ex: 6.99 para 6,99%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixa" className="flex items-center gap-1.5">
                <DollarSign size={14} />
                Taxa fixa (R$)
              </Label>
              <Input
                id="fixa"
                type="number"
                step="0.01"
                min="0"
                value={fixa}
                onChange={(e) => setFixa(e.target.value)}
                placeholder="ex: 2.29"
              />
              <p className="text-xs text-muted-foreground">Cobrada por transação</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !settingsId} className="w-full sm:w-auto">
            <Save size={16} className="mr-2" />
            {saving ? 'Salvando…' : 'Salvar taxa'}
          </Button>

          {!settingsId && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                Execute o SQL abaixo no Supabase para ativar a persistência das taxas:
                <code className="mt-1 block rounded bg-yellow-100 dark:bg-yellow-900/40 p-2 text-xs font-mono">
                  ALTER TABLE site_settings{'\n'}
                  {'  '}ADD COLUMN IF NOT EXISTS taxa_gateway_pct numeric(6,4) NOT NULL DEFAULT 6.99,{'\n'}
                  {'  '}ADD COLUMN IF NOT EXISTS taxa_gateway_fixa numeric(6,2) NOT NULL DEFAULT 2.29;
                </code>
              </span>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Prévia do líquido com essa taxa</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="pb-2 text-left font-medium">Valor bruto</th>
                  <th className="pb-2 text-left font-medium">Taxa ({pct}% + R$ {fixa})</th>
                  <th className="pb-2 text-left font-medium text-emerald-600 dark:text-emerald-400">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {PREVIEW_VALUES.map((bruto) => {
                  const taxa = bruto * (pctNum / 100) + fixaNum;
                  const liquido = bruto - taxa;
                  return (
                    <tr key={bruto} className="border-b last:border-0">
                      <td className="py-2 font-medium">{fmtBrl(bruto)}</td>
                      <td className="py-2 text-red-500">− {fmtBrl(taxa)}</td>
                      <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">{fmtBrl(liquido)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
