import { Check } from 'lucide-react';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';

const materials = ['Entulho de obra', 'Madeira', 'Ferro', 'Gesso', 'E muito mais'];

export function WhatToDiscardSection() {
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="container">
        <AnimateOnScroll className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">Materiais</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Materiais aceitos na caçamba
          </h2>
          <ul className="mx-auto mt-8 max-w-md space-y-3 text-left">
            {materials.map((m) => (
              <li key={m} className="flex items-center gap-3 text-base font-medium text-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-lg text-muted-foreground">
            O descarte é feito de acordo com as normas ambientais vigentes.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
