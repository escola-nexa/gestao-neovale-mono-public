import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Loader2, ChevronDown, CheckCircle2, AlertCircle, GraduationCap,
  BookOpen, Save, RotateCcw, Send, PenTool, FileText, Clock, CalendarDays, MessageSquare, Eye, EyeOff,
} from 'lucide-react';
import { planejamentoApi } from '@/features/planejamento/api';
import { TeacherPlanningData } from '@/services/supabaseApi';
import { TeacherPlanningStatus, PLANNING_STATUS_LABELS } from '@/types/academic';
import WeeklyLessonMaterials from '@/features/disciplinas/components/WeeklyLessonMaterials';
import { FeedbackHistory } from './components/FeedbackHistory';
import { PageHeader } from '@/components/PageHeader';
import { ClipboardCheck } from 'lucide-react';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import { formatSubjectName } from '@/components/SubjectNameWithAnp';

const PEDAGOGICAL_FIELDS = [
  { key: 'objective', label: 'Objetivo' },
  { key: 'competencies', label: 'Competências' },
  { key: 'contents', label: 'Conteúdos' },
  { key: 'methodology', label: 'Metodologia' },
  { key: 'resources', label: 'Recursos Didáticos' },
  { key: 'evaluation', label: 'Avaliação' },
  { key: 'product', label: 'Produto/Registro' },
  { key: 'next_steps', label: 'Próximos Passos' },
];

const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  DRAFT: { icon: <FileText className="h-3 w-3" />, className: 'border-slate-300 text-slate-600 bg-slate-50', label: 'Rascunho' },
  CONCLUIDO: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'border-emerald-300 text-emerald-700 bg-emerald-50', label: 'Concluído' },
  ENVIADO: { icon: <Send className="h-3 w-3" />, className: 'border-amber-300 text-amber-700 bg-amber-50', label: 'Enviado' },
  PENDING: { icon: <Clock className="h-3 w-3" />, className: 'border-amber-300 text-amber-700 bg-amber-50', label: 'Enviado' },
  DEVOLVIDO: { icon: <RotateCcw className="h-3 w-3" />, className: 'border-red-300 text-red-700 bg-red-50', label: 'Devolvido' },
  REJECTED: { icon: <RotateCcw className="h-3 w-3" />, className: 'border-red-300 text-red-700 bg-red-50', label: 'Devolvido' },
  ASSINADO: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-emerald-600 text-white border-emerald-600', label: 'Assinado' },
  APPROVED: { icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-emerald-600 text-white border-emerald-600', label: 'Assinado' },
  AGUARDANDO_ASSINATURA: { icon: <PenTool className="h-3 w-3" />, className: 'border-blue-300 text-blue-700 bg-blue-50', label: 'Aguardando Assinatura' },
  AGUARDANDO_ASSINATURA_COORDENADOR: { icon: <PenTool className="h-3 w-3" />, className: 'border-violet-300 text-violet-700 bg-violet-50', label: 'Aguardando Coord.' },
};

function isWeekFilled(tp: TeacherPlanningData): boolean {
  return !!(tp.objective && tp.competencies && tp.contents && tp.methodology && tp.resources && tp.evaluation && tp.product && tp.next_steps);
}

function getFilledFieldCount(tp: TeacherPlanningData): number {
  return [tp.objective, tp.competencies, tp.contents, tp.methodology, tp.resources, tp.evaluation, tp.product, tp.next_steps].filter(f => f && f.trim()).length;
}

export default function CoordinatorPlanningCheckPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const professorId = searchParams.get('professorId');
  const schoolId = searchParams.get('schoolId');
  const subjectId = searchParams.get('subjectId');
  const classGroupId = searchParams.get('classGroupId');
  const bimester = searchParams.get('bimester');

  const [loading, setLoading] = useState(true);
  const [plannings, setPlannings] = useState<TeacherPlanningData[]>([]);
  const [professorName, setProfessorName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [classGroupName, setClassGroupName] = useState('');
  const { data: anpMap } = useAnpSubjectMap();
  const isAnp = subjectId ? !!anpMap?.bySubject.has(subjectId) : false;

  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
  const [weekFeedback, setWeekFeedback] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [professorId, schoolId, subjectId, classGroupId, bimester]);

  const loadData = async () => {
    if (!professorId || !schoolId || !subjectId || !classGroupId || !bimester) {
      navigate('/planejamento');
      return;
    }

    try {
      setLoading(true);

      // Load plannings
      const { data: tps, error } = await supabase
        .from('teacher_plannings')
        .select('*')
        .eq('professor_id', professorId)
        .eq('school_id', schoolId)
        .eq('subject_id', subjectId)
        .eq('class_group_id', classGroupId)
        .eq('bimester_number', parseInt(bimester))
        .order('week_number', { ascending: true });

      if (error) throw error;
      setPlannings(tps || []);

      // Load names in parallel
      const [profRes, schoolRes, subjectRes, cgRes] = await Promise.all([
        planejamentoApi.getProfessorName(professorId).then(name => ({ data: { full_name: name } })),
        planejamentoApi.getEntityName('schools', schoolId).then(name => ({ data: { nome: name } })),
        planejamentoApi.getEntityName('subjects', subjectId).then(name => ({ data: { nome: name } })),
        planejamentoApi.getEntityName('class_groups', classGroupId).then(name => ({ data: { nome: name } })),
      ]);

      setProfessorName(profRes.data?.full_name || 'Professor');
      setSchoolName(schoolRes.data?.nome || 'Escola');
      setSubjectName(subjectRes.data?.nome || 'Disciplina');
      setClassGroupName(cgRes.data?.nome || 'Turma');
    } catch (err: any) {
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filledWeeks = plannings.filter(isWeekFilled).length;
  const totalWeeks = plannings.length;
  const progressPct = totalWeeks > 0 ? Math.round((filledWeeks / totalWeeks) * 100) : 0;

  const isFinalized = (tp: TeacherPlanningData) =>
    tp.status === 'ASSINADO' || tp.status === 'APPROVED' || (tp.professor_signed && tp.coordinator_signed);

  const allFinalized = plannings.length > 0 && plannings.every(isFinalized);

  // Check if professor has submitted (ENVIADO or later workflow statuses)
  const submittedStatuses = ['ENVIADO', 'PENDING', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR', 'ASSINADO', 'APPROVED'];
  const hasBeenSubmitted = plannings.some(tp => submittedStatuses.includes(tp.status));

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // Return all weeks with per-week feedback + general feedback
  const handleReturnAll = async () => {
    if (!generalFeedback.trim() && Object.values(weekFeedback).every(f => !f.trim())) {
      toast({ title: 'Adicione pelo menos uma observação geral ou por semana', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .single();

      for (const tp of plannings) {
        if (isFinalized(tp)) continue;

        const perWeekFb = weekFeedback[tp.id]?.trim() || '';
        const combinedFeedback = [
          generalFeedback.trim() ? `[Observação Geral] ${generalFeedback.trim()}` : '',
          perWeekFb ? `[Semana ${tp.week_number}] ${perWeekFb}` : '',
        ].filter(Boolean).join('\n\n');

        if (!combinedFeedback) continue;

        // Save feedback history
        await planejamentoApi.addFeedback({ planning_id: planningId, organization_id: user.organization_id, created_by: user.id, message: note, old_status: oldStatus, new_status: 'needs_revision' });

        // Update planning status
        await supabase
          .from('teacher_plannings')
          .update({
            status: 'DEVOLVIDO' as TeacherPlanningStatus,
            coordinator_feedback: combinedFeedback,
          })
          .eq('id', tp.id);
      }

      toast({ title: 'Planejamento devolvido com observações!' });
      navigate('/planejamento');
    } catch (err: any) {
      toast({ title: 'Erro ao devolver', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Send all weeks for professor signature
  const handleSendForSignature = async () => {
    setSaving(true);
    try {
      for (const tp of plannings) {
        if (isFinalized(tp)) continue;
        await supabase
          .from('teacher_plannings')
          .update({ status: 'AGUARDANDO_ASSINATURA' as TeacherPlanningStatus })
          .eq('id', tp.id);
      }
      toast({ title: 'Enviado para assinatura do professor!' });
      navigate('/planejamento');
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando planejamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Planejamento', href: '/planejamento' },
          { label: 'Conferência' },
        ]}
        title="Conferência de Planejamento"
        description={`${professorName} • ${formatSubjectName(subjectName, isAnp)} • ${classGroupName} • ${schoolName} • ${bimester}º Bimestre`}
        icon={ClipboardCheck}
        backTo="/planejamento"
        variant="compact"
      />

      {/* Progress */}
      <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{filledWeeks}/{totalWeeks} semanas preenchidas</span>
        <Progress value={progressPct} className={`h-2 flex-1 ${progressPct === 100 ? '[&>div]:bg-primary' : ''}`} />
        <span className={`text-xs font-bold tabular-nums ${progressPct === 100 ? 'text-primary' : 'text-muted-foreground'}`}>{progressPct}%</span>
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {plannings.map((tp) => {
          const filled = isWeekFilled(tp);
          const filledCount = getFilledFieldCount(tp);
          const config = statusConfig[tp.status] || statusConfig.DRAFT;
          const isOpen = openWeeks[tp.id] ?? false;
          const finalized = isFinalized(tp);

          return (
            <Collapsible key={tp.id} open={isOpen} onOpenChange={() => setOpenWeeks(prev => ({ ...prev, [tp.id]: !prev[tp.id] }))}>
              <CollapsibleTrigger asChild>
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all duration-300 hover:bg-muted/30 ${
                  filled ? 'border-primary/20 bg-primary/[0.02]' : ''
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-[11px] font-bold ${
                      filled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {tp.week_number || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        Semana {tp.week_number || '?'}
                        {tp.week_start_date && tp.week_end_date && (
                          <span className="text-muted-foreground font-normal ml-1 text-xs">
                            {formatDate(tp.week_start_date)} – {formatDate(tp.week_end_date)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium gap-1 ${config.className}`}>
                      {config.icon}{config.label}
                    </Badge>
                    {filled && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {!filled && filledCount > 0 && (
                      <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 bg-amber-50/50">
                        {filledCount}/8
                      </Badge>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-10 mt-1.5 mb-3 border rounded-xl overflow-hidden bg-card shadow-sm">
                  {/* Lesson Materials */}
                  {tp.subject_id && tp.bimester_number && tp.week_number && (
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-semibold text-blue-700">Aulas Planejadas</h4>
                        {/* Access indicator - simplified: if content exists, professor likely accessed */}
                        <Badge variant="outline" className={`text-[10px] ml-auto ${
                          filled ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-slate-300 text-slate-500 bg-slate-50'
                        }`}>
                          {filled ? <><Eye className="h-3 w-3 mr-1" /> Conteúdo preenchido</> : <><EyeOff className="h-3 w-3 mr-1" /> Pendente</>}
                        </Badge>
                      </div>
                      <WeeklyLessonMaterials
                        subjectId={tp.subject_id}
                        bimesterNumber={tp.bimester_number}
                        weekNumber={tp.week_number}
                      />
                    </div>
                  )}

                  <Separator />

                  {/* Pedagogical Content - read-only for coordinator */}
                  <div className="p-4 bg-purple-50/30 dark:bg-purple-950/10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold">Conteúdo Pedagógico</h4>
                      {filled ? (
                        <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10 ml-auto">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Completo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground ml-auto">
                          {filledCount}/8 preenchidos
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {PEDAGOGICAL_FIELDS.map(field => {
                        const val = (tp as any)[field.key] || '';
                        const isFilled = val.trim().length > 0;
                        return (
                          <div key={field.key} className={`rounded-lg border p-3 ${isFilled ? 'border-green-200 bg-green-50/30' : 'border-border bg-background'}`}>
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                              {field.label}
                              {isFilled && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            </label>
                            <p className="text-sm text-foreground whitespace-pre-wrap min-h-[36px]">
                              {val || <span className="text-muted-foreground italic">Não preenchido</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-week feedback - only show if professor has submitted */}
                  {!finalized && hasBeenSubmitted && (
                    <div className="p-4 border-t bg-amber-50/30">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                        <label className="text-xs font-semibold text-amber-700">Observação para esta semana (opcional)</label>
                      </div>
                      <Textarea
                        value={weekFeedback[tp.id] || ''}
                        onChange={(e) => setWeekFeedback(prev => ({ ...prev, [tp.id]: e.target.value }))}
                        placeholder="Insira uma observação de melhoria específica para esta semana..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {/* Feedback history */}
                  {tp.organization_id && (
                    <div className="p-4 border-t">
                      <FeedbackHistory teacherPlanningId={tp.id} />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* General feedback + actions */}
      {!allFinalized && hasBeenSubmitted && plannings.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          {/* General feedback */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <label className="text-sm font-semibold">Observação Geral do Planejamento</label>
            </div>
            <Textarea
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              placeholder="Insira uma observação geral sobre todo o planejamento do professor..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleReturnAll}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Devolver com Observações
            </Button>
            <Button
              onClick={handleSendForSignature}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
              Enviar para Assinatura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
