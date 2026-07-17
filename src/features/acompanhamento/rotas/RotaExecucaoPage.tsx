import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rotasApi } from './api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, MapPin, Play, CheckCircle2, Clock, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statusBadge, statusLabel, type VisitRoute, type VisitRouteSchool } from './types';
import CheckEvidenceDialog from './components/CheckEvidenceDialog';
import { toast } from 'sonner';

type Stop = VisitRouteSchool & { school?: { nome: string; cidade: string; endereco: string | null } };

export default function RotaExecucaoPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<VisitRoute | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; mode: 'in' | 'out'; stop?: Stop }>({ open: false, mode: 'in' });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => { if (routeId) load(); }, [routeId]);

  const load = async () => {
    setLoading(true);
    const { route: r, stops: s } = await rotasApi.getExecutionDetails(routeId!);
    setRoute(r);
    const list = s as Stop[];
    setStops(list);

    // Signed URLs para fotos já enviadas
    const paths = list.flatMap(x => [x.check_in_photo_path, x.check_out_photo_path].filter(Boolean) as string[]);
    if (paths.length) {
      const urls: Record<string, string> = {};
      await Promise.all(paths.map(async (p) => {
        const signedUrl = await rotasApi.getSignedUrl(p);
        if (signedUrl) urls[p] = signedUrl;
      }));
      setPhotoUrls(urls);
    }
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const map: Record<string, Stop[]> = {};
    stops.forEach(s => {
      const k = s.planned_date ?? 'sem-data';
      (map[k] ||= []).push(s);
    });
    return { map, today };
  }, [stops]);

  const progress = useMemo(() => {
    const done = stops.filter(s => s.check_out_at).length;
    return { done, total: stops.length, pct: stops.length ? Math.round((done / stops.length) * 100) : 0 };
  }, [stops]);

  const openMaps = (s: Stop) => {
    const q = s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(`${s.school?.endereco ?? ''}, ${s.city ?? ''}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!route) return <div className="p-6">Rota não encontrada.</div>;

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <PageHeader
        title={`Execução · ${route.name}`}
        description={`${progress.done}/${progress.total} escolas concluídas (${progress.pct}%)`}
        actions={
          <Button variant="outline" onClick={() => navigate(`/acompanhamento/rotas/${routeId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />Detalhe
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <Badge className={statusBadge[route.status]}>{statusLabel[route.status]}</Badge>
        <div className="flex-1 h-2 bg-muted rounded">
          <div className="h-2 bg-primary rounded transition-all" style={{ width: `${progress.pct}%` }} />
        </div>
      </div>

      {Object.entries(grouped.map).sort(([a], [b]) => a.localeCompare(b)).map(([day, list]) => (
        <div key={day} className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground sticky top-0 bg-background py-1">
            {day === 'sem-data' ? 'Sem data' : format(new Date(day + 'T12:00:00'), "EEEE, dd/MM", { locale: ptBR })}
            {day === grouped.today && <Badge variant="secondary" className="ml-2">Hoje</Badge>}
          </h3>

          {list.map((s, i) => {
            const phase: 'pending' | 'in' | 'done' = s.check_out_at ? 'done' : s.check_in_at ? 'in' : 'pending';
            return (
              <Card key={s.id} className={phase === 'done' ? 'opacity-70' : ''}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-tight">{s.school?.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        <MapPin className="inline h-3 w-3 mr-1" />{s.city}
                        {s.planned_arrival && <> · <Clock className="inline h-3 w-3 mx-1" />{s.planned_arrival.slice(0, 5)}</>}
                      </div>
                    </div>
                  </div>

                  {(s.check_in_at || s.check_out_at) && (
                    <div className="text-xs space-y-1 border-l-2 border-primary/50 pl-2">
                      {s.check_in_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-amber-600" />
                          <span>In {format(new Date(s.check_in_at), 'HH:mm')}</span>
                          {s.check_in_photo_path && photoUrls[s.check_in_photo_path] && (
                            <a href={photoUrls[s.check_in_photo_path]} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />foto
                            </a>
                          )}
                        </div>
                      )}
                      {s.check_out_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Out {format(new Date(s.check_out_at), 'HH:mm')}</span>
                          {s.check_out_photo_path && photoUrls[s.check_out_photo_path] && (
                            <a href={photoUrls[s.check_out_photo_path]} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />foto
                            </a>
                          )}
                          {s.occurrence_type && s.occurrence_type !== 'normal' && (
                            <Badge variant="destructive" className="text-[10px]">{s.occurrence_type}</Badge>
                          )}
                        </div>
                      )}
                      {s.occurrence_description && (
                        <div className="text-muted-foreground italic">"{s.occurrence_description}"</div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => openMaps(s)}>
                      <MapPin className="h-3 w-3 mr-1" />Ir
                    </Button>
                    {phase === 'pending' && (
                      <Button size="sm" className="ml-auto" onClick={() => setDialog({ open: true, mode: 'in', stop: s })}>
                        <Play className="h-3 w-3 mr-1" />Check-in
                      </Button>
                    )}
                    {phase === 'in' && (
                      <Button size="sm" className="ml-auto" variant="default" onClick={() => setDialog({ open: true, mode: 'out', stop: s })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Check-out
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {dialog.stop && (
        <CheckEvidenceDialog
          open={dialog.open}
          onOpenChange={(o) => setDialog({ ...dialog, open: o })}
          mode={dialog.mode}
          routeId={routeId!}
          stopId={dialog.stop.id}
          schoolName={dialog.stop.school?.nome ?? ''}
          onDone={load}
        />
      )}
    </div>
  );
}
