/**
 * DomainGate
 *
 * Verifica ao carregar a app se o hostname atual corresponde a um
 * "custom_domain" cadastrado na tabela `custom_pages`.
 *
 * Se sim → renderiza direto a CustomPageView (sem mudar a URL).
 * Se não → renderiza os filhos normalmente (routing padrão da app).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CustomPageView from '@/pages/CustomPageView';

/** Domínios que pertencem à instalação principal — nunca tratados como custom. */
const MAIN_DOMAINS = [
  'cacamba.store',
  'www.cacamba.store',
  'localhost',
  '127.0.0.1',
  '187.77.252.82',
];

function isMainDomain(hostname: string) {
  if (MAIN_DOMAINS.includes(hostname)) return true;
  // Qualquer subdomínio de cacamba.store também é principal
  if (hostname.endsWith('.cacamba.store')) return true;
  // IPs locais
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true;
  return false;
}

type CustomPage = Parameters<typeof CustomPageView>[0]['page'];

type State =
  | { status: 'checking' }
  | { status: 'main' }
  | { status: 'custom'; page: CustomPage };

export function DomainGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'checking' });

  useEffect(() => {
    const hostname = window.location.hostname;

    if (isMainDomain(hostname)) {
      setState({ status: 'main' });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('custom_domain', hostname)
        .eq('active', true)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setState({ status: 'custom', page: data as CustomPage });
      } else {
        // Domínio não cadastrado → mostra app normalmente
        setState({ status: 'main' });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (state.status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        A carregar…
      </div>
    );
  }

  if (state.status === 'custom') {
    return <CustomPageView page={state.page} />;
  }

  return <>{children}</>;
}
