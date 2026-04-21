import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useStatePage } from '@/contexts/StatePageContext';
import { BrandWordmark } from '@/components/BrandWordmark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const navHashes = [
  { label: 'Diferenciais', hash: '#prova-diferencial' },
  { label: 'Benefícios', hash: '#beneficios' },
  { label: 'Ofertas', hash: '#ofertas' },
  { label: 'Tamanhos', hash: '#tamanhos' },
  { label: 'Como funciona', hash: '#como-funciona' },
  { label: 'Acompanhamento', hash: '#acompanhamento' },
  { label: 'Contato', hash: '#contato' },
];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const { basePath } = useStatePage();

  const isCheckoutPage =
    location.pathname === '/checkout' || /^\/e\/[^/]+\/checkout\/?$/.test(location.pathname);

  const navLinks = useMemo(
    () => navHashes.map((item) => ({ ...item, href: basePath ? `${basePath}${item.hash}` : item.hash })),
    [basePath],
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onHero = !isScrolled && !isCheckoutPage;
  const headerSolid = isScrolled || isCheckoutPage;

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        headerSolid ? 'bg-background/95 shadow-md backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-3 md:h-20">
        <Link to={basePath || '/'} className="flex shrink-0 items-center gap-2.5">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl shadow-md ring-2 ring-white/25',
              onHero ? 'bg-white/15 text-white' : 'bg-primary text-primary-foreground',
            )}
          >
            <Truck className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <BrandWordmark inverted={onHero} className="text-lg md:text-xl" />
        </Link>

        <nav className="hidden items-center gap-5 xl:gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors',
                onHero ? 'text-white/85 hover:text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </a>
          ))}
          <ThemeToggle variant={onHero ? 'onDark' : 'default'} className="shrink-0" />
          {available && (
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
              <Button variant="whatsapp" size="default" className="shrink-0">
                WhatsApp
              </Button>
            </a>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 md:hidden">
          <ThemeToggle variant={onHero ? 'onDark' : 'default'} />
          <button
            type="button"
            className={cn('p-2', onHero ? 'text-white' : 'text-foreground')}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-b bg-background shadow-lg md:hidden">
          <nav className="container flex flex-col gap-4 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-medium text-foreground transition-colors hover:text-foreground/80"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {available && (
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
                <Button variant="whatsapp" size="lg" className="w-full">
                  Falar no WhatsApp
                </Button>
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
