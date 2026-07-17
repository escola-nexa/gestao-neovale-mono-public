import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
  index?: number;
}

export function StatCard({ title, value, icon: Icon, description, loading, index = 0 }: StatCardProps) {
  return (
    <NeovaleStatCard
      label={title}
      value={value}
      description={description}
      icon={Icon as any}
      loading={loading}
      index={index}
    />
  );
}
