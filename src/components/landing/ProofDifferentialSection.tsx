import { Truck, CircleDollarSign, Leaf, MessageCircle } from 'lucide-react';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

const highlights: { icon: typeof Truck; title: string }[] = [
  { icon: Truck, title: 'Entrega no mesmo dia' },
  { icon: CircleDollarSign, title: 'Preço sem surpresa' },
  { icon: Leaf, title: 'Descarte correto e ecológico' },
  { icon: MessageCircle, title: 'Atendimento ágil no WhatsApp' },
];

export function ProofDifferentialSection() {
  return (
    <section id="prova-diferencial" className="border-b bg-gradient-to-b from-muted/40 to-background py-16 md:py-20">
      <div className="container">
        <AnimateOnScroll className="mx-auto mb-12 max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Diferenciais</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Entulho acumulando? Resolva em poucas horas.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Atendimento direto, prazos combinados e processo simples. Com a Entulho Hoje você pede com clareza e recebe
            sem complicação.
          </p>
        </AnimateOnScroll>

        <StaggerContainer className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {highlights.map((h) => {
            const Icon = h.icon;
            return (
              <StaggerItem key={h.title}>
                <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <p className="font-display font-semibold text-foreground">{h.title}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
