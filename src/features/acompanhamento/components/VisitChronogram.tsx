import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, ExternalLink, LogIn, LogOut, FileText, Navigation, ChevronRight } from 'lucide-react';
import type { DaySchedule } from '../utils/chronogramEngine';
import { buildGoogleMapsRouteUrl } from '../utils/chronogramEngine';

interface Props {
  schedule: DaySchedule[];
  visitSchools: any[];
  records: Record<string, any[]>;
  departurePoint: string;
  onArrival: (vs: any) => void;
  onDeparture: (vs: any) => void;
  onRecord: (vs: any) => void;
  onOpenMaps: (vs: any) => void;
}

const visitStatusColors: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  em_visita: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  visitada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  concluida: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};
const visitStatusLabels: Record<string, string> = {
  pendente: 'Pendente', em_visita: 'Em Visita', visitada: 'Visitada', concluida: 'Concluída',
};

export function VisitChronogram({ schedule, visitSchools, records, departurePoint, onArrival, onDeparture, onRecord, onOpenMaps }: Props) {
  if (schedule.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Cronograma não disponível</p>
          <p className="text-sm mt-1">Recrie a visita com datas de início e fim para gerar o cronograma.</p>
        </CardContent>
      </Card>
    );
  }

  const findVisitSchool = (schoolId: string) => visitSchools.find(vs => vs.school_id === schoolId);

  return (
    <div className="space-y-4">
      {schedule.map((day) => (
        <Card key={day.date} className="overflow-hidden">
          <CardHeader className="pb-2 bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {day.dayLabel}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{day.totalSchools} escola{day.totalSchools !== 1 ? 's' : ''}</span>
                <span>{day.dayStartTime} – {day.dayEndTime}</span>
                <span>{day.totalMinutes} min total</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const daySchools = day.cities.flatMap(c => c.schools.map(s => ({ address: s.address, city: s.city })));
                    const url = buildGoogleMapsRouteUrl(departurePoint, daySchools);
                    if (url) window.open(url, '_blank');
                  }}
                >
                  <Navigation className="mr-1 h-3 w-3" /> Rota do Dia
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {day.cities.map((cityBlock) => (
              <div key={cityBlock.city} className="border-t">
                <div className="px-4 py-2 bg-primary/[0.03] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">{cityBlock.city}</span>
                    <Badge variant="secondary" className="text-xs">{cityBlock.schoolCount} escola{cityBlock.schoolCount !== 1 ? 's' : ''}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{cityBlock.totalTimeMinutes} min estimados</span>
                </div>
                <div className="divide-y">
                  {cityBlock.schools.map((scheduled, idx) => {
                    const vs = findVisitSchool(scheduled.schoolId);
                    const schoolRecords = vs ? (records[vs.id] || []) : [];
                    const status = vs?.visit_status || 'pendente';

                    return (
                      <div key={scheduled.id + '-' + idx} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center mt-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              status === 'concluida' || status === 'visitada' 
                                ? 'bg-emerald-500 text-white' 
                                : status === 'em_visita' 
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-primary/10 text-primary'
                            }`}>
                              {scheduled.dayOrder}
                            </div>
                            {idx < cityBlock.schools.length - 1 && (
                              <div className="w-px h-6 bg-border mt-1" />
                            )}
                          </div>

                          {/* Schedule times */}
                          <div className="flex flex-col items-center min-w-[60px] text-center">
                            <span className="text-sm font-mono font-semibold text-primary">{scheduled.plannedArrival}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90 my-0.5" />
                            <span className="text-xs font-mono text-muted-foreground">{scheduled.plannedDeparture}</span>
                          </div>

                          {/* School info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{scheduled.schoolName}</p>
                              <Badge className={visitStatusColors[status]} variant="secondary">
                                {visitStatusLabels[status] || status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{scheduled.address}</p>
                            {scheduled.travelFromPrevious > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                ~{scheduled.travelFromPrevious} min deslocamento
                              </p>
                            )}

                            {/* Real arrival/departure */}
                            {vs?.arrival_at && (
                              <div className="flex gap-3 mt-1.5 text-xs">
                                <span className="text-emerald-600">Chegada real: {new Date(vs.arrival_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                {vs.departure_at && (
                                  <span className="text-blue-600">Saída real: {new Date(vs.departure_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                                {vs.arrival_at && vs.departure_at && (
                                  <span className="text-muted-foreground">
                                    Permanência: {Math.round((new Date(vs.departure_at).getTime() - new Date(vs.arrival_at).getTime()) / 60000)} min
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Records */}
                            {schoolRecords.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {schoolRecords.map((r: any) => (
                                  <div key={r.id} className="bg-muted/50 rounded px-2 py-1 text-xs">
                                    <span className="font-medium">{r.title}</span>
                                    {r.school_visit_participants?.length > 0 && (
                                      <span className="ml-2 text-muted-foreground">
                                        ({r.school_visit_participants.length} participante{r.school_visit_participants.length > 1 ? 's' : ''})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => vs && onOpenMaps(vs)}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            {vs && !vs.arrival_at && (
                              <Button size="sm" className="h-7 text-xs" onClick={() => onArrival(vs)}>
                                <LogIn className="mr-1 h-3 w-3" /> Chegada
                              </Button>
                            )}
                            {vs && vs.arrival_at && !vs.departure_at && (
                              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onDeparture(vs)}>
                                <LogOut className="mr-1 h-3 w-3" /> Saída
                              </Button>
                            )}
                            {vs && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRecord(vs)}>
                                <FileText className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
