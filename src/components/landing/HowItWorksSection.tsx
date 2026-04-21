import { MessageCircle, Truck, Package, ArrowRightLeft } from 'lucide-react';
import { AnimateOnScroll, StaggerContainer, StaggerItem } from '@/components/ui/animate-on-scroll';

const steps = [
  {
    icon: MessageCircle,
    step: '01',
    title: 'Peça pelo WhatsApp',
    description: 'Informe o tamanho e o endereço.',
  },
  {
    icon: Truck,
    step: '02',
    title: 'Entregamos rápido',
    description: 'No mesmo dia ou agendado.',
  },
  {
    icon: Package,
    step: '03',
    title: 'Use no seu tempo',
    description: 'Encha a caçamba com tranquilidade.',
  },
  {
    icon: ArrowRightLeft,
    step: '04',
    title: 'Retiramos e descartamos',
    description: 'Você avisa, a gente resolve.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-surface py-20 md:py-28">
      <div className="container">
        <AnimateOnScroll className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Como funciona</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">Simples, rápido e sem burocracia</h2>
        </AnimateOnScroll>

        <StaggerContainer className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <StaggerItem key={step.step}>
              <div className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                  <step.icon className="text-primary-foreground" size={28} />
                </div>
                <span className="text-sm font-bold text-accent">Passo {step.step}</span>
                <h3 className="mt-1 font-display text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
