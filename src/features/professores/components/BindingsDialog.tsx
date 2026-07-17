import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Trash2, School, BookOpen, Info, Sun, Sunset, Moon, Clock, History, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { professorsApi } from '../api';
import { schoolsApi, coursesApi } from '@/services/supabaseApi';
import { professoresApi } from '@/features/professores/api';
import type { ProfessorData, ProfessorSchoolCourse } from '../types';

interface BindingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor: ProfessorData | null;
  defaultOpenForm?: boolean;
}

export function BindingsDialog({ open, onOpenChange, professor, defaultOpenForm = false }: BindingsDialogProps) {
  const [bindings, setBindings] = useState<ProfessorSchoolCourse[]>([]);
  const [unbindHistory, setUnbindHistory] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Multi-select state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [coordinatorCourseIds, setCoordinatorCourseIds] = useState<Set<string>>(new Set());

  // Workload (per turno) — applies to ALL courses being added in this batch
  const [workloadMorning, setWorkloadMorning] = useState<string>('');
  const [workloadAfternoon, setWorkloadAfternoon] = useState<string>('');
  const [workloadNight, setWorkloadNight] = useState<string>('');
  

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ProfessorSchoolCourse | null>(null);
  const [unbindReason, setUnbindReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit workload
  const [editTarget, setEditTarget] = useState<ProfessorSchoolCourse | null>(null);
  const [editMorning, setEditMorning] = useState('');
  const [editAfternoon, setEditAfternoon] = useState('');
  const [editNight, setEditNight] = useState('');
  const [isEditingSave, setIsEditingSave] = useState(false);

  useEffect(() => {
    if (open && professor) {
      loadData();
      resetForm();
      if (defaultOpenForm) setShowAddForm(true);
    }
  }, [open, professor, defaultOpenForm]);

  useEffect(() => {
    if (selectedSchoolId) {
      const schoolCourses = courses.filter(c => c.school_ids?.includes(selectedSchoolId));
      setFilteredCourses(schoolCourses);
      setSelectedCourseIds(new Set());
      setCoordinatorCourseIds(new Set());
    } else {
      setFilteredCourses([]);
    }
  }, [selectedSchoolId, courses]);

  const resetForm = () => {
    setShowAddForm(false);
    setSelectedSchoolId('');
    setSelectedCourseIds(new Set());
    setCoordinatorCourseIds(new Set());
    setWorkloadMorning('');
    setWorkloadAfternoon('');
    setWorkloadNight('');
    
  };

  const parseHrs = (v: string): number => {
    const n = parseFloat((v || '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const totalWorkload = parseHrs(workloadMorning) + parseHrs(workloadAfternoon) + parseHrs(workloadNight);
  const workloadValid = totalWorkload > 0;

  const loadData = async () => {
    if (!professor) return;
    setIsLoading(true);
    try {
      const [bindingsData, schoolsData, coursesData, historyRes] = await Promise.all([
        professorsApi.getBindings(professor.id),
        schoolsApi.getAll(),
        coursesApi.getAll(),
        (supabase as any)
          .from('professor_unbinding_history')
          .select('id, reason, unbound_at, unbound_by, school_id, course_id, schools:school_id(nome), courses:course_id(nome)')
          .eq('professor_id', professor.id)
          .order('unbound_at', { ascending: false }),
      ]);
      setSchools(schoolsData);
      setCourses(coursesData);

      // Resolver nomes dos usuários (de histórico + vínculos inativos)
      const history = (historyRes?.data || []) as any[];
      const userIds = Array.from(new Set([
        ...history.map(h => h.unbound_by).filter(Boolean),
        ...bindingsData.map((b: any) => b.unbound_by).filter(Boolean),
      ]));
      let userMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        for (const p of (profs || []) as any[]) {
          userMap[p.user_id] = { full_name: p.full_name, email: p.email };
        }
      }
      const resolveName = (uid?: string | null) =>
        uid ? (userMap[uid]?.full_name || userMap[uid]?.email || 'Usuário removido') : null;

      setBindings(
        bindingsData.map((b: any) => ({
          ...b,
          unbound_by_name: resolveName(b.unbound_by),
        })),
      );
      setUnbindHistory(
        history.map(h => ({
          ...h,
          unbound_by_name: resolveName(h.unbound_by) || 'Sistema',
        }))
      );
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  // Already-bound (active) courses for the selected school — disabled to avoid duplicates
  const alreadyBoundCourseIds = useMemo(() => {
    if (!selectedSchoolId) return new Set<string>();
    return new Set(
      bindings
        .filter(b => b.school_id === selectedSchoolId && b.status === 'ACTIVE' && b.course_id)
        .map(b => b.course_id as string)
    );
  }, [bindings, selectedSchoolId]);

  // Já existe vínculo "somente escola" (sem curso) ativo para a escola selecionada?
  const hasSchoolOnlyBinding = useMemo(() => {
    if (!selectedSchoolId) return false;
    return bindings.some(
      b => b.school_id === selectedSchoolId && b.status === 'ACTIVE' && !b.course_id
    );
  }, [bindings, selectedSchoolId]);

  // Escola selecionada não possui cursos cadastrados?
  const schoolHasNoCourses = useMemo(
    () => !!selectedSchoolId && filteredCourses.length === 0,
    [selectedSchoolId, filteredCourses],
  );

  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCoordinatorCourseIds(c => { const cn = new Set(c); cn.delete(id); return cn; });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCoordinator = (id: string) => {
    setCoordinatorCourseIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddBindings = async () => {
    if (!professor || !selectedSchoolId) {
      toast.error('Selecione a escola');
      return;
    }
    if (!workloadValid) {
      toast.error('Informe a carga horária em ao menos um turno (Matutino, Vespertino ou Noturno)');
      return;
    }

    const workloadPayload = {
      workload_morning_hours: parseHrs(workloadMorning),
      workload_afternoon_hours: parseHrs(workloadAfternoon),
      workload_night_hours: parseHrs(workloadNight),
      workload_filled_at: new Date().toISOString(),
    };

    // Caso 1: vínculo "somente escola" (escola sem cursos cadastrados)
    if (schoolHasNoCourses) {
      if (hasSchoolOnlyBinding) {
        toast.error('O professor já está vinculado a esta escola');
        return;
      }
      setIsSaving(true);
      try {
        const { error } = await professoresApi.client.from('professor_school_courses').insert({
          organization_id: professor.organization_id,
          professor_id: professor.id,
          school_id: selectedSchoolId,
          course_id: null,
          is_coordinator: false,
          status: 'ACTIVE' as const,
          ...workloadPayload,
        });
        if (error) {
          if (error.code === '23505') {
            toast.error('Este vínculo já existe');
          } else {
            throw error;
          }
        } else {
          toast.success('Vínculo com a escola adicionado (sem curso)');
          resetForm();
          await loadData();
        }
      } catch (error: any) {
        toast.error(error.message || 'Erro ao adicionar vínculo');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Caso 2: vínculo padrão com cursos selecionados
    if (selectedCourseIds.size === 0) {
      toast.error('Selecione ao menos um curso');
      return;
    }
    setIsSaving(true);
    try {
      const rows = Array.from(selectedCourseIds).map(courseId => ({
        organization_id: professor.organization_id,
        professor_id: professor.id,
        school_id: selectedSchoolId,
        course_id: courseId,
        is_coordinator: coordinatorCourseIds.has(courseId),
        status: 'ACTIVE' as const,
        ...workloadPayload,
      }));
      const { error } = await professoresApi.client.from('professor_school_courses').insert(rows);
      if (error) {
        if (error.code === '23505') {
          toast.error('Um ou mais cursos já estavam vinculados');
        } else {
          throw error;
        }
      } else {
        toast.success(`${rows.length} vínculo${rows.length !== 1 ? 's' : ''} adicionado${rows.length !== 1 ? 's' : ''}`);
        resetForm();
        await loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar vínculos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (binding: ProfessorSchoolCourse) => {
    try {
      const newStatus = binding.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await professorsApi.updateBinding(binding.id, newStatus);
      toast.success(`Vínculo ${newStatus === 'ACTIVE' ? 'ativado' : 'desativado'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar vínculo');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !professor) return;
    const reason = unbindReason.trim();
    if (reason.length < 5) {
      toast.error('Informe a justificativa do desvínculo (mínimo 5 caracteres)');
      return;
    }
    setIsDeleting(true);
    try {
      const { data: { user } } = await professoresApi.client.auth.getUser();
      // 1. Grava no histórico permanente
      const { error: histErr } = await professoresApi.client.from('professor_unbinding_history').insert({
        organization_id: professor.organization_id,
        professor_id: professor.id,
        school_id: deleteTarget.school_id,
        course_id: deleteTarget.course_id,
        binding_id: deleteTarget.id,
        reason,
        workload_morning_hours: deleteTarget.workload_morning_hours || 0,
        workload_afternoon_hours: deleteTarget.workload_afternoon_hours || 0,
        workload_night_hours: deleteTarget.workload_night_hours || 0,
        unbound_by: user?.id || null,
      });
      if (histErr) throw histErr;
      // 2. Remove o vínculo
      await professorsApi.deleteBinding(deleteTarget.id);
      toast.success('Vínculo removido e registrado no histórico');
      setDeleteTarget(null);
      setUnbindReason('');
      loadData();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover vínculo');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (b: ProfessorSchoolCourse) => {
    setEditTarget(b);
    setEditMorning(String(b.workload_morning_hours ?? '') || '');
    setEditAfternoon(String(b.workload_afternoon_hours ?? '') || '');
    setEditNight(String(b.workload_night_hours ?? '') || '');
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const m = parseHrs(editMorning);
    const a = parseHrs(editAfternoon);
    const n = parseHrs(editNight);
    if (m + a + n <= 0) {
      toast.error('Informe a carga em ao menos um turno');
      return;
    }
    setIsEditingSave(true);
    try {
      const { error } = await supabase
        .from('professor_school_courses')
        .update({
          workload_morning_hours: m,
          workload_afternoon_hours: a,
          workload_night_hours: n,
          workload_filled_at: new Date().toISOString(),
        })
        .eq('id', editTarget.id);
      if (error) throw error;
      toast.success('Carga horária atualizada');
      setEditTarget(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar carga horária');
    } finally {
      setIsEditingSave(false);
    }
  };

  if (!professor) return null;

  const availableCourses = filteredCourses.filter(c => !alreadyBoundCourseIds.has(c.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vínculos de {professor.full_name}</DialogTitle>
            <DialogDescription>
              Atribua o professor a uma escola escolhendo um ou mais cursos de uma só vez.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {showAddForm ? (
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <Label>Escola *</Label>
                      <SearchableSelect
                        value={selectedSchoolId}
                        onValueChange={setSelectedSchoolId}
                        placeholder="Selecione a escola"
                        searchPlaceholder="Buscar escola..."
                        options={schools.map(s => ({ value: s.id, label: s.nome }))}
                      />
                      {selectedSchoolId && (() => {
                        const sch: any = schools.find(s => s.id === selectedSchoolId);
                        const cidade = sch?.cidade || '—';
                        const estado = sch?.estado || sch?.uf || '';
                        return (
                          <div className="mt-2 space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Cidade</Label>
                              <div className="mt-1 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                                {cidade}{estado ? ` / ${estado}` : ''}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Diretor(a)</Label>
                                <div className="mt-1 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                                  <div className="font-medium">{sch?.diretor || '—'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {sch?.diretor_telefone ? `📞 ${sch.diretor_telefone}` : 'Sem telefone cadastrado'}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Diretor(a) Adjunto(a)</Label>
                                <div className="mt-1 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                                  <div className="font-medium">{sch?.diretor_adjunto || '—'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {sch?.diretor_adjunto_telefone ? `📞 ${sch.diretor_adjunto_telefone}` : 'Sem telefone cadastrado'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label>Cursos {schoolHasNoCourses ? '(opcional)' : '*'}</Label>
                        {selectedCourseIds.size > 0 && (
                          <Badge variant="secondary">{selectedCourseIds.size} selecionado{selectedCourseIds.size !== 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                      {!selectedSchoolId ? (
                        <div className="text-sm text-muted-foreground italic px-2 py-3 border border-dashed rounded">
                          Selecione a escola primeiro
                        </div>
                      ) : schoolHasNoCourses ? (
                        <div className="text-sm px-3 py-3 border border-dashed rounded bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                          <p className="font-medium">Esta escola ainda não possui cursos vinculados.</p>
                          <p className="text-xs mt-1">
                            {hasSchoolOnlyBinding
                              ? 'O professor já está vinculado a esta escola sem curso.'
                              : 'Você pode vincular o professor apenas à escola. Quando os cursos forem cadastrados, vincule-os por aqui.'}
                          </p>
                        </div>
                      ) : availableCourses.length === 0 ? (
                        <div className="text-sm text-muted-foreground px-2 py-3 border border-dashed rounded">
                          Todos os cursos desta escola já estão vinculados ao professor
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto rounded border divide-y">
                          {availableCourses.map(course => {
                            const sel = selectedCourseIds.has(course.id);
                            return (
                              <div key={course.id} className={`p-2.5 ${sel ? 'bg-primary/5' : ''}`}>
                                <div className="flex items-start gap-2">
                                  <Checkbox
                                    id={`bind-${course.id}`}
                                    checked={sel}
                                    onCheckedChange={() => toggleCourse(course.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label htmlFor={`bind-${course.id}`} className="cursor-pointer block">
                                      <span className="font-medium text-sm">{course.nome}</span>
                                    </Label>
                                    {sel && (
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <Switch
                                          checked={coordinatorCourseIds.has(course.id)}
                                          onCheckedChange={() => toggleCoordinator(course.id)}
                                          id={`coord-${course.id}`}
                                        />
                                        <Label htmlFor={`coord-${course.id}`} className="text-xs cursor-pointer text-muted-foreground">
                                          Coordenador deste curso
                                        </Label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Carga horária por turno */}
                    {selectedSchoolId && (() => {
                      const morningH = parseHrs(workloadMorning);
                      const afternoonH = parseHrs(workloadAfternoon);
                      const nightH = parseHrs(workloadNight);
                      const filledShifts = [morningH, afternoonH, nightH].filter((h) => h > 0).length;

                      const shiftCard = (opts: {
                        id: string;
                        label: string;
                        icon: React.ReactNode;
                        accent: string; // tailwind classes for accent ring/bg when filled
                        value: string;
                        hours: number;
                        onChange: (v: string) => void;
                      }) => {
                        const filled = opts.hours > 0;
                        return (
                          <div
                            className={[
                              'relative rounded-lg border-2 p-3 transition-all',
                              filled
                                ? `${opts.accent} shadow-sm`
                                : 'border-dashed border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/10 hover:border-amber-500',
                            ].join(' ')}
                          >
                            {filled && (
                              <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-600" />
                            )}
                            <Label
                              htmlFor={opts.id}
                              className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"
                            >
                              {opts.icon}
                              {opts.label}
                            </Label>
                            <div className="relative">
                              <Input
                                id={opts.id}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                placeholder="0"
                                value={opts.value}
                                onChange={(e) => opts.onChange(e.target.value)}
                                className={[
                                  'pr-12 text-base font-semibold h-10',
                                  filled ? 'border-emerald-400 focus-visible:ring-emerald-400' : '',
                                ].join(' ')}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                h/sem
                              </span>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div
                          className={[
                            'space-y-3 rounded-xl border-2 p-4 transition-all',
                            workloadValid
                              ? 'border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/10'
                              : 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 ring-2 ring-amber-300/40',
                          ].join(' ')}
                        >
                          {/* Header destacado */}
                          <div className="flex items-start gap-3">
                            <div
                              className={[
                                'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
                                workloadValid
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-400 text-amber-950 animate-pulse',
                              ].join(' ')}
                            >
                              {workloadValid ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <AlertTriangle className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-base font-bold">
                                  Carga horária semanal por turno
                                </Label>
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  OBRIGATÓRIO
                                </Badge>
                              </div>
                              <p
                                className={[
                                  'text-xs mt-1 font-medium',
                                  workloadValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-200',
                                ].join(' ')}
                              >
                                {workloadValid
                                  ? `✓ ${filledShifts} turno${filledShifts > 1 ? 's' : ''} preenchido${filledShifts > 1 ? 's' : ''}. Você pode salvar.`
                                  : '⚠ Preencha as horas em pelo menos UM turno para continuar.'}
                              </p>
                            </div>
                          </div>

                          {/* Cards por turno */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {shiftCard({
                              id: 'wl-morning',
                              label: 'Matutino',
                              icon: <Sun className="h-4 w-4 text-amber-500" />,
                              accent: 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/20',
                              value: workloadMorning,
                              hours: morningH,
                              onChange: setWorkloadMorning,
                            })}
                            {shiftCard({
                              id: 'wl-afternoon',
                              label: 'Vespertino',
                              icon: <Sunset className="h-4 w-4 text-orange-500" />,
                              accent: 'border-orange-400 bg-orange-50/80 dark:bg-orange-950/20',
                              value: workloadAfternoon,
                              hours: afternoonH,
                              onChange: setWorkloadAfternoon,
                            })}
                            {shiftCard({
                              id: 'wl-night',
                              label: 'Noturno',
                              icon: <Moon className="h-4 w-4 text-indigo-500" />,
                              accent: 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/20',
                              value: workloadNight,
                              hours: nightH,
                              onChange: setWorkloadNight,
                            })}
                          </div>

                          {/* Total destacado */}
                          <div
                            className={[
                              'flex items-center justify-between rounded-lg px-3 py-2.5 border',
                              workloadValid
                                ? 'bg-emerald-100/70 dark:bg-emerald-950/30 border-emerald-300'
                                : 'bg-white/60 dark:bg-background/40 border-amber-200',
                            ].join(' ')}
                          >
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              Total semanal nesta escola
                            </span>
                            <span
                              className={[
                                'text-lg font-bold tabular-nums',
                                workloadValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground',
                              ].join(' ')}
                            >
                              {totalWorkload.toFixed(1)} <span className="text-xs font-medium">h/sem</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddBindings}
                        disabled={
                          isSaving ||
                          !selectedSchoolId ||
                          !workloadValid ||
                          (schoolHasNoCourses ? hasSchoolOnlyBinding : selectedCourseIds.size === 0)
                        }
                      >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {schoolHasNoCourses
                          ? 'Vincular somente à escola'
                          : `Adicionar ${selectedCourseIds.size > 0 ? `(${selectedCourseIds.size})` : ''}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button onClick={() => setShowAddForm(true)} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar vínculo
                </Button>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Vínculos ativos ({bindings.filter(b => b.status === 'ACTIVE').length})
                </h4>

                {bindings.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    Nenhum vínculo cadastrado
                  </p>
                ) : (
                  bindings.map((binding) => {
                    const sch: any = schools.find(s => s.id === binding.school_id);
                    const cidade = sch?.cidade || '';
                    const estado = sch?.estado || sch?.uf || '';
                    return (
                    <Card key={binding.id} className={binding.status === 'INACTIVE' ? 'opacity-60' : ''}>
                      <CardContent className="py-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Linha 1: Escola · Cidade · Status */}
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <School className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{binding.school_name}</span>
                            {cidade && (
                              <>
                                <span className="text-muted-foreground/60">·</span>
                                <span className="text-muted-foreground">
                                  <span className="text-xs font-medium">Cidade:</span> {cidade}{estado ? ` / ${estado}` : ''}
                                </span>
                              </>
                            )}
                            <Badge variant={binding.status === 'ACTIVE' ? 'default' : 'outline'}>
                              {binding.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          {/* Linha 2: Curso */}
                          <div className="flex items-center gap-2 flex-wrap text-sm pl-6">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {binding.course_id ? (
                              <span>{binding.course_name}</span>
                            ) : (
                              <span className="italic text-muted-foreground">Sem curso vinculado</span>
                            )}
                            {binding.is_coordinator && (
                              <Badge variant="secondary">Coordenador</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {Number(
                                (binding.workload_morning_hours || 0) +
                                (binding.workload_afternoon_hours || 0) +
                                (binding.workload_night_hours || 0)
                              ).toFixed(1)}h
                              {' '}
                              (M{Number(binding.workload_morning_hours || 0).toFixed(0)}/
                              V{Number(binding.workload_afternoon_hours || 0).toFixed(0)}/
                              N{Number(binding.workload_night_hours || 0).toFixed(0)})
                            </Badge>
                          </div>
                          {/* Linha 3: Diretor / Diretor Adjunto */}
                          {(sch?.diretor || sch?.diretor_adjunto || sch?.diretor_telefone || sch?.diretor_adjunto_telefone) && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5 flex-wrap text-xs text-muted-foreground pl-6">
                              <span>
                                <span className="font-medium text-foreground">Diretor(a):</span>{' '}
                                {sch?.diretor || '—'}
                                {sch?.diretor_telefone && <> · 📞 {sch.diretor_telefone}</>}
                              </span>
                              <span>
                                <span className="font-medium text-foreground">Adjunto(a):</span>{' '}
                                {sch?.diretor_adjunto || '—'}
                                {sch?.diretor_adjunto_telefone && <> · 📞 {sch.diretor_adjunto_telefone}</>}
                              </span>
                            </div>
                          )}
                          {/* Linha 4: Quem desvinculou (somente quando inativo) */}
                          {binding.status === 'INACTIVE' && binding.unbound_at && (
                            <div className="mt-1 ml-6 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
                              <strong>Desvinculado</strong> em{' '}
                              {new Date(binding.unbound_at).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}{' '}
                              por <span className="font-medium">{binding.unbound_by_name || 'Sistema'}</span>
                              {binding.unbind_reason && (
                                <span className="block text-foreground/70 mt-0.5">
                                  <span className="font-medium text-destructive">Motivo:</span> {binding.unbind_reason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={binding.status === 'ACTIVE'}
                            onCheckedChange={() => handleToggleStatus(binding)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar carga horária"
                            onClick={() => openEdit(binding)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(binding)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })
                )}
              </div>

              {/* Histórico de Desvínculos (vermelho, separado) */}
              {unbindHistory.length > 0 && (
                <div className="space-y-2 pt-4 mt-4 border-t-2 border-destructive/30">
                  <h4 className="font-semibold text-sm text-destructive flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Desvínculos ({unbindHistory.length})
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Registro permanente das desvinculações realizadas com justificativa.
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unbindHistory.map((h: any) => (
                      <div
                        key={h.id}
                        className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex flex-wrap items-center gap-2">
                            <School className="h-3.5 w-3.5 text-destructive" />
                            <span className="font-medium text-destructive">
                              {h.schools?.nome || '—'}
                            </span>
                            {h.courses?.nome && (
                              <>
                                <span className="text-destructive/60">·</span>
                                <BookOpen className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-destructive/90">{h.courses.nome}</span>
                              </>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-destructive/80">
                              {new Date(h.unbound_at).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              por <span className="font-medium text-foreground/80">{h.unbound_by_name || 'Sistema'}</span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs text-foreground/80">
                          <strong className="text-destructive">Motivo:</strong> {h.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setUnbindReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Desvincular professor</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover o vínculo de <strong>{deleteTarget?.school_name}</strong>
              {deleteTarget?.course_id ? <> · <strong>{deleteTarget?.course_name}</strong></> : <> <em>(sem curso)</em></>}.
              {' '}Esta ação será registrada permanentemente no histórico do professor.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="unbind-reason" className="text-sm">
              Justificativa do desvínculo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="unbind-reason"
              placeholder="Ex.: Encerramento de contrato, transferência para outra escola, fim do ano letivo, solicitação do professor..."
              value={unbindReason}
              onChange={(e) => setUnbindReason(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 5 caracteres. {unbindReason.length}/500.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting || unbindReason.trim().length < 5}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar desvínculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar carga horária</AlertDialogTitle>
            <AlertDialogDescription>
              {editTarget?.school_name}
              {editTarget?.course_id ? <> · {editTarget?.course_name}</> : <> <em>(sem curso)</em></>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><Sun className="h-3 w-3" /> Matutino (h)</Label>
              <Input type="number" min="0" step="0.5" value={editMorning} onChange={(e) => setEditMorning(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Sunset className="h-3 w-3" /> Vespertino (h)</Label>
              <Input type="number" min="0" step="0.5" value={editAfternoon} onChange={(e) => setEditAfternoon(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Moon className="h-3 w-3" /> Noturno (h)</Label>
              <Input type="number" min="0" step="0.5" value={editNight} onChange={(e) => setEditNight(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Total: {(parseHrs(editMorning) + parseHrs(editAfternoon) + parseHrs(editNight)).toFixed(1)}h/sem
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEditingSave}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveEdit} disabled={isEditingSave}>
              {isEditingSave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
