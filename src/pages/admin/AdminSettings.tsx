import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('site_settings').select('*').limit(1).single();
      if (data) setSettings(data);
      setLoading(false);
    }
    fetch();
  }, []);

  const handleChange = (field: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('site_settings').update({
      site_name: settings.site_name,
      telefone_principal: settings.telefone_principal,
      whatsapp_principal: settings.whatsapp_principal,
      endereco_empresa: settings.endereco_empresa,
      email_contato: settings.email_contato,
    }).eq('id', settings.id);

    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Configurações salvas!');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Configurações"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Configurações do Site">
      <div className="max-w-2xl space-y-6">
        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground">Dados da Empresa</h3>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome do Site</label>
            <Input value={settings?.site_name || ''} onChange={(e) => handleChange('site_name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Telefone Principal</label>
            <Input value={settings?.telefone_principal || ''} onChange={(e) => handleChange('telefone_principal', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">WhatsApp Principal</label>
            <Input value={settings?.whatsapp_principal || ''} onChange={(e) => handleChange('whatsapp_principal', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Endereço da Empresa</label>
            <Input value={settings?.endereco_empresa || ''} onChange={(e) => handleChange('endereco_empresa', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">E-mail de Contato</label>
            <Input value={settings?.email_contato || ''} onChange={(e) => handleChange('email_contato', e.target.value)} />
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
