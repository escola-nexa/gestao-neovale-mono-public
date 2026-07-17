import { useNavigate } from 'react-router-dom';
import { School, FileText, ClipboardList, Clock, BookOpen } from 'lucide-react';
import { NeovaleStatCard, NeovaleTone } from '@/components/ui/NeovaleStatCard';
import type { RoleSummary } from '../hooks/useProfileData';

interface Props {
  role: string;
  summary: RoleSummary;
}

interface StatItem {
  label: string;
  value: number;
  icon: any;
  route?: string;
  tone: NeovaleTone;
}

export function RoleSummaryCards({ role, summary }: Props) {
  const navigate = useNavigate();
  const stats: StatItem[] = [];

  if (role === 'admin' || role === 'coordenador' || role === 'rh') {
    stats.push(
      { label: 'Escolas', value: summary.schools_count, icon: School, route: '/escolas', tone: 'info' },
      { label: 'Planej. Pendentes', value: summary.plannings_pending, icon: FileText, route: '/planejamento', tone: 'warning' },
      { label: 'Orient. Pendentes', value: summary.orientations_pending, icon: ClipboardList, route: '/orientacoes', tone: 'neutral' },
    );
  }

  if (role === 'professor') {
    stats.push(
      { label: 'Aulas Hoje', value: summary.classes_today, icon: Clock, route: '/frequencia', tone: 'success' },
      { label: 'Aulas/Semana', value: summary.schedule_count, icon: BookOpen, route: '/grade-horaria', tone: 'info' },
      { label: 'Planej. Pendentes', value: summary.plannings_pending, icon: FileText, route: '/planejamento', tone: 'warning' },
      { label: 'Orient. Pendentes', value: summary.orientations_pending, icon: ClipboardList, route: '/orientacoes', tone: 'neutral' },
    );
  }

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <NeovaleStatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          tone={stat.tone}
          compact
          index={i}
          onClick={stat.route ? () => navigate(stat.route!) : undefined}
        />
      ))}
    </div>
  );
}
