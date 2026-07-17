import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rotasApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, MapPin, Calendar, Gauge, ExternalLink, Play, CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { statusBadge, statusLabel, type VisitRoute, type VisitRouteSchool, type RouteStatus } from './types';
import { useRouteMap } from './hooks/useRouteMap';

export default function RotaDetalhePage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [route, setRoute] = useState<VisitRoute | null>(null);
  const [stops, setStops] = useState<(VisitRouteSchool & { school?: { nome: string; cidade: string; endereco: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapPoints = useMemo(() =>
    stops.filter(s => s.lat != null && s.lng != null)
      .map((s, i) => ({ lat: s.lat!, lng: s.lng!, label: String(i + 1), title: s.school?.nome ?? '' })),
    [stops]);
  useRouteMap(mapRef, mapPoints);

  useEffect(() => { if (routeId) load(); }, [routeId]);

  const load = async () => {
    setLoading(true);
    const { route: r, stops: s } = await rotasApi.getRouteDetails(routeId!);
    setRoute(r);
    setStops(s);
    setLoading(false);
  };

  const setStatus = async (status: RouteStatus) => {
    try {
      await rotasApi.updateRouteStatus(routeId!, status);
    } catch (error: any) { toast.error(error.message); return; }
    toast.success('Status atualizado');
    load();
  };

  const mapsUrl = useMemo(() => {
    if (!route || !stops.length) return null;
    const origin = route.departure_point ? encodeURIComponent(route.departure_point) : '';
    const addrs = stops.map(s => `${s.school?.endereco ?? ''}, ${s.city ?? ''}`).map(encodeURIComponent);
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${addrs[addrs.length - 1]}${addrs.length > 1 ? `&waypoints=${addrs.slice(0, -1).join('|')}` : ''}&travelmode=driving`;
  }, [route, stops]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!route) return <div className="p-6">Rota não encontrada.</div>;

  const stopsByDay = stops.reduce((acc: Record<string, typeof stops>, s) => {
    const k = s.planned_date ?? 'sem-data';
    (acc[k] ||= []).push(s); return acc;
  }, {});

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <PageHeader title={route.name} description={`${stops.length} escolas · ${Math.round(Number(route.total_km))} km`}
        actions={<>
          <Button variant="outline" onClick={() => navigate('/acompanhamento/rotas')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          {route.status !== 'cancelada' && (
            <Button onClick={() => navigate(`/acompanhamento/rotas/${routeId}/execucao`)}>
              <ClipboardCheck className="h-4 w-4 mr-1" />Executar em campo
            </Button>
          )}
          {mapsUrl && <Button variant="outline" asChild><a href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Abrir no Google Maps</a></Button>}
        </>} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusBadge[route.status]}>{statusLabel[route.status]}</Badge>
        {route.efficiency_score && <Badge variant="secondary">Score {route.efficiency_score}</Badge>}
        <span className="text-sm text-muted-foreground"><Calendar className="inline h-3 w-3 mr-1" />{format(new Date(route.start_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })} → {format(new Date(route.end_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</span>
        <div className="ml-auto flex gap-2">
          {route.status === 'planejada' && <Button size="sm" onClick={() => setStatus('em_andamento')}><Play className="h-3 w-3 mr-1" />Iniciar</Button>}
          {route.status === 'em_andamento' && <Button size="sm" onClick={() => setStatus('finalizada')}><CheckCircle2 className="h-3 w-3 mr-1" />Finalizar</Button>}
          {route.status !== 'finalizada' && route.status !== 'cancelada' &&
            <Button size="sm" variant="outline" onClick={() => setStatus('cancelada')}><XCircle className="h-3 w-3 mr-1" />Cancelar</Button>}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">KM</div><div className="text-xl font-bold">{Math.round(Number(route.total_km))}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Desloc.</div><div className="text-xl font-bold">{(Number(route.total_travel_minutes) / 60).toFixed(1)}h</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Visitas</div><div className="text-xl font-bold">{stops.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Custo</div><div className="text-xl font-bold">R$ {Number(route.total_estimated_cost).toFixed(2)}</div></CardContent></Card>
      </div>

      {mapPoints.length > 0 && <div ref={mapRef} className="w-full h-80 rounded-md border" />}

      <div className="space-y-4">
        {Object.entries(stopsByDay).map(([day, list]) => (
          <Card key={day}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{day === 'sem-data' ? 'Sem data' : format(new Date(day + 'T12:00:00'), "EEEE, dd/MM/yyyy", { locale: ptBR })}</h3>
              <div className="space-y-2">
                {list.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-3 border-l-2 border-primary pl-3 py-1">
                    <Badge variant="outline">{i + 1}</Badge>
                    <div className="flex-1">
                      <div className="font-medium">{s.school?.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        <MapPin className="inline h-3 w-3 mr-1" />{s.city}
                        {s.planned_arrival && <> · {s.planned_arrival.slice(0, 5)} → {s.planned_departure?.slice(0, 5)}</>}
                        {s.distance_from_previous_km > 0 && <> · <Gauge className="inline h-3 w-3 mr-1" />{s.distance_from_previous_km.toFixed(1)} km</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
