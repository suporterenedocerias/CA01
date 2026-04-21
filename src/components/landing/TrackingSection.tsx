import { useState, useEffect } from 'react';
import { Check, MapPin, Truck, PackageCheck } from 'lucide-react';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    icon: PackageCheck,
    title: 'Pedido confirmado',
    description: 'Sua caçamba foi reservada e a equipe foi acionada.',
  },
  {
    icon: Truck,
    title: 'Saiu para entrega',
    description: 'O motorista está a caminho do endereço.',
  },
  {
    icon: MapPin,
    title: 'Chegando no local',
    description: 'Faltam poucos minutos para a entrega.',
  },
  {
    icon: Check,
    title: 'Entregue com sucesso',
    description: 'Caçamba posicionada no endereço solicitado.',
  },
];

/** Índice do step atualmente "em progresso" — cicla de 1 a 3, step 0 sempre concluído */
const CYCLE = [1, 2, 3, 3]; // 3 aparece 2× para dar pausa no estado final
const INTERVAL_MS = 2600;

export function TrackingSection() {
  const [cycleIdx, setCycleIdx] = useState(0);
  const activeStep = CYCLE[cycleIdx];

  useEffect(() => {
    const t = setInterval(() => setCycleIdx((p) => (p + 1) % CYCLE.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="acompanhamento"
      className="scroll-mt-20 bg-[hsl(var(--section-alt))] py-20 md:py-28"
    >
      <div className="container">
        <AnimateOnScroll className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Transparência</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Acompanhe seu pedido em tempo real
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Da confirmação à entrega no local: você vê cada etapa e sabe quando a equipe e o motorista estão a caminho.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll className="mx-auto max-w-lg">
          <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-[var(--shadow-elevated)] md:p-8">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-foreground">Status do pedido</h3>
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeStep}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-1.5 rounded-full bg-whatsapp/10 px-3 py-1.5 text-xs font-semibold text-whatsapp"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whatsapp opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-whatsapp" />
                  </span>
                  {steps[activeStep].title}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="relative">
              {steps.map((step, index) => {
                const isCompleted = index < activeStep || activeStep === steps.length - 1;
                const isCurrent = index === activeStep && activeStep < steps.length - 1;
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
                          className={`mt-2 w-0.5 flex-1 min-h-[2rem] rounded-full ${
                            isCompleted ? 'bg-accent' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>

                    <div className="pt-1">
                      <p
                        className={`font-display text-sm font-bold ${
                          isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
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
