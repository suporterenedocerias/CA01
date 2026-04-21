import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface DumpsterSize {
  id: string;
  size: string;
  title: string;
  description: string;
  price: number;
  active: boolean;
  order_index: number;
  isNew?: boolean;
}

export default function AdminSizes() {
  const [sizes, setSizes] = useState<DumpsterSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = sizes.findIndex((s) => s.id === draggedId);
    const toIdx = sizes.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sizes];
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item);
    setSizes(reordered);
  };

  const handleDragEnd = () => setDraggedId(null);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('dumpster_sizes').select('*').order('order_index');
      if (data) setSizes(data as DumpsterSize[]);
      setLoading(false);
    }
    fetch();
  }, []);

  const toggleActive = (id: string) => {
    setSizes(sizes.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const removeSize = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('dumpster_sizes').delete().eq('id', id);
    }
    setSizes(sizes.filter(s => s.id !== id));
    toast.success('Removido');
  };

  const addSize = () => {
    setSizes([...sizes, {
      id: crypto.randomUUID(),
      size: '', title: '', description: '', price: 0,
      active: true, order_index: sizes.length + 1, isNew: true,
    }]);
  };

  const updateField = (id: string, field: keyof DumpsterSize, value: any) => {
    setSizes(sizes.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < sizes.length; i++) {
        const s = sizes[i];
        const data = {
          size: s.size, title: s.title, description: s.description,
          price: Number(s.price), active: s.active, order_index: i + 1,
        };

        if (s.isNew) {
          await supabase.from('dumpster_sizes').insert({ ...data, id: s.id });
        } else {
          await supabase.from('dumpster_sizes').update(data).eq('id', s.id);
        }
      }
      setSizes(sizes.map(s => ({ ...s, isNew: false })));
      toast.success('Tamanhos salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Tamanhos de Caçamba"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Tamanhos de Caçamba">
      <div className="space-y-4">
        {sizes.map((size) => (
          <div
            key={size.id}
            draggable
            onDragStart={() => handleDragStart(size.id)}
            onDragOver={(e) => handleDragOver(e, size.id)}
            onDragEnd={handleDragEnd}
            className={`p-4 rounded-xl bg-card border shadow-sm transition-opacity ${draggedId === size.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="flex items-start gap-4">
              <GripVertical className="text-muted-foreground mt-3 cursor-grab shrink-0 select-none" size={20} />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Input placeholder="Tamanho (ex: 5m³)" value={size.size}
                  onChange={(e) => updateField(size.id, 'size', e.target.value)} />
                <Input placeholder="Título" value={size.title}
                  onChange={(e) => updateField(size.id, 'title', e.target.value)} />
                <Input placeholder="Descrição" value={size.description}
                  onChange={(e) => updateField(size.id, 'description', e.target.value)} />
                <Input placeholder="Preço" type="number" value={size.price}
                  onChange={(e) => updateField(size.id, 'price', e.target.value)} />
                <div className="flex items-center gap-3">
                  <Switch checked={size.active} onCheckedChange={() => toggleActive(size.id)} />
                  <span className="text-sm text-muted-foreground">{size.active ? 'Ativo' : 'Inativo'}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeSize(size.id, size.isNew)} className="text-destructive ml-auto">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addSize} className="w-full">
          <Plus size={18} className="mr-2" /> Adicionar Tamanho
        </Button>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
