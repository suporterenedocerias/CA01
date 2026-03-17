import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Counter {
  id: string;
  name: string;
  value: number;
  label: string;
  suffix: string;
  active: boolean;
  order_index: number;
  isNew?: boolean;
}

export default function AdminCounters() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('site_counters').select('*').order('order_index');
      if (data) setCounters(data as Counter[]);
      setLoading(false);
    }
    fetch();
  }, []);

  const toggleActive = (id: string) => {
    setCounters(counters.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const removeCounter = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('site_counters').delete().eq('id', id);
    }
    setCounters(counters.filter(c => c.id !== id));
    toast.success('Removido');
  };

  const addCounter = () => {
    setCounters([...counters, {
      id: crypto.randomUUID(), name: '', value: 0, label: '', suffix: '+',
      active: true, order_index: counters.length + 1, isNew: true,
    }]);
  };

  const updateField = (id: string, field: keyof Counter, value: any) => {
    setCounters(counters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < counters.length; i++) {
        const c = counters[i];
        const data = {
          name: c.name, value: Number(c.value), label: c.label,
          suffix: c.suffix, active: c.active, order_index: i + 1,
        };

        if (c.isNew) {
          await supabase.from('site_counters').insert({ ...data, id: c.id });
        } else {
          await supabase.from('site_counters').update(data).eq('id', c.id);
        }
      }
      setCounters(counters.map(c => ({ ...c, isNew: false })));
      toast.success('Contadores salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Contadores"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Números do Site (Contadores)">
      <p className="text-muted-foreground mb-6">
        Edite os números de prova social exibidos no site.
      </p>

      <div className="space-y-4">
        {counters.map((counter) => (
          <div key={counter.id} className="p-4 rounded-xl bg-card border shadow-sm">
            <div className="flex items-start gap-4">
              <GripVertical className="text-muted-foreground mt-3 cursor-grab shrink-0" size={20} />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Input placeholder="Nome interno" value={counter.name}
                  onChange={(e) => updateField(counter.id, 'name', e.target.value)} />
                <Input placeholder="Valor numérico" type="number" value={counter.value}
                  onChange={(e) => updateField(counter.id, 'value', e.target.value)} />
                <Input placeholder="Legenda no site" value={counter.label}
                  onChange={(e) => updateField(counter.id, 'label', e.target.value)} />
                <Input placeholder="Sufixo (+, %, etc)" value={counter.suffix}
                  onChange={(e) => updateField(counter.id, 'suffix', e.target.value)} />
                <div className="flex items-center gap-3">
                  <Switch checked={counter.active} onCheckedChange={() => toggleActive(counter.id)} />
                  <span className="text-sm text-muted-foreground">{counter.active ? 'Ativo' : 'Inativo'}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeCounter(counter.id, counter.isNew)} className="text-destructive ml-auto">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addCounter} className="w-full">
          <Plus size={18} className="mr-2" /> Adicionar Contador
        </Button>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
