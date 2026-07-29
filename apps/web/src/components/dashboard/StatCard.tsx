import { cn } from '@/lib/utils';
import { STAT_CARD_VARIANT_STYLES } from '@/utils/constants';

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) {
  const styles = STAT_CARD_VARIANT_STYLES[variant];
  return (
    <div className={cn('rounded-xl border p-5 transition-all hover:shadow-md', styles.card)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
