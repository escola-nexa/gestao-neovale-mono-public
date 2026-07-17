import { useMemo } from 'react';
import { Ticket, AlertTriangle, Timer, CheckCircle2 } from 'lucide-react';
import { differenceInHours, differenceInMinutes, subDays } from 'date-fns';
import { NeovaleStatCard, NeovaleTone } from '@/components/ui/NeovaleStatCard';

interface Props {
  tickets: any[];
  onClickInRisk: () => void;
  onClickOverdue: () => void;
  onClickResolved: () => void;
  onClickOpen: () => void;
  activeKey?: 'open' | 'risk' | 'overdue' | 'resolved' | null;
}

const CLOSED = ['resolvido', 'cancelado'];

export function TicketsKpiBar({ tickets, onClickInRisk, onClickOverdue, onClickResolved, onClickOpen, activeKey }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const open = tickets.filter(t => !CLOSED.includes(t.status));

    const inRisk = open.filter(t => {
      const hours = differenceInHours(now, new Date(t.updated_at || t.created_at));
      return ['critica', 'alta'].includes(t.priority) && hours >= 24;
    }).length;

    const overdue = open.filter(t => {
      const hours = differenceInHours(now, new Date(t.updated_at || t.created_at));
      return hours >= 72;
    }).length;

    const resolved7d = tickets.filter(t => t.status === 'resolvido' && t.closed_at && new Date(t.closed_at) >= weekAgo);
    const avgResolveMin = resolved7d.length > 0
      ? Math.round(resolved7d.reduce((acc, t) => acc + differenceInMinutes(new Date(t.closed_at), new Date(t.created_at)), 0) / resolved7d.length)
      : 0;

    const avgLabel = avgResolveMin > 0
      ? avgResolveMin < 60 ? `${avgResolveMin}min` : avgResolveMin < 1440 ? `${Math.round(avgResolveMin / 60)}h` : `${Math.round(avgResolveMin / 1440)}d`
      : '—';

    const openedThisWeek = tickets.filter(t => new Date(t.created_at) >= weekAgo).length;
    const openedPrevWeek = tickets.filter(t => {
      const d = new Date(t.created_at);
      return d >= subDays(now, 14) && d < weekAgo;
    }).length;
    const delta = openedThisWeek - openedPrevWeek;

    return { open: open.length, inRisk, overdue, resolved7d: resolved7d.length, avgLabel, delta };
  }, [tickets]);

  const cards: Array<{ key: 'open' | 'risk' | 'overdue' | 'resolved'; label: string; value: number; icon: any; tone: NeovaleTone; sub: string; onClick: () => void }> = [
    {
      key: 'open',
      label: 'Em aberto',
      value: stats.open,
      icon: Ticket,
      tone: 'info',
      sub: stats.delta === 0 ? 'estável vs semana ant.' : `${stats.delta > 0 ? '+' : ''}${stats.delta} vs semana ant.`,
      onClick: onClickOpen,
    },
    {
      key: 'risk',
      label: 'SLA em risco',
      value: stats.inRisk,
      icon: AlertTriangle,
      tone: 'warning',
      sub: 'crítica/alta parados >24h',
      onClick: onClickInRisk,
    },
    {
      key: 'overdue',
      label: 'Atrasados',
      value: stats.overdue,
      icon: Timer,
      tone: 'danger',
      sub: 'sem resposta há >72h',
      onClick: onClickOverdue,
    },
    {
      key: 'resolved',
      label: 'Resolvidos (7d)',
      value: stats.resolved7d,
      icon: CheckCircle2,
      tone: 'success',
      sub: `tempo médio: ${stats.avgLabel}`,
      onClick: onClickResolved,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c, i) => (
        <NeovaleStatCard
          key={c.key}
          label={c.label}
          value={c.value}
          description={c.sub}
          icon={c.icon}
          tone={c.tone}
          index={i}
          active={activeKey === c.key}
          onClick={c.onClick}
        />
      ))}
    </div>
  );
}
