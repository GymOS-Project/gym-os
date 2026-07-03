import { Video as LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: { card: 'bg-card', icon: 'bg-muted text-foreground' },
  primary: { card: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800', icon: 'bg-teal-500 text-white' },
  success: { card: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', icon: 'bg-green-500 text-white' },
  warning: { card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', icon: 'bg-amber-500 text-white' },
  destructive: { card: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', icon: 'bg-red-500 text-white' },
};

export function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) {
  const styles = variantStyles[variant];
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
