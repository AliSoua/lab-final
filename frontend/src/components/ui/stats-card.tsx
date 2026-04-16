// src/components/ui/stats-card.tsx
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatsCard({ icon: Icon, label, value, trend, className }: StatsCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {trend && (
              <span className={cn('text-xs', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}