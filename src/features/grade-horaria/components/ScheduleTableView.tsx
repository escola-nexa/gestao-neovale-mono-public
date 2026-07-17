import React, { useMemo, useState, useEffect } from 'react';
import { MoreHorizontal, Trash2, RefreshCw, Calendar, BookOpen, ClipboardList, X, Loader2, ChevronDown, ChevronRight, Building2, ChevronsLeft, ChevronLeft, ChevronsRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WEEKDAY_LABELS, type Weekday } from '@/types/academic';
import { SEMESTER_LABELS } from '@/hooks/useSemester';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import type { WeeklyModelWithRelations, ScheduleType, SchoolGenerationInfo } from '../hooks/useWeeklySchedule';
import { PlanningObservationButton } from './PlanningObservationButton';


interface ScheduleTableViewProps {
  models: WeeklyModelWithRelations[];
  groupBy?: 'school' | 'professor' | 'school-course';
  onDelete?: (id: string) => Promise<void>;
  /** Optimized bulk delete: single round-trip per chunk. When provided, used instead of looping onDelete. */
  onBulkDelete?: (ids: string[]) => Promise<{ ok: number; fail: number }>;
  onGenerateOccurrences?: (id: string) => Promise<number>;
  /** Admin-only: enables checkboxes + bulk delete bar */
  canBulkDelete?: boolean;
  /** Status de geração por escola — usado para badge no header de grupo */
  schoolGenerationStatus?: Map<string, SchoolGenerationInfo>;
}

export function ScheduleTableView({
  models,
  groupBy = 'school',
  onDelete,
  onBulkDelete,
  onGenerateOccurrences,
  canBulkDelete = false,
  schoolGenerationStatus,
}: ScheduleTableViewProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { data: anpMap } = useAnpSubjectMap();

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  // Hierarchical grouping: Escola → Curso
  // IMPORTANTE: agrupar SEMPRE a partir do conjunto COMPLETO de `models`
  // (não dos `pagedModels`). Caso contrário, os contadores de cursos/aulas/
  // planejamentos/horários no cabeçalho da escola refletem apenas o que
  // "caiu" na página atual — o que causa números aparentemente errados
  // (ex.: "2 cursos · 2 aulas · 4 horários" para uma escola que na verdade
  // possui 3 cursos e dezenas de horários).
  const schoolCourseGroups = useMemo(() => {
    if (groupBy !== 'school-course') return [];
    const map = new Map<string, {
      schoolId: string;
      schoolName: string;
      courses: Map<string, { courseId: string; courseName: string; rows: WeeklyModelWithRelations[] }>;
    }>();
    for (const m of models) {
      const sKey = m.school_id || '__none__';
      if (!map.has(sKey)) {
        map.set(sKey, { schoolId: sKey, schoolName: m.school_name || 'Sem escola', courses: new Map() });
      }
      const school = map.get(sKey)!;
      const cKey = m.course_id || '__none__';
      if (!school.courses.has(cKey)) {
        school.courses.set(cKey, { courseId: cKey, courseName: m.course_name || 'Sem curso', rows: [] });
      }
      school.courses.get(cKey)!.rows.push(m);
    }
    const result = Array.from(map.values())
      .sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'pt-BR'))
      .map(s => ({
        ...s,
        coursesList: Array.from(s.courses.values()).sort((a, b) => a.courseName.localeCompare(b.courseName, 'pt-BR')),
      }));
    return result;
  }, [models, groupBy]);

  // No modo agrupado por escola paginamos por ESCOLA (não por linha): assim
  // cada página mostra `pageSize` escolas com todos os seus cursos/horários
  // e os contadores do cabeçalho refletem o total real da escola.
  // No modo plano (sem agrupamento) paginamos por linha, como antes.
  const isGroupedMode = groupBy === 'school-course';
  const totalRows = isGroupedMode ? schoolCourseGroups.length : models.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  useEffect(() => { setPage(1); }, [totalRows, pageSize, groupBy]);
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);

  const pagedSchoolCourseGroups = useMemo(
    () => (isGroupedMode ? schoolCourseGroups.slice(startIdx, endIdx) : []),
    [isGroupedMode, schoolCourseGroups, startIdx, endIdx],
  );

  const pagedModels = useMemo(() => {
    if (isGroupedMode) {
      const rows: WeeklyModelWithRelations[] = [];
      for (const s of pagedSchoolCourseGroups) {
        for (const c of s.coursesList) rows.push(...c.rows);
      }
      return rows;
    }
    return models.slice(startIdx, endIdx);
  }, [isGroupedMode, pagedSchoolCourseGroups, models, startIdx, endIdx]);

  const allIds = useMemo(() => pagedModels.map(m => m.id), [pagedModels]);
  const allSelected = canBulkDelete && allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = canBulkDelete && selectedIds.size > 0 && !allSelected;


  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => {
      if (allSelected) return new Set();
      return new Set(allIds);
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Default: collapse all groups on initial load AND on page/groupBy change.
  // User toggles don't change these deps, so expanded groups stay open until paginating.
  useEffect(() => {
    if (groupBy !== 'school-course') return;
    if (schoolCourseGroups.length === 0) return;
    const keys = new Set<string>();
    for (const s of schoolCourseGroups) {
      keys.add(`school:${s.schoolId}`);
      for (const c of s.coursesList) {
        keys.add(`course:${s.schoolId}:${c.courseId}`);
      }
    }
    setCollapsedGroups(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage, groupBy, pageSize]);


  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSchoolGroup = (schoolId: string, allModelIds: string[]) => {
    const allInGroupSelected = allModelIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allInGroupSelected) {
        allModelIds.forEach(id => next.delete(id));
      } else {
        allModelIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    try {
      if (onBulkDelete) {
        // Fast path: 2 queries per 200-id chunk + single refetch.
        const res = await onBulkDelete(ids);
        ok = res.ok;
        fail = res.fail;
      } else if (onDelete) {
        // Fallback: sequential (legacy).
        for (const id of ids) {
          try { await onDelete(id); ok++; } catch { fail++; }
        }
      }
    } finally {
      setBulkDeleting(false);
      setConfirmBulkOpen(false);
      clearSelection();
    }
    if (fail === 0) {
      toast.success(`${ok} horário(s) excluído(s) com sucesso`);
    } else if (ok === 0) {
      toast.error(`Falha ao excluir ${fail} horário(s)`);
    } else {
      toast.warning(`${ok} excluído(s), ${fail} com erro`);
    }
  };

  const handleDelete = async (model: WeeklyModelWithRelations) => {
    if (!onDelete) return;
    const typeName = model.schedule_type === 'CLASS' ? 'aula' : 'planejamento';
    const name = model.subject_name || model.course_name;
    if (!confirm(`Tem certeza que deseja excluir o horário de ${typeName} (${name})?`)) {
      return;
    }

    try {
      await onDelete(model.id);
    } catch (error) {
      toast.error('Erro ao excluir horário');
    }
  };

  const handleGenerateOccurrences = async (model: WeeklyModelWithRelations) => {
    if (!onGenerateOccurrences) return;
    setGeneratingId(model.id);
    const typeLabel = model.schedule_type === 'CLASS' ? 'aula(s)' : 'aula(s) de planejamento';
    try {
      const count = await onGenerateOccurrences(model.id);
      toast.success(`${count} ${typeLabel} gerada(s) com sucesso`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar aulas');
    } finally {
      setGeneratingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      ACTIVE: 'default',
      INACTIVE: 'outline',
      CLOSED: 'secondary',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      CLOSED: 'Encerrado',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const getTypeBadge = (type: ScheduleType) => {
    if (type === 'CLASS') {
      return (
        <Badge variant="default" className="gap-1">
          <BookOpen className="h-3 w-3" />
          Aula
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
        <ClipboardList className="h-3 w-3" />
        Planejamento
      </Badge>
    );
  };

  if (models.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum horário cadastrado</p>
        <p className="text-sm">Clique em "Novo Horário" para começar</p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk action bar (admin only) */}
      {canBulkDelete && selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground shadow-lg border border-destructive/30 animate-in fade-in slide-in-from-top-2">
          <Trash2 className="h-4 w-4" />
          <span className="text-sm font-medium">
            {selectedIds.size} horário{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 ml-2 bg-white text-destructive hover:bg-white/90"
            onClick={() => setConfirmBulkOpen(true)}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Excluir selecionados
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
            onClick={clearSelection}
            disabled={bulkDeleting}
          >
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canBulkDelete && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
              )}
              <TableHead>Tipo</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Escola</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const colSpan = (canBulkDelete ? 1 : 0) + 10;

              const renderRow = (model: WeeklyModelWithRelations) => {
                const selected = selectedIds.has(model.id);
                return (
                  <TableRow
                    key={model.id}
                    className={cn(
                      model.schedule_type === 'PLANNING' && 'bg-amber-50/30',
                      selected && 'bg-destructive/5',
                    )}
                  >
                    {canBulkDelete && (
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleOne(model.id)}
                          aria-label={`Selecionar ${model.subject_name || model.course_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>{getTypeBadge(model.schedule_type)}</TableCell>
                    <TableCell className="font-medium">{model.professor_name}</TableCell>
                    <TableCell>{model.school_name}</TableCell>
                    <TableCell>{model.course_name}</TableCell>
                    <TableCell>
                      {model.class_group_name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <SubjectNameWithAnp
                          name={model.subject_name || '—'}
                          isAnp={model.subject_id ? anpMap?.bySubject.has(model.subject_id) : false}
                          compact
                        />
                        {model.subject_semester && (
                          <Badge variant="outline" className="text-xs">
                            {SEMESTER_LABELS[model.subject_semester]}
                          </Badge>
                        )}
                        {(model as any).class_mode === 'ANP' && (
                          <Badge
                            variant="outline"
                            className="border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-[10px] px-1.5"
                            title="Aula Não Presencial (slot ANP)"
                          >
                            Slot ANP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{WEEKDAY_LABELS[model.weekday as Weekday]}</TableCell>
                    <TableCell>
                      {model.start_time.slice(0, 5)} - {model.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell>{getStatusBadge(model.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {model.schedule_type === 'PLANNING' && (
                          <PlanningObservationButton model={model} />
                        )}
                        {(onDelete || onGenerateOccurrences) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onGenerateOccurrences && (
                                <DropdownMenuItem
                                  onClick={() => handleGenerateOccurrences(model)}
                                  disabled={generatingId === model.id}
                                >
                                  <RefreshCw className={`mr-2 h-4 w-4 ${generatingId === model.id ? 'animate-spin' : ''}`} />
                                  {model.schedule_type === 'CLASS' ? 'Gerar Aulas' : 'Gerar Ocorrências'}
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(model)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : model.schedule_type !== 'PLANNING' ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : null}
                      </div>
                    </TableCell>

                  </TableRow>
                );
              };

              if (groupBy !== 'school-course') {
                return pagedModels.map(renderRow);
              }

              // Hierarchical: Escola → Curso
              const nodes: React.ReactNode[] = [];
              for (const school of pagedSchoolCourseGroups) {
                const schoolKey = `school:${school.schoolId}`;
                const schoolCollapsed = collapsedGroups.has(schoolKey);
                const allModelIds = school.coursesList.flatMap(c => c.rows.map(r => r.id));
                const totalClasses = school.coursesList.reduce((s, c) => s + c.rows.filter(r => r.schedule_type === 'CLASS').length, 0);
                const totalPlannings = school.coursesList.reduce((s, c) => s + c.rows.filter(r => r.schedule_type === 'PLANNING').length, 0);
                const allInGroupSelected = canBulkDelete && allModelIds.length > 0 && allModelIds.every(id => selectedIds.has(id));
                const someInGroupSelected = canBulkDelete && allModelIds.some(id => selectedIds.has(id)) && !allInGroupSelected;

                nodes.push(
                  <TableRow key={schoolKey} className="bg-primary/10 hover:bg-primary/15 border-y">
                    {canBulkDelete && (
                      <TableCell>
                        <Checkbox
                          checked={allInGroupSelected ? true : someInGroupSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleSchoolGroup(school.schoolId, allModelIds)}
                          aria-label={`Selecionar todos de ${school.schoolName}`}
                        />
                      </TableCell>
                    )}
                    <TableCell colSpan={colSpan - (canBulkDelete ? 1 : 0)} className="py-2">
                      <button
                        type="button"
                        onClick={() => toggleGroup(schoolKey)}
                        className="flex items-center gap-2 font-semibold text-sm w-full text-left"
                      >
                        {schoolCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="truncate">{school.schoolName}</span>
                        {(() => {
                          const st = schoolGenerationStatus?.get(school.schoolId);
                          if (!st) return null;
                          const lastTxt = st.lastGeneratedAt
                            ? `Última geração: ${new Date(st.lastGeneratedAt).toLocaleString('pt-BR')}`
                            : 'Nunca gerada';
                          const reasonsTxt = st.reasons.length > 0 ? ` · ${st.reasons.join(', ')}` : '';
                          if (st.status === 'upToDate') {
                            return (
                              <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 bg-emerald-50 text-emerald-800" title={lastTxt}>
                                <CheckCircle2 className="h-3 w-3" /> Gerada
                              </Badge>
                            );
                          }
                          if (st.status === 'pending') {
                            return (
                              <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 bg-amber-50 text-amber-800" title={`${lastTxt}${reasonsTxt}`}>
                                <Clock className="h-3 w-3" /> Pendente
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="text-[10px] gap-1 border-blue-300 bg-blue-50 text-blue-800" title={`${lastTxt}${reasonsTxt}`}>
                              <AlertCircle className="h-3 w-3" /> Alterada
                            </Badge>
                          );
                        })()}
                        <Badge variant="outline" className="ml-2 text-[10px]">{school.coursesList.length} curso{school.coursesList.length !== 1 ? 's' : ''}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-primary/10">{totalClasses} aula{totalClasses !== 1 ? 's' : ''}</Badge>
                        {totalPlannings > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">{totalPlannings} planej.</Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground font-normal">{allModelIds.length} horário{allModelIds.length !== 1 ? 's' : ''}</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );

                if (schoolCollapsed) continue;

                for (const course of school.coursesList) {
                  const courseKey = `course:${school.schoolId}:${course.courseId}`;
                  const courseCollapsed = collapsedGroups.has(courseKey);
                  const courseClasses = course.rows.filter(r => r.schedule_type === 'CLASS').length;
                  const coursePlannings = course.rows.filter(r => r.schedule_type === 'PLANNING').length;

                  nodes.push(
                    <TableRow key={courseKey} className="bg-muted/40 hover:bg-muted/60">
                      {canBulkDelete && <TableCell />}
                      <TableCell colSpan={colSpan - (canBulkDelete ? 1 : 0)} className="py-1.5">
                        <button
                          type="button"
                          onClick={() => toggleGroup(courseKey)}
                          className="flex items-center gap-2 text-xs w-full text-left pl-4"
                        >
                          {courseCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium truncate">{course.courseName}</span>
                          <Badge variant="outline" className="text-[10px] bg-primary/10">{courseClasses}A</Badge>
                          {coursePlannings > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">{coursePlannings}P</Badge>
                          )}
                          <span className="ml-auto text-[10px] text-muted-foreground">{course.rows.length} horário{course.rows.length !== 1 ? 's' : ''}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  );

                  if (!courseCollapsed) {
                    course.rows.forEach(r => nodes.push(renderRow(r)));
                  }
                }
              }
              return nodes;
            })()}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden divide-y">
        {pagedModels.map(model => {
          const selected = selectedIds.has(model.id);
          return (
          <div
            key={model.id}
            className={cn(
              'p-4 space-y-2',
              model.schedule_type === 'PLANNING' && 'bg-amber-50/30',
              selected && 'bg-destructive/5',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {canBulkDelete && (
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleOne(model.id)}
                    className="mt-1"
                    aria-label="Selecionar"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{model.professor_name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {getTypeBadge(model.schedule_type)}
                    {getStatusBadge(model.status)}
                  </div>
                </div>
              </div>
              {((onDelete || onGenerateOccurrences) || model.schedule_type === 'PLANNING') && (
                <div className="flex items-center gap-1 shrink-0">
                  {model.schedule_type === 'PLANNING' && (
                    <PlanningObservationButton model={model} />
                  )}
                  {(onDelete || onGenerateOccurrences) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onGenerateOccurrences && (
                          <DropdownMenuItem
                            onClick={() => handleGenerateOccurrences(model)}
                            disabled={generatingId === model.id}
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${generatingId === model.id ? 'animate-spin' : ''}`} />
                            {model.schedule_type === 'CLASS' ? 'Gerar Aulas' : 'Gerar Ocorrências'}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => handleDelete(model)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}

            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p><strong>Escola:</strong> {model.school_name}</p>
              <p><strong>Curso:</strong> {model.course_name}</p>
              {model.class_group_name && <p><strong>Turma:</strong> {model.class_group_name}</p>}
              <p>
                <strong>Disciplina:</strong> {model.subject_name || '—'}
                {model.subject_semester && ` (${SEMESTER_LABELS[model.subject_semester]})`}
              </p>
              <p><strong>{WEEKDAY_LABELS[model.weekday as Weekday]}</strong> • {model.start_time.slice(0, 5)} - {model.end_time.slice(0, 5)}</p>
            </div>
          </div>
          );
        })}
      </div>

      {/* Pagination footer */}
      {totalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            Exibindo <strong>{startIdx + 1}</strong>–<strong>{endIdx}</strong> de <strong>{totalRows}</strong> {isGroupedMode ? `escola${totalRows !== 1 ? 's' : ''} (${pagedModels.length} horário${pagedModels.length !== 1 ? 's' : ''})` : `horário${totalRows !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Por página</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 200, 500].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={safePage <= 1} aria-label="Primeira página">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} aria-label="Página anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2 min-w-[80px] text-center">
                Página <strong>{safePage}</strong> de <strong>{totalPages}</strong>
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} aria-label="Próxima página">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages} aria-label="Última página">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Confirm bulk delete */}
      <AlertDialog open={confirmBulkOpen} onOpenChange={(v) => !bulkDeleting && setConfirmBulkOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir {selectedIds.size} horário(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente</strong> e remove os horários selecionados da grade.
              Aulas já geradas no calendário a partir destes horários também podem ser afetadas.
              Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
