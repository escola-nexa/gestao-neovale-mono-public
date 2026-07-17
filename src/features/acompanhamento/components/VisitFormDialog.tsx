import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { acompanhamentoApi } from '../api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { Loader2, MapPin } from 'lucide-react';
import { generateChronogram, type SchoolEntry } from '../utils/chronogramEngine';
import { WeeklyScheduleEditor, DEFAULT_SCHEDULE, type WeeklySchedule } from './WeeklyScheduleEditor';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedSchoolId?: string;
}

export function VisitFormDialog({ open, onOpenChange, onSuccess, preSelectedSchoolId }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(preSelectedSchoolId ? [preSelectedSchoolId] : []);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({ ...DEFAULT_SCHEDULE });
  const [form, setForm] = useState({
    action_name: '', description: '', objective: '', logistics_notes: '', priority: 'media',
    start_datetime: '', end_datetime: '',
    departure_point: '', visit_duration_minutes: 40,
  });

  useEffect(() => {
    if (open && organizationId) {
      acompanhamentoApi.getVisitFormData(organizationId).then(({ schools, users }) => {
        setSchools(schools);
        setUsers(users);
      });
    }
  }, [open, organizationId]);

  const cities = [...new Set(schools.map((s) => s.cidade))].sort();
  const filteredSchools = selectedCities.length > 0 ? schools.filter((s) => selectedCities.includes(s.cidade)) : schools;

  const handleSave = async () => {
    if (!form.action_name || !form.start_datetime || selectedSchools.length === 0) {
      toast.error('Preencha o nome, data de início e selecione ao menos uma escola');
      return;
    }
    setSaving(true);
    try {
      const startDate = form.start_datetime.split('T')[0];
      const endDate = form.end_datetime ? form.end_datetime.split('T')[0] : startDate;

      const schoolEntries: SchoolEntry[] = selectedSchools.map(sId => {
        const school = schools.find(s => s.id === sId);
        return {
          id: sId, schoolId: sId,
          schoolName: school?.nome || '',
          city: school?.cidade || '',
          address: school?.endereco || '',
        };
      });

      const { flatVisits } = generateChronogram(schoolEntries, {
        startDate, endDate,
        visitDurationMinutes: form.visit_duration_minutes,
        weeklySchedule,
      });

      const visitData = {
        organization_id: organizationId!,
        action_name: form.action_name, description: form.description, objective: form.objective,
        logistics_notes: form.logistics_notes, priority: form.priority,
        start_datetime: form.start_datetime, end_datetime: form.end_datetime || null,
        responsible_user_id: user!.id, created_by: user!.id, visit_type: 'visita',
        departure_point: form.departure_point,
        visit_duration_minutes: form.visit_duration_minutes,
        interval_minutes: 10,
        travel_time_minutes: 15,
        weekly_schedule: weeklySchedule,
      };

      const schoolInserts = flatVisits.map((fv, idx) => ({
        school_id: fv.schoolId,
        city: fv.city,
        route_order: idx + 1,
        planned_date: fv.plannedDate,
        planned_arrival: fv.plannedArrival,
        planned_departure: fv.plannedDeparture,
        day_order: fv.dayOrder,
      }));

      const userInserts = selectedUsers.map((uId) => ({
        user_id: uId,
        user_name: users.find((p) => p.user_id === uId)?.full_name || ''
      }));

      await acompanhamentoApi.createVisit(visitData, schoolInserts, userInserts);

      toast.success('Visita criada com cronograma!');
      onOpenChange(false);
      onSuccess();
      setForm({
        action_name: '', description: '', objective: '', logistics_notes: '', priority: 'media',
        start_datetime: '', end_datetime: '',
        departure_point: '', visit_duration_minutes: 40,
      });
      setWeeklySchedule({ ...DEFAULT_SCHEDULE });
      setSelectedSchools(preSelectedSchoolId ? [preSelectedSchoolId] : []);
      setSelectedCities([]);
      setSelectedUsers([]);
    } catch (err: any) { toast.error(err.message || 'Erro ao criar visita'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Visita Escolar</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label>Nome da Ação *</Label><Input value={form.action_name} onChange={(e) => setForm({ ...form, action_name: e.target.value })} placeholder="Ex: Visita de acompanhamento pedagógico" /></div>
            <div className="sm:col-span-2"><Label>Objetivo</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={2} /></div>
            <div className="sm:col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Data/Hora de Início *</Label><Input type="datetime-local" value={form.start_datetime} onChange={(e) => setForm({ ...form, start_datetime: e.target.value })} /></div>
            <div><Label>Data/Hora de Fim</Label><Input type="datetime-local" value={form.end_datetime} onChange={(e) => setForm({ ...form, end_datetime: e.target.value })} /></div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem>
              </SelectContent></Select>
            </div>
          </div>

          {/* Logistics Parameters */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h4 className="text-sm font-semibold text-primary">Parâmetros Logísticos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Ponto de Partida</Label><Input value={form.departure_point} onChange={(e) => setForm({ ...form, departure_point: e.target.value })} placeholder="Endereço de saída (sede, hotel, etc.)" /></div>
              <div><Label>Duração por Visita (min)</Label><Input type="number" min={10} max={240} value={form.visit_duration_minutes} onChange={(e) => setForm({ ...form, visit_duration_minutes: parseInt(e.target.value) || 40 })} /></div>
            </div>

            {/* Weekly Schedule Editor */}
            <WeeklyScheduleEditor value={weeklySchedule} onChange={setWeeklySchedule} />
          </div>

          <div className="sm:col-span-2"><Label>Observações Logísticas</Label><Textarea value={form.logistics_notes} onChange={(e) => setForm({ ...form, logistics_notes: e.target.value })} rows={2} /></div>

          <div>
            <Label className="mb-2 block">Usuários Envolvidos</Label>
            <ScrollArea className="max-h-32 border rounded-md p-2">
              {users.map((u) => (
                <div key={u.user_id} className="flex items-center gap-2 py-1">
                  <Checkbox checked={selectedUsers.includes(u.user_id)} onCheckedChange={() => setSelectedUsers((prev) => prev.includes(u.user_id) ? prev.filter((id) => id !== u.user_id) : [...prev, u.user_id])} />
                  <span className="text-sm">{u.full_name} <span className="text-muted-foreground">({u.email})</span></span>
                </div>
              ))}
            </ScrollArea>
          </div>

          {!preSelectedSchoolId && (
            <>
              <div>
                <Label className="mb-2 block">Cidades (filtro)</Label>
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <Button key={city} variant={selectedCities.includes(city) ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCities((prev) => prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city])}>
                      <MapPin className="mr-1 h-3 w-3" /> {city}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Escolas * ({selectedSchools.length} selecionada{selectedSchools.length !== 1 ? 's' : ''})</Label>
                <ScrollArea className="max-h-48 border rounded-md p-2">
                  {cities.filter((c) => selectedCities.length === 0 || selectedCities.includes(c)).map((city) => {
                    const citySchools = filteredSchools.filter((s) => s.cidade === city);
                    if (citySchools.length === 0) return null;
                    return (
                      <div key={city} className="mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{city} ({citySchools.length})</p>
                        {citySchools.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 py-0.5">
                            <Checkbox checked={selectedSchools.includes(s.id)} onCheckedChange={() => setSelectedSchools((prev) => prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id])} />
                            <span className="text-sm">{s.nome}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </ScrollArea>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar Visita</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
