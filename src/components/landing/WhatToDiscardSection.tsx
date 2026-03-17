import { Recycle, Truck, Leaf } from 'lucide-react';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';

const highlights = [
  { icon: Recycle, text: 'Entulho, madeira, ferro, gesso e muito mais' },
  { icon: Truck, text: 'Retirada rápida e prática no seu endereço' },
  { icon: Leaf, text: 'Destinação ecológica e responsável' },
];

export function WhatToDiscardSection() {
  return (
    <section className="py-20 md:py-28 bg-surface">
      <div className="container">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Materiais</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Aceitamos todos os tipos de materiais
          </h2>
          <p className="text-muted-foreground text-lg">
            Não se preocupe com o tipo de resíduo. Nós cuidamos de tudo para você com agilidade e responsabilidade ambiental.
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {highlights.map(({ icon: Icon, text }) => (
            <AnimateOnScroll key={text}>
              <div className="p-6 rounded-xl bg-card border border-border text-center h-full flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                  <Icon className="text-accent" size={28} />
                </div>
                <p className="text-muted-foreground text-sm font-medium">{text}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
