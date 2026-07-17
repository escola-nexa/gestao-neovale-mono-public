import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { escolasApi } from '@/features/escolas/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { isManagerRole } from '@/lib/roles';
import { Search, Loader2, Users, Eye, UserPlus, X, AlertTriangle, BookOpen, Calendar, Check, LayoutGrid, List, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LinkProfessorDialog } from './components/LinkProfessorDialog';
import { BulkLinkProfessorDialog } from './components/BulkLinkProfessorDialog';

interface SchoolProfessor {
  id: string;
  fullName: string;
  registrationCode: string | null;
  phone: string | null;
  specialization: string | null;
  status: string;
  courses: { id: string; nome: string; bindingId: string; isCoordinator: boolean }[];
  weeklySlots: number;
}

interface SchoolCourseOption {
  id: string;
  nome: string;
  codigo: string;
}

interface UnlinkCheck {
  professorId: string;
  professorName: string;
  bindings: { bindingId: string; courseId: string; courseName: string; weeklySlots: number; plannings: number; canRemove: boolean; selected: boolean }[];
  loading: boolean;
}

export default function SchoolProfessorsPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const canManage = isManagerRole(user?.perfil);

  const [professors, setProfessors] = useState<SchoolProfessor[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCourses, setSchoolCourses] = useState<SchoolCourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false);
  const [unlinkDialog, setUnlinkDialog] = useState<UnlinkCheck | null>(null);
  const [unlinkSaving, setUnlinkSaving] = useState(false);
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [matrixCell, setMatrixCell] = useState<{ profId: string; courseId: string; busy: boolean } | null>(null);

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [schoolRes, bindingsRes, slotsRes, courseLinksRes] = await Promise.all([
        escolasApi.client.from('schools').select('nome').eq('id', schoolId!).maybeSingle(),
        escolasApi.client.from('professor_school_courses')
          .select(`
            id, professor_id, course_id, is_coordinator,
            courses:course_id(id, nome, codigo),
            professors:professor_id(id, full_name, registration_code, phone, specialization, status, deleted_at)
          `)
          .eq('school_id', schoolId!)
          .eq('status', 'ACTIVE'),
        escolasApi.client.from('weekly_teaching_models')
          .select('professor_id')
          .eq('school_id', schoolId!)
          .eq('status', 'ACTIVE')
          .eq('schedule_type', 'CLASS'),
        escolasApi.client.from('course_schools').select('course_id, courses:course_id(id, nome, codigo, status)').eq('school_id', schoolId!),
      ]);

      if (schoolRes.data) setSchoolName(schoolRes.data.nome);

      // School courses (active only)
      const courseOptions: SchoolCourseOption[] = ((courseLinksRes.data || []) as any[])
        .map(r => r.courses)
        .filter((c: any) => c && c.status === 'ativo')
        .map((c: any) => ({ id: c.id, nome: c.nome, codigo: c.codigo }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setSchoolCourses(courseOptions);

      // Slots count per professor
      const slotCountMap = new Map<string, number>();
      for (const slot of (slotsRes.data || [])) {
        slotCountMap.set(slot.professor_id, (slotCountMap.get(slot.professor_id) || 0) + 1);
      }

      const profMap = new Map<string, SchoolProfessor>();
      for (const binding of (bindingsRes.data || []) as any[]) {
        const prof = binding.professors;
        if (!prof || prof.deleted_at) continue;
        const courseObj = binding.courses;
        const existing = profMap.get(prof.id);
        const courseEntry = courseObj
          ? { id: courseObj.id, nome: courseObj.nome, bindingId: binding.id, isCoordinator: !!binding.is_coordinator }
          : null;

        if (existing) {
          if (courseEntry && !existing.courses.some(c => c.id === courseEntry.id)) {
            existing.courses.push(courseEntry);
          }
        } else {
          profMap.set(prof.id, {
            id: prof.id,
            fullName: prof.full_name,
            registrationCode: prof.registration_code,
            phone: prof.phone,
            specialization: prof.specialization,
            status: prof.status,
            courses: courseEntry ? [courseEntry] : [],
            weeklySlots: slotCountMap.get(prof.id) || 0,
          });
        }
      }

      setProfessors(Array.from(profMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (error) {
      console.error('Erro ao carregar professores da escola:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = professors.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.registrationCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const openUnlinkDialog = async (prof: SchoolProfessor) => {
    if (!schoolId) return;
    setUnlinkDialog({
      professorId: prof.id,
      professorName: prof.fullName,
      bindings: prof.courses.map(c => ({
        bindingId: c.bindingId,
        courseId: c.id,
        courseName: c.nome,
        weeklySlots: 0,
        plannings: 0,
        canRemove: true,
        selected: true,
      })),
      loading: true,
    });

    try {
      const bindingIds = prof.courses.map(c => c.bindingId);
      const { data: depRows } = await escolasApi.client.rpc('check_professor_binding_dependencies', {
        _binding_ids: bindingIds,
      });
      const depMap = new Map<string, { weekly_slots: number; plannings: number }>();
      for (const row of (depRows || []) as any[]) {
        depMap.set(row.binding_id, {
          weekly_slots: Number(row.weekly_slots) || 0,
          plannings: Number(row.plannings) || 0,
        });
      }
      const checks = prof.courses.map(c => {
        const dep = depMap.get(c.bindingId) || { weekly_slots: 0, plannings: 0 };
        return {
          bindingId: c.bindingId,
          courseId: c.id,
          courseName: c.nome,
          weeklySlots: dep.weekly_slots,
          plannings: dep.plannings,
          canRemove: dep.weekly_slots === 0 && dep.plannings === 0,
        };
      });

      setUnlinkDialog(prev => prev ? {
        ...prev,
        loading: false,
        bindings: checks.map(c => ({ ...c, selected: c.canRemove })),
      } : null);
    } catch (e) {
      setUnlinkDialog(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const toggleUnlinkSelection = (bindingId: string) => {
    setUnlinkDialog(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        bindings: prev.bindings.map(b => b.bindingId === bindingId && b.canRemove ? { ...b, selected: !b.selected } : b),
      };
    });
  };

  const handleConfirmUnlink = async () => {
    if (!unlinkDialog) return;
    const idsToDelete = unlinkDialog.bindings.filter(b => b.selected && b.canRemove).map(b => b.bindingId);
    if (idsToDelete.length === 0) {
      setUnlinkDialog(null);
      return;
    }
    setUnlinkSaving(true);
    try {
      const { error } = await escolasApi.client.from('professor_school_courses').delete().in('id', idsToDelete);
      if (error) throw error;
      toast({ title: 'Sucesso', description: `${idsToDelete.length} vínculo${idsToDelete.length !== 1 ? 's' : ''} removido${idsToDelete.length !== 1 ? 's' : ''}` });
      setUnlinkDialog(null);
      await loadData();
    } catch {
      toast({ title: 'Erro', description: 'Falha ao remover vínculos', variant: 'destructive' });
    } finally {
      setUnlinkSaving(false);
    }
  };

  const selectedToRemove = unlinkDialog?.bindings.filter(b => b.selected && b.canRemove).length || 0;
  const blockedCount = unlinkDialog?.bindings.filter(b => !b.canRemove).length || 0;

  // ---- Matrix helpers ----
  const handleMatrixToggle = async (prof: SchoolProfessor, course: SchoolCourseOption) => {
    if (!schoolId || !canManage) return;
    const existing = prof.courses.find(c => c.id === course.id);
    setMatrixCell({ profId: prof.id, courseId: course.id, busy: true });
    try {
      if (existing) {
        const { data: depRows } = await escolasApi.client.rpc('check_professor_binding_dependencies', {
          _binding_ids: [existing.bindingId],
        });
        const dep = (depRows && depRows[0]) || { weekly_slots: 0, plannings: 0 };
        const slots = Number(dep.weekly_slots) || 0;
        const plans = Number(dep.plannings) || 0;
        if (slots > 0 || plans > 0) {
          toast({
            title: 'Não é possível desvincular',
            description: `Há ${slots} aula(s) na grade e ${plans} planejamento(s) ativos. Remova-os primeiro.`,
            variant: 'destructive',
          });
          return;
        }
        const { error } = await escolasApi.client.from('professor_school_courses').delete().eq('id', existing.bindingId);
        if (error) throw error;
        toast({ title: 'Vínculo removido', description: `${prof.fullName} · ${course.nome}` });
      } else {
        if (!organizationId) {
          toast({ title: 'Erro', description: 'Organização não identificada', variant: 'destructive' });
          return;
        }
        const { error } = await escolasApi.client.from('professor_school_courses').insert({
          organization_id: organizationId,
          professor_id: prof.id,
          school_id: schoolId,
          course_id: course.id,
          is_coordinator: false,
          status: 'ACTIVE',
        });
        if (error) throw error;
        toast({ title: 'Vínculo criado', description: `${prof.fullName} · ${course.nome}` });
      }
      await loadData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar vínculo', variant: 'destructive' });
    } finally {
      setMatrixCell(null);
    }
  };

  const handleMatrixToggleCoord = async (prof: SchoolProfessor, course: SchoolCourseOption) => {
    if (!schoolId || !canManage) return;
    const existing = prof.courses.find(c => c.id === course.id);
    if (!existing) return;
    try {
      const { error } = await supabase
        .from('professor_school_courses')
        .update({ is_coordinator: !existing.isCoordinator })
        .eq('id', existing.bindingId);
      if (error) throw error;
      await loadData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || 'Escola', href: `/escolas/${schoolId}` },
          { label: 'Professores' },
        ]}
        title="Professores da Escola"
        description={`${schoolName} · ${professors.length} professor${professors.length !== 1 ? 'es' : ''} vinculado${professors.length !== 1 ? 's' : ''}`}
        backTo={`/escolas/${schoolId}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              <Button
                size="sm"
                variant={view === 'list' ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setView('list')}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={view === 'matrix' ? 'default' : 'ghost'}
                className="h-7 px-2"
                onClick={() => setView('matrix')}
                title="Matriz Professor × Curso"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            {canManage && (
              <>
                <Button variant="outline" onClick={() => setBulkLinkOpen(true)}>
                  <Users className="mr-2 h-4 w-4" /> Em massa
                </Button>
                <Button onClick={() => setLinkOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Vincular professor
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar professor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {professors.length === 0 ? 'Nenhum professor vinculado a esta escola' : 'Nenhum professor encontrado'}
              </p>
              {professors.length === 0 && canManage && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setLinkOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Vincular professor
                </Button>
              )}
            </div>
          ) : view === 'matrix' ? (
            <div className="overflow-x-auto">
              {schoolCourses.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>Nenhum curso vinculado a esta escola. Vincule cursos primeiro para usar a matriz.</p>
                </div>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <div className="px-2 sm:px-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      Clique em uma célula para vincular/desvincular. Clique no <Star className="inline h-3 w-3 -mt-0.5" /> para marcar como coordenador do curso.
                    </p>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 sticky left-0 bg-background z-10 min-w-[200px]">Professor</th>
                          {schoolCourses.map(c => (
                            <th key={c.id} className="p-2 text-center font-medium text-xs whitespace-nowrap" title={c.nome}>
                              <div className="max-w-[120px] mx-auto truncate">{c.nome}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(prof => (
                          <tr key={prof.id} className="border-b hover:bg-muted/30">
                            <td className="p-2 sticky left-0 bg-background z-10">
                              <button
                                className="text-left hover:underline font-medium truncate block max-w-[200px]"
                                onClick={() => navigate(`/professores/${prof.id}`, { state: { fromSchool: schoolId, schoolName } })}
                                title={prof.fullName}
                              >
                                {prof.fullName}
                              </button>
                            </td>
                            {schoolCourses.map(c => {
                              const linked = prof.courses.find(pc => pc.id === c.id);
                              const isBusy = matrixCell?.profId === prof.id && matrixCell?.courseId === c.id && matrixCell?.busy;
                              return (
                                <td key={c.id} className="p-1 text-center">
                                  <div className="inline-flex items-center gap-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          disabled={!canManage || isBusy}
                                          onClick={() => handleMatrixToggle(prof, c)}
                                          className={`h-7 w-7 rounded border transition-colors flex items-center justify-center ${
                                            linked
                                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/80'
                                              : 'border-dashed text-muted-foreground hover:border-primary hover:bg-primary/10'
                                          } ${!canManage ? 'cursor-default' : 'cursor-pointer'} disabled:opacity-50`}
                                        >
                                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : linked ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs">+</span>}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {linked ? `Desvincular ${prof.fullName} de ${c.nome}` : `Vincular ${prof.fullName} a ${c.nome}`}
                                      </TooltipContent>
                                    </Tooltip>
                                    {linked && canManage && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleMatrixToggleCoord(prof, c)}
                                            className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                                              linked.isCoordinator ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-500'
                                            }`}
                                          >
                                            <Star className="h-3 w-3" fill={linked.isCoordinator ? 'currentColor' : 'none'} />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {linked.isCoordinator ? 'Remover como coordenador' : 'Marcar como coordenador'}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TooltipProvider>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Cursos</TableHead>
                      <TableHead>Carga Horária</TableHead>
                      <TableHead>Especialização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((prof) => (
                      <TableRow key={prof.id}>
                        <TableCell className="font-medium">{prof.fullName}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{prof.registrationCode || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prof.courses.slice(0, 2).map(c => (
                              <Badge key={c.id} variant="outline" className="text-xs">
                                {c.nome}{c.isCoordinator ? ' (C)' : ''}
                              </Badge>
                            ))}
                            {prof.courses.length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{prof.courses.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{prof.weeklySlots}</span>
                          <span className="text-xs text-muted-foreground ml-1">aulas/sem</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{prof.specialization || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={prof.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {prof.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/professores/${prof.id}`, { state: { fromSchool: schoolId, schoolName } })}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver Perfil
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Desvincular da escola"
                                onClick={() => openUnlinkDialog(prof)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y">
                {filtered.map((prof) => (
                  <div key={prof.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{prof.fullName}</p>
                        {prof.registrationCode && (
                          <span className="text-xs text-muted-foreground font-mono">Mat: {prof.registrationCode}</span>
                        )}
                      </div>
                      <Badge variant={prof.status === 'ACTIVE' ? 'default' : 'secondary'} className="shrink-0">
                        {prof.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    {prof.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {prof.courses.map(c => (
                          <Badge key={c.id} variant="outline" className="text-xs">
                            {c.nome}{c.isCoordinator ? ' (C)' : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{prof.weeklySlots} aulas/semana</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/professores/${prof.id}`, { state: { fromSchool: schoolId, schoolName } })}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver Perfil
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openUnlinkDialog(prof)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {schoolId && (
        <LinkProfessorDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          schoolId={schoolId}
          schoolName={schoolName}
          schoolCourses={schoolCourses}
          alreadyLinkedProfessorIds={professors.map(p => p.id)}
          onLinked={loadData}
        />
      )}

      {schoolId && (
        <BulkLinkProfessorDialog
          open={bulkLinkOpen}
          onOpenChange={setBulkLinkOpen}
          schoolId={schoolId}
          schoolName={schoolName}
          schoolCourses={schoolCourses}
          existingLinks={Object.fromEntries(
            professors.map(p => [p.id, new Set(p.courses.map(c => c.id))])
          )}
          onLinked={loadData}
        />
      )}

      {/* Unlink dialog */}
      <AlertDialog open={!!unlinkDialog} onOpenChange={(o) => !o && setUnlinkDialog(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Desvincular professor da escola
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Selecione os cursos que serão desvinculados de <strong>{unlinkDialog?.professorName}</strong> em <strong>{schoolName}</strong>.
                </p>
                {unlinkDialog?.loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Verificando dependências...</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {unlinkDialog?.bindings.map(b => (
                      <label
                        key={b.bindingId}
                        className={`flex items-start gap-2 p-2.5 rounded-md border ${b.canRemove ? 'cursor-pointer hover:bg-muted/50' : 'opacity-70 bg-muted/30'}`}
                      >
                        <input
                          type="checkbox"
                          checked={b.selected && b.canRemove}
                          disabled={!b.canRemove}
                          onChange={() => toggleUnlinkSelection(b.bindingId)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm">{b.courseName}</span>
                          </div>
                          {b.canRemove ? (
                            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                              <Check className="h-3 w-3" /> Sem dependências, pode desvincular
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600 mt-1 space-y-0.5">
                              <div className="font-medium">Não pode ser desvinculado:</div>
                              {b.weeklySlots > 0 && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{b.weeklySlots} aula{b.weeklySlots !== 1 ? 's' : ''} na grade semanal</div>}
                              {b.plannings > 0 && <div>{b.plannings} planejamento{b.plannings !== 1 ? 's' : ''} cadastrado{b.plannings !== 1 ? 's' : ''}</div>}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {!unlinkDialog?.loading && blockedCount > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {blockedCount} curso{blockedCount !== 1 ? 's' : ''} {blockedCount !== 1 ? 'estão' : 'está'} bloqueado{blockedCount !== 1 ? 's' : ''} por aulas na grade ou planejamentos. Remova-os primeiro em Grade Horária / Planejamento.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnlink}
              disabled={unlinkSaving || selectedToRemove === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Desvincular {selectedToRemove > 0 ? `(${selectedToRemove})` : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
