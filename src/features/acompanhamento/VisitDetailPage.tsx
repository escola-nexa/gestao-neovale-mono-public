import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { acompanhamentoApi } from './api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Users, Loader2, LogIn, LogOut, FileText, Plus, Trash2, Navigation, MapPin, Clock, Route, RefreshCw, Building2 } from 'lucide-react';
import { VisitChronogram } from './components/VisitChronogram';
import { generateChronogram, buildGoogleMapsRouteUrl, type SchoolEntry, type DaySchedule } from './utils/chronogramEngine';

const statusColors: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  concluida: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
const statusLabels: Record<string, string> = {
  agendada: 'Agendada', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};

const guideSteps = [
  { icon: MapPin, title: 'Ponto de Partida', description: 'Defina de onde sai o deslocamento' },
  { icon: Route, title: 'Cronograma', description: 'O sistema gera agenda por dia e cidade' },
  { icon: LogIn, title: 'Registre', description: 'Marque chegada e saída em cada escola' },
  { icon: FileText, title: 'Evidências', description: 'Registre visita com detalhes e participantes' },
];

export default function VisitDetailPage() {
  const { visitId, schoolId: contextSchoolId } = useParams();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [visit, setVisit] = useState<any>(null);
  const [visitSchools, setVisitSchools] = useState<any[]>([]);
  const [visitUsers, setVisitUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [selectedVisitSchool, setSelectedVisitSchool] = useState<any>(null);
  const [recordForm, setRecordForm] = useState({ title: '', description: '', objective: '', executive_summary: '', referrals: '', pending_items: '', next_steps: '', final_notes: '' });
  const [participants, setParticipants] = useState<Array<{ name: string; role: string; notes: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<Record<string, any[]>>({});

  useEffect(() => { if (visitId) loadVisit(); }, [visitId]);

  const loadVisit = async () => {
    setLoading(true);
    try {
      if (!visitId) return;
      const { visit, schools, users, records } = await acompanhamentoApi.getVisitDetails(visitId);
      setVisit(visit);
      setVisitSchools(schools);
      setVisitUsers(users);
      
      if (records && records.length > 0) {
        const grouped: Record<string, any[]> = {};
        records.forEach((r: any) => { if (!grouped[r.visit_school_id]) grouped[r.visit_school_id] = []; grouped[r.visit_school_id].push(r); });
        setRecords(grouped);
      }
    } catch { } finally { setLoading(false); }
  };

  // Generate chronogram from visit data
  const chronogram = useMemo<DaySchedule[]>(() => {
    if (!visit || visitSchools.length === 0) return [];

    // Check if schools have planned data already
    const hasPlannedData = visitSchools.some((vs: any) => vs.planned_date && vs.planned_arrival);
    
    if (hasPlannedData) {
      // Build schedule from stored data
      const dayMap = new Map<string, any>();
      visitSchools.forEach((vs: any) => {
        const dateKey = vs.planned_date || visit.start_datetime?.split('T')[0];
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, new Map<string, any[]>());
        }
        const cityMap = dayMap.get(dateKey)!;
        const cityKey = vs.city || vs.schools?.cidade || 'Sem Cidade';
        if (!cityMap.has(cityKey)) cityMap.set(cityKey, []);
        cityMap.get(cityKey)!.push({
          id: vs.id,
          schoolId: vs.school_id,
          schoolName: vs.schools?.nome || '',
          city: cityKey,
          address: vs.schools?.endereco || '',
          plannedDate: dateKey,
          plannedArrival: vs.planned_arrival || '08:00',
          plannedDeparture: vs.planned_departure || '08:40',
          dayOrder: vs.day_order || vs.route_order || 0,
          travelFromPrevious: (visit as any).travel_time_minutes || 15,
          isFirstOfDay: false,
          isFirstOfCity: false,
        });
      });

      const schedule: DaySchedule[] = [];
      const sortedDates = Array.from(dayMap.keys()).sort();
      
      sortedDates.forEach(date => {
        const cityMap = dayMap.get(date)!;
        const cities: any[] = [];
        let totalSchools = 0;
        let dayStart = '23:59';
        let dayEnd = '00:00';

        cityMap.forEach((schools: any[], city: string) => {
          schools.sort((a: any, b: any) => (a.dayOrder || 0) - (b.dayOrder || 0));
          schools.forEach((s: any, i: number) => {
            s.isFirstOfCity = i === 0;
            s.isFirstOfDay = totalSchools === 0 && i === 0;
            if (s.plannedArrival < dayStart) dayStart = s.plannedArrival;
            if (s.plannedDeparture > dayEnd) dayEnd = s.plannedDeparture;
          });
          const duration = (visit as any).visit_duration_minutes || 40;
          cities.push({
            city,
            schools,
            totalTimeMinutes: schools.length * (duration + ((visit as any).travel_time_minutes || 15)),
            schoolCount: schools.length,
          });
          totalSchools += schools.length;
        });

        const dateObj = new Date(date + 'T12:00:00');
        const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const dd = dateObj.getDate().toString().padStart(2, '0');
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');

        schedule.push({
          date,
          dayLabel: `${weekdays[dateObj.getDay()]}, ${dd}/${mm}/${dateObj.getFullYear()}`,
          cities,
          totalSchools,
          dayStartTime: dayStart,
          dayEndTime: dayEnd,
          totalMinutes: timeToMin(dayEnd) - timeToMin(dayStart),
        });
      });

      return schedule;
    }

    // Fallback: generate chronogram on the fly
    const startDate = visit.start_datetime?.split('T')[0];
    const endDate = visit.end_datetime?.split('T')[0] || startDate;
    if (!startDate) return [];

    const entries: SchoolEntry[] = visitSchools.map((vs: any) => ({
      id: vs.id,
      schoolId: vs.school_id,
      schoolName: vs.schools?.nome || '',
      city: vs.city || vs.schools?.cidade || 'Sem Cidade',
      address: vs.schools?.endereco || '',
    }));

    const { schedule } = generateChronogram(entries, {
      startDate,
      endDate,
      visitDurationMinutes: (visit as any).visit_duration_minutes || 40,
      weeklySchedule: (visit as any).weekly_schedule || null,
      dailyStartTime: (visit as any).daily_start_time || '08:00',
      dailyEndTime: (visit as any).daily_end_time || '18:00',
      intervalMinutes: (visit as any).interval_minutes || 10,
      travelTimeMinutes: (visit as any).travel_time_minutes || 15,
    });

    return schedule;
  }, [visit, visitSchools]);

  const handleArrival = async (vs: any) => {
    await acompanhamentoApi.registerVisitArrival(vs.id, visit.id, visit.status);
    toast.success('Chegada registrada!');
    loadVisit();
  };

  const handleDeparture = async (vs: any) => {
    await acompanhamentoApi.registerVisitDeparture(vs.id);
    toast.success('Saída registrada!');
    loadVisit();
  };

  const openGoogleMaps = (school: any) => {
    const addr = school.schools?.endereco || school.schools?.nome || '';
    const city = school.city || '';
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(`${addr}${city ? ', ' + city : ''}`)}`, '_blank');
  };

  const openRouteByCity = (city?: string) => {
    let schools = visitSchools.filter(vs => vs.schools?.endereco || vs.schools?.nome);
    if (city) schools = schools.filter(vs => (vs.city || vs.schools?.cidade || '') === city);
    if (schools.length === 0) { toast.error('Nenhuma escola com endereço'); return; }
    const addresses = schools.map(vs => ({ address: vs.schools?.endereco || vs.schools?.nome || '', city: vs.city || '' }));
    const url = buildGoogleMapsRouteUrl((visit as any)?.departure_point || '', addresses);
    if (url) window.open(url, '_blank');
  };

  const handleRecalculate = async () => {
    if (!visit) return;
    const startDate = visit.start_datetime?.split('T')[0];
    const endDate = visit.end_datetime?.split('T')[0] || startDate;
    if (!startDate) return;

    const entries: SchoolEntry[] = visitSchools.map((vs: any) => ({
      id: vs.id, schoolId: vs.school_id,
      schoolName: vs.schools?.nome || '',
      city: vs.city || vs.schools?.cidade || '',
      address: vs.schools?.endereco || '',
    }));

    const { flatVisits } = generateChronogram(entries, {
      startDate, endDate,
      visitDurationMinutes: (visit as any).visit_duration_minutes || 40,
      weeklySchedule: (visit as any).weekly_schedule || null,
      dailyStartTime: (visit as any).daily_start_time || '08:00',
      dailyEndTime: (visit as any).daily_end_time || '18:00',
      intervalMinutes: (visit as any).interval_minutes || 10,
      travelTimeMinutes: (visit as any).travel_time_minutes || 15,
    });

    await acompanhamentoApi.recalculateVisitChronogram(flatVisits);

    toast.success('Cronograma recalculado!');
    loadVisit();
  };

  const saveRecord = async () => {
    if (!selectedVisitSchool || !recordForm.title) { toast.error('Preencha o título'); return; }
    setSaving(true);
    try {
      const recordData = {
        visit_school_id: selectedVisitSchool.id, organization_id: organizationId!, ...recordForm, recorded_by: user!.id,
      };
      const participantsData = participants.filter((p) => p.name);
      
      await acompanhamentoApi.saveVisitRecord(recordData, participantsData);
      toast.success('Registro salvo!');
      setShowRecordDialog(false);
      loadVisit();
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setSaving(false); }
  };

  const updateVisitStatus = async (status: string) => {
    await acompanhamentoApi.updateVisitStatus(visit.id, status);
    toast.success('Status atualizado!');
    loadVisit();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!visit) return <div className="text-center py-20 text-muted-foreground">Visita não encontrada</div>;

  const breadcrumbs = contextSchoolId
    ? [{ label: 'Escola', href: `/escolas/${contextSchoolId}` }, { label: 'Visitas', href: `/escolas/${contextSchoolId}/acompanhamento/visitas` }, { label: visit.action_name }]
    : [{ label: 'Acompanhamento', href: '/acompanhamento' }, { label: 'Visitas', href: '/acompanhamento/visitas' }, { label: visit.action_name }];

  const uniqueCities = [...new Set(visitSchools.map((vs: any) => vs.city || vs.schools?.cidade).filter(Boolean))];
  const completedCount = visitSchools.filter((vs: any) => vs.visit_status === 'concluida' || vs.visit_status === 'visitada').length;
  const pendingCount = visitSchools.filter((vs: any) => vs.visit_status === 'pendente').length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={visit.action_name}
        description={visit.objective || 'Detalhes da visita escolar'}
        backTo="/acompanhamento/visitas"
        badge={{
          label: statusLabels[visit.status] || visit.status,
          tone: visit.status === 'concluida' ? 'success' : visit.status === 'cancelada' ? 'danger' : visit.status === 'em_andamento' ? 'warning' : 'info',
        }}
        actions={
          <>
            {visit.status === 'agendada' && <Button size="sm" onClick={() => updateVisitStatus('em_andamento')}>Iniciar Visita</Button>}
            {visit.status === 'em_andamento' && <Button size="sm" onClick={() => updateVisitStatus('concluida')}>Concluir Visita</Button>}
          </>
        }
      />

      <FeatureGuideCard title="Como usar a Rota Inteligente" steps={guideSteps} />

      {/* Block 1: Visit Summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(visit.start_datetime), "dd/MM/yyyy", { locale: ptBR })} {visit.end_datetime ? `– ${format(new Date(visit.end_datetime), "dd/MM/yyyy", { locale: ptBR })}` : ''}</span>
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{visitSchools.length} escola{visitSchools.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{uniqueCities.length} cidade{uniqueCities.length !== 1 ? 's' : ''}</span>
            {visitUsers.length > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{visitUsers.length} envolvido{visitUsers.length !== 1 ? 's' : ''}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{chronogram.length} dia{chronogram.length !== 1 ? 's' : ''} planejado{chronogram.length !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>

      {/* Block 2: Logistics Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4 text-primary" />Parâmetros Logísticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Ponto de Partida</p>
              <p className="font-medium mt-1 truncate">{(visit as any).departure_point || 'Não definido'}</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Duração/Escola</p>
              <p className="font-medium mt-1">{(visit as any).visit_duration_minutes || 40} min</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Intervalo + Deslocamento</p>
              <p className="font-medium mt-1">10 + 15 min (automático)</p>
            </div>
          </div>
          {/* Weekly Schedule Display */}
          {(() => {
            const ws = (visit as any).weekly_schedule;
            if (!ws) return (
              <div className="text-sm text-muted-foreground mb-3">
                Horário diário: {(visit as any).daily_start_time || '08:00'} – {(visit as any).daily_end_time || '18:00'}
              </div>
            );
            const dayLabels: Record<string, string> = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex' };
            return (
              <div className="space-y-1.5 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Turnos por Dia</p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {['seg', 'ter', 'qua', 'qui', 'sex'].map(day => {
                    const shifts = ws[day] || [];
                    return (
                      <div key={day} className="border rounded-md p-2 text-center">
                        <p className="text-xs font-semibold">{dayLabels[day]}</p>
                        {shifts.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic mt-1">—</p>
                        ) : shifts.map((s: any, i: number) => (
                          <p key={i} className="text-xs mt-0.5 font-mono">{s.start}–{s.end}</p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={handleRecalculate}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Recalcular Cronograma</Button>
            {uniqueCities.map(city => (
              <Button key={city} variant="outline" size="sm" onClick={() => openRouteByCity(city)}>
                <Navigation className="mr-1 h-3.5 w-3.5" /> Rota {city}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Block 3: Execution Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{visitSchools.length}</p><p className="text-xs text-muted-foreground">Total Escolas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{completedCount}</p><p className="text-xs text-muted-foreground">Concluídas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{visitSchools.filter((vs: any) => vs.visit_status === 'em_visita').length}</p><p className="text-xs text-muted-foreground">Em Visita</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{pendingCount}</p><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
      </div>

      {/* Block 4: Chronogram */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Cronograma de Viagem e Deslocamento</h2>
        <VisitChronogram
          schedule={chronogram}
          visitSchools={visitSchools}
          records={records}
          departurePoint={(visit as any)?.departure_point || ''}
          onArrival={handleArrival}
          onDeparture={handleDeparture}
          onRecord={(vs) => {
            setSelectedVisitSchool(vs);
            setRecordForm({ title: '', description: '', objective: '', executive_summary: '', referrals: '', pending_items: '', next_steps: '', final_notes: '' });
            setParticipants([]);
            setShowRecordDialog(true);
          }}
          onOpenMaps={openGoogleMaps}
        />
      </div>

      {/* Record Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registro de Visita — {selectedVisitSchool?.schools?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Título *</Label><Input value={recordForm.title} onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })} /></div>
            <div><Label>Descrição Detalhada</Label><Textarea value={recordForm.description} onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })} rows={3} /></div>
            <div><Label>Resumo Executivo</Label><Textarea value={recordForm.executive_summary} onChange={(e) => setRecordForm({ ...recordForm, executive_summary: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Encaminhamentos</Label><Textarea value={recordForm.referrals} onChange={(e) => setRecordForm({ ...recordForm, referrals: e.target.value })} rows={2} /></div>
              <div><Label>Pendências</Label><Textarea value={recordForm.pending_items} onChange={(e) => setRecordForm({ ...recordForm, pending_items: e.target.value })} rows={2} /></div>
              <div><Label>Próximos Passos</Label><Textarea value={recordForm.next_steps} onChange={(e) => setRecordForm({ ...recordForm, next_steps: e.target.value })} rows={2} /></div>
              <div><Label>Observações Finais</Label><Textarea value={recordForm.final_notes} onChange={(e) => setRecordForm({ ...recordForm, final_notes: e.target.value })} rows={2} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Pessoas com quem falou</Label><Button variant="outline" size="sm" onClick={() => setParticipants([...participants, { name: '', role: '', notes: '' }])}><Plus className="mr-1 h-3 w-3" /> Adicionar</Button></div>
              {participants.map((p, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <Input placeholder="Nome" value={p.name} onChange={(e) => { const np = [...participants]; np[i].name = e.target.value; setParticipants(np); }} />
                  <Input placeholder="Cargo" value={p.role} onChange={(e) => { const np = [...participants]; np[i].role = e.target.value; setParticipants(np); }} />
                  <div className="flex gap-1"><Input placeholder="Obs." value={p.notes} onChange={(e) => { const np = [...participants]; np[i].notes = e.target.value; setParticipants(np); }} /><Button variant="ghost" size="icon" onClick={() => setParticipants(participants.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRecordDialog(false)}>Cancelar</Button>
              <Button onClick={saveRecord} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Registro</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function timeToMin(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
}
