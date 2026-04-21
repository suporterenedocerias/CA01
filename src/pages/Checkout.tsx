import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatePageProvider } from '@/contexts/StatePageContext';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { ContactFormSection } from '@/components/landing/ContactFormSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';
import NotFound from '@/pages/NotFound';

/**
 * Página dedicada de checkout (pedido + PIX), mesmo visual da landing.
 * Rotas: `/checkout` e `/e/:slug/checkout`.
 */
export default function Checkout() {
  const { slug } = useParams<{ slug?: string }>();
  const [stateName, setStateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('state_pages')
        .select('name, slug, active')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) setMissing(true);
      else setStateName(data.name);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        A carregar…
      </div>
    );
  }

  if (slug && missing) return <NotFound />;

  const basePath = slug ? `/e/${slug}` : '';

  return (
    <StatePageProvider value={{ slug: slug ?? null, stateName, basePath }}>
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="pt-16 md:pt-20">
          <div className="border-b border-border bg-muted/40">
            <div className="container flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <Link
                to={basePath || '/'}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                ← Voltar ao site
              </Link>
              <span className="text-muted-foreground">Checkout, pedido online</span>
            </div>
          </div>
          <ContactFormSection />
        </div>
        <SiteFooter />
        <WhatsAppFloatingButton />
      </div>
    </StatePageProvider>
  );
}
