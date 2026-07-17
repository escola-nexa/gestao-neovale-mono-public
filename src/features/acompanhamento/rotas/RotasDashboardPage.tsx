import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rotasApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';
import { Loader2, ArrowLeft, Route as RouteIcon, Gauge, DollarSign, CheckCircle2, MapPin, TrendingDown, Trophy, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { type VisitRoute, type VisitRouteSchool, statusLabel } from './types';

interface SupervisorAgg {
  id: string;
  name: string;
  routes: number;
  km: number;
  finalized: number;
  cost: number;
}

export default function RotasDashboardPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<VisitRoute[]>([]);
  const [stops, setStops] = useState<VisitRouteSchool[]>([]);
  const [supervisors, setSupervisors] = useState<Record<string, string>>({});

  useEffect(() => { if (organizationId) load(); }, [organizationId]);

  const load = async () => {
    setLoading(true);
    const { routes, stops, supervisors } = await rotasApi.getDashboardData(organizationId!);
    setRoutes(routes);
    setStops(stops);
    setSupervisors(supervisors);
    setLoading(false);
  };

  const kpis = useMemo(() => {
    const total = routes.length;
    const finalized = routes.filter(r => r.status === 'finalizada').length;
    const inProgress = routes.filter(r => r.status === 'em_andamento').length;
    const planned = routes.filter(r => r.status === 'planejada').length;
    const kmPlanned = routes.reduce((a, r) => a + Number(r.total_km || 0), 0);
    const costPlanned = routes.reduce((a, r) => a + Number(r.total_estimated_cost || 0), 0);
    const visitsCompleted = stops.filter(s => s.check_out_at).length;
    const visitsTotal = stops.length;
    const occurrences = stops.filter(s => s.occurrence_type).length;
    const avgCostPerSchool = visitsTotal ? costPlanned / visitsTotal : 0;
    return { total, finalized, inProgress, planned, kmPlanned, costPlanned, visitsCompleted, visitsTotal, occurrences, avgCostPerSchool };
  }, [routes, stops]);

  const efficiencyData = useMemo(() => {
    const grades = ['A+', 'A', 'B', 'C', 'D'];
    return grades.map(g => ({
      grade: g,
      count: routes.filter(r => r.efficiency_score === g).length,
    }));
  }, [routes]);

  const statusData = useMemo(() => [
    { name: 'Planejadas', value: kpis.planned, color: 'hsl(217, 91%, 60%)' },
    { name: 'Em Andamento', value: kpis.inProgress, color: 'hsl(38, 92%, 50%)' },
    { name: 'Finalizadas', value: kpis.finalized, color: 'hsl(142, 71%, 45%)' },
  ].filter(s => s.value > 0), [kpis]);

  const supervisorRanking: SupervisorAgg[] = useMemo(() => {
    const map = new Map<string, SupervisorAgg>();
    routes.forEach(r => {
      if (!r.supervisor_id) return;
      const existing = map.get(r.supervisor_id) ?? {
        id: r.supervisor_id, name: supervisors[r.supervisor_id] ?? '—',
        routes: 0, km: 0, finalized: 0, cost: 0,
      };
      existing.routes += 1;
      existing.km += Number(r.total_km || 0);
      existing.cost += Number(r.total_estimated_cost || 0);
      if (r.status === 'finalizada') existing.finalized += 1;
      map.set(r.supervisor_id, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.finalized - a.finalized || b.routes - a.routes)
      .slice(0, 10);
  }, [routes, supervisors]);

  const topCities = useMemo(() => {
    const map = new Map<string, number>();
    stops.forEach(s => {
      if (!s.city) return;
      map.set(s.city, (map.get(s.city) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([city, n]) => ({ city, count: n }))
      .sort((a, b) => b.count - a.count).slice(0, 8);
  }, [stops]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      <PageHeader title="Dashboard de Rotas" description="Visão executiva consolidada de visitas e supervisão de campo"
        actions={<Button variant="outline" onClick={() => navigate('/acompanhamento/rotas')}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeovaleStatCard label="Total de rotas" value={kpis.total} icon={RouteIcon} tone="neutral" />
        <NeovaleStatCard label="Finalizadas" value={kpis.finalized} icon={CheckCircle2} tone="success" />
        <NeovaleStatCard label="Em andamento" value={kpis.inProgress} icon={RouteIcon} tone="warning" />
        <NeovaleStatCard label="Planejadas" value={kpis.planned} icon={MapPin} tone="info" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeovaleStatCard label="KM planejados" value={Math.round(kpis.kmPlanned)} icon={Gauge} tone="neutral" />
        <NeovaleStatCard label="Custo estimado" value={`R$ ${kpis.costPlanned.toFixed(0)}`} icon={DollarSign} tone="neutral" />
        <NeovaleStatCard label="Visitas concluídas" value={`${kpis.visitsCompleted}/${kpis.visitsTotal}`} icon={CheckCircle2} tone="success" />
        <NeovaleStatCard label="Custo médio/escola" value={`R$ ${kpis.avgCostPerSchool.toFixed(2)}`} icon={TrendingDown} tone="info" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {statusData.length === 0 ? <div className="text-center text-sm text-muted-foreground py-10">Sem dados</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Score de eficiência</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" />Ranking de supervisores</CardTitle></CardHeader>
        <CardContent>
          {supervisorRanking.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">Nenhuma rota com supervisor</div>
          ) : (
            <div className="space-y-2">
              {supervisorRanking.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-md border">
                  <Badge variant={i < 3 ? 'default' : 'outline'} className="w-8 justify-center">{i + 1}º</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.routes} rotas · {s.finalized} finalizadas · {Math.round(s.km)} km · R$ {s.cost.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top municípios visitados</CardTitle></CardHeader>
          <CardContent>
            {topCities.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">Sem dados</div>
            ) : (
              <div className="space-y-2">
                {topCities.map(c => (
                  <div key={c.city} className="flex items-center gap-3">
                    <div className="flex-1 text-sm truncate">{c.city}</div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(c.count / topCities[0].count) * 100}%` }} />
                    </div>
                    <Badge variant="outline">{c.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" />Ocorrências em campo</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.occurrences}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Total de ocorrências registradas no check-out das visitas. Use para identificar escolas com problemas recorrentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
