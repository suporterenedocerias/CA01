import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Region {
  id: string;
  name: string;
  active: boolean;
  order_index: number;
  isNew?: boolean;
}

export default function AdminRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [newRegion, setNewRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('regions').select('*').order('order_index');
      if (data) setRegions(data as Region[]);
      setLoading(false);
    }
    fetch();
  }, []);

  const addRegion = () => {
    if (newRegion.trim()) {
      setRegions([...regions, {
        id: crypto.randomUUID(),
        name: newRegion.trim(),
        active: true,
        order_index: regions.length + 1,
        isNew: true,
      }]);
      setNewRegion('');
    }
  };

  const removeRegion = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('regions').delete().eq('id', id);
    }
    setRegions(regions.filter(r => r.id !== id));
    toast.success('Removido');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < regions.length; i++) {
        const r = regions[i];
        const data = { name: r.name, active: r.active, order_index: i + 1 };

        if (r.isNew) {
          await supabase.from('regions').insert({ ...data, id: r.id });
        } else {
          await supabase.from('regions').update(data).eq('id', r.id);
        }
      }
      setRegions(regions.map(r => ({ ...r, isNew: false })));
      toast.success('Regiões salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Regiões"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Regiões Atendidas">
      <div className="max-w-2xl">
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Nova região..."
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRegion()}
          />
          <Button onClick={addRegion}>
            <Plus size={18} className="mr-2" /> Adicionar
          </Button>
        </div>

        <div className="space-y-2 mb-6">
          {regions.map((region) => (
            <div key={region.id} className="flex items-center justify-between p-3 rounded-lg bg-card border">
              <span className="text-sm font-medium text-foreground">{region.name}</span>
              <Button variant="ghost" size="icon" onClick={() => removeRegion(region.id, region.isNew)} className="text-destructive">
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
