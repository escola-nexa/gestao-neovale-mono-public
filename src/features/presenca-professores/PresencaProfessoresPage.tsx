import { supabase } from '@/integrations/supabase/client';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Plus, RefreshCw, FileText, ClipboardList, AlertTriangle,
  CheckCircle2, UserX, Timer, FileDown, Send, Eye, MoreVertical, X, Filter, Trash2,
} from 'lucide-react';
import { SubmitForReviewDialog } from './components/SubmitForReviewDialog';
import { FolhaPontoManualDialog } from './components/FolhaPontoManualDialog';
import { GenerateSheetsProgressDialog } from './components/GenerateSheetsProgressDialog';
import {
  useMonthlySheets, useGenerateSheet, useGenerateSheetsBatch,
  useAttendanceDashboardKpis, useRecalcSheet, useSubmitSheetForReview,
  useGenerateSheetPdf, useProfessorHasActiveGrade, STATUS_LABEL,
} from './hooks/useTeacherAttendance';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSemester, SEMESTER_LABELS, type SubjectSemester } from '@/hooks/useSemester';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const STATUS_OPTIONS = [
  { value: '__all__', label: 'Todos os status' },
  { value: 'draft', label: STATUS_LABEL.draft || 'Rascunho' },
  { value: 'generated', label: STATUS_LABEL.generated || 'Gerada' },
  { value: 'with_pending_items', label: STATUS_LABEL.with_pending_items || 'Com pendências' },
  { value: 'under_review', label: STATUS_LABEL.under_review || 'Em revisão' },
  { value: 'approved_by_coordination', label: STATUS_LABEL.approved_by_coordination || 'Aprovada pela Coord.' },
  { value: 'approved_by_rh', label: STATUS_LABEL.approved_by_rh || 'Aprovada pelo RH' },
  { value: 'closed', label: STATUS_LABEL.closed || 'Fechada' },
  { value: 'reopened', label: STATUS_LABEL.reopened || 'Reaberta' },
];

const PENDING_OPTIONS = [
  { value: '__all__', label: 'Todas' },
  { value: 'pending', label: 'Só com pendências' },
  { value: 'divergent', label: 'Só com divergências' },
  { value: 'clean', label: 'Sem pendências' },
];

function statusBadge(status: string) {
  const variants: Record<string, string> = {
    closed: 'bg-green-100 text-green-700',
    approved_by_rh: 'bg-emerald-100 text-emerald-700',
    approved_by_coordination: 'bg-blue-100 text-blue-700',
    under_review: 'bg-amber-100 text-amber-700',
    with_pending_items: 'bg-orange-100 text-orange-700',
    generated: 'bg-slate-100 text-slate-700',
    draft: 'bg-gray-100 text-gray-700',
    reopened: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return <Badge className={`${variants[status] || 'bg-gray-100 text-gray-700'} font-medium`}>{STATUS_LABEL[status] || status}</Badge>;
}

function minutesToHours(m: number) {
  if (!m) return '0h';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

export default function PresencaProfessoresPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [schoolId, setSchoolId] = useState<string>('');
  const [professorId, setProfessorId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [pendingFilter, setPendingFilter] = useState<string>('__all__');
  const [confirmBatchOpen, setConfirmBatchOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [confirmSingleOpen, setConfirmSingleOpen] = useState(false);
  const [folhaPontoManualOpen, setFolhaPontoManualOpen] = useState(false);
  const [allowOtherPeriods, setAllowOtherPeriods] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSemester, semesterDateRanges, currentBimester, getBimesterForDate } = useSemester();

  // Semestre/bimestre do mês selecionado.
  const selectedMonthSemester = useMemo<SubjectSemester | null>(() => {
    const probe = `${year}-${String(month).padStart(2, '0')}-15`;
    for (const sem of ['FIRST', 'SECOND'] as const) {
      const r = semesterDateRanges[sem];
      if (r && probe >= r.startDate && probe <= r.endDate) return sem;
    }
    return null;
  }, [year, month, semesterDateRanges]);

  const selectedMonthBimester = useMemo<number | null>(() => {
    return getBimesterForDate(new Date(year, month - 1, 15));
  }, [year, month, getBimesterForDate]);

  // Regra: gerar APENAS para o bimestre vigente, salvo se o usuário liberar.
  const isCurrentBimester = !!currentBimester && selectedMonthBimester === currentBimester;
  const canGenerateForPeriod = allowOtherPeriods
    ? !!selectedMonthSemester // qualquer mês dentro do calendário ativo
    : isCurrentBimester;

  const periodBlockReason = canGenerateForPeriod
    ? null
    : !selectedMonthBimester
      ? 'O mês selecionado não pertence a nenhum bimestre do calendário acadêmico ativo.'
      : `O mês selecionado pertence ao ${selectedMonthBimester}º bimestre. O bimestre vigente é o ${currentBimester}º. Marque "Gerar para outros meses/bimestres" se quiser prosseguir.`;

  const { data: sheets = [], isLoading } = useMonthlySheets(year, month);
  const generate = useGenerateSheet();
  const generateBatch = useGenerateSheetsBatch();
  const recalc = useRecalcSheet();
  const submitReview = useSubmitSheetForReview();
  const pdf = useGenerateSheetPdf();
  const { data: kpisResp } = useAttendanceDashboardKpis(year, month, schoolId || null);
  const serverKpis = kpisResp?.kpis ?? null;

  const { data: professors = [] } = useQuery({
    queryKey: ['professors-list', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('professors').select('id, full_name')
        .eq('organization_id', organizationId!).is('deleted_at', null).order('full_name');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-list-with-courses', organizationId],
    queryFn: async () => fetchSchoolsWithCourses({ organizationId: organizationId!, onlyActive: false }),
    enabled: !!organizationId,
  });

  const { data: sheetIdsInSchool } = useQuery({
    queryKey: ['sheets-by-school', organizationId, year, month, schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase
        .from('teacher_attendance_entries').select('monthly_sheet_id')
        .eq('organization_id', organizationId!).eq('school_id', schoolId);
      return new Set((data || []).map((r: any) => r.monthly_sheet_id));
    },
    enabled: !!organizationId && !!schoolId,
  });

  const filtered = useMemo(() => {
    return sheets.filter((s: any) => {
      if (professorId && s.professor_id !== professorId) return false;
      if (statusFilter !== '__all__' && s.status !== statusFilter) return false;
      if (schoolId && sheetIdsInSchool && !sheetIdsInSchool.has(s.id)) return false;
      const hasPending = (s.total_pending_entries || 0) > 0 || s.status === 'with_pending_items';
      const hasDivergent = (s.total_divergent_entries || 0) > 0;
      if (pendingFilter === 'pending' && !hasPending) return false;
      if (pendingFilter === 'divergent' && !hasDivergent) return false;
      if (pendingFilter === 'clean' && (hasPending || hasDivergent)) return false;
      return true;
    });
  }, [sheets, professorId, statusFilter, schoolId, sheetIdsInSchool, pendingFilter]);

  // Paginação (client-side): reseta para a página 1 sempre que filtros mudam.
  React.useEffect(() => {
    setPage(1);
  }, [year, month, schoolId, professorId, statusFilter, pendingFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );
  const fromIdx = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toIdx = Math.min(filtered.length, safePage * pageSize);

  const useServer = !professorId && statusFilter === '__all__' && pendingFilter === '__all__' && !!serverKpis;

  const kpis = useMemo(() => {
    if (useServer) {
      return {
        total: Number(serverKpis.total_sheets) || 0,
        closed: Number(serverKpis.closed_sheets) || 0,
        pending: Number(serverKpis.pending_sheets) || 0,
        expectedWl: Number(serverKpis.expected_wl ?? serverKpis.expected_workload_minutes) || 0,
        confirmedWl: Number(serverKpis.confirmed_wl ?? serverKpis.confirmed_workload_minutes) || 0,
        absent: Number(serverKpis.absent ?? serverKpis.total_absent_entries) || 0,
        divergent: Number(serverKpis.divergences ?? serverKpis.total_divergent_entries) || 0,
      };
    }
    return {
      total: filtered.length,
      closed: filtered.filter((s: any) => ['closed','approved_by_rh'].includes(s.status)).length,
      pending: filtered.filter((s: any) => s.status === 'with_pending_items' || s.status === 'under_review' || (s.total_pending_entries || 0) > 0).length,
      expectedWl: filtered.reduce((a: number, s: any) => a + (s.expected_workload_minutes || 0), 0),
      confirmedWl: filtered.reduce((a: number, s: any) => a + (s.confirmed_workload_minutes || 0), 0),
      absent: filtered.reduce((a: number, s: any) => a + (s.total_absent_entries || 0), 0),
      divergent: filtered.reduce((a: number, s: any) => a + (s.total_divergent_entries || 0), 0),
    };
  }, [filtered, serverKpis, useServer]);

  // Active filter chips
  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (schoolId) activeChips.push({ key: 'school', label: `Escola: ${schools.find((s: any) => s.id === schoolId)?.nome || '—'}`, clear: () => setSchoolId('') });
  if (professorId) activeChips.push({ key: 'prof', label: `Professor: ${professors.find((p: any) => p.id === professorId)?.full_name || '—'}`, clear: () => setProfessorId('') });
  if (statusFilter !== '__all__') activeChips.push({ key: 'status', label: `Status: ${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}`, clear: () => setStatusFilter('__all__') });
  if (pendingFilter !== '__all__') activeChips.push({ key: 'pend', label: `Pendências: ${PENDING_OPTIONS.find(o => o.value === pendingFilter)?.label}`, clear: () => setPendingFilter('__all__') });
  const hasFilters = activeChips.length > 0;

  function clearAllFilters() {
    setSchoolId(''); setProfessorId(''); setStatusFilter('__all__'); setPendingFilter('__all__');
  }

  function handleExportPdf(sheetId: string) { pdf.mutate(sheetId); }
  async function handleGenerateAll() {
    // No-op: a geração agora roda dentro do GenerateSheetsProgressDialog.
  }

  // Selection helpers (sincroniza com filtro: apenas IDs visíveis permanecem)
  const visibleIds = useMemo(() => new Set(filtered.map((s: any) => s.id)), [filtered]);
  const effectiveSelected = useMemo(
    () => new Set(Array.from(selectedIds).filter((id) => visibleIds.has(id))),
    [selectedIds, visibleIds],
  );
  const allVisibleSelected = filtered.length > 0 && effectiveSelected.size === filtered.length;
  const someVisibleSelected = effectiveSelected.size > 0 && !allVisibleSelected;

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) filtered.forEach((s: any) => next.add(s.id));
      else filtered.forEach((s: any) => next.delete(s.id));
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  const selectedSheets = useMemo(
    () => filtered.filter((s: any) => effectiveSelected.has(s.id)),
    [filtered, effectiveSelected],
  );

  const KPI = ({ title, value, icon: Icon, color }: any) => (
    <Card><CardContent className="pt-5"><div className="flex items-center justify-between gap-2">
      <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{title}</p><p className={`text-2xl font-bold ${color || ''}`}>{value}</p></div>
      <Icon className={`h-6 w-6 shrink-0 ${color || 'text-muted-foreground'}`}/>
    </div></CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Folhas de Presença' },
        ]}
        title="Folhas de Presença"
        description="Folha-ponto mensal automática baseada na chamada dos alunos"
        backTo="/presenca-professores"
      />

      {/* Controle de bimestre — sempre visível para o usuário decidir o escopo */}
      <Alert variant={!isCurrentBimester && !allowOtherPeriods ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          {isCurrentBimester
            ? `Bimestre vigente: ${currentBimester ?? '—'}º`
            : allowOtherPeriods
              ? 'Geração liberada para outro bimestre'
              : 'Geração bloqueada para este período'}
        </AlertTitle>
        <AlertDescription className="space-y-2">
          <div>
            {isCurrentBimester
              ? `O mês selecionado (${MONTHS[month - 1]}/${year}) pertence ao bimestre vigente. Por padrão só é permitido gerar folhas do bimestre vigente.`
              : (periodBlockReason || 'Por padrão só é permitido gerar folhas do bimestre vigente.')}
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={allowOtherPeriods}
              onCheckedChange={(c) => setAllowOtherPeriods(!!c)}
            />
            <span>Gerar para outros meses/bimestres (requer ação consciente)</span>
          </label>
        </AlertDescription>
      </Alert>

      {/* Action bar — largura total */}
      <div className="flex flex-wrap items-center gap-2">
        <GenerateSelectedButton
          professorId={professorId}
          professorName={professors.find((p: any) => p.id === professorId)?.full_name}
          year={year}
          month={month}
          onGenerate={() => setConfirmSingleOpen(true)}
          isPending={generate.isPending}
          outOfSemester={!canGenerateForPeriod}
          outOfSemesterReason={periodBlockReason}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={() => setConfirmBatchOpen(true)}
                  disabled={generateBatch.isPending || !canGenerateForPeriod}
                >
                  {generateBatch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                  Gerar folhas do mês
                </Button>
              </span>
            </TooltipTrigger>
            {!canGenerateForPeriod && periodBlockReason && (
              <TooltipContent className="max-w-xs">{periodBlockReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  onClick={() => setFolhaPontoManualOpen(true)}
                  disabled={!canGenerateForPeriod}
                >
                  <FileDown className="h-4 w-4 mr-2"/>
                  Folha ponto manual
                </Button>
              </span>
            </TooltipTrigger>
            {!canGenerateForPeriod && periodBlockReason && (
              <TooltipContent className="max-w-xs">{periodBlockReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {isAdmin && (
          <Button
            variant="destructive"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={filtered.length === 0}
            title={effectiveSelected.size > 0
              ? `Excluir ${effectiveSelected.size} selecionada(s)`
              : `Excluir todas as ${filtered.length} folhas filtradas`}
          >
            <Trash2 className="h-4 w-4 mr-2"/>
            {effectiveSelected.size > 0
              ? `Excluir selecionadas (${effectiveSelected.size})`
              : 'Excluir folhas'}
          </Button>
        )}
      </div>

      {/* KPIs em duas linhas (4 + 3) */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI title="Folhas geradas" value={kpis.total} icon={FileText} />
          <KPI title="Folhas fechadas" value={kpis.closed} icon={CheckCircle2} color="text-green-600" />
          <KPI title="Folhas pendentes" value={kpis.pending} icon={ClipboardList} color="text-amber-600" />
          <KPI title="CH prevista" value={minutesToHours(kpis.expectedWl)} icon={Timer} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPI title="CH confirmada" value={minutesToHours(kpis.confirmedWl)} icon={CheckCircle2} color="text-emerald-600" />
          <KPI title="Ausências" value={kpis.absent} icon={UserX} color="text-red-600" />
          <KPI title="Divergências" value={kpis.divergent} icon={AlertTriangle} color="text-red-600" />
        </div>
      </div>


      {/* Filtros */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-muted-foreground"/>
            <span>Filtros</span>
            {hasFilters && (
              <Badge variant="secondary" className="ml-1">{activeChips.length}</Badge>
            )}
          </div>

          {/* Filtros — linha 1: Período + Escola + Professor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Escola</Label>
              <SearchableSelect
                value={schoolId}
                onValueChange={setSchoolId}
                options={[{ value: '', label: 'Todas as escolas' }, ...schools.map((s: any) => ({ value: s.id, label: s.nome }))]}
                placeholder="Todas as escolas"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Professor</Label>
              <SearchableSelect
                value={professorId}
                onValueChange={setProfessorId}
                options={[{ value: '', label: 'Todos os professores' }, ...professors.map((p: any) => ({ value: p.id, label: p.full_name }))]}
                placeholder="Todos os professores"
              />
            </div>
          </div>

          {/* Filtros — linha 2: Status + Pendências */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pendências</Label>
              <Select value={pendingFilter} onValueChange={setPendingFilter}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {PENDING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(hasFilters || !isLoading) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
              <span className="text-xs text-muted-foreground mr-1">
                {filtered.length} {filtered.length === 1 ? 'folha' : 'folhas'}
              </span>
              {activeChips.map((c) => (
                <Badge key={c.key} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
                  <span className="text-xs">{c.label}</span>
                  <button onClick={c.clear} className="hover:bg-muted-foreground/10 rounded-full p-0.5">
                    <X className="h-3 w-3"/>
                  </button>
                </Badge>
              ))}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma folha encontrada. Clique em "Gerar folhas do mês" para criar as folhas.
            </div>
          ) : (
            <>
              {/* Desktop / Tablet table */}
              <div className="hidden md:block overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && (
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label="Selecionar todas as folhas visíveis"
                            checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                            onCheckedChange={(c) => toggleAllVisible(!!c)}
                          />
                        </TableHead>
                      )}
                      <TableHead className="min-w-[180px]">Professor</TableHead>
                      <TableHead className="text-center hidden xl:table-cell">Mês/Ano</TableHead>
                      <TableHead className="text-center" title="Aulas (CLASS) + Planejamento (PLANNING)">Aulas + PL</TableHead>
                      <TableHead className="text-center">Presentes</TableHead>
                      <TableHead className="text-center">Ausências</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">Pendências</TableHead>
                      <TableHead className="text-center" title="CH prevista vs CH confirmada">CH (conf./prev.)</TableHead>
                      <TableHead className="text-center min-w-[140px]">% cumprido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-12">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((s: any) => {
                      const isClosed = ['closed','approved_by_rh'].includes(s.status);
                      const hasPending = (s.total_pending_entries || 0) > 0 || s.status === 'with_pending_items';
                      const classCount = s.total_class_entries ?? 0;
                      const planningCount = s.total_planning_entries ?? 0;
                      const exp = s.expected_workload_minutes || 0;
                      const conf = s.confirmed_workload_minutes || 0;
                      const pct = exp > 0 ? Math.round((conf / exp) * 100) : 0;
                      return (
                        <TableRow
                          key={s.id}
                          className={`group ${isClosed ? 'opacity-90' : ''} ${hasPending ? 'border-l-2 border-l-amber-400' : ''} ${effectiveSelected.has(s.id) ? 'bg-muted/40' : ''}`}
                        >
                          {isAdmin && (
                            <TableCell className="w-10">
                              <Checkbox
                                aria-label={`Selecionar folha de ${s.professors?.full_name || ''}`}
                                checked={effectiveSelected.has(s.id)}
                                onCheckedChange={(c) => toggleOne(s.id, !!c)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">
                            <div className="break-words">{s.professors?.full_name || '—'}</div>
                            <div className="text-[11px] text-muted-foreground xl:hidden">
                              {String(s.reference_month).padStart(2,'0')}/{s.reference_year}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs hidden xl:table-cell">
                            {String(s.reference_month).padStart(2,'0')}/{s.reference_year}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <span className="font-medium">{classCount}</span>
                            <span className="text-muted-foreground"> + </span>
                            <span className="text-blue-600">{planningCount}</span>
                          </TableCell>
                          <TableCell className="text-center text-green-600">{s.total_present_entries}</TableCell>
                          <TableCell className="text-center text-red-600">{s.total_absent_entries}</TableCell>
                          <TableCell className="text-center hidden lg:table-cell">{s.total_pending_entries}</TableCell>
                          <TableCell className="text-center text-xs">
                            <span className="text-emerald-700">{minutesToHours(conf)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span>{minutesToHours(exp)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden min-w-[60px]">
                                <div
                                  className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(s.status)}</TableCell>
                          <TableCell className="text-right">
                            <RowActions
                              sheet={s}
                              isClosed={isClosed}
                              onRecalc={() => recalc.mutate(s.id)}
                              onSubmitReview={() => setReviewTarget(s)}
                              onExportPdf={() => handleExportPdf(s.id)}
                              busy={recalc.isPending || submitReview.isPending}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {paged.map((s: any) => {
                  const isClosed = ['closed','approved_by_rh'].includes(s.status);
                  const hasPending = (s.total_pending_entries || 0) > 0 || s.status === 'with_pending_items';
                  const classCount = s.total_class_entries ?? 0;
                  const planningCount = s.total_planning_entries ?? 0;
                  const exp = s.expected_workload_minutes || 0;
                  const conf = s.confirmed_workload_minutes || 0;
                  const pct = exp > 0 ? Math.round((conf / exp) * 100) : 0;
                  return (
                    <div
                      key={s.id}
                      className={`rounded-lg border p-3 ${hasPending ? 'border-l-2 border-l-amber-400' : ''} ${isClosed ? 'opacity-90' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {isAdmin && (
                            <Checkbox
                              aria-label={`Selecionar folha de ${s.professors?.full_name || ''}`}
                              checked={effectiveSelected.has(s.id)}
                              onCheckedChange={(c) => toggleOne(s.id, !!c)}
                              className="mt-0.5"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-sm break-words">{s.professors?.full_name || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {String(s.reference_month).padStart(2,'0')}/{s.reference_year}
                            </div>
                          </div>
                        </div>
                        {statusBadge(s.status)}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs mb-2">
                        <Stat label="Aulas+PL" value={`${classCount}+${planningCount}`} />
                        <Stat label="Presentes" value={s.total_present_entries} color="text-green-600" />
                        <Stat label="Ausências" value={s.total_absent_entries} color="text-red-600" />
                        <Stat label="Pendências" value={s.total_pending_entries} color="text-amber-600" />
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                          <span>CH {minutesToHours(conf)} / {minutesToHours(exp)}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <RowActions
                          sheet={s}
                          isClosed={isClosed}
                          onRecalc={() => recalc.mutate(s.id)}
                          onSubmitReview={() => setReviewTarget(s)}
                          onExportPdf={() => handleExportPdf(s.id)}
                          busy={recalc.isPending || submitReview.isPending}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-4 text-sm">
                <div className="text-muted-foreground">
                  Mostrando <strong>{fromIdx}</strong>–<strong>{toIdx}</strong> de <strong>{filtered.length}</strong>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="hidden sm:inline">Itens por página</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100, 200].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 px-2"
                      onClick={() => setPage(1)} disabled={safePage <= 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-8 px-2"
                      onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>‹</Button>
                    <span className="px-2 tabular-nums">
                      Página <strong>{safePage}</strong> / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" className="h-8 px-2"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-8 px-2"
                      onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}>»</Button>
                  </div>
                </div>
              </div>
            </>

          )}
        </CardContent>
      </Card>

      <GenerateSheetsProgressDialog
        open={confirmBatchOpen}
        onOpenChange={setConfirmBatchOpen}
        year={year}
        month={month}
        schoolId={schoolId || null}
        schoolName={schools.find((s: any) => s.id === schoolId)?.nome || null}
        bimester={selectedMonthBimester}
        confirmHint={
          !isCurrentBimester && allowOtherPeriods ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Atenção: este mês não pertence ao bimestre vigente
              ({currentBimester ? `${currentBimester}º` : '—'}). A geração foi liberada manualmente.
            </div>
          ) : null
        }
      />


      <AlertDialog open={confirmSingleOpen} onOpenChange={setConfirmSingleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar folha do professor?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Será criada/atualizada a folha de presença de{' '}
                  <strong>{professors.find((p: any) => p.id === professorId)?.full_name || '—'}</strong>{' '}
                  referente a <strong>{MONTHS[month-1]}/{year}</strong>.
                </p>
                <SemesterHint year={year} month={month} />
                <p className="text-xs text-muted-foreground">
                  As aulas vêm da Grade Horária respeitando o semestre do mês (disciplinas anuais entram sempre).
                  Folhas já fechadas ou aprovadas pelo R.H. não serão alteradas.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                generate.mutate({ professorId, year, month });
                setConfirmSingleOpen(false);
              }}
            >
              Gerar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkDeleteSheetsDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        sheets={selectedSheets.length > 0 ? selectedSheets : filtered}
        scope={selectedSheets.length > 0 ? 'selected' : 'filtered'}
        monthLabel={`${MONTHS[month-1]}/${year}`}
        onDone={() => {
          clearSelection();
          queryClient.invalidateQueries({ queryKey: ['teacher-attendance-sheets'] });
          queryClient.invalidateQueries({ queryKey: ['teacher-attendance-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['teacher-attendance-bi'] });
          queryClient.invalidateQueries({ queryKey: ['teacher-attendance-daily-series'] });
          queryClient.invalidateQueries({ queryKey: ['sheets-by-school'] });
          queryClient.invalidateQueries({ queryKey: ['folha-ponto-targets'] });
        }}
      />




      <SubmitForReviewDialog
        open={!!reviewTarget}
        onOpenChange={(v) => { if (!v) setReviewTarget(null); }}
        target={reviewTarget ? {
          id: reviewTarget.id,
          professorName: reviewTarget.professors?.full_name,
          referenceMonth: reviewTarget.reference_month,
          referenceYear: reviewTarget.reference_year,
          pending: reviewTarget.total_pending_entries || 0,
          divergent: reviewTarget.total_divergent_entries || 0,
          status: reviewTarget.status,
          expectedMinutes: reviewTarget.expected_workload_minutes || 0,
          confirmedMinutes: reviewTarget.confirmed_workload_minutes || 0,
          totalEntries: (reviewTarget.total_class_entries || 0) + (reviewTarget.total_planning_entries || 0),
        } : null}
        isPending={submitReview.isPending}
        onConfirm={({ notes, force }) => {
          if (!reviewTarget) return;
          submitReview.mutate(
            { sheetId: reviewTarget.id, notes, force },
            { onSuccess: () => setReviewTarget(null) },
          );
        }}
      />

      <FolhaPontoManualDialog
        open={folhaPontoManualOpen}
        onOpenChange={setFolhaPontoManualOpen}
        schools={schools as any}
        professors={professors as any}
        defaultProfessorId={professorId || undefined}
        defaultSchoolId={schoolId || undefined}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded-md bg-muted/40 py-1.5">
      <div className={`font-semibold text-sm ${color || ''}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function RowActions({
  sheet, isClosed, onRecalc, onSubmitReview, onExportPdf, busy,
}: {
  sheet: any; isClosed: boolean; onRecalc: () => void;
  onSubmitReview: () => void; onExportPdf: () => void; busy: boolean;
}) {
  const canSubmit = ['draft','generated','with_pending_items','reopened'].includes(sheet.status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Ações">
          <MoreVertical className="h-4 w-4"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Visualizar</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to={`/presenca-professores/folhas/${sheet.id}`}>
              <Eye className="h-4 w-4 mr-2"/> Ver detalhe
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator/>
        <DropdownMenuLabel className="text-xs">Processar</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={isClosed || busy} onSelect={onRecalc}>
            <RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`}/> Recalcular
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canSubmit || busy} onSelect={onSubmitReview}>
            <Send className="h-4 w-4 mr-2"/> Enviar para revisão
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator/>
        <DropdownMenuLabel className="text-xs">Exportar</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onExportPdf}>
            <FileDown className="h-4 w-4 mr-2"/> Baixar PDF
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GenerateSelectedButton({
  professorId, professorName, year, month, onGenerate, isPending,
  outOfSemester, outOfSemesterReason,
}: {
  professorId: string; professorName?: string; year: number; month: number;
  onGenerate: () => void; isPending: boolean;
  outOfSemester?: boolean; outOfSemesterReason?: string | null;
}) {
  const { data: hasGrade, isLoading } = useProfessorHasActiveGrade(professorId || null, year, month);
  const noProf = !professorId;
  const noGrade = !!professorId && !isLoading && hasGrade === false;
  const disabled = noProf || noGrade || isPending || !!outOfSemester;

  const label = noProf
    ? 'Gerar folha do professor filtrado'
    : `Gerar folha de ${professorName ?? 'professor'}`;

  const btn = (
    <Button variant="outline" onClick={onGenerate} disabled={disabled} title={label}>
      {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Plus className="h-4 w-4 mr-2"/>}
      <span className="max-w-[260px] truncate">{label}</span>
    </Button>
  );

  const tip = outOfSemester
    ? (outOfSemesterReason || 'Mês fora do semestre vigente.')
    : noProf
      ? 'Selecione um professor no filtro acima para gerar apenas a folha dele.'
      : noGrade
        ? `Professor sem grade horária ativa em ${String(month).padStart(2,'0')}/${year}.`
        : null;

  if (!tip) return btn;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
        <TooltipContent className="max-w-xs">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


function SemesterHint({ year, month }: { year: number; month: number }) {
  const { organizationId } = useOrganization();
  const { data } = useQuery({
    queryKey: ['semester-for-month', organizationId, year, month],
    enabled: !!organizationId,
    queryFn: async () => {
      const data = { id: 'mock', name: 'mock' };
      if (error) throw error;
      return data as 'FIRST' | 'SECOND' | null;
    },
  });
  const label = data === 'FIRST' ? '1º semestre (bimestres 1 e 2)'
              : data === 'SECOND' ? '2º semestre (bimestres 3 e 4)'
              : null;
  if (!label) return null;
  return (
    <div className="rounded-md bg-muted px-3 py-2 text-sm">
      Grade Horária utilizada: <strong>{label}</strong>
    </div>
  );
}


function BulkDeleteSheetsDialog({
  open, onOpenChange, sheets, scope, monthLabel, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sheets: any[];
  scope: 'selected' | 'filtered';
  monthLabel: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<'confirm' | 'running' | 'done'>('confirm');
  const [index, setIndex] = React.useState(0);
  const [currentName, setCurrentName] = React.useState<string>('');
  const [errors, setErrors] = React.useState<Array<{ name: string; message: string }>>([]);
  const [deleted, setDeleted] = React.useState(0);

  // Snapshot da lista no momento do "Excluir agora" para não mudar durante a execução
  const [queue, setQueue] = React.useState<any[]>([]);
  const total = queue.length || sheets.length;

  React.useEffect(() => {
    if (!open) {
      // reset ao fechar (somente quando não estiver rodando)
      if (phase !== 'running') {
        setPhase('confirm');
        setIndex(0);
        setDeleted(0);
        setErrors([]);
        setCurrentName('');
        setQueue([]);
      }
    }
  }, [open, phase]);

  async function runDeletion() {
    const snapshot = [...sheets];
    setQueue(snapshot);
    setPhase('running');
    setIndex(0);
    setDeleted(0);
    setErrors([]);

    for (let i = 0; i < snapshot.length; i++) {
      const s = snapshot[i];
      const name = s.professors?.full_name || s.professor_id;
      setIndex(i + 1);
      setCurrentName(name);
      try {
        const { error } = await supabase
          .from('teacher_attendance_monthly_sheets')
          .delete()
          .eq('id', s.id);
        if (error) throw error;
        setDeleted((d) => d + 1);
      } catch (e: any) {
        setErrors((prev) => [...prev, { name, message: e?.message || 'Erro ao excluir' }]);
      }
    }

    setPhase('done');
    onDone();
    toast({
      title: 'Exclusão concluída',
      description: `${snapshot.length - errors.length} folha(s) excluída(s).`,
    });
  }

  const pct = total > 0 ? Math.round((index / total) * 100) : 0;
  const blocked = phase === 'running';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (blocked) return; // não fecha durante execução
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => { if (blocked) e.preventDefault(); }}>
        {phase === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive"/> Excluir folhas de presença?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 pt-2 text-sm">
                  <p>
                    Você está prestes a excluir <strong>{sheets.length}</strong>{' '}
                    {scope === 'selected' ? 'folha(s) selecionada(s)' : `folha(s) filtradas de ${monthLabel}`}.
                  </p>
                  <p className="text-destructive">
                    Esta ação é <strong>permanente</strong>. Todas as ocorrências, ajustes e assinaturas
                    associadas serão removidas. Folhas <strong>fechadas</strong> não serão excluídas (regra do sistema).
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={runDeletion} disabled={sheets.length === 0}>
                <Trash2 className="h-4 w-4 mr-2"/> Excluir agora
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === 'running' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/> Excluindo folhas…
              </DialogTitle>
              <DialogDescription>
                Aguarde até a conclusão. Não feche esta janela.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Progress value={pct} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{index} de {total}</span>
                <span>{pct}%</span>
              </div>
              <div className="text-sm truncate">
                <span className="text-muted-foreground">Excluindo: </span>
                <span className="font-medium">{currentName}</span>
              </div>
              {errors.length > 0 && (
                <div className="text-xs text-destructive">
                  {errors.length} erro(s) até agora.
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600"/> Exclusão concluída
              </DialogTitle>
              <DialogDescription>
                {deleted} folha(s) excluída(s) com sucesso
                {errors.length > 0 ? `, ${errors.length} falharam.` : '.'}
              </DialogDescription>
            </DialogHeader>
            {errors.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-2 text-xs space-y-1">
                {errors.map((e, i) => (
                  <div key={i}>
                    <span className="font-medium">{e.name}:</span>{' '}
                    <span className="text-destructive">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
