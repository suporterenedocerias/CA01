import { useMemo } from 'react';
import { Truck } from 'lucide-react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { BRAND_TAGLINE } from '@/lib/brand';
import { useStatePage } from '@/contexts/StatePageContext';

const footerHashes = [
  { label: 'Diferenciais', hash: '#prova-diferencial' },
  { label: 'Por que escolher', hash: '#beneficios' },
  { label: 'Ofertas', hash: '#ofertas' },
  { label: 'Tamanhos e preços', hash: '#tamanhos' },
  { label: 'Como funciona', hash: '#como-funciona' },
  { label: 'Acompanhamento do pedido', hash: '#acompanhamento' },
  { label: 'Pedido online', hash: '#contato' },
];

export function SiteFooter() {
  const { basePath } = useStatePage();
  const links = useMemo(
    () => footerHashes.map((item) => ({ ...item, href: basePath ? `${basePath}${item.hash}` : item.hash })),
    [basePath],
  );

  return (
    <footer className="bg-primary py-14">
      <div className="container">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground shadow-md">
                <Truck className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <BrandWordmark lightOnBrand className="text-lg" />
            </div>
            <p className="max-w-xs text-sm text-primary-foreground/70">{BRAND_TAGLINE}</p>
          </div>

          <div>
            <h4 className="mb-4 font-display font-bold text-primary-foreground">Links</h4>
            <ul className="space-y-2 text-sm">
              {links.map((item) => (
                <li key={item.hash}>
                  <a href={item.href} className="text-primary-foreground/65 transition-colors hover:text-primary-foreground">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display font-bold text-primary-foreground">Horário</h4>
            <div className="space-y-2 text-sm text-primary-foreground/65">
              <p>Segunda a sexta: 7h às 20h</p>
              <p>Sábado: 7h às 20h</p>
              <p>Emergência: 24h</p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 pt-8 text-center">
          <p className="text-sm text-primary-foreground/45">
            © {new Date().getFullYear()} Entulho Hoje. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
