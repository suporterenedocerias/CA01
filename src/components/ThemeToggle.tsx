import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  /** No hero (fundo escuro): ícones claros */
  variant?: 'default' | 'onDark';
  className?: string;
};

export function ThemeToggle({ variant = 'default', className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className={cn('inline-flex h-10 w-10 shrink-0', className)} aria-hidden />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        variant === 'onDark' && 'text-white hover:bg-white/15 hover:text-white',
        className,
      )}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
