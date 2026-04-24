import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, isSupabaseClientConfigured } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Users,
  Package,
  MessageCircle,
  BarChart3,
  MapPin,
  LogOut,
  ChevronLeft,
  Settings,
  Tag,
  ShoppingCart,
  Truck,
  UserCog,
  TrendingUp,
  Landmark,
  FileText,
} from 'lucide-react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { isAdminLocalBypass } from '@/lib/admin-local-bypass';
import { DEFAULT_ADMIN_EMAIL, DEFAULT_DEV_ADMIN_PASSWORD } from '@/lib/admin-login';

const menuSections = [
  {
    label: 'Vendas',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { label: 'Leads / Contatos', icon: Users, path: '/admin/leads' },
      { label: 'Pedidos PIX', icon: ShoppingCart, path: '/admin/orders' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Tamanhos', icon: Package, path: '/admin/sizes' },
      { label: 'Ofertas', icon: Tag, path: '/admin/offers' },
    ],
  },
  {
    label: 'Checkout & Gateway',
    items: [
      { label: 'Páginas', icon: FileText, path: '/admin/custom-pages' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Tráfego & ROAS', icon: TrendingUp, path: '/admin/traffic' },
      { label: 'Taxa Gateway', icon: Landmark, path: '/admin/gateway-fees' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'WhatsApp', icon: MessageCircle, path: '/admin/whatsapp' },
      { label: 'Contadores', icon: BarChart3, path: '/admin/counters' },
      { label: 'Regiões', icon: MapPin, path: '/admin/regions' },
    ],
  },
  {
    label: 'Equipa',
    items: [
      { label: 'Funcionários', icon: UserCog, path: '/admin/funcionarios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Configurações', icon: Settings, path: '/admin/settings' },
    ],
  },
];

// Lista plana para o menu mobile (scroll horizontal)
const menuItems = menuSections.flatMap((s) => s.items);

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function tryDevAutoLogin(): Promise<void> {
      if (!import.meta.env.DEV || !isSupabaseClientConfigured()) return;
      const email =
        (import.meta.env.VITE_DEV_ADMIN_EMAIL as string | undefined)?.trim() || DEFAULT_ADMIN_EMAIL;
      const password =
        (import.meta.env.VITE_DEV_ADMIN_PASSWORD as string | undefined)?.trim() ||
        DEFAULT_DEV_ADMIN_PASSWORD;
      if (!email || !password) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) console.warn('[dev] Login automático do admin falhou:', error.message);
    }

    async function resolveSession(): Promise<boolean> {
      for (let i = 0; i < 4; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return true;
        if (i < 3) await new Promise((r) => setTimeout(r, 200));
      }
      return false;
    }

    (async () => {
      if (isAdminLocalBypass()) {
        await tryDevAutoLogin();
        if (cancelled) return;
        setChecking(false);
        return;
      }

      const ok = await resolveSession();
      if (cancelled) return;
      if (!ok) navigate('/admin/login', { replace: true });
      setChecking(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') navigate('/', { replace: true });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-[100dvh] w-full max-w-full flex-1 overflow-x-hidden bg-muted text-foreground">
      {/* Sidebar — mesma cor à direita evita fuga de 1px (linha branca) no seam */}
      <aside className="relative z-[1] hidden w-64 shrink-0 flex-col bg-primary shadow-[1px_0_0_0_hsl(var(--primary))] md:flex md:flex-col">
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary shadow-md">
            <Truck className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <BrandWordmark lightOnBrand className="text-lg" />
        </div>

        <nav className="flex-1 px-3 overflow-y-auto space-y-4 py-2">
          {menuSections.map((section) => (
            <div key={section.label}>
              <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/40 select-none">
                {section.label}
              </p>
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/15 text-primary-foreground'
                        : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3">
          <div className="mb-1 flex justify-center px-2">
            <ThemeToggle className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft size={20} />
            Ver Site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-300 transition-colors hover:bg-red-950/50 hover:text-red-100"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-0 flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-muted text-foreground">
        <header className="flex items-center justify-between gap-2 bg-primary p-4 md:hidden">
          <BrandWordmark lightOnBrand className="text-lg" />
          <div className="flex items-center gap-0.5">
            <ThemeToggle className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" />
            <button type="button" onClick={handleLogout} className="p-2 text-primary-foreground/70" aria-label="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <nav className="md:hidden flex overflow-x-auto bg-primary border-b border-primary-foreground/10 px-2">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-4 py-3 text-xs whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-primary-foreground border-b-2 border-primary-foreground'
                    : 'text-primary-foreground/75'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 p-6 md:p-8">
          <h1 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
