import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Eye, ExternalLink, FileText, CheckCircle, Clock, XCircle, User, School, BookOpen,
  FileDown, ChevronDown, CalendarDays, PenTool, GraduationCap, AlertCircle, Building2, ClipboardCheck, Trash2, Wifi,
} from 'lucide-react';
import { TeacherPlanningData, CourseData, SubjectData, SchoolData, ClassGroupData } from '@/services/supabaseApi';
import { PLANNING_STATUS_LABELS, TeacherPlanningStatus } from '@/types/academic';
import { useAuth } from '@/contexts/AuthContext';
import { planejamentoApi } from '@/features/planejamento/api';
import { toast } from 'sonner';
import { DigitalSignatureDialog } from './DigitalSignatureDialog';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { Paginator } from '@/components/common/Paginator';

interface TeacherPlanningListProps {
  items: TeacherPlanningData[];
  courses: CourseData[];
  subjects: SubjectData[];
  schools: SchoolData[];
  classGroups: ClassGroupData[];
  professors: Record<string, string>;
  isCoordinator: boolean;
  onView: (tp: TeacherPlanningData) => void;
  onRefresh?: () => void;
  emptyMessage: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  DRAFT: { icon: <FileText className="h-3.5 w-3.5" />, className: 'border-slate-300 text-slate-600 bg-slate-50' },
  CONCLUIDO: { icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  PENDING: { icon: <Clock className="h-3.5 w-3.5" />, className: 'border-amber-300 text-amber-700 bg-amber-50' },
  ENVIADO: { icon: <Clock className="h-3.5 w-3.5" />, className: 'border-amber-300 text-amber-700 bg-amber-50' },
  AGUARDANDO_ASSINATURA: { icon: <PenTool className="h-3.5 w-3.5" />, className: 'border-blue-300 text-blue-700 bg-blue-50' },
  AGUARDANDO_ASSINATURA_COORDENADOR: { icon: <PenTool className="h-3.5 w-3.5" />, className: 'border-violet-300 text-violet-700 bg-violet-50' },
  APPROVED: { icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'bg-emerald-600 text-white border-emerald-600' },
  ASSINADO: { icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'bg-emerald-600 text-white border-emerald-600' },
  REJECTED: { icon: <XCircle className="h-3.5 w-3.5" />, className: 'bg-destructive text-destructive-foreground' },
  DEVOLVIDO: { icon: <XCircle className="h-3.5 w-3.5" />, className: 'bg-destructive text-destructive-foreground' },
};

interface ProfessorGroup {
  professorId: string;
  professorName: string;
  disciplines: DisciplineGroup[];
  totalWeeks: number;
  statusSummary: Record<string, number>;
}

interface DisciplineGroup {
  key: string;
  subjectId: string;
  subjectName: string;
  classGroupName: string;
  bimester: number | null;
  items: TeacherPlanningData[];
  statusSummary: Record<string, number>;
}

interface SchoolGroup {
  schoolId: string;
  schoolName: string;
  professors: ProfessorGroup[];
  totalWeeks: number;
}

export function TeacherPlanningList({
  items, courses, subjects, schools, classGroups, professors, isCoordinator,
  onView, onRefresh, emptyMessage,
}: TeacherPlanningListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [deleting, setDeleting] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingPlanningIds, setSigningPlanningIds] = useState<string[]>([]);
  const [anpSlotKeys, setAnpSlotKeys] = useState<Set<string>>(new Set());
  const { data: anpMap } = useAnpSubjectMap();

  // Load ANP slots so we can mark plannings as ANP
  useEffect(() => {
    let active = true;
    (async () => {
      const classGroupIds = [...new Set(items.map(i => i.class_group_id).filter(Boolean))] as string[];
      if (classGroupIds.length === 0) {
        setAnpSlotKeys(new Set());
        return;
      }
      const data = await planejamentoApi.getWeeklyTeachingModels(classGroupIds);
      if (!active) return;
      const keys = new Set<string>();
      (data || []).forEach((r: any) => {
        keys.add(`${r.class_group_id}|${r.subject_id}|${r.weekday}|${(r.start_time || '').slice(0, 5)}`);
      });
      setAnpSlotKeys(keys);
    })();
    return () => { active = false; };
  }, [items]);

  const isAnpPlanning = (tp: TeacherPlanningData): boolean => {
    if (!tp.class_group_id || !tp.subject_id || !tp.class_date || !tp.start_time) return false;
    const weekday = new Date(tp.class_date + 'T00:00:00').getDay(); // 0=Sun..6=Sat
    const key = `${tp.class_group_id}|${tp.subject_id}|${weekday}|${tp.start_time.slice(0, 5)}`;
    return anpSlotKeys.has(key);
  };

  const getSubjectName = (id: string | null) => {
    if (!id) return '-';
    const s = subjects.find(s => s.id === id);
    if (!s) return '-';
    return s.nome_boletim ? `${s.nome} (${s.nome_boletim})` : s.nome;
  };
  const getSchoolName = (id: string | null) => schools.find(s => s.id === id)?.nome || '-';
  const getClassGroupName = (id: string | null) => classGroups.find(cg => cg.id === id)?.nome || '-';

  const handleDeleteGroup = async (groupItems: TeacherPlanningData[]) => {
    setDeleting(true);
    try {
      const ids = groupItems.map(i => i.id);
      // Collect pre_planning_ids to hard-delete later
      const prePlanningIds = [...new Set(groupItems.map(i => i.pre_planning_id).filter(Boolean))] as string[];

      await planejamentoApi.bulkHardDeleteTeacherPlannings(ids);

      // HARD-DELETE corresponding pre_plannings (via RPC that handles dependencies + permissions)
      if (prePlanningIds.length > 0) {
        await planejamentoApi.bulkSoftDeletePrePlannings(prePlanningIds);
      }

      toast.success(`${ids.length} planejamento(s) excluído(s) com sucesso`);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { icon: null, className: '' };
    return (
      <Badge variant="outline" className={`text-xs font-medium gap-1 ${config.className}`}>
        {config.icon}
        {PLANNING_STATUS_LABELS[status as TeacherPlanningStatus] || status}
      </Badge>
    );
  };

  // Group by school → professor → discipline
  const schoolGroups = useMemo((): SchoolGroup[] => {
    if (!isCoordinator) return [];

    const schoolMap = new Map<string, SchoolGroup>();

    items.forEach((tp) => {
      const sId = tp.school_id || 'unknown';
      if (!schoolMap.has(sId)) {
        schoolMap.set(sId, {
          schoolId: sId,
          schoolName: getSchoolName(sId),
          professors: [],
          totalWeeks: 0,
        });
      }
      const sg = schoolMap.get(sId)!;
      sg.totalWeeks++;

      // Find or create professor group
      let pg = sg.professors.find(p => p.professorId === tp.professor_id);
      if (!pg) {
        pg = {
          professorId: tp.professor_id,
          professorName: professors[tp.professor_id] || 'Professor',
          disciplines: [],
          totalWeeks: 0,
          statusSummary: {},
        };
        sg.professors.push(pg);
      }
      pg.totalWeeks++;
      pg.statusSummary[tp.status] = (pg.statusSummary[tp.status] || 0) + 1;

      // Find or create discipline group
      const dKey = `${tp.subject_id}_${tp.class_group_id}_${tp.bimester_number}`;
      let dg = pg.disciplines.find(d => d.key === dKey);
      if (!dg) {
        dg = {
          key: dKey,
          subjectId: tp.subject_id,
          subjectName: getSubjectName(tp.subject_id),
          classGroupName: getClassGroupName(tp.class_group_id),
          bimester: tp.bimester_number,
          items: [],
          statusSummary: {},
        };
        pg.disciplines.push(dg);
      }
      dg.items.push(tp);
      dg.statusSummary[tp.status] = (dg.statusSummary[tp.status] || 0) + 1;
    });

    // Sort schools, professors, and disciplines alphabetically
    const result = Array.from(schoolMap.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName));
    result.forEach(sg => {
      sg.professors.sort((a, b) => a.professorName.localeCompare(b.professorName));
      sg.professors.forEach(pg => {
        pg.disciplines.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      });
    });
    return result;
  }, [items, isCoordinator, professors]);

  const [openSchools, setOpenSchools] = useState<Record<string, boolean>>({});
  const [openProfessors, setOpenProfessors] = useState<Record<string, boolean>>({});

  // All collapsed by default

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Professor view: simple flat table with pagination
  if (!isCoordinator) {
    return <ProfessorTeacherPlanningTable
      items={items}
      isAnpPlanning={isAnpPlanning}
      getSubjectName={getSubjectName}
      getSchoolName={getSchoolName}
      getClassGroupName={getClassGroupName}
      getStatusBadge={getStatusBadge}
      onView={onView}
    />;
  }

  // Coordinator view: grouped by school → professor
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {schoolGroups.map((sg) => {
          const isSchoolOpen = openSchools[sg.schoolId] === true;

          return (
            <Collapsible key={sg.schoolId} open={isSchoolOpen} onOpenChange={() => setOpenSchools(prev => ({ ...prev, [sg.schoolId]: !isSchoolOpen }))}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-gradient-to-r from-muted/40 to-muted/70 hover:from-muted/60 hover:to-muted/90 cursor-pointer transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isSchoolOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{sg.schoolName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sg.professors.length} professor(es) • {sg.professors.reduce((sum, p) => sum + p.disciplines.length, 0)} disciplina(s)
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 gap-1.5 text-xs"
                          disabled={deleting}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir Escola
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir todos os planejamentos da escola</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>todos os {sg.totalWeeks} planejamentos</strong> da escola{' '}
                            <strong>{sg.schoolName}</strong>? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              const allItems = sg.professors.flatMap(p => p.disciplines.flatMap(d => d.items));
                              handleDeleteGroup(allItems);
                            }}
                          >
                            Excluir {sg.totalWeeks} planejamento(s)
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-3">
                  {sg.professors.map((pg) => {
                    const isProfOpen = openProfessors[`${sg.schoolId}_${pg.professorId}`] === true;

                    return (
                      <Collapsible
                        key={pg.professorId}
                        open={isProfOpen}
                        onOpenChange={() => setOpenProfessors(prev => ({ ...prev, [`${sg.schoolId}_${pg.professorId}`]: !isProfOpen }))}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center h-4 w-4 rounded transition-transform duration-200 ${isProfOpen ? 'rotate-0' : '-rotate-90'}`}>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary shrink-0">
                                <User className="h-4 w-4 text-secondary-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{pg.professorName}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {pg.disciplines.length} disciplina(s)
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {/* Count disciplines per dominant status */}
                              {(() => {
                                const discStatusMap: Record<string, number> = {};
                                pg.disciplines.forEach(dg => {
                                  const dominant = Object.entries(dg.statusSummary).sort((a, b) => b[1] - a[1])[0]?.[0] || 'DRAFT';
                                  discStatusMap[dominant] = (discStatusMap[dominant] || 0) + 1;
                                });
                                return Object.entries(discStatusMap).map(([status, count]) => {
                                  const config = statusConfig[status] || { icon: null, className: '' };
                                  return (
                                    <Badge key={status} variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${config.className}`}>
                                      {count} {PLANNING_STATUS_LABELS[status as TeacherPlanningStatus] || status}
                                    </Badge>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-8 mt-2 space-y-2">
                            {pg.disciplines.map((dg) => (
                              <div key={dg.key} className="rounded-lg border bg-card overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium"><SubjectNameWithAnp name={dg.subjectName} isAnp={anpMap?.bySubject.has(dg.subjectId)} compact /> • {dg.classGroupName}</p>
                                        {dg.items.some(isAnpPlanning) && (
                                          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50 text-[10px] h-5">
                                            <Wifi className="h-2.5 w-2.5" />
                                            ANP
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">{dg.bimester}º Bimestre • {dg.items.length} semana(s)</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {Object.entries(dg.statusSummary).map(([status, count]) => {
                                        const config = statusConfig[status] || { icon: null, className: '' };
                                        return (
                                          <Badge key={status} variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${config.className}`}>
                                            {count}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                    {(() => {
                                      const signatureStatuses = ['AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR', 'ASSINADO', 'APPROVED'];
                                      const allDevolvido = dg.items.every(tp => tp.status === 'DEVOLVIDO' || tp.status === 'REJECTED');
                                      const allInSignatureOrFinalized = dg.items.every(tp => signatureStatuses.includes(tp.status));
                                      const dominantStatus = Object.entries(dg.statusSummary).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                                      const dominantConfig = statusConfig[dominantStatus];

                                      if (allDevolvido) {
                                        return (
                                          <Badge variant="outline" className="text-[10px] px-2.5 py-1 font-medium gap-1 bg-destructive text-destructive-foreground">
                                            <XCircle className="h-3 w-3" />
                                            Devolvido ao professor
                                          </Badge>
                                        );
                                      }

                                      if (allInSignatureOrFinalized) {
                                        const allAwaitingCoordinator = dg.items.every(tp => tp.status === 'AGUARDANDO_ASSINATURA_COORDENADOR');
                                        return (
                                          <div className="flex items-center gap-2">
                                            {dominantConfig && (
                                              <Badge variant="outline" className={`text-[10px] px-2.5 py-1 font-medium gap-1 ${dominantConfig.className}`}>
                                                {dominantConfig.icon}
                                                {PLANNING_STATUS_LABELS[dominantStatus as TeacherPlanningStatus] || dominantStatus}
                                              </Badge>
                                            )}
                                            {allAwaitingCoordinator && isCoordinator && (
                                              <Button
                                                size="sm"
                                                className="h-8 gap-1.5 text-xs"
                                                onClick={() => {
                                                  setSigningPlanningIds(dg.items.map(tp => tp.id));
                                                  setSignatureDialogOpen(true);
                                                }}
                                              >
                                                <PenTool className="h-3.5 w-3.5" />
                                                Assinar
                                              </Button>
                                            )}
                                          </div>
                                        );
                                      }

                                      // Check if professor has submitted (ENVIADO or later in workflow)
                                      const submittedStatuses = ['ENVIADO', 'PENDING', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR', 'ASSINADO', 'APPROVED'];
                                      const hasSubmitted = dg.items.some(tp => submittedStatuses.includes(tp.status));

                                      if (hasSubmitted) {
                                        return (
                                          <>
                                            <Button
                                              size="sm"
                                              className="h-8 gap-1.5 text-xs"
                                              onClick={() => {
                                                const tp = dg.items[0];
                                                const params = new URLSearchParams({
                                                  professorId: tp.professor_id,
                                                  schoolId: tp.school_id || '',
                                                  subjectId: tp.subject_id || '',
                                                  classGroupId: tp.class_group_id || '',
                                                  bimester: String(tp.bimester_number || 1),
                                                });
                                                navigate(`/planejamento/conferir?${params.toString()}`);
                                              }}
                                            >
                                              <ClipboardCheck className="h-3.5 w-3.5" />
                                              Conferir Planejamento
                                            </Button>
                                            {isAdmin && (
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 gap-1.5 text-xs"
                                                    disabled={deleting}
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Excluir
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir planejamentos</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Tem certeza que deseja excluir {dg.items.length} semana(s) de planejamento de{' '}
                                                      <strong>{dg.subjectName}</strong> ({dg.classGroupName})?
                                                      Esta ação não pode ser desfeita.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                      onClick={() => handleDeleteGroup(dg.items)}
                                                    >
                                                      Excluir
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            )}
                                          </>
                                        );
                                      }

                                      // Not yet submitted - show "Ver" button + admin delete
                                      return (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1.5 text-xs"
                                            onClick={() => {
                                              const tp = dg.items[0];
                                              const params = new URLSearchParams({
                                                professorId: tp.professor_id,
                                                schoolId: tp.school_id || '',
                                                subjectId: tp.subject_id || '',
                                                classGroupId: tp.class_group_id || '',
                                                bimester: String(tp.bimester_number || 1),
                                              });
                                              navigate(`/planejamento/conferir?${params.toString()}`);
                                            }}
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            Ver
                                          </Button>
                                          {isAdmin && (
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  className="h-8 gap-1.5 text-xs"
                                                  disabled={deleting}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                  Excluir
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Excluir planejamentos</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Tem certeza que deseja excluir {dg.items.length} semana(s) de planejamento de{' '}
                                                    <strong>{dg.subjectName}</strong> ({dg.classGroupName})?
                                                    Esta ação não pode ser desfeita.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    onClick={() => handleDeleteGroup(dg.items)}
                                                  >
                                                    Excluir
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Coordinator Signature Dialog */}
      <DigitalSignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        planningId={signingPlanningIds[0] || ''}
        planningIds={signingPlanningIds}
        signatureType="COORDINATOR"
        onSuccess={() => {
          setSignatureDialogOpen(false);
          setSigningPlanningIds([]);
          onRefresh?.();
        }}
      />
    </TooltipProvider>
  );
}

interface ProfessorTableProps {
  items: TeacherPlanningData[];
  isAnpPlanning: (tp: TeacherPlanningData) => boolean;
  getSubjectName: (id: string | null) => string;
  getSchoolName: (id: string | null) => string;
  getClassGroupName: (id: string | null) => string;
  getStatusBadge: (status: string) => JSX.Element;
  onView: (tp: TeacherPlanningData) => void;
}

function ProfessorTeacherPlanningTable({
  items, isAnpPlanning, getSubjectName, getSchoolName, getClassGroupName, getStatusBadge, onView,
}: ProfessorTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => { setPage(1); }, [items.length]);
  const total = items.length;
  const paginated = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Disciplina</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Escola / Turma</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Data da Aula</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((tp) => (
                <TableRow key={tp.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium truncate max-w-[220px]">{getSubjectName(tp.subject_id)}</p>
                      {isAnpPlanning(tp) && (
                        <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50 text-[10px] h-5">
                          <Wifi className="h-2.5 w-2.5" />
                          AULA ANP
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm flex items-center gap-1.5">
                        <School className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{getSchoolName(tp.school_id)}</span>
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{getClassGroupName(tp.class_group_id)}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tp.class_date ? (
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(tp.class_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </p>
                    ) : (
                      <span className="text-sm text-muted-foreground">{new Date(tp.created_at).toLocaleDateString('pt-BR')}</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(tp.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(tp)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {total > pageSize && (
          <Paginator
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="planejamentos"
          />
        )}
      </div>
    </TooltipProvider>
  );
}
