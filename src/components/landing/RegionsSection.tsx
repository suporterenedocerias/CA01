import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

export function RegionsSection() {
  const [regions, setRegions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      const { data } = await supabase.from('regions').select('*').eq('active', true).order('order_index');
      if (data) setRegions(data);
    }
    fetchRegions();
  }, []);

  if (regions.length === 0) return null;

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Área de cobertura</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Regiões Atendidas</h2>
          <p className="text-muted-foreground text-lg">Atendemos São Paulo capital e toda a região metropolitana.</p>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {regions.map((r) => (
            <StaggerItem key={r.id}>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border/50 hover:border-accent/50 transition-colors">
                <MapPin size={16} className="text-accent shrink-0" />
                <span className="text-sm font-medium text-foreground">{r.name}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
