import { MessageCircle, Truck, Package, ArrowRightLeft } from 'lucide-react';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

const steps = [
  { icon: MessageCircle, step: '01', title: 'Solicite pelo WhatsApp', description: 'Envie uma mensagem informando o tamanho desejado e o endereço de entrega.' },
  { icon: Truck, step: '02', title: 'Entrega Rápida', description: 'Nossa equipe entrega a caçamba no local combinado, no mesmo dia ou agendado.' },
  { icon: Package, step: '03', title: 'Utilize à Vontade', description: 'Preencha a caçamba com entulho, respeitando a capacidade e materiais permitidos.' },
  { icon: ArrowRightLeft, step: '04', title: 'Retirada e Descarte', description: 'Avisou que encheu? Retiramos e fazemos o descarte ecológico corretamente.' },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-surface">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Processo simples</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Como funciona</h2>
          <p className="text-muted-foreground text-lg">Em 4 passos simples, sua caçamba está no local.</p>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <StaggerItem key={step.step}>
              <div className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <step.icon className="text-primary-foreground" size={28} />
                </div>
                <span className="text-sm font-bold text-accent">Passo {step.step}</span>
                <h3 className="font-display text-lg font-bold text-foreground mt-1 mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
