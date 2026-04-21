import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

type Props = {
  className?: string;
  inverted?: boolean;
  lightOnBrand?: boolean;
};

export function BrandWordmark({ className, inverted, lightOnBrand }: Props) {
  const { site_name } = useSiteSettings();
  const name = site_name || BRAND_NAME;

  // Divide na última palavra para destacar em accent (ex: "Caçamba Minas" → "Caçamba" + "Minas")
  const lastSpace = name.lastIndexOf(' ');
  const part1 = lastSpace > 0 ? name.slice(0, lastSpace) : name;
  const part2 = lastSpace > 0 ? name.slice(lastSpace + 1) : '';

  return (
    <span
      className={cn(
        'font-display text-xl font-bold tracking-tight',
        inverted ? 'text-white' : lightOnBrand ? 'text-primary-foreground' : 'text-foreground',
        className,
      )}
    >
      {part1}{part2 && <>{' '}<span className="text-accent">{part2}</span></>}
    </span>
  );
}
