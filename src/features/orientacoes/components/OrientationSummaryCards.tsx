import { CalendarDays, Clock, PenLine, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { NeovaleStatCard, NeovaleTone } from '@/components/ui/NeovaleStatCard';

interface Stats {
  hoje: number;
  agendados: number;
  aguardando: number;
  emAtraso: number;
  assinado: number;
  cancelado: number;
}

interface OrientationSummaryCardsProps {
  stats: Stats;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function OrientationSummaryCards({ stats, activeTab, setActiveTab }: OrientationSummaryCardsProps) {
  const items: Array<{ key: string; tab: string; label: string; value: number; icon: any; tone: NeovaleTone }> = [
    { key: 'today', tab: 'today', label: 'Hoje', value: stats.hoje, icon: CalendarDays, tone: 'neutral' },
    { key: 'scheduled', tab: 'scheduled', label: 'Agendados', value: stats.agendados, icon: Clock, tone: 'info' },
    { key: 'awaiting', tab: 'awaiting', label: 'Ag. Assinatura', value: stats.aguardando, icon: PenLine, tone: 'warning' },
    { key: 'overdue', tab: 'overdue', label: 'Em Atraso', value: stats.emAtraso, icon: AlertCircle, tone: 'danger' },
    { key: 'signed', tab: 'signed', label: 'Assinadas', value: stats.assinado, icon: CheckCircle2, tone: 'success' },
    { key: 'cancelled', tab: 'cancelled', label: 'Canceladas', value: stats.cancelado, icon: X, tone: 'neutral' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
      {items.map((it, i) => (
        <NeovaleStatCard
          key={it.key}
          label={it.label}
          value={it.value}
          icon={it.icon}
          tone={it.tone}
          compact
          index={i}
          active={activeTab === it.tab}
          onClick={() => setActiveTab(it.tab)}
        />
      ))}
    </div>
  );
}
