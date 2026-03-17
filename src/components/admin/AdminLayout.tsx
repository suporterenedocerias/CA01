import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
} from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';

import { ShoppingCart } from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Leads / Pedidos', icon: Users, path: '/admin/leads' },
  { label: 'Pedidos PIX', icon: ShoppingCart, path: '/admin/orders' },
  { label: 'Tamanhos', icon: Package, path: '/admin/sizes' },
  { label: 'WhatsApp', icon: MessageCircle, path: '/admin/whatsapp' },
  { label: 'Contadores', icon: BarChart3, path: '/admin/counters' },
  { label: 'Regiões', icon: MapPin, path: '/admin/regions' },
  { label: 'Configurações', icon: Settings, path: '/admin/settings' },
];

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin');
      }
      setChecking(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate('/admin');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Sidebar */}
      <aside className="w-64 bg-primary flex-col shrink-0 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <img src={logoIcon} alt="Logo" className="h-8 w-8" />
          <span className="font-display text-lg font-bold text-primary-foreground">
            Caçamba<span className="text-accent">Já</span>
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-accent'
                    : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft size={20} />
            Ver Site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden bg-primary p-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary-foreground">
            Caçamba<span className="text-accent">Já</span>
          </span>
          <button onClick={handleLogout} className="text-primary-foreground/70">
            <LogOut size={20} />
          </button>
        </header>

        <nav className="md:hidden flex overflow-x-auto bg-card border-b px-2">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-4 py-3 text-xs whitespace-nowrap shrink-0 ${
                  active ? 'text-accent border-b-2 border-accent' : 'text-muted-foreground'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 p-6 md:p-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
