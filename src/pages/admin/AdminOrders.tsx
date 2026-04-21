import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { labelForEmployeeId } from '@/lib/whatsapp-employee-stats';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api';
import { calcLiquido, fmtBrl } from '@/lib/fastsoft-fees';

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  aguardando_pagamento: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  pago: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  entregue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

type EmployeeRow = { id: string; label: string };

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [employeeNumbers, setEmployeeNumbers] = useState<EmployeeRow[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [taxaPct, setTaxaPct] = useState(6.99);
  const [taxaFixa, setTaxaFixa] = useState(2.29);

  const fetchOrders = useCallback(async () => {
    const [oRes, nRes, sRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('whatsapp_numbers').select('id, label').order('order_index'),
      supabase.from('site_settings').select('taxa_gateway_pct, taxa_gateway_fixa').limit(1).single(),
    ]);
    setOrders(oRes.data || []);
    setEmployeeNumbers((nRes.data as EmployeeRow[]) || []);
    if (sRes.data) {
      setTaxaPct(Number((sRes.data as any).taxa_gateway_pct ?? 6.99));
      setTaxaFixa(Number((sRes.data as any).taxa_gateway_fixa ?? 2.29));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (!employeeFilter) return orders;
    if (employeeFilter === '__none__') return orders.filter((o) => !o.whatsapp_number_id);
    return orders.filter((o) => o.whatsapp_number_id === employeeFilter);
  }, [orders, employeeFilter]);

  const updateStatus = async (id: string, status: string) => {
    const extra: Record<string, unknown> = {};
    if (status === 'pago') {
      extra.payment_status = 'paid';
      extra.paid_at = new Date().toISOString();
    } else if (status === 'cancelado') {
      extra.payment_status = 'cancelled';
    } else if (status === 'aguardando_pagamento' || status === 'pendente') {
      extra.payment_status = 'pending';
    }
    await supabase.from('orders').update({ status, ...extra }).eq('id', id);
    fetchOrders();
  };

  const handleCheckPayment = async (orderId: string) => {
    setCheckingId(orderId);
    try {
      const result = await apiGet(`check-payment/${orderId}`);
      if (result.status === 'paid') {
        toast.success(result.updated ? 'Pagamento confirmado! Status atualizado.' : 'Pagamento já estava confirmado.');
        fetchOrders();
      } else {
        toast.info(`Status Fluxxo Pay: ${result.status || 'pendente'}`);
      }
    } catch {
      toast.error('Erro ao verificar pagamento.');
    } finally {
      setCheckingId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Pedidos PIX">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pedidos PIX">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package size={24} /> Pedidos
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[12rem]"
            >
              <option value="">Todos os funcionários</option>
              <option value="__none__">Sem número no pedido</option>
              {employeeNumbers.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label?.trim() || n.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <Badge variant="secondary">
              {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
              {employeeFilter ? ` (de ${orders.length})` : ''}
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Página</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Funcionário</th>
                <th className="text-left p-3 font-medium">Caçamba</th>
                <th className="text-left p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Pagamento</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-t hover:bg-muted/50">
                  <td className="p-3">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {order.page_slug ? (
                      <span className="font-mono text-foreground">/e/{order.page_slug}</span>
                    ) : (
                      <span className="text-muted-foreground">Principal</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{order.nome}</div>
                    <div className="text-xs text-muted-foreground">{order.whatsapp}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {order.whatsapp_number_id
                      ? labelForEmployeeId(order.whatsapp_number_id, employeeNumbers)
                      : '—'}
                  </td>
                  <td className="p-3">{order.tamanho} x{order.quantidade}</td>
                  <td className="p-3">
                    <div className="font-medium">R$ {Number(order.valor_total).toFixed(2)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      liq. {fmtBrl(calcLiquido(Number(order.valor_total), taxaPct, taxaFixa))}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${statusColors[order.status] || 'bg-gray-100'}`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="aguardando_pagamento">Aguardando Pgto</option>
                      <option value="pago">Pago</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                    {order.payment_status !== 'paid' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Verificar pagamento na Fluxxo Pay"
                        onClick={() => handleCheckPayment(order.id)}
                        disabled={checkingId === order.id}
                      >
                        {checkingId === order.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <RefreshCw size={14} className="text-muted-foreground" />
                        }
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Pedido #{order.id.slice(0, 8)}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm">
                          <div><strong>Cliente:</strong> {order.nome}</div>
                          <div><strong>WhatsApp:</strong> {order.whatsapp}</div>
                          <div>
                            <strong>Funcionário (nº no pedido):</strong>{' '}
                            {order.whatsapp_number_id
                              ? labelForEmployeeId(order.whatsapp_number_id, employeeNumbers)
                              : '—'}
                          </div>
                          {order.email && <div><strong>Email:</strong> {order.email}</div>}
                          {order.cpf_cnpj && <div><strong>CPF/CNPJ:</strong> {order.cpf_cnpj}</div>}
                          <div><strong>Endereço:</strong> {[order.endereco, order.numero, order.bairro, order.cidade, order.estado].filter(Boolean).join(', ')}</div>
                          <div><strong>Caçamba:</strong> {order.tamanho} x{order.quantidade}</div>
                          <div><strong>Valor bruto:</strong> R$ {Number(order.valor_total).toFixed(2)}</div>
                          <div><strong>Valor líquido:</strong> <span className="text-emerald-600 dark:text-emerald-400">{fmtBrl(calcLiquido(Number(order.valor_total), taxaPct, taxaFixa))}</span> <span className="text-xs text-muted-foreground">(após taxa Fluxxo Pay 6,99% + R$ 2,29)</span></div>
                          <div><strong>Pagamento:</strong> {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}</div>
                          {order.paid_at && <div><strong>Pago em:</strong> {new Date(order.paid_at).toLocaleString('pt-BR')}</div>}
                          {order.observacoes && <div><strong>Obs:</strong> {order.observacoes}</div>}
                        </div>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum pedido neste filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
