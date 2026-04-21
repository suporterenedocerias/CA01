import { useEffect, useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';
import { DEFAULT_DUMPSTER_SIZES } from '@/lib/default-dumpster-sizes';
import { supabase, isSupabaseClientConfigured } from '@/integrations/supabase/client';

type Size = { id: string; size: string; title: string; description: string; price: number; order_index: number };

function useDumpsterSizes() {
  const [sizes, setSizes] = useState<Size[]>(DEFAULT_DUMPSTER_SIZES as unknown as Size[]);

  useEffect(() => {
    if (!isSupabaseClientConfigured()) return;
    supabase
      .from('dumpster_sizes')
      .select('id, size, title, description, price, order_index')
      .eq('active', true)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setSizes(data as Size[]);
      });
  }, []);

  return sizes;
}

export function SizesSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const sizes = useDumpsterSizes();

  return (
    <section id="tamanhos" className="py-20 md:py-28">
      <div className="container">
        <AnimateOnScroll className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Tamanhos e preços</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Escolha a caçamba ideal para sua obra
          </h2>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sizes.map((item) => {
            const isPopular = item.size === '5m³';
            return (
              <StaggerItem key={item.id}>
                <div
                  className={`relative flex h-full flex-col rounded-xl border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isPopular ? 'border-accent bg-accent/5 shadow-lg' : 'border-border bg-card hover:border-accent/50'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground">
                      Mais pedida
                    </span>
                  )}
                  <div className="mb-4 text-center">
                    <span className="font-display text-3xl font-extrabold text-foreground md:text-4xl">{item.size}</span>
                    <span className="mt-1 block text-sm font-semibold text-muted-foreground">— {item.title}</span>
                  </div>
                  <p className="mb-6 flex-1 text-center text-sm text-muted-foreground">{item.description}</p>
                  <div className="mb-4 text-center">
                    <span className="text-2xl font-bold text-foreground">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </span>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-whatsapp" strokeWidth={3} aria-hidden />
                      Entrega + retirada inclusos
                    </p>
                  </div>
                  {available ? (
                    <a
                      href={getWhatsAppUrl(`Olá! Quero solicitar a caçamba ${item.size} (${item.title}).`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackClick}
                    >
                      <Button variant="whatsapp" className="w-full">
                        <MessageCircle className="mr-2" size={18} /> Solicitar
                      </Button>
                    </a>
                  ) : (
                    <Button variant="whatsapp" className="w-full" disabled>
                      <MessageCircle className="mr-2" size={18} /> Indisponível
                    </Button>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
