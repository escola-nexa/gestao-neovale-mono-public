import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartTabs } from '@/components/SmartTabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, FileCheck, ClipboardList, BarChart3, Sparkles, HelpCircle, BookOpen, Send, PenTool, ChevronDown, FileText, CheckCircle, AlertCircle, Users, Calendar, Eye } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';
import { isManagerRole } from '@/lib/roles';
import { prePlanningsApi, teacherPlanningsApi, PrePlanningData, TeacherPlanningData, coursesApi, subjectsApi, CourseData, SubjectData, classGroupsApi, ClassGroupData, schoolsApi, SchoolData, PlanningFilterParams } from '@/services/supabaseApi';
import { PlanningFilters, PlanningFiltersState } from './components/PlanningFilters';
import { PrePlanningList } from './components/PrePlanningList';
import { WeeklyPrePlanningView } from './components/WeeklyPrePlanningView';
import { PlanningStatusGuide } from './components/PlanningStatusGuide';
import { PendingProfessorsView } from './components/PendingProfessorsView';

import { TeacherPlanningList } from './components/TeacherPlanningList';
import { WeeklyTeacherPlanningView } from './components/WeeklyTeacherPlanningView';
import { planejamentoApi } from '@/features/planejamento/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ProfessorMap { [key: string]: string; }
interface ProfIdToUserIdMap { [profId: string]: string; }

export default function PlanejamentoPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { professorId, isProfessor } = useProfessorId();
  const isCoordinator = isManagerRole(user?.perfil);

  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [prePlannings, setPrePlannings] = useState<PrePlanningData[]>([]);
  const [teacherPlannings, setTeacherPlannings] = useState<TeacherPlanningData[]>([]);
  const [ppCount, setPpCount] = useState(0);
  const [tpCount, setTpCount] = useState(0);
  const [ppPage, setPpPage] = useState(1);
  const [tpPage, setTpPage] = useState(1);
  const PAGE_SIZE = 500;

  const [courses, setCourses] = useState<CourseData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupData[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [professors, setProfessors] = useState<ProfessorMap>({});
  const [profIdToUserId, setProfIdToUserId] = useState<ProfIdToUserIdMap>({});

  const [filters, setFilters] = useState<PlanningFiltersState>({
    schoolId: '', courseId: '', classGroupId: '', professorId: '', startDate: '', endDate: '', status: '',
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planningToDelete, setPlanningToDelete] = useState<PrePlanningData | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Load reference data once
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [c, s, cg, sch] = await Promise.all([
          coursesApi.getAll(), subjectsApi.getAll(),
          classGroupsApi.getAll(), schoolsApi.getAll(),
        ]);
        setCourses(c); setSubjects(s); setClassGroups(cg); setSchools(sch);

        const profMap: ProfessorMap = {};
        const idToUser: ProfIdToUserIdMap = {};
        const allProfs = await planejamentoApi.getActiveProfessors();
        allProfs?.forEach(p => { profMap[p.id] = p.full_name; profMap[p.user_id] = p.full_name; idToUser[p.id] = p.user_id; });
        setProfessors(profMap);
        setProfIdToUserId(idToUser);
      } catch {
        toast({ title: 'Erro ao carregar dados de referência', variant: 'destructive' });
      }
    };
    loadRefs();
  }, []);

  // Build server-side filter params
  // NOTE: teacher_plannings.professor_id stores auth.uid() (user UUID)
  // while pre_plannings.professor_id stores professors.id (record UUID)
  const buildFilterParams = useCallback((page: number, forTeacherPlannings = false): PlanningFilterParams => {
    const params: PlanningFilterParams = { page, pageSize: PAGE_SIZE };
    if (filters.schoolId) params.schoolId = filters.schoolId;
    if (filters.courseId) params.courseId = filters.courseId;
    if (filters.classGroupId) params.classGroupId = filters.classGroupId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    // For professors, filter server-side by the correct ID type
    if (isProfessor) {
      if (forTeacherPlannings) {
        // teacher_plannings.professor_id = auth.uid()
        if (user?.id) params.professorId = user.id;
      } else {
        // pre_plannings uses professors.id (record UUID)
        if (professorId) params.professorId = professorId;
      }
    } else if (filters.professorId) {
      if (forTeacherPlannings) {
        // Coordinator filtering: convert professors.id to user_id
        const userId = profIdToUserId[filters.professorId];
        if (userId) params.professorId = userId;
        else params.professorId = filters.professorId;
      } else {
        params.professorId = filters.professorId;
      }
    }
    if (filters.status) params.status = filters.status;
    return params;
  }, [filters, isProfessor, professorId, user?.id, profIdToUserId]);

  // Load planning data with server-side filtering — fetches ALL pages so the
  // bimestre/professor/disciplina aggregation no client-side enxergue todos os
  // registros (sem isso, professores com muitas semanas perdem disciplinas no agrupamento).
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const fetchAllPre = async (): Promise<{ data: PrePlanningData[]; count: number }> => {
        const all: PrePlanningData[] = [];
        let page = 1;
        let total = 0;
        // hard cap defensivo para evitar loop infinito
        while (page <= 50) {
          const res = await prePlanningsApi.getFiltered({ ...buildFilterParams(page, false), pageSize: PAGE_SIZE });
          all.push(...res.data);
          total = res.count;
          if (all.length >= total || res.data.length === 0) break;
          page++;
        }
        return { data: all, count: total };
      };

      const fetchAllTeacher = async (): Promise<{ data: TeacherPlanningData[]; count: number }> => {
        const all: TeacherPlanningData[] = [];
        let page = 1;
        let total = 0;
        while (page <= 50) {
          const res = await teacherPlanningsApi.getFiltered({ ...buildFilterParams(page, true), pageSize: PAGE_SIZE });
          all.push(...res.data);
          total = res.count;
          if (all.length >= total || res.data.length === 0) break;
          page++;
        }
        return { data: all, count: total };
      };

      const [ppResult, tpResult] = await Promise.all([fetchAllPre(), fetchAllTeacher()]);

      let filteredPP = ppResult.data;
      // Coordinator: only show GERADO/DISPONIVEL pre-plannings
      if (isCoordinator && !filters.status) {
        filteredPP = filteredPP.filter(p => p.status === 'GERADO' || p.status === 'DISPONIVEL');
      }

      // Professor: remove pre-plannings already adopted as teacher plannings
      if (isProfessor) {
        const usedPrePlanningIds = new Set(tpResult.data.map(t => t.pre_planning_id).filter(Boolean));
        filteredPP = filteredPP.filter(p => !usedPrePlanningIds.has(p.id));
      }

      setPrePlannings(filteredPP);
      setPpCount(ppResult.count);
      setTeacherPlannings(tpResult.data);
      setTpCount(tpResult.count);
      setHasLoaded(true);
    } catch {
      toast({ title: 'Erro ao carregar planejamentos', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [buildFilterParams, isCoordinator, isProfessor, filters.status]);


  // Coordenador precisa aplicar ao menos 1 filtro antes de carregar (evita sobrecarga).
  // Professor sempre carrega (já é filtrado pelo próprio user_id no servidor).
  const hasActiveFilter = useMemo(() => {
    return Boolean(
      filters.schoolId || filters.courseId || filters.classGroupId ||
      filters.professorId || filters.startDate || filters.endDate || filters.status
    );
  }, [filters]);

  // Reload when filters change (coord só carrega se houver filtro; professor sempre).
  useEffect(() => {
    if (isProfessor || hasActiveFilter) {
      loadData();
    } else {
      // Coordenador sem filtros: limpa dados e desliga loading
      setPrePlannings([]);
      setTeacherPlannings([]);
      setPpCount(0);
      setTpCount(0);
      setHasLoaded(false);
      setLoading(false);
    }
  }, [loadData, isProfessor, hasActiveFilter]);

  // These are now already server-side filtered
  const filteredPrePlannings = prePlannings;
  const filteredTeacherPlannings = teacherPlannings;


  const handleDeleteConfirm = (pp: PrePlanningData) => {
    const isUserAdmin = user?.perfil === 'admin';
    if (!isUserAdmin && pp.status !== 'GERADO') { toast({ title: 'Exclusão bloqueada', description: 'Apenas administradores podem excluir pré-planejamentos que não estão no status Gerado.', variant: 'destructive' }); return; }
    setPlanningToDelete(pp); setDeleteDialogOpen(true);
  };

  const handleDeletePrePlanning = async () => {
    const idsToDelete = bulkDeleteIds.length > 0 ? bulkDeleteIds : (planningToDelete ? [planningToDelete.id] : []);
    if (idsToDelete.length === 0) return;
    setDeleting(true);
    try {
      // Bulk soft-delete via single RPC (chunked to keep payloads safe).
      const CHUNK = 500;
      let successCount = 0;
      let errorCount = 0;
      for (let i = 0; i < idsToDelete.length; i += CHUNK) {
        const slice = idsToDelete.slice(i, i + CHUNK);
        await planejamentoApi.bulkSoftDeletePrePlannings(slice);
        if (error) { errorCount += slice.length; continue; }
        const row = (data as { deleted_count: number; skipped_count: number }[] | null)?.[0];
        if (row) { successCount += row.deleted_count; errorCount += row.skipped_count; }
      }
      if (successCount > 0) {
        toast({ title: `${successCount} pré-planejamento(s) excluído(s)!` });
        loadData();
      }
      if (errorCount > 0) {
        toast({ title: `${errorCount} ignorado(s) (sem permissão ou já excluído)`, variant: 'destructive' });
      }
    } catch (error: any) { toast({ title: error.message || 'Erro ao excluir', variant: 'destructive' }); }
    finally { setDeleting(false); setDeleteDialogOpen(false); setPlanningToDelete(null); setBulkDeleteIds([]); }
  };

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids);
    setPlanningToDelete(null);
    setDeleteDialogOpen(true);
  };

  // Count total individual teacher plannings (not grouped by discipline)
  const totalPlanningCount = useMemo(() => {
    return teacherPlannings.length + prePlannings.length;
  }, [teacherPlannings, prePlannings]);

  // Count individual teacher plannings per status
  const teacherPlanningStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teacherPlannings.forEach(tp => {
      counts[tp.status] = (counts[tp.status] || 0) + 1;
    });
    return counts;
  }, [teacherPlannings]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando planejamentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FeatureGuideCard title="Como usar Planejamento Pedagógico" steps={[
        { icon: Plus, title: 'Gerar pré-planejamento', description: 'O coordenador gera o pré-planejamento baseado na grade horária.', color: 'blue' },
        { icon: PenTool, title: 'Professor edita', description: 'O professor completa o planejamento com objetivos, conteúdos e metodologia.', color: 'green' },
        { icon: Eye, title: 'Revisão do coordenador', description: 'O coordenador revisa, aprova ou devolve com feedback.', color: 'purple' },
        { icon: FileCheck, title: 'Assinatura digital', description: 'Professor e coordenador assinam digitalmente para finalizar.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Planejamento' }]}
        title="Planejamento Pedagógico"
        description={isCoordinator ? 'Gerencie pré-planejamentos e aprove planejamentos dos professores' : 'Visualize e gerencie seus planejamentos de aula'}
        icon={ClipboardList}
        actions={isCoordinator && (
          <Button onClick={() => navigate('/planejamento/geracao-massa')} className="gap-2 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Gerar Pré-Planejamentos
          </Button>
        )}
      />

      {/* Status Pipeline for Professors */}
      {!isCoordinator ? (
        <div className="space-y-3">
          {/* Main stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Planejamentos', value: totalPlanningCount, icon: <FileCheck className="h-4 w-4" />, accent: 'text-emerald-600 bg-emerald-500/10' },
              { label: 'Enviados', value: (teacherPlanningStatusCounts['ENVIADO'] || 0) + (teacherPlanningStatusCounts['PENDING'] || 0), icon: <Send className="h-4 w-4" />, accent: 'text-amber-600 bg-amber-500/10' },
              { label: 'Assinados', value: (teacherPlanningStatusCounts['ASSINADO'] || 0) + (teacherPlanningStatusCounts['APPROVED'] || 0), icon: <PenTool className="h-4 w-4" />, accent: 'text-primary bg-primary/10' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
                <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${stat.accent}`}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Visual status pipeline */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Acompanhamento por Status</p>
              {filters.status && (
                <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  ✕ Limpar filtro
                </button>
              )}
            </div>
            {/* Row 1: main workflow */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { status: 'DRAFT', label: 'Em edição', icon: <FileText className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['DRAFT'] || 0), dot: 'bg-slate-400', activeBg: 'bg-slate-100 border-slate-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'CONCLUIDO', label: 'Concluído', icon: <CheckCircle className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['CONCLUIDO'] || 0), dot: 'bg-emerald-500', activeBg: 'bg-emerald-50 border-emerald-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'ENVIADO', label: 'Enviado', icon: <Send className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['ENVIADO'] || 0) + (teacherPlanningStatusCounts['PENDING'] || 0), dot: 'bg-amber-500', activeBg: 'bg-amber-50 border-amber-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'DEVOLVIDO', label: 'Devolvido', icon: <AlertCircle className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['DEVOLVIDO'] || 0) + (teacherPlanningStatusCounts['REJECTED'] || 0), dot: 'bg-red-500', activeBg: 'bg-red-50 border-red-300', inactiveBg: 'bg-muted/30 border-border' },
              ].map((item) => {
                const isActive = filters.status === item.status;
                return (
                  <button
                    key={item.status}
                    onClick={() => setFilters(prev => ({ ...prev, status: prev.status === item.status ? '' : item.status }))}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive ? `${item.activeBg} ring-2 ring-primary/30 shadow-sm` : `${item.inactiveBg} hover:bg-muted/60`
                    } ${item.count === 0 ? 'opacity-40' : ''}`}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${item.dot}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                    <span className="font-bold text-foreground">{item.count}</span>
                  </button>
                );
              })}
            </div>
            {/* Row 2: signature stages */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { status: 'AGUARDANDO_ASSINATURA', label: 'Aguard. Assin. Prof.', icon: <PenTool className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['AGUARDANDO_ASSINATURA'] || 0), dot: 'bg-blue-500', activeBg: 'bg-blue-50 border-blue-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'AGUARDANDO_ASSINATURA_COORDENADOR', label: 'Aguard. Assin. Coord.', icon: <PenTool className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['AGUARDANDO_ASSINATURA_COORDENADOR'] || 0), dot: 'bg-violet-500', activeBg: 'bg-violet-50 border-violet-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'ASSINADO', label: 'Assinado', icon: <CheckCircle className="h-3.5 w-3.5" />, count: (teacherPlanningStatusCounts['ASSINADO'] || 0) + (teacherPlanningStatusCounts['APPROVED'] || 0), dot: 'bg-emerald-600', activeBg: 'bg-emerald-100 border-emerald-400', inactiveBg: 'bg-muted/30 border-border' },
              ].map((item) => {
                const isActive = filters.status === item.status;
                return (
                  <button
                    key={item.status}
                    onClick={() => setFilters(prev => ({ ...prev, status: prev.status === item.status ? '' : item.status }))}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive ? `${item.activeBg} ring-2 ring-primary/30 shadow-sm` : `${item.inactiveBg} hover:bg-muted/60`
                    } ${item.count === 0 ? 'opacity-40' : ''}`}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${item.dot}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                    <span className="font-bold text-foreground">{item.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Planejamentos', value: totalPlanningCount, icon: <FileCheck className="h-4 w-4" />, accent: 'text-emerald-600 bg-emerald-500/10' },
              { label: 'Enviados', value: (teacherPlanningStatusCounts['ENVIADO'] || 0) + (teacherPlanningStatusCounts['PENDING'] || 0), icon: <Send className="h-4 w-4" />, accent: 'text-amber-600 bg-amber-500/10' },
              { label: 'Assinados', value: (teacherPlanningStatusCounts['ASSINADO'] || 0) + (teacherPlanningStatusCounts['APPROVED'] || 0), icon: <PenTool className="h-4 w-4" />, accent: 'text-primary bg-primary/10' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
                <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${stat.accent}`}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status pipeline for coordinators */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Acompanhamento por Status</p>
              {filters.status && (
                <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  ✕ Limpar filtro
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { status: 'DRAFT', label: 'Em edição', count: (teacherPlanningStatusCounts['DRAFT'] || 0), dot: 'bg-slate-400', activeBg: 'bg-slate-100 border-slate-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'CONCLUIDO', label: 'Concluído', count: (teacherPlanningStatusCounts['CONCLUIDO'] || 0), dot: 'bg-emerald-500', activeBg: 'bg-emerald-50 border-emerald-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'ENVIADO', label: 'Enviado', count: (teacherPlanningStatusCounts['ENVIADO'] || 0) + (teacherPlanningStatusCounts['PENDING'] || 0), dot: 'bg-amber-500', activeBg: 'bg-amber-50 border-amber-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'DEVOLVIDO', label: 'Devolvido', count: (teacherPlanningStatusCounts['DEVOLVIDO'] || 0) + (teacherPlanningStatusCounts['REJECTED'] || 0), dot: 'bg-red-500', activeBg: 'bg-red-50 border-red-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'AGUARDANDO_ASSINATURA', label: 'Aguard. Prof.', count: (teacherPlanningStatusCounts['AGUARDANDO_ASSINATURA'] || 0), dot: 'bg-blue-500', activeBg: 'bg-blue-50 border-blue-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'AGUARDANDO_ASSINATURA_COORDENADOR', label: 'Aguard. Coord.', count: (teacherPlanningStatusCounts['AGUARDANDO_ASSINATURA_COORDENADOR'] || 0), dot: 'bg-violet-500', activeBg: 'bg-violet-50 border-violet-300', inactiveBg: 'bg-muted/30 border-border' },
                { status: 'ASSINADO', label: 'Assinado', count: (teacherPlanningStatusCounts['ASSINADO'] || 0) + (teacherPlanningStatusCounts['APPROVED'] || 0), dot: 'bg-emerald-600', activeBg: 'bg-emerald-100 border-emerald-400', inactiveBg: 'bg-muted/30 border-border' },
              ].map((item) => {
                const isActive = filters.status === item.status;
                return (
                  <button
                    key={item.status}
                    onClick={() => setFilters(prev => ({ ...prev, status: prev.status === item.status ? '' : item.status }))}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive ? `${item.activeBg} ring-2 ring-primary/30 shadow-sm` : `${item.inactiveBg} hover:bg-muted/60`
                    } ${item.count === 0 ? 'opacity-40' : ''}`}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${item.dot}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                    <span className="font-bold text-foreground">{item.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Guide - professor only, minimal */}
      {!isCoordinator && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Como funciona o planejamento?</span>
              <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border bg-card p-4 shadow-sm space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Pré-Planejamento (Coordenação)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['A coordenação gera o conteúdo pedagógico semanal.', 'Você recebe os pré-planejamentos automaticamente.', 'Use "Usar Pré-planejamento" para adotar o conteúdo.'].map((text, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">{i + 1}</span>
                      <p className="text-[11px] text-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  Seus Planejamentos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {['Clique em "Lançar Planejamento" na disciplina.', 'Edite os 8 campos pedagógicos de cada semana.', 'Salve seus rascunhos a qualquer momento.', 'Envie ao coordenador quando estiver pronto.'].map((text, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">{i + 1}</span>
                      <p className="text-[11px] text-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Status guide for coordinators */}
      {isCoordinator && <PlanningStatusGuide />}

      {/* Filters */}
      <PlanningFilters filters={filters} onFiltersChange={setFilters} showProfessorFilter={isCoordinator} />

      {/* Content */}
      {isCoordinator && !hasActiveFilter ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border bg-card text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Aplique pelo menos um filtro para listar os planejamentos</p>
            <p className="text-xs text-muted-foreground max-w-md">
              Para evitar sobrecarga, os dados só são carregados após selecionar Escola, Curso, Turma, Professor, Status ou intervalo de datas acima.
            </p>
          </div>
        </div>
      ) : isCoordinator ? (

        <SmartTabs
          defaultValue="my-plannings"
          tabsListClassName="grid w-full h-11 bg-muted/60 p-1 rounded-xl grid-cols-3"
          triggerClassName="gap-2 text-sm rounded-lg transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
          tabs={[
            {
              value: 'pending-professors',
              label: 'Pendências',
              shortLabel: 'Pend.',
              icon: <Users className="h-4 w-4" />,
              content: (
                <PendingProfessorsView
                  plannings={filteredTeacherPlannings}
                  schools={schools} courses={courses} subjects={subjects} classGroups={classGroups} professors={professors}
                />
              ),
            },
            {
              value: 'pre-plannings',
              label: 'Pré-Plan.',
              shortLabel: 'Pré',
              icon: <ClipboardList className="h-4 w-4" />,
              badge: <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">{filteredPrePlannings.length}</Badge>,
              hidden: filteredPrePlannings.length === 0 && prePlannings.length === 0,
              content: (
                <WeeklyPrePlanningView
                  items={filteredPrePlannings} courses={courses} subjects={subjects} schools={schools} classGroups={classGroups} professors={professors}
                  onRefresh={loadData}
                  onDelete={handleDeleteConfirm}
                  onBulkDelete={handleBulkDelete}
                  bulkDeleting={deleting}
                  emptyMessage={prePlannings.length === 0 ? 'Nenhum pré-planejamento cadastrado. Use o painel acima para gerar semanas.' : 'Nenhum resultado encontrado'}
                />
              ),
            },
            {
              value: 'my-plannings',
              label: 'Planejamentos',
              shortLabel: 'Plan.',
              icon: <FileCheck className="h-4 w-4" />,
              badge: <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">{new Set(filteredTeacherPlannings.map(tp => tp.professor_id)).size}</Badge>,
              content: (
                <TeacherPlanningList
                  items={filteredTeacherPlannings} courses={courses} subjects={subjects} schools={schools} classGroups={classGroups} professors={professors} isCoordinator={isCoordinator}
                  onView={(tp) => navigate(`/planejamento/detalhe/planejamento/${tp.id}`)}
                  onRefresh={loadData}
                  emptyMessage={teacherPlannings.length === 0 ? 'Nenhum planejamento para aprovação' : 'Nenhum resultado encontrado'}
                />
              ),
            },
          ]}
        />
      ) : (
        <WeeklyTeacherPlanningView
          items={filteredTeacherPlannings}
          prePlannings={filteredPrePlannings}
          courses={courses} subjects={subjects} schools={schools} classGroups={classGroups} professors={professors}
          onRefresh={loadData}
          onView={(tp) => navigate(`/planejamento/detalhe/planejamento/${tp.id}`)}
          emptyMessage={teacherPlannings.length === 0 && prePlannings.length === 0 ? 'Nenhum planejamento disponível.' : 'Nenhum resultado encontrado'}
        />
      )}

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteIds.length > 1
                ? `Tem certeza que deseja excluir ${bulkDeleteIds.length} pré-planejamentos? Esta ação não pode ser desfeita.`
                : 'Tem certeza que deseja excluir este pré-planejamento? Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePrePlanning} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
