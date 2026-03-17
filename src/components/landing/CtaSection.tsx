import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';

export function CtaSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary via-primary to-primary/90 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <AnimateOnScroll className="text-center max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-primary-foreground mb-6 text-balance">
            Precisa de uma caçamba?<br />
            <span className="text-accent">Peça agora mesmo!</span>
          </h2>
          <p className="text-lg text-primary-foreground/70 mb-10 max-w-xl mx-auto">
            Entrega rápida, preço justo e atendimento humanizado. Solicite pelo WhatsApp e receba sua caçamba hoje.
          </p>
          {available ? (
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
              <Button variant="whatsapp" size="xl" className="text-lg px-12">
                <MessageCircle className="mr-2" size={22} />
                Solicitar Caçamba no WhatsApp
              </Button>
            </a>
          ) : (
            <p className="text-primary-foreground/60 text-sm">WhatsApp indisponível no momento.</p>
          )}
        </AnimateOnScroll>
      </div>
    </section>
  );
}
