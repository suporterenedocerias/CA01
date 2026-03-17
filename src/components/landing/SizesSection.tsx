import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

interface DumpsterSize {
  id: string;
  size: string;
  title: string;
  description: string;
  price: number;
  order_index: number;
}

export function SizesSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const [sizes, setSizes] = useState<DumpsterSize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSizes() {
      const { data } = await supabase
        .from('dumpster_sizes')
        .select('*')
        .eq('active', true)
        .order('order_index');
      if (data) setSizes(data);
      setLoading(false);
    }
    fetchSizes();
  }, []);

  if (loading || sizes.length === 0) return null;

  const popularIndex = sizes.findIndex(s => s.size === '5m³');

  return (
    <section id="tamanhos" className="py-20 md:py-28">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Tamanhos e valores</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Escolha o tamanho ideal
          </h2>
          <p className="text-muted-foreground text-lg">Caçambas de diversos tamanhos para qualquer tipo de obra.</p>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sizes.map((item, index) => {
            const isPopular = index === popularIndex;
            return (
              <StaggerItem key={item.id}>
                <div className={`relative rounded-xl border-2 p-6 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isPopular ? 'border-accent bg-accent/5 shadow-lg' : 'border-border bg-card hover:border-accent/50'
                }`}>
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full whitespace-nowrap">
                      MAIS PEDIDO
                    </span>
                  )}
                  <div className="text-center mb-6">
                    <span className="font-display text-4xl font-extrabold text-foreground">{item.size}</span>
                    <h3 className="font-display text-lg font-bold text-foreground mt-2">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm text-center mb-6 flex-1">{item.description}</p>
                  <div className="text-center mb-6">
                    <span className="text-3xl font-bold text-foreground">
                      R$ {Number(item.price).toFixed(2).replace('.', ',')}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">incluso entrega e retirada</p>
                  </div>
                  {available ? (
                    <a href={getWhatsAppUrl(`Olá! Tenho interesse na caçamba ${item.size} - ${item.title}.`)} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
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
