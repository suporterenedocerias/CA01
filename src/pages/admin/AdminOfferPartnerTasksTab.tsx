import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

type OfferOpt = { id: string; title: string };
type TaskRow = {
  id: string;
  created_at: string;
  title: string;
  details: string;
  site_offer_id: string | null;
  status: string;
};

const statusLabel: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export function AdminOfferPartnerTasksTab() {
  const [offers, setOffers] = useState<OfferOpt[]>([]);
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [offerId, setOfferId] = useState<string>('');

  const load = async () => {
    const [oRes, tRes] = await Promise.all([
      supabase.from('site_offers').select('id, title').order('order_index'),
      supabase.from('partner_task_requests').select('*').order('created_at', { ascending: false }),
    ]);
    if (oRes.error) console.error(oRes.error);
    else setOffers((oRes.data as OfferOpt[]) ?? []);
    if (tRes.error) {
      if (tRes.error.message.includes('does not exist') || tRes.error.code === '42P01') {
        toast.error('Rode a migration partner_task_requests no Supabase.');
      }
      setRows([]);
    } else {
      setRows((tRes.data as TaskRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error('Indique um título para o pedido.');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('partner_task_requests').insert({
        title: t,
        details: details.trim(),
        site_offer_id: offerId && offerId !== '_none' ? offerId : null,
        status: 'aberto',
      });
      if (error) throw error;
      toast.success('Pedido registado. O parceiro vê no painel mestre (Pedidos).');
      setTitle('');
      setDetails('');
      setOfferId('');
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar';
      toast.error(msg);
    }
    setSending(false);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Pedido ao parceiro</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Descreva o que precisa (ajuste de oferta, arte, campanha, etc.). Opcionalmente associe a uma das suas
              ofertas para dar contexto.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="pt-title">Título do pedido</Label>
            <Input
              id="pt-title"
              placeholder='Ex.: "Atualizar preço da oferta 5m³"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-offer">Relacionar a uma oferta (opcional)</Label>
            <Select value={offerId || '_none'} onValueChange={(v) => setOfferId(v === '_none' ? '' : v)}>
              <SelectTrigger id="pt-offer">
                <SelectValue placeholder="Nenhuma — pedido geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhuma — pedido geral</SelectItem>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title || 'Sem título'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pt-details">Detalhes</Label>
            <Textarea
              id="pt-details"
              rows={5}
              placeholder="Explique o que precisa, prazos e referências."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'A enviar…' : 'Enviar pedido'}
          </Button>
        </form>
      </div>

      <div>
        <h3 className="font-display mb-3 text-base font-semibold text-foreground">Os seus pedidos</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não enviou nenhum pedido.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{r.title}</p>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </div>
                {r.details ? <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{r.details}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString('pt-BR')}
                  {r.site_offer_id ? (
                    <>
                      {' · '}
                      <span className="font-mono">
                        Oferta: {offers.find((o) => o.id === r.site_offer_id)?.title ?? r.site_offer_id.slice(0, 8)}
                      </span>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
