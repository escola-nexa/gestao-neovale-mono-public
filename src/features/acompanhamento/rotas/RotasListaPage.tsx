import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rotasApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';
import { Plus, MapPin, Eye, Loader2, Route as RouteIcon, Search, Calendar, Gauge, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type VisitRoute, statusLabel, statusBadge, type RouteStatus } from './types';

export default function RotasListaPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [routes, setRoutes] = useState<VisitRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RouteStatus | 'todas'>('planejada');
  const [search, setSearch] = useState('');

  useEffect(() => { if (organizationId) load(); }, [organizationId]);

  const load = async () => {
    setLoading(true);
    const data = await rotasApi.listRoutes(organizationId!);
    setRoutes(data);
    setLoading(false);
  };

  const filtered = routes
    .filter(r => tab === 'todas' ? true : r.status === tab)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    planejada: routes.filter(r => r.status === 'planejada').length,
    em_andamento: routes.filter(r => r.status === 'em_andamento').length,
    finalizada: routes.filter(r => r.status === 'finalizada').length,
    totalKm: routes.reduce((a, r) => a + Number(r.total_km || 0), 0),
  };

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-7xl">
      <PageHeader title="Rotas de Visitas" description="Planejador inteligente de rotas educacionais"
        actions={<>
          <Button variant="outline" onClick={() => navigate('/acompanhamento/rotas/dashboard')}><BarChart3 className="h-4 w-4 mr-2" />Dashboard</Button>
          <Button onClick={() => navigate('/acompanhamento/rotas/nova')}><Plus className="h-4 w-4 mr-2" />Nova Rota</Button>
        </>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeovaleStatCard label="Planejadas" value={counts.planejada} icon={Calendar} tone="info" />
        <NeovaleStatCard label="Em andamento" value={counts.em_andamento} icon={RouteIcon} tone="warning" />
        <NeovaleStatCard label="Finalizadas" value={counts.finalizada} icon={MapPin} tone="success" />
        <NeovaleStatCard label="KM planejados" value={Math.round(counts.totalKm)} icon={Gauge} tone="neutral" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="planejada">Planejadas</TabsTrigger>
          <TabsTrigger value="em_andamento">Em Andamento</TabsTrigger>
          <TabsTrigger value="finalizada">Finalizadas</TabsTrigger>
          <TabsTrigger value="cancelada">Canceladas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar pelo nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma rota encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className="hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/acompanhamento/rotas/${r.id}`)}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{r.name}</h3>
                    <Badge className={statusBadge[r.status]}>{statusLabel[r.status]}</Badge>
                    {r.legacy_visit_id && <Badge variant="outline" className="text-xs">Legada</Badge>}
                    {r.efficiency_score && <Badge variant="secondary">Score {r.efficiency_score}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                    <span><Calendar className="inline h-3 w-3 mr-1" />{format(new Date(r.start_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} → {format(new Date(r.end_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span><Gauge className="inline h-3 w-3 mr-1" />{Math.round(Number(r.total_km))} km</span>
                    <span>R$ {Number(r.total_estimated_cost).toFixed(2)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
