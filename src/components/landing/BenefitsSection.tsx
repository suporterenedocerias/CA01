import { Truck, Clock, ShieldCheck, Leaf, Headphones, DollarSign } from 'lucide-react';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

const benefits = [
  { icon: Clock, title: 'Entrega no Mesmo Dia', description: 'Agilidade para sua obra não parar. Entrega expressa na região.' },
  { icon: DollarSign, title: 'Preço Fechado', description: 'Sem surpresas. Entrega, permanência e retirada já inclusos no valor.' },
  { icon: Headphones, title: 'Suporte via WhatsApp', description: 'Atendimento rápido e humanizado para pedidos e dúvidas.' },
  { icon: Leaf, title: 'Descarte Ecológico', description: 'Destinação correta de resíduos conforme normas ambientais.' },
  { icon: Truck, title: 'Frota Própria', description: 'Caminhões modernos e equipe treinada para entrega segura.' },
  { icon: ShieldCheck, title: 'Empresa Licenciada', description: 'Documentação em dia, alvará e licença ambiental.' },
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-20 md:py-28 bg-surface">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Por que nos escolher</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Caçambas licenciadas, entrega rápida e retirada no prazo.
          </h2>
          <p className="text-muted-foreground text-lg">
            Compromisso com qualidade, prazo e preço justo em cada entrega.
          </p>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <StaggerItem key={b.title}>
              <div className="group p-6 rounded-xl bg-card border border-border/50 hover:border-accent/50 hover:shadow-lg transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <b.icon className="text-accent" size={24} />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{b.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
