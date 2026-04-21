import { MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';

const bullets = ['Resposta rápida', 'Preço transparente', 'Entrega no mesmo dia'];

export function CtaSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-emerald-900 to-primary py-20 md:py-28">
      <div className="absolute inset-0 opacity-[0.12]">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="container relative z-10">
        <AnimateOnScroll className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Contato</span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-balance text-primary-foreground md:text-5xl">
            Precisa de caçamba agora?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            Fale conosco e combine entrega no prazo que você precisa.
          </p>

          <ul className="mx-auto mt-8 flex flex-col items-center gap-2 text-primary-foreground/90 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-6">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm font-medium md:text-base">
                <Check className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} />
                {b}
              </li>
            ))}
          </ul>

          {available ? (
            <a
              className="mt-10 inline-block"
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackClick}
            >
              <Button variant="whatsapp" size="xl" className="px-12 text-lg">
                <MessageCircle className="mr-2" size={22} />
                Solicitar agora
              </Button>
            </a>
          ) : (
            <p className="mt-6 text-sm text-primary-foreground/60">WhatsApp indisponível no momento.</p>
          )}
        </AnimateOnScroll>
      </div>
    </section>
  );
}
