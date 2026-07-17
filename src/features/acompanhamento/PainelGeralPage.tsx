import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { acompanhamentoApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, MapPin, Truck, CheckCircle2, Clock, BarChart3 } from 'lucide-react';

export default function PainelGeralPage() {
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visits: 0, visitsCompleted: 0, visitsInProgress: 0, deliveries: 0, deliveriesCompleted: 0, deliveriesInProgress: 0, citiesServed: 0, schoolsVisited: 0 });

  useEffect(() => { loadStats(); }, [organizationId]);

  const loadStats = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const dashboardStats = await acompanhamentoApi.getGeneralDashboardStats(organizationId);
      setStats(dashboardStats);
    } catch { } finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const cards = [
    { label: 'Visitas Totais', value: stats.visits, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Visitas Concluídas', value: stats.visitsCompleted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Visitas em Andamento', value: stats.visitsInProgress, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Entregas Totais', value: stats.deliveries, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    { label: 'Entregas Concluídas', value: stats.deliveriesCompleted, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
    { label: 'Entregas em Andamento', value: stats.deliveriesInProgress, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10' },
    { label: 'Cidades Atendidas', value: stats.citiesServed, icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
    { label: 'Escolas Visitadas', value: stats.schoolsVisited, icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Acompanhamento', href: '/acompanhamento' }, { label: 'Painel Geral' }]}
        title="Painel Geral — Acompanhamento Escolar"
        description="Indicadores consolidados de visitas e entregas"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (<Card key={c.label}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`h-5 w-5 ${c.color}`} /></div><div><p className={`text-2xl font-bold ${c.color}`}>{c.value}</p><p className="text-xs text-muted-foreground">{c.label}</p></div></div></CardContent></Card>);
        })}
      </div>
    </div>
  );
}
