import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Video, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ORIENTATION_TYPE_OPTIONS, type OrientationType } from '@/types/academic';
import { orientacoesApi } from './api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/PageHeader';
import { MessageSquarePlus } from 'lucide-react';

interface PlanningOccurrence {
  id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string;
  weekday: string;
  weekly_model_id: string;
  subject_name?: string;
  subject_id?: string;
}

const WEEKDAY_LABELS: Record<string, string> = {
  SEGUNDA: 'Segunda', TERCA: 'Terça', QUARTA: 'Quarta',
  QUINTA: 'Quinta', SEXTA: 'Sexta',
};

// Counter to generate unique keys for resetting uncontrolled Selects
let resetCounter = 0;

export default function NovaOrientacaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [professors, setProfessors] = useState<any[]>([]);

  // Store selections as refs to avoid re-render loops
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [orientationType, setOrientationType] = useState('');

  // Refs to access current values in async callbacks without re-renders
  const selectedProfessorRef = useRef('');
  const planningSlotsRef = useRef<any[]>([]);
  const [videoCallLink, setVideoCallLink] = useState('');
  const [schedulingNotes, setSchedulingNotes] = useState('');

  // Reset keys - incrementing these forces Select to remount (uncontrolled reset)
  const [schoolResetKey, setSchoolResetKey] = useState(0);
  const [courseResetKey, setCourseResetKey] = useState(0);
  const [slotResetKey, setSlotResetKey] = useState(0);

  const [professorSchools, setProfessorSchools] = useState<any[]>([]);
  const [professorCourses, setProfessorCourses] = useState<any[]>([]);
  const [planningSlots, setPlanningSlots] = useState<any[]>([]);
  const [futureOccurrences, setFutureOccurrences] = useState<PlanningOccurrence[]>([]);
  const [selectedOccurrences, setSelectedOccurrences] = useState<string[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      if (!user) return;
      const userRole = await orientacoesApi.getUserRole(user.id);
      if (userRole) setOrganizationId(userRole.organization_id);

      const profsData = await orientacoesApi.getProfessors(userRole?.organization_id);
      setProfessors(profsData || []);
    } catch (error) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    }
  };

  const handleProfessorChange = useCallback(async (profId: string) => {
    setSelectedProfessor(profId);
    selectedProfessorRef.current = profId;
    setSelectedSchool('');
    setSelectedCourse('');
    setSelectedSlotId('');
    // Increment reset keys to force remount of dependent Selects
    setSchoolResetKey(k => k + 1);
    setCourseResetKey(k => k + 1);
    setSlotResetKey(k => k + 1);
    setProfessorCourses([]);
    setPlanningSlots([]);
    setFutureOccurrences([]);
    setSelectedOccurrences([]);

    try {
      const bindings = await orientacoesApi.getProfessorSchoolBindings(profId);

      if (!bindings || bindings.length === 0) { setProfessorSchools([]); return; }

      const schoolsData = bindings.map((b: any) => b.schools).filter(Boolean);
      setProfessorSchools(schoolsData || []);
    } catch (error) {
      console.error('Error loading professor schools:', error);
      setProfessorSchools([]);
    }
  }, []);

  const handleSchoolChange = useCallback(async (schoolId: string) => {
    setSelectedSchool(schoolId);
    setSelectedCourse('');
    setSelectedSlotId('');
    setCourseResetKey(k => k + 1);
    setSlotResetKey(k => k + 1);
    setFutureOccurrences([]);
    setSelectedOccurrences([]);

    const profId = selectedProfessorRef.current;
    if (profId) {
      loadSchoolData(profId, schoolId);
    }
  }, []);

  const loadSchoolData = async (profId: string, schoolId: string) => {
    try {
      const bindings = await orientacoesApi.getProfessorCourseBindings(profId, schoolId);

      if (!bindings || bindings.length === 0) {
        setProfessorCourses([]);
      } else {
        const courseIds = [...new Set(bindings.map((b: any) => b.course_id))];
        // Wait, course data will be retrieved in bulk later or use the API
        // For simplicity, we can still use supabase here or get from coursesApi
        const { coursesApi } = await import('@/lib/api-adapter'); // Mocked/Updated import
        const coursesData = await coursesApi.getAll();
        setProfessorCourses(coursesData.filter(c => courseIds.includes(c.id)));
      }

      const slotsData = await orientacoesApi.getPlanningSlots(profId, schoolId);

      planningSlotsRef.current = slotsData || [];
      setPlanningSlots(slotsData || []);
    } catch (error) {
      console.error('Error loading school data:', error);
      setProfessorCourses([]);
      setPlanningSlots([]);
    }
  };

  const handleSlotChange = useCallback(async (slotId: string) => {
    setSelectedSlotId(slotId);
    setSelectedOccurrences([]);
    setLoadingOccurrences(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const data = await orientacoesApi.getFutureOccurrences(slotId, today);

      const slot = planningSlotsRef.current.find(s => s.id === slotId);
      processOccurrences(data || [], slot);
    } catch (error) {
      console.error('Error loading future occurrences:', error);
      setFutureOccurrences([]);
      setLoadingOccurrences(false);
    }
  }, []);

  const processOccurrences = async (data: any[], slot: any) => {
    try {
      const occurrenceIds = data.map(d => d.id);
      let existingOrientationOccIds: string[] = [];
      if (occurrenceIds.length > 0) {
        existingOrientationOccIds = await orientacoesApi.getExistingOrientationOccurrenceIds(occurrenceIds);
      }

      const occurrences: PlanningOccurrence[] = data
        .filter(d => !existingOrientationOccIds.includes(d.id))
        .map(d => ({
          id: d.id,
          occurrence_date: d.occurrence_date,
          start_time: d.start_time,
          end_time: d.end_time,
          weekday: slot?.weekday || '',
          weekly_model_id: d.weekly_model_id,
          subject_name: slot?.subjects?.nome,
          subject_id: slot?.subject_id,
        }));

      setFutureOccurrences(occurrences);
    } catch (error) {
      console.error('Error processing occurrences:', error);
      setFutureOccurrences([]);
    } finally {
      setLoadingOccurrences(false);
    }
  };

  const formatSlotLabel = (slot: any) => {
    const day = WEEKDAY_LABELS[slot.weekday] || slot.weekday;
    const start = slot.start_time?.substring(0, 5);
    const end = slot.end_time?.substring(0, 5);
    return `${day} - ${start} às ${end}`;
  };

  const toggleOccurrence = (id: string) => {
    setSelectedOccurrences(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllOccurrences = () => {
    setSelectedOccurrences(prev =>
      prev.length === futureOccurrences.length ? [] : futureOccurrences.map(o => o.id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProfessor) {
      toast({ title: 'Professor é obrigatório', variant: 'destructive' }); return;
    }
    if (!selectedSchool) {
      toast({ title: 'Escola é obrigatória', variant: 'destructive' }); return;
    }
    if (!orientationType) {
      toast({ title: 'Tipo de orientação é obrigatório', variant: 'destructive' }); return;
    }
    if (!organizationId) {
      toast({ title: 'Erro: Organização não encontrada', variant: 'destructive' }); return;
    }
    if (selectedOccurrences.length === 0) {
      toast({ title: 'Selecione pelo menos uma data para agendar', variant: 'destructive' }); return;
    }

    setLoading(true);
    try {
      // Read planningSlots synchronously from current state
      const currentSlot = planningSlots.find(s => s.id === selectedSlotId);
      const orientationsToInsert = selectedOccurrences.map(occId => {
        const occ = futureOccurrences.find(o => o.id === occId)!;
        return {
          organization_id: organizationId,
          professor_id: selectedProfessor,
          school_id: selectedSchool,
          course_id: selectedCourse || null,
          subject_id: currentSlot?.subject_id || null,
          planning_slot_id: selectedSlotId || null,
          orientation_type: orientationType as OrientationType,
          video_call_link: videoCallLink || null,
          scheduling_notes: schedulingNotes || null,
          status: 'AGENDADO',
          scheduled_date: occ.occurrence_date,
          scheduled_start_time: occ.start_time,
          scheduled_end_time: occ.end_time,
          occurrence_id: occ.id,
        };
      });

      await orientacoesApi.createOrientations(orientationsToInsert);

      toast({ title: `${orientationsToInsert.length} orientação(ões) agendada(s) com sucesso!` });
      navigate('/orientacoes');
    } catch (error: any) {
      console.error('Error creating orientation:', error);
      toast({ title: error.message || 'Erro ao criar orientação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Orientações', href: '/orientacoes' },
          { label: 'Nova Orientação' },
        ]}
        title="Nova Orientação"
        description="Agende orientações pedagógicas com base na Grade Horária"
        icon={MessageSquarePlus}
        backTo="/orientacoes"
      />

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contexto da Orientação</CardTitle>
              <CardDescription>Selecione professor, escola e slot de planejamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Professor *</Label>
                  <SearchableSelect
                    value={selectedProfessor}
                    onValueChange={handleProfessorChange}
                    placeholder="Selecione o professor..."
                    searchPlaceholder="Buscar professor..."
                    options={professors.map((prof) => ({
                      value: prof.id,
                      label: prof.full_name || 'Professor',
                    }))}
                  />
                </div>
                <div>
                  <Label>Escola *</Label>
                  <SearchableSelect
                    key={`school-${schoolResetKey}`}
                    value={selectedSchool}
                    onValueChange={handleSchoolChange}
                    disabled={!selectedProfessor}
                    placeholder={selectedProfessor ? "Selecione a escola..." : "Selecione o professor primeiro"}
                    searchPlaceholder="Buscar escola..."
                    options={professorSchools.map((school) => ({ value: school.id, label: school.nome }))}
                  />
                </div>
              </div>

              <div>
                <Label>Curso</Label>
                <SearchableSelect
                  key={`course-${courseResetKey}`}
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  disabled={!selectedSchool}
                  placeholder={selectedSchool ? "Selecione o curso..." : "Selecione a escola primeiro"}
                  searchPlaceholder="Buscar curso..."
                  options={professorCourses.map((course) => ({ value: course.id, label: course.nome }))}
                />
              </div>

              <div>
                <Label>Horário de Planejamento *</Label>
                <SearchableSelect
                  key={`slot-${slotResetKey}`}
                  value={selectedSlotId}
                  onValueChange={handleSlotChange}
                  disabled={!selectedSchool}
                  placeholder={selectedSchool ? "Selecione o horário..." : "Selecione professor e escola primeiro"}
                  searchPlaceholder="Buscar horário..."
                  options={planningSlots.map((slot) => ({ value: slot.id, label: formatSlotLabel(slot) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Horários de planejamento cadastrados na Grade Horária</p>
              </div>
            </CardContent>
          </Card>

          {selectedSlotId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Datas Disponíveis
                </CardTitle>
                <CardDescription>
                  Marque as datas em que deseja agendar a orientação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOccurrences ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : futureOccurrences.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma data futura disponível para este horário.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary"
                          checked={selectedOccurrences.length === futureOccurrences.length}
                          onChange={toggleAllOccurrences}
                        />
                        Selecionar todas
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {selectedOccurrences.length} de {futureOccurrences.length}
                      </span>
                    </div>
                    <div className="border rounded-md max-h-[350px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="w-10 p-2"></th>
                            <th className="text-left p-2 font-medium">Data</th>
                            <th className="text-left p-2 font-medium">Dia</th>
                            <th className="text-left p-2 font-medium">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {futureOccurrences.map((occ) => {
                            const isSelected = selectedOccurrences.includes(occ.id);
                            const dateObj = parseISO(occ.occurrence_date);
                            return (
                              <tr
                                key={occ.id}
                                className={`border-t cursor-pointer transition-colors ${
                                  isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                                }`}
                                onClick={() => toggleOccurrence(occ.id)}
                              >
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input accent-primary"
                                    checked={isSelected}
                                    readOnly
                                  />
                                </td>
                                <td className="p-2">{format(dateObj, "dd/MM/yyyy")}</td>
                                <td className="p-2 capitalize">{format(dateObj, "EEE", { locale: ptBR })}</td>
                                <td className="p-2">{occ.start_time?.substring(0, 5)} – {occ.end_time?.substring(0, 5)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Orientação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de Orientação *</Label>
                <Select onValueChange={setOrientationType}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                  <SelectContent>
                    {ORIENTATION_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Link da Chamada de Vídeo
                </Label>
                <Input value={videoCallLink} onChange={e => setVideoCallLink(e.target.value)} placeholder="https://meet.google.com/xxx ou https://zoom.us/j/xxx" type="url" />
                <p className="text-xs text-muted-foreground mt-1">Cole o link do Google Meet, Zoom ou outra plataforma</p>
              </div>

              <div>
                <Label>Observações do Agendamento</Label>
                <Textarea value={schedulingNotes} onChange={e => setSchedulingNotes(e.target.value)} placeholder="Observações sobre o agendamento..." rows={3} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/orientacoes')} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || selectedOccurrences.length === 0}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agendar {selectedOccurrences.length > 0 ? `${selectedOccurrences.length} Orientação(ões)` : 'Orientação'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
