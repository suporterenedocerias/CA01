import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, MessageCircle, Loader2 } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function pushPurchaseEvent(order: Record<string, unknown>) {
  try {
    window.dataLayer = window.dataLayer || [];
    // Limpa objeto ecommerce anterior (boa prática GA4)
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: order.id,
        value: Number(order.valor_total || 0),
        currency: 'BRL',
        items: [
          {
            item_id: String(order.tamanho || ''),
            item_name: `Caçamba ${order.tamanho}`,
            item_category: 'Caçambas',
            price: Number(order.valor_unitario || 0),
            quantity: Number(order.quantidade || 1),
          },
        ],
      },
    });
  } catch (_) {
    // dataLayer não disponível — GTM não instalado ainda
  }
}

const PaymentConfirmed = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const fired = useRef(false);
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) {
          setOrder(data as Record<string, unknown>);
          if (!fired.current) {
            fired.current = true;
            pushPurchaseEvent(data as Record<string, unknown>);
          }
        }
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const total = Number(order?.valor_total || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const whatsappMsg = `Olá! Meu pagamento foi confirmado. Pedido ${String(order?.id || '').slice(0, 8)} — Caçamba ${order?.tamanho}.`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24 pb-16 px-4">
        <div className="container max-w-lg mx-auto">
          <div className="p-8 rounded-2xl bg-card border shadow-sm text-center space-y-6">
            {/* Ícone de sucesso */}
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="text-green-500" size={48} />
            </div>

            {/* Título */}
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Pagamento Confirmado!
              </h1>
              <p className="text-muted-foreground mt-2 text-base">
                Obrigado, <strong>{String(order?.nome || 'cliente')}</strong>! Seu pedido foi recebido e o pagamento PIX foi confirmado.
              </p>
            </div>

            {/* Resumo */}
            {order && (
              <div className="p-4 rounded-xl bg-muted/60 space-y-3 text-sm text-left border border-border">
                <p className="font-semibold text-foreground text-base">Resumo do Pedido</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nº do Pedido</span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {String(order.id || '').slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caçamba</span>
                  <span>{String(order.tamanho || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span>{String(order.quantidade || 1)}</span>
                </div>
                {order.endereco && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrega</span>
                    <span className="text-right max-w-[60%]">
                      {String(order.endereco)}, {String(order.numero || '')} — {String(order.cidade || '')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                  <span>Total pago</span>
                  <span className="text-green-600">{total}</span>
                </div>
              </div>
            )}

            {/* Próximos passos */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-left space-y-2">
              <p className="font-semibold text-foreground">Próximos passos</p>
              <p className="text-muted-foreground">
                Nossa equipe entrará em contato pelo WhatsApp para confirmar o endereço e agendar a entrega da caçamba.
              </p>
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-3">
              {available && (
                <a
                  href={getWhatsAppUrl(whatsappMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackClick}
                >
                  <Button variant="whatsapp" size="lg" className="w-full">
                    <MessageCircle className="mr-2" size={18} />
                    Falar no WhatsApp
                  </Button>
                </a>
              )}
              <Link to="/">
                <Button variant="outline" size="lg" className="w-full">
                  <Home className="mr-2" size={18} />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default PaymentConfirmed;
