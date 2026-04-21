import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import NotFound from '@/pages/NotFound';

type CustomPage = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  custom_domain: string | null;
  active: boolean;
};

type Props = {
  /** Passa o slug quando vem da rota /p/:slug */
  slug?: string;
  /** Passa a página já carregada quando vem do DomainGate (evita 2 queries) */
  page?: CustomPage;
};

export default function CustomPageView({ slug, page: pageProp }: Props) {
  const [page, setPage] = useState<CustomPage | null>(pageProp ?? null);
  const [loading, setLoading] = useState(!pageProp);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (pageProp) return;
    if (!slug) { setMissing(true); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setMissing(true); }
      else { setPage(data as CustomPage); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, pageProp]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        A carregar…
      </div>
    );
  }

  if (missing || !page) return <NotFound />;

  const ctaHref = page.cta_url || `/p/${page.slug}/checkout`;
  const ctaLabel = page.cta_label || 'Pedir caçamba agora';

  return (
    <>
      <Helmet>
        <title>{page.seo_title || page.title}</title>
        {page.seo_description && (
          <meta name="description" content={page.seo_description} />
        )}
      </Helmet>

      <div className="flex min-h-[100dvh] flex-col bg-background">
        {/* Hero */}
        <section className="bg-primary px-6 py-20 text-center text-primary-foreground md:py-28">
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
              {page.title}
            </h1>
            {page.subtitle && (
              <p className="text-lg font-medium opacity-90 md:text-xl">{page.subtitle}</p>
            )}
            <div className="pt-4">
              <a
                href={ctaHref}
                className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-bold text-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                {ctaLabel}
              </a>
            </div>
          </div>
        </section>

        {/* Corpo */}
        {page.body && (
          <section className="mx-auto w-full max-w-3xl px-6 py-14">
            <div className="prose prose-zinc max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-300">
              {page.body.split('\n').map((line, i) =>
                line.trim() === '' ? (
                  <br key={i} />
                ) : (
                  <p key={i}>{line}</p>
                ),
              )}
            </div>
          </section>
        )}

        {/* CTA inferior */}
        <section className="mt-auto bg-zinc-100 px-6 py-12 text-center dark:bg-zinc-900">
          <p className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Pronto para solicitar?
          </p>
          <a
            href={ctaHref}
            className="inline-block rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {ctaLabel}
          </a>
        </section>
      </div>
    </>
  );
}
