import { Video as LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: { card: 'bg-card', icon: 'bg-muted text-foreground' },
  primary: { card: 'border-primary/20 bg-primary/10', icon: 'gradient-primary text-primary-foreground' },
  success: { card: 'border-success/20 bg-success/10', icon: 'bg-success text-success-foreground' },
  warning: { card: 'border-warning/20 bg-warning/10', icon: 'bg-warning text-warning-foreground' },
  destructive: { card: 'border-destructive/20 bg-destructive/10', icon: 'bg-destructive text-destructive-foreground' },
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
