import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { ContactFormSection } from '@/components/landing/ContactFormSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';
import { StatePageProvider } from '@/contexts/StatePageContext';
import NotFound from '@/pages/NotFound';

type CustomPageMeta = {
  slug: string;
  title: string;
  gateway_type: string | null;
};

/**
 * Checkout dedicado para páginas customizadas (/p/:slug/checkout).
 * Passa o page_slug para a API, que busca as chaves do gateway
 * configuradas naquela página.
 */
export default function CustomPageCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CustomPageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) { setMissing(true); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('custom_pages')
        .select('slug, title, gateway_type')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) setMissing(true);
      else setPage(data as CustomPageMeta);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        A carregar…
      </div>
    );
  }

  if (missing || !page) return <NotFound />;

  return (
    <StatePageProvider value={{ slug: null, stateName: page.title, basePath: `/p/${slug}` }}>
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="pt-16 md:pt-20">
          <div className="border-b border-border bg-muted/40">
            <div className="container flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <Link
                to={`/p/${slug}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                ← Voltar
              </Link>
              <span className="text-muted-foreground">Checkout — {page.title}</span>
            </div>
          </div>
          {/* ContactFormSection já usa page_slug do contexto de URL via useParams internamente,
              ou podemos passar via prop. O API recebe page_slug no body. */}
          <ContactFormSection pageSlug={slug!} />
        </div>
        <SiteFooter />
        <WhatsAppFloatingButton />
      </div>
    </StatePageProvider>
  );
}
