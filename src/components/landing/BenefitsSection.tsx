import { Truck, Clock, ShieldCheck, Leaf, Headphones, DollarSign } from 'lucide-react';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

const benefits = [
  {
    icon: Clock,
    title: 'Entrega no mesmo dia',
    description: 'Sua obra não para por falta de caçamba.',
  },
  {
    icon: DollarSign,
    title: 'Preço fechado',
    description: 'Você já sabe quanto vai pagar. Sem taxas escondidas.',
  },
  {
    icon: Headphones,
    title: 'Atendimento rápido',
    description: 'Resolve tudo pelo WhatsApp em poucos minutos.',
  },
  {
    icon: Leaf,
    title: 'Descarte ecológico',
    description: 'Cumprimos todas as normas ambientais.',
  },
  {
    icon: Truck,
    title: 'Frota própria',
    description: 'Mais rapidez e controle nas entregas.',
  },
  {
    icon: ShieldCheck,
    title: 'Empresa licenciada',
    description: 'Segurança jurídica e ambiental pra você.',
  },
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="bg-surface py-20 md:py-28">
      <div className="container">
        <AnimateOnScroll className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Por que escolher</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Menos dor de cabeça, mais agilidade na sua obra
          </h2>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <StaggerItem key={b.title}>
              <div className="group flex h-full flex-col rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-accent/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <b.icon className="text-accent" size={24} />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
