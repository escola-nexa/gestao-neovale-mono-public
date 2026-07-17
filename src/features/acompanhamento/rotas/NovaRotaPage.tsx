import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rotasApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, MapPin, Calendar, Gauge, DollarSign, Sparkles, ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { optimize } from './utils/optimizer';
import { distributeAcrossDays } from './utils/scheduler';
import { efficiencyScore } from './utils/scoring';
import { estimateRouteCost } from './utils/costEstimator';
import { useRouteMap } from './hooks/useRouteMap';

interface SchoolRow { id: string; nome: string; cidade: string; lat: number | null; lng: number | null; endereco: string | null }
interface UserRow { user_id: string; full_name: string; email: string }

const steps = [
  '1. Informações',
  '2. Municípios & Escolas',
  '3. Conflitos',
  '4. Capacidade',
  '5. Otimização',
  '6. Sugestões',
  '7. Confirmação',
];

export default function NovaRotaPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Etapa 1 - infos
  const [form, setForm] = useState({
    name: '', supervisor_id: '', departure_point: '',
    start_date: '', end_date: '', notes: '',
    shift_start: '08:00', shift_end: '17:00',
    break_start: '12:00', break_end: '13:00',
    default_visit_minutes: 60,
    fuel_price_per_liter: 6, kml_per_liter: 10, toll_estimated: 0,
  });
  const [users, setUsers] = useState<UserRow[]>([]);

  // Etapa 2 - schools
  const [allSchools, setAllSchools] = useState<SchoolRow[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [searchSchool, setSearchSchool] = useState('');

  // Etapa 3
  const [conflicts, setConflicts] = useState<Record<string, { route_name: string; route_id: string }[]>>({});
  const [checkingConflict, setCheckingConflict] = useState(false);

  // Etapa 5 - optimization result
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<any>(null);

  // Etapa 7
  const [saving, setSaving] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapPoints = useMemo(() => optResult?.points ?? [], [optResult]);
  useRouteMap(mapDivRef, mapPoints);

  useEffect(() => {
    if (!organizationId) return;
    rotasApi.getFormData(organizationId).then(({ schools, users }) => {
      setAllSchools(schools);
      setUsers(users);
    });
  }, [organizationId]);

  const cities = useMemo(() => [...new Set(allSchools.map(s => s.cidade).filter(Boolean))].sort(), [allSchools]);
  const filteredSchools = allSchools.filter(s =>
    (cityFilter.length === 0 || cityFilter.includes(s.cidade)) &&
    (!searchSchool || s.nome.toLowerCase().includes(searchSchool.toLowerCase())));

  const toggleSchool = (id: string) =>
    setSelectedSchools(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const checkConflicts = async () => {
    if (!form.start_date || !form.end_date) return;
    setCheckingConflict(true);
    const citiesPicked = [...new Set(allSchools.filter(s => selectedSchools.includes(s.id)).map(s => s.cidade))];
    const map: Record<string, any[]> = {};
    for (const c of citiesPicked) {
      const data = await rotasApi.checkConflicts(organizationId, c, form.start_date, form.end_date);
      if (data && data.length) map[c] = data.map((d: any) => ({ route_name: d.route_name, route_id: d.route_id }));
    }
    setConflicts(map);
    setCheckingConflict(false);
  };

  const conflictCount = Object.keys(conflicts).length;

  const capacity = useMemo(() => {
    if (!form.start_date || !form.end_date) return null;
    const s = new Date(form.start_date), e = new Date(form.end_date);
    let work = 0;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dw = d.getDay(); if (dw !== 0 && dw !== 6) work++;
    }
    const [sh, sm] = form.shift_start.split(':').map(Number);
    const [eh, em] = form.shift_end.split(':').map(Number);
    let dailyMin = (eh * 60 + em) - (sh * 60 + sm);
    if (form.break_start && form.break_end) {
      const [bh, bm] = form.break_start.split(':').map(Number);
      const [bh2, bm2] = form.break_end.split(':').map(Number);
      dailyMin -= ((bh2 * 60 + bm2) - (bh * 60 + bm));
    }
    const totalMin = work * dailyMin;
    const visitPlusTravel = form.default_visit_minutes + 30; // estimativa 30min entre escolas
    const maxVisits = Math.floor(totalMin / visitPlusTravel);
    return { workDays: work, dailyMin, totalMin, maxVisits, selected: selectedSchools.length, fits: selectedSchools.length <= maxVisits };
  }, [form, selectedSchools.length]);

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      const sel = allSchools.filter(s => selectedSchools.includes(s.id));
      const needGeo = sel.filter(s => s.lat == null || s.lng == null).map(s => s.id);
      if (needGeo.length) {
        toast.info(`Geocodificando ${needGeo.length} escola(s)...`);
        const geoRes = await rotasApi.geocodeSchools(needGeo);
        const upd = new Map<string, { lat: number; lng: number }>();
        for (const r of (geoRes?.results ?? [])) if (r.lat) upd.set(r.id, { lat: r.lat, lng: r.lng });
        setAllSchools(prev => prev.map(s => upd.has(s.id) ? { ...s, ...upd.get(s.id)! } : s));
        sel.forEach(s => { const u = upd.get(s.id); if (u) { s.lat = u.lat; s.lng = u.lng; } });
      }
      const valid = sel.filter(s => s.lat != null && s.lng != null);
      if (valid.length < 2) { toast.error('Precisa de ao menos 2 escolas com coordenadas válidas'); return; }

      // depot = primeiro como referência (sem geocoding do ponto de partida nessa fase)
      const points = [{ lat: valid[0].lat!, lng: valid[0].lng! }, ...valid.map(s => ({ lat: s.lat!, lng: s.lng! }))];
      const mat = await rotasApi.computeMatrix(points);

      const { order } = optimize(mat.min); // otimiza por tempo
      const travelLegs: number[] = [];
      const distLegs: number[] = [];
      for (let i = 1; i < order.length; i++) {
        travelLegs.push(mat.min[order[i - 1]][order[i]]);
        distLegs.push(mat.km[order[i - 1]][order[i]]);
      }
      const sched = distributeAcrossDays(travelLegs, distLegs, {
        startDate: form.start_date, endDate: form.end_date,
        shiftStart: form.shift_start, shiftEnd: form.shift_end,
        breakStart: form.break_start, breakEnd: form.break_end,
        visitMinutes: form.default_visit_minutes,
      });

      const totalKm = distLegs.reduce((a, b) => a + b, 0);
      const totalTravel = travelLegs.reduce((a, b) => a + b, 0);
      const totalVisit = sched.stops.length * form.default_visit_minutes;
      const cost = estimateRouteCost({ totalKm, fuelPricePerLiter: form.fuel_price_per_liter, kmlPerLiter: form.kml_per_liter, tollEstimated: form.toll_estimated });
      const score = efficiencyScore({ totalKm, totalTravelMinutes: totalTravel, totalVisitMinutes: totalVisit, schoolCount: sched.stops.length, daysUsed: sched.daysUsed, estimatedCost: cost.total });

      const orderedSchools = order.slice(1).map(idx => valid[idx - 1]);
      setOptResult({
        order, schools: orderedSchools, stops: sched.stops, totalKm, totalTravel, totalVisit, cost, score,
        daysUsed: sched.daysUsed, overflow: sched.overflow,
        points: orderedSchools.map((s, i) => ({ lat: s.lat!, lng: s.lng!, label: String(i + 1), title: s.nome })),
      });
      toast.success(`Rota otimizada: ${Math.round(totalKm)} km · ${score.letter}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro na otimização');
    } finally { setOptimizing(false); }
  };

  const suggestions = useMemo(() => {
    if (!optResult) return [];
    const list: string[] = [];
    if (optResult.overflow > 0) list.push(`Faltam ${optResult.overflow} escolas sem espaço — amplie o período ou divida em 2 rotas.`);
    if (optResult.daysUsed === 1 && optResult.schools.length > 6) list.push('Considere dividir entre mais dias para reduzir cansaço.');
    if (optResult.totalKm / optResult.schools.length > 60) list.push('Muitas escolas distantes entre si — agrupe por região mais próxima.');
    if (conflictCount > 0) list.push(`${conflictCount} município(s) em conflito — remova ou ajuste as datas.`);
    if (!list.length) list.push('Rota equilibrada. Pronto para confirmar.');
    return list;
  }, [optResult, conflictCount]);

  const confirm = async () => {
    if (!optResult) return;
    setSaving(true);
    try {
      const routeData = {
        organization_id: organizationId!,
        name: form.name, supervisor_id: form.supervisor_id || user!.id,
        departure_point: form.departure_point,
        start_date: form.start_date, end_date: form.end_date,
        status: 'planejada', shift_start: form.shift_start, shift_end: form.shift_end,
        break_start: form.break_start, break_end: form.break_end,
        default_visit_minutes: form.default_visit_minutes,
        fuel_price_per_liter: form.fuel_price_per_liter,
        kml_per_liter: form.kml_per_liter, toll_estimated: form.toll_estimated,
        total_km: optResult.totalKm, total_travel_minutes: optResult.totalTravel,
        total_visit_minutes: optResult.totalVisit, total_estimated_cost: optResult.cost.total,
        efficiency_score: optResult.score.letter,
        notes: form.notes, created_by: user!.id,
        optimization_payload: { score: optResult.score, cost: optResult.cost },
      };

      const citiesMap = new Map<string, number>();
      optResult.schools.forEach((s: SchoolRow) => citiesMap.set(s.cidade, (citiesMap.get(s.cidade) ?? 0) + 1));
      const citiesData = [...citiesMap.entries()].map(([city, school_count]) => ({ organization_id: organizationId!, city, school_count }));

      const schoolsData = optResult.schools.map((s: SchoolRow, i: number) => ({
        organization_id: organizationId!, school_id: s.id, city: s.cidade,
        lat: s.lat, lng: s.lng, route_order: i + 1,
        day_order: optResult.stops[i]?.dayOrder, planned_date: optResult.stops[i]?.plannedDate,
        planned_arrival: optResult.stops[i]?.plannedArrival, planned_departure: optResult.stops[i]?.plannedDeparture,
        travel_from_previous_minutes: optResult.stops[i]?.travelMinutes ?? 0,
        distance_from_previous_km: optResult.stops[i]?.distanceKm ?? 0,
        visit_minutes: form.default_visit_minutes, status: 'pendente',
      }));

      const logData = {
        organization_id: organizationId!, actor_id: user!.id,
        action: 'created', details: { schoolCount: optResult.schools.length, totalKm: optResult.totalKm },
      };

      const route = await rotasApi.createRoute(routeData, citiesData, schoolsData, logData);

      toast.success('Rota criada!');
      navigate(`/acompanhamento/rotas/${route.id}`);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  // ---------- render ----------
  const canAdvance = () => {
    if (step === 0) return form.name && form.start_date && form.end_date && form.supervisor_id;
    if (step === 1) return selectedSchools.length >= 2;
    if (step === 2) return conflictCount === 0;
    if (step === 3) return capacity?.fits;
    if (step === 4) return !!optResult;
    return true;
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <PageHeader title="Nova Rota de Visitas" description="Planejador inteligente em 7 etapas"
        actions={<Button variant="outline" onClick={() => navigate('/acompanhamento/rotas')}>Cancelar</Button>} />

      <div className="flex flex-wrap gap-2 text-xs">
        {steps.map((s, i) => (
          <Badge key={s} variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}>{s}</Badge>
        ))}
      </div>

      <Card><CardContent className="pt-6 space-y-4">
        {step === 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Nome da Rota *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Data Inicial *</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Data Final *</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Supervisor Responsável *</Label>
              <select className="w-full border rounded-md p-2 bg-background" value={form.supervisor_id} onChange={e => setForm({ ...form, supervisor_id: e.target.value })}>
                <option value="">Selecione...</option>
                {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Ponto de Partida</Label><Input value={form.departure_point} onChange={e => setForm({ ...form, departure_point: e.target.value })} placeholder="Sede, hotel, etc." /></div>
            <div><Label>Início Expediente</Label><Input type="time" value={form.shift_start} onChange={e => setForm({ ...form, shift_start: e.target.value })} /></div>
            <div><Label>Fim Expediente</Label><Input type="time" value={form.shift_end} onChange={e => setForm({ ...form, shift_end: e.target.value })} /></div>
            <div><Label>Intervalo Início</Label><Input type="time" value={form.break_start} onChange={e => setForm({ ...form, break_start: e.target.value })} /></div>
            <div><Label>Intervalo Fim</Label><Input type="time" value={form.break_end} onChange={e => setForm({ ...form, break_end: e.target.value })} /></div>
            <div><Label>Min por Visita</Label><Input type="number" value={form.default_visit_minutes} onChange={e => setForm({ ...form, default_visit_minutes: +e.target.value })} /></div>
            <div><Label>Combustível R$/L</Label><Input type="number" step="0.1" value={form.fuel_price_per_liter} onChange={e => setForm({ ...form, fuel_price_per_liter: +e.target.value })} /></div>
            <div><Label>km/L</Label><Input type="number" step="0.1" value={form.kml_per_liter} onChange={e => setForm({ ...form, kml_per_liter: +e.target.value })} /></div>
            <div><Label>Pedágio Estimado R$</Label><Input type="number" step="0.01" value={form.toll_estimated} onChange={e => setForm({ ...form, toll_estimated: +e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {cities.map(c => (
                <Button key={c} size="sm" variant={cityFilter.includes(c) ? 'default' : 'outline'}
                  onClick={() => setCityFilter(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}>
                  <MapPin className="h-3 w-3 mr-1" />{c}
                </Button>
              ))}
            </div>
            <Input placeholder="Buscar escola..." value={searchSchool} onChange={e => setSearchSchool(e.target.value)} />
            <div className="text-sm text-muted-foreground">{selectedSchools.length} escola(s) selecionada(s)</div>
            <ScrollArea className="h-80 border rounded-md p-2">
              {filteredSchools.map(s => (
                <div key={s.id} className="flex items-center gap-2 py-1">
                  <Checkbox checked={selectedSchools.includes(s.id)} onCheckedChange={() => toggleSchool(s.id)} />
                  <span className="text-sm flex-1">{s.nome} <span className="text-muted-foreground">— {s.cidade}</span></span>
                  {s.lat == null && <Badge variant="outline" className="text-xs">sem geo</Badge>}
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Button onClick={checkConflicts} disabled={checkingConflict}>
              {checkingConflict ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Verificar Conflitos
            </Button>
            {conflictCount === 0 ? (
              <Alert><Check className="h-4 w-4" /><AlertTitle>Sem conflitos</AlertTitle><AlertDescription>Todos os municípios estão livres no período.</AlertDescription></Alert>
            ) : (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{conflictCount} município(s) em conflito</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 text-sm">
                    {Object.entries(conflicts).map(([city, list]) => (
                      <li key={city}><b>{city}</b> — {list.map(l => l.route_name).join(', ')}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 3 && capacity && (
          <div className="grid md:grid-cols-2 gap-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Dias úteis</div><div className="text-2xl font-bold">{capacity.workDays}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Horas disponíveis</div><div className="text-2xl font-bold">{(capacity.totalMin / 60).toFixed(1)}h</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Máximo de visitas</div><div className="text-2xl font-bold">{capacity.maxVisits}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Escolas selecionadas</div><div className="text-2xl font-bold">{capacity.selected}</div></CardContent></Card>
            <div className="md:col-span-2">
              {capacity.fits
                ? <Alert><Check className="h-4 w-4" /><AlertTitle>Capacidade OK</AlertTitle><AlertDescription>Cabe no período informado.</AlertDescription></Alert>
                : <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Excesso de visitas</AlertTitle><AlertDescription>Reduza escolas ou amplie o período.</AlertDescription></Alert>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <Button onClick={runOptimization} disabled={optimizing}>
              {optimizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {optResult ? 'Reotimizar' : 'Otimizar Rota'}
            </Button>
            {optResult && (
              <div className="grid md:grid-cols-4 gap-3">
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">KM</div><div className="text-xl font-bold">{Math.round(optResult.totalKm)}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Desloc. (h)</div><div className="text-xl font-bold">{(optResult.totalTravel / 60).toFixed(1)}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Dias</div><div className="text-xl font-bold">{optResult.daysUsed}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Score</div><div className="text-xl font-bold">{optResult.score.letter}</div></CardContent></Card>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <Alert key={i}><Sparkles className="h-4 w-4" /><AlertDescription>{s}</AlertDescription></Alert>
            ))}
          </div>
        )}

        {step === 6 && optResult && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <Card><CardContent className="p-3"><Gauge className="h-4 w-4 mb-1" /><div className="text-xs text-muted-foreground">KM Total</div><div className="text-xl font-bold">{Math.round(optResult.totalKm)}</div></CardContent></Card>
              <Card><CardContent className="p-3"><Calendar className="h-4 w-4 mb-1" /><div className="text-xs text-muted-foreground">Dias</div><div className="text-xl font-bold">{optResult.daysUsed}</div></CardContent></Card>
              <Card><CardContent className="p-3"><DollarSign className="h-4 w-4 mb-1" /><div className="text-xs text-muted-foreground">Custo</div><div className="text-xl font-bold">R$ {optResult.cost.total.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Combustível</div><div className="text-lg font-semibold">R$ {optResult.cost.fuel.toFixed(2)} <span className="text-xs text-muted-foreground">({optResult.cost.liters} L)</span></div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Pedágio</div><div className="text-lg font-semibold">R$ {optResult.cost.tolls.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Score</div><div className="text-lg font-semibold">{optResult.score.letter} ({optResult.score.score})</div></CardContent></Card>
            </div>
            <div ref={mapDivRef} className="w-full h-80 rounded-md border" />
          </div>
        )}
      </CardContent></Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
        {step < 6
          ? <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>Próximo<ArrowRight className="h-4 w-4 ml-1" /></Button>
          : <Button onClick={confirm} disabled={saving || !optResult}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar Rota</Button>
        }
      </div>
    </div>
  );
}
