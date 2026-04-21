import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StatePageProvider } from '@/contexts/StatePageContext';
import { LandingContent } from '@/pages/LandingContent';
import NotFound from '@/pages/NotFound';

export default function StateLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [stateName, setStateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setMissing(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('state_pages')
        .select('name, slug, active')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setMissing(true);
      } else {
        setStateName(data.name);
      }
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

  if (missing || !slug) {
    return <NotFound />;
  }

  const basePath = `/e/${slug}`;

  return (
    <StatePageProvider value={{ slug, stateName, basePath }}>
      <LandingContent />
    </StatePageProvider>
  );
}
