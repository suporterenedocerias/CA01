import { Check, MapPin, Truck, PackageCheck } from 'lucide-react';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: PackageCheck,
    title: 'Pedido Confirmado',
    description: 'Sua caçamba foi reservada e a equipe foi acionada.',
  },
  {
    icon: Truck,
    title: 'Saiu para Entrega',
    description: 'O motorista está a caminho do endereço.',
  },
  {
    icon: MapPin,
    title: 'Chegando ao Local',
    description: 'Faltam poucos minutos para a entrega.',
  },
  {
    icon: Check,
    title: 'Entregue com Sucesso',
    description: 'Caçamba posicionada no endereço solicitado.',
  },
];

export function TrackingSection() {
  return (
    <section className="py-20 md:py-28 bg-[hsl(var(--section-alt))]">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">
            Transparência total
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Acompanhe cada etapa da entrega
          </h2>
          <p className="text-muted-foreground text-lg">
            Você sabe exatamente o que está acontecendo com seu pedido em tempo real.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll className="max-w-lg mx-auto">
          <div className="rounded-2xl border-2 border-border bg-card p-6 md:p-8 shadow-[var(--shadow-elevated)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-xl font-bold text-foreground">
                Rastreamento da entrega
              </h3>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-whatsapp bg-whatsapp/10 px-3 py-1.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-whatsapp opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-whatsapp" />
                </span>
                Atualização ao vivo
              </span>
            </div>

            {/* Steps */}
            <div className="relative">
              {steps.map((step, index) => {
                const isCompleted = index <= 2;
                const isCurrent = index === 2;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.title}
                    className="relative flex gap-4 pb-8 last:pb-0"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15, duration: 0.4 }}
                  >
                    {/* Connector line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isCompleted
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-accent/20' : ''}`}
                      >
                        <Icon size={18} />
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 mt-2 rounded-full ${
                            isCompleted ? 'bg-accent' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pt-1">
                      <p
                        className={`font-display font-bold text-sm ${
                          isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
