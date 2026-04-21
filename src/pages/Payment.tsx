import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, Clock, Loader2, QrCode, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { copyTextMobileFriendly } from '@/lib/copy-text-mobile';
import { getBrCodeForQr, getPixCopyText, getPixQrImageUrl } from '@/lib/order-pix-fields';
import { resolveApiBase } from '@/lib/resolve-api-base';

const POLL_MS = 4000;

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const refreshOrder = useCallback(async () => {
    if (!orderId) return null;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (error || !data) return null;
    return data;
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    (async () => {
      const data = await refreshOrder();
      if (cancelled) return;
      if (!data) {
        toast.error('Pedido não encontrado.');
        navigate('/');
        return;
      }
      setOrder(data);
      setLoading(false);
      if (data.payment_status === 'paid') {
        navigate(`/pagamento-confirmado/${orderId}`);
      }
    })();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setOrder(updated);
          if (updated.payment_status === 'paid') {
            navigate(`/pagamento-confirmado/${orderId}`);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate, refreshOrder]);

  useEffect(() => {
    if (!orderId || !order || order.payment_status === 'paid') return;

    const id = window.setInterval(async () => {
      // Consulta a FastSoft ativamente (não depende só do webhook)
      try {
        const apiBase = resolveApiBase();
        const res = await fetch(`${apiBase}/check-payment/${orderId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'paid') {
            navigate(`/pagamento-confirmado/${orderId}`);
            return;
          }
        }
      } catch (_) { /* ignora falha de rede, tenta na próxima */ }

      const data = await refreshOrder();
      if (!data) return;
      setOrder(data);
      if (data.payment_status === 'paid') {
        navigate(`/pagamento-confirmado/${orderId}`);
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [orderId, order?.payment_status, navigate, refreshOrder]);

  useEffect(() => {
    if (!order?.pix_expires_at) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(order.pix_expires_at).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setTimeLeft('Expirado');
        clearInterval(interval);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.pix_expires_at]);

  const textToCopy = getPixCopyText(order);
  const brCodeForQr = getBrCodeForQr(order);
  const qrImageSrc = getPixQrImageUrl(order);

  const handleCopy = async () => {
    if (!textToCopy) return;
    const ok = await copyTextMobileFriendly(textToCopy);
    if (ok) {
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error('Toque no código acima, selecione tudo e copie manualmente.');
    }
  };

  const handleShare = async () => {
    if (!textToCopy || !navigator.share) return;
    try {
      await navigator.share({
        title: 'PIX — Entulho Hoje',
        text: textToCopy,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      toast.error('Não foi possível compartilhar. Use Copiar.');
    }
  };

  const qrSize = isMobile ? 240 : 224;
  const QrWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="p-3 bg-white rounded-xl border border-border shadow-sm inline-block">{children}</div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <SiteHeader />
      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="container max-w-lg mx-auto">
          <div className="p-5 sm:p-8 rounded-2xl bg-card border shadow-sm text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-sm font-medium">
              <Clock size={14} />
              <span>Expira em {timeLeft}</span>
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Pagamento via PIX</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Escaneie o QR Code no app do banco ou use Copiar / Compartilhar
              </p>
            </div>

            <div className="flex justify-center overflow-x-auto">
              <QrWrapper>
                {brCodeForQr ? (
                  isMobile ? (
                    <QRCodeCanvas
                      value={brCodeForQr}
                      size={qrSize}
                      marginSize={2}
                      level="M"
                      className="max-w-[min(72vw,280px)] h-auto"
                    />
                  ) : (
                    <QRCodeSVG value={brCodeForQr} size={qrSize} className="w-56 h-56 md:w-60 md:h-60" />
                  )
                ) : qrImageSrc ? (
                  <img
                    src={qrImageSrc}
                    alt="QR Code PIX"
                    className="w-[min(72vw,280px)] max-h-[280px] object-contain"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center bg-muted rounded-lg text-muted-foreground"
                    style={{ width: qrSize, height: qrSize }}
                  >
                    <QrCode size={64} />
                  </div>
                )}
              </QrWrapper>
            </div>

            <div className="space-y-3 text-left">
              <p className="text-sm font-medium text-foreground text-center">Código PIX (copia e cola)</p>
              <div className="relative">
                <textarea
                  readOnly
                  value={textToCopy || 'Código não disponível'}
                  rows={4}
                  className="w-full p-3 bg-muted rounded-lg text-xs text-foreground break-all font-mono resize-none border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[5rem]"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handleCopy}
                  variant="whatsapp"
                  size="lg"
                  className="w-full flex-1 min-h-12 touch-manipulation"
                  disabled={!textToCopy}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="mr-2" size={18} /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2" size={18} /> Copiar código PIX
                    </>
                  )}
                </Button>
                {typeof navigator !== 'undefined' && navigator.share && textToCopy ? (
                  <Button
                    type="button"
                    onClick={handleShare}
                    variant="outline"
                    size="lg"
                    className="w-full flex-1 min-h-12 touch-manipulation sm:max-w-[none]"
                  >
                    <Share2 className="mr-2" size={18} />
                    Compartilhar
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm text-left">
              <p className="font-medium text-foreground">Resumo do pedido</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caçamba</span>
                <span>{order?.tamanho}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade</span>
                <span>{order?.quantidade}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>R$ {Number(order?.valor_total || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Loader2 className="animate-spin shrink-0" size={14} />
              <span>Aguardando confirmação do pagamento…</span>
            </div>

            {available && (
              <div className="pt-2 border-t border-border">
                <a
                  href={getWhatsAppUrl('Olá! Preciso de ajuda com meu pedido PIX.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackClick}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation py-2"
                >
                  <MessageCircle size={14} />
                  Dúvidas? Fale no WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Payment;
