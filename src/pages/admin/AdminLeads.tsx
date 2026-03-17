import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const statusOptions = ['Novo', 'Em atendimento', 'Fechado'];

export default function AdminLeads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    
    const { data, error } = await query;
    if (error) {
      console.error(error);
      return;
    }
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }
    setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    toast.success('Status atualizado');
  };

  const filtered = leads.filter((l) =>
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    l.whatsapp.includes(search)
  );

  return (
    <AdminLayout title="Leads / Pedidos">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl bg-card border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Data</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Nome</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">WhatsApp</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Endereço</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Tamanho</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Qtd</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum lead encontrado.</td></tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-sm font-medium text-foreground">{lead.nome}</td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.whatsapp}</td>
                    <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate">
                      {[lead.endereco, lead.numero, lead.bairro, lead.cidade].filter(Boolean).join(', ')}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.tamanho}</td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.quantidade}</td>
                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="text-xs rounded-md border px-2 py-1 bg-background"
                      >
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <a href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="whatsapp" size="sm">
                          <MessageCircle size={14} />
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
