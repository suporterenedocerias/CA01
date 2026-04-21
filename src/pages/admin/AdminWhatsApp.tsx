import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, MousePointerClick, ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface WhatsAppNumber {
  id: string;
  number: string;
  label: string;
  active: boolean;
  click_count: number;
  peso_distribuicao: number;
  order_index: number;
  isNew?: boolean;
}

interface ClickStats {
  number_id: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

export default function AdminWhatsApp() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clickStats, setClickStats] = useState<Record<string, ClickStats>>({});

  useEffect(() => {
    async function fetch() {
      const [numbersRes, clicksRes, statsRes] = await Promise.all([
        supabase.from('whatsapp_numbers').select('*').order('order_index'),
        supabase.from('whatsapp_clicks').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_click_stats'),
      ]);
      
      if (numbersRes.data) setNumbers(numbersRes.data as WhatsAppNumber[]);
      setTotalClicks(clicksRes.count || 0);

      if (statsRes.data) {
        const map: Record<string, ClickStats> = {};
        for (const s of statsRes.data) {
          map[s.number_id] = s as ClickStats;
        }
        setClickStats(map);
      }

      setLoading(false);
    }
    fetch();
  }, []);

  const toggleActive = (id: string) => {
    setNumbers(numbers.map(n => n.id === id ? { ...n, active: !n.active } : n));
  };

  const removeNumber = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('whatsapp_numbers').delete().eq('id', id);
    }
    setNumbers(numbers.filter(n => n.id !== id));
    toast.success('Removido');
  };

  const addNumber = () => {
    setNumbers([...numbers, {
      id: crypto.randomUUID(), number: '', label: '', active: true,
      click_count: 0, peso_distribuicao: 1, order_index: numbers.length + 1, isNew: true,
    }]);
  };

  const updateField = (id: string, field: keyof WhatsAppNumber, value: any) => {
    setNumbers(numbers.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < numbers.length; i++) {
        const n = numbers[i];
        const data = {
          number: n.number, label: n.label, active: n.active,
          peso_distribuicao: Number(n.peso_distribuicao) || 1,
          order_index: i + 1,
        };

        if (n.isNew) {
          await supabase.from('whatsapp_numbers').insert({ ...data, id: n.id });
        } else {
          await supabase.from('whatsapp_numbers').update(data).eq('id', n.id);
        }
      }
      setNumbers(numbers.map(n => ({ ...n, isNew: false })));
      toast.success('Números salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Números de WhatsApp"><p>Carregando...</p></AdminLayout>;

  const activeCount = numbers.filter(n => n.active).length;
  const mostClicked = [...numbers].sort((a, b) => b.click_count - a.click_count)[0];

  return (
    <AdminLayout title="Números de WhatsApp">
      <p className="mb-6 text-sm text-muted-foreground">
        A <strong>ordem dos números</strong> e a <strong>rotação</strong> (a cada quantos novos visitantes
        trocar de número) são configuradas em{' '}
        <Link to="/admin/funcionarios" className="font-medium text-primary underline-offset-4 hover:underline">
          Funcionários
        </Link>
        . Aqui vê estatísticas de cliques; o campo «Peso» já não altera a rotação no site.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <span className="text-sm text-muted-foreground">Total de Cliques</span>
          <div className="font-display text-3xl font-bold text-foreground mt-1">{totalClicks}</div>
        </div>
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <span className="text-sm text-muted-foreground">Números Ativos</span>
          <div className="font-display text-3xl font-bold text-foreground mt-1">{activeCount}</div>
        </div>
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <span className="text-sm text-muted-foreground">Mais Clicado</span>
          <div className="font-display text-lg font-bold text-foreground mt-1">
            {mostClicked?.label || '-'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {numbers.map((num) => {
          const stats = clickStats[num.id];
          return (
            <div key={num.id} className="p-4 rounded-xl bg-card border shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                <Input placeholder="Nome (ex: Número 1)" value={num.label}
                  onChange={(e) => updateField(num.id, 'label', e.target.value)} />
                <Input placeholder="Número (ex: 5511999999901)" value={num.number}
                  onChange={(e) => updateField(num.id, 'number', e.target.value)} />
                <Input placeholder="Peso" type="number" value={num.peso_distribuicao}
                  onChange={(e) => updateField(num.id, 'peso_distribuicao', e.target.value)} />
                <div className="flex items-center gap-3 text-sm">
                  <MousePointerClick size={14} className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{stats?.total_clicks ?? num.click_count} total</span>
                    <span className="text-muted-foreground text-xs">
                      {stats?.clicks_today ?? 0} hoje · {stats?.clicks_week ?? 0} semana
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={num.active} onCheckedChange={() => toggleActive(num.id)} />
                  <span className="text-sm text-muted-foreground">{num.active ? 'Ativo' : 'Inativo'}</span>
                  <div className="ml-auto flex items-center gap-1">
                    {num.number && (
                      <a
                        href={`https://wa.me/${num.number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Testar WhatsApp"
                      >
                        <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-400">
                          <ExternalLink size={16} />
                        </Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeNumber(num.id, num.isNew)} className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <Button variant="outline" onClick={addNumber} className="w-full">
          <Plus size={18} className="mr-2" /> Adicionar Número
        </Button>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
