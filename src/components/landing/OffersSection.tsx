import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

interface SiteOffer {
  id: string;
  title: string;
  description: string;
  badge: string;
  price_current: number;
  price_original: number | null;
}

function formatBrl(n: number) {
  return `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
}

export function OffersSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const [offers, setOffers] = useState<SiteOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const { data, error } = await supabase
          .from('site_offers')
          .select('id, title, description, badge, price_current, price_original')
          .eq('active', true)
          .order('order_index');
        if (!error && data?.length) {
          setOffers(data as SiteOffer[]);
        }
      } catch {
        /* tabela pode não existir até rodar migration */
      }
      setLoading(false);
    }
    fetchOffers();
  }, []);

  if (loading || offers.length === 0) return null;

  return (
    <section id="ofertas" className="py-16 md:py-24 bg-gradient-to-b from-accent/8 via-background to-background scroll-mt-20">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent uppercase tracking-wider">
            <Sparkles size={16} className="text-accent" />
            Ofertas especiais
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Aproveite enquanto duram
          </h2>
          <p className="text-muted-foreground text-lg">
            Valores promocionais com entrega e retirada. Fale no WhatsApp e garanta a sua.
          </p>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <StaggerItem key={offer.id}>
              <div className="relative rounded-2xl border-2 border-accent/40 bg-card p-6 flex flex-col h-full shadow-lg shadow-accent/5 hover:shadow-xl hover:border-accent/70 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <span className="relative z-[1] inline-block w-fit px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold tracking-wide mb-4">
                  {offer.badge}
                </span>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{offer.title}</h3>
                {offer.description ? (
                  <p className="text-muted-foreground text-sm mb-6 flex-1 leading-relaxed">{offer.description}</p>
                ) : (
                  <div className="flex-1 mb-6" />
                )}
                <div className="mb-6">
                  {offer.price_original != null && Number(offer.price_original) > 0 && (
                    <p className="text-sm text-muted-foreground line-through mb-1">
                      {formatBrl(Number(offer.price_original))}
                    </p>
                  )}
                  <p className="text-3xl font-extrabold text-foreground">{formatBrl(Number(offer.price_current))}</p>
                  <p className="text-xs text-muted-foreground mt-1">incluso entrega e retirada</p>
                </div>
                {available ? (
                  <a
                    href={getWhatsAppUrl(
                      `Olá! Quero a oferta: ${offer.title} — ${formatBrl(Number(offer.price_current))}.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={trackClick}
                  >
                    <Button variant="whatsapp" className="w-full font-bold">
                      <MessageCircle className="mr-2" size={18} /> Garantir oferta
                    </Button>
                  </a>
                ) : (
                  <Button variant="whatsapp" className="w-full" disabled>
                    <MessageCircle className="mr-2" size={18} /> Indisponível
                  </Button>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
