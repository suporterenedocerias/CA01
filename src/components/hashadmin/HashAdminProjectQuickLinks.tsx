import type { HashAdminInstance } from '@/lib/hashadmin-config';
import {
  ArrowUpRight,
  Globe,
  LayoutDashboard,
  Users,
  ShoppingCart,
  Tag,
  Package,
  MessageCircle,
  Settings,
  MapPin,
  BarChart3,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS: { path: string; label: string; Icon: typeof Globe }[] = [
  { path: '', label: 'Site público', Icon: Globe },
  { path: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/admin/leads', label: 'Leads / pedidos', Icon: Users },
  { path: '/admin/funcionarios', label: 'Funcionários', Icon: UserCog },
  { path: '/admin/orders', label: 'Pedidos PIX', Icon: ShoppingCart },
  { path: '/admin/offers', label: 'Ofertas', Icon: Tag },
  { path: '/admin/sizes', label: 'Tamanhos', Icon: Package },
  { path: '/admin/whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { path: '/admin/regions', label: 'Regiões', Icon: MapPin },
  { path: '/admin/counters', label: 'Contadores', Icon: BarChart3 },
  { path: '/admin/settings', label: 'Configurações', Icon: Settings },
];

type Props = {
  inst: HashAdminInstance;
  /** Mais compacto (uma linha que quebra) */
  variant?: 'grid' | 'compact';
  className?: string;
};

export function HashAdminProjectQuickLinks({ inst, variant = 'grid', className }: Props) {
  const origin = inst.siteOrigin.replace(/\/$/, '');

  return (
    <div
      className={cn(
        variant === 'grid'
          ? 'flex flex-wrap gap-2'
          : 'flex flex-wrap gap-1.5',
        className,
      )}
    >
      {LINKS.map(({ path, label, Icon }) => {
        const href = path ? `${origin}${path}` : origin;
        return (
          <a
            key={path || 'root'}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors',
              variant === 'grid'
                ? 'border-zinc-600 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-400 hover:bg-zinc-800 hover:text-white'
                : 'border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-500 hover:text-white',
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {label}
            <ArrowUpRight className="size-3 shrink-0 opacity-50" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}
