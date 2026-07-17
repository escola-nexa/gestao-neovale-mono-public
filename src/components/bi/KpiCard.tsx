import { LucideIcon } from 'lucide-react';
import { NeovaleStatCard, NeovaleTone } from '@/components/ui/NeovaleStatCard';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
  className?: string;
}

const variantToTone: Record<NonNullable<KpiCardProps['variant']>, NeovaleTone> = {
  default: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

export function KpiCard({ title, value, subtitle, icon, trend, variant = 'default', loading, className }: KpiCardProps) {
  return (
    <NeovaleStatCard
      label={title}
      value={value}
      description={subtitle}
      icon={icon}
      tone={variantToTone[variant]}
      trend={trend}
      loading={loading}
      className={className}
    />
  );
}
