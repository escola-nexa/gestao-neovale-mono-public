import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { professoresApi } from '@/features/professores/api';
import { professorsApi } from './api';
import { BindingsDialog } from './components/BindingsDialog';
import type { ProfessorData, ProfessorSchoolCourse } from './types';
import { PageHeader } from '@/components/PageHeader';
import {
  ArrowLeft,
  School,
  Clock,
  FileText,
  Link2,
  Loader2,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  Calendar,
} from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  INACTIVE: { label: 'Inativo', variant: 'outline' },
  ON_LEAVE: { label: 'Afastado', variant: 'secondary' },
};

const WEEKDAY_LABELS: Record<string, string> = {
  SEGUNDA: 'Segunda',
  TERCA: 'Terça',
  QUARTA: 'Quarta',
  QUINTA: 'Quinta',
  SEXTA: 'Sexta',
};

const WEEKDAY_ORDER = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];

const PLANNING_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  CONCLUIDO: { label: 'Em edição', variant: 'secondary' },
  ENVIADO: { label: 'Enviado', variant: 'outline' },
  PENDING: { label: 'Enviado', variant: 'outline' },
  DEVOLVIDO: { label: 'Devolvido', variant: 'destructive' },
  REJECTED: { label: 'Devolvido', variant: 'destructive' },
  AGUARDANDO_ASSINATURA: { label: 'Aguard. Assinatura', variant: 'outline' },
  AGUARDANDO_ASSINATURA_COORDENADOR: { label: 'Aguard. Coord.', variant: 'outline' },
  ASSINADO: { label: 'Assinado', variant: 'default' },
  APPROVED: { label: 'Assinado', variant: 'default' },
};

interface ScheduleEntry {
  id: string;
  weekday: string;
  start_time: string;
  end_time: string;
  school_name: string;
  course_name: string;
  class_group_name: string;
  subject_name: string;
  schedule_type: string;
}

interface PlanningStatusSummary {
  status: string;
  count: number;
}

export default function ProfessorDetailPage() {
  const { professorId } = useParams<{ professorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSchool = (location.state as any)?.fromSchool as string | undefined;
  const fromSchoolName = (location.state as any)?.schoolName as string | undefined;
  const [professor, setProfessor] = useState<ProfessorData | null>(null);
  const [bindings, setBindings] = useState<ProfessorSchoolCourse[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [planningStats, setPlanningStats] = useState<PlanningStatusSummary[]>([]);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [planningCount, setPlanningCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bindingsOpen, setBindingsOpen] = useState(false);

  useEffect(() => {
    if (professorId) loadData();
  }, [professorId]);

  const loadData = async () => {
    if (!professorId) return;
    setLoading(true);
    try {
      const [prof, binds] = await Promise.all([
        professorsApi.getById(professorId),
        professorsApi.getBindings(professorId),
      ]);
      setProfessor(prof);
      setBindings(binds.filter(b => b.status === 'ACTIVE'));

      // Load weekly schedule with joined data
      const { data: scheduleData } = await supabase
        .from('weekly_teaching_models')
        .select(`
          id, weekday, start_time, end_time, schedule_type,
          schools:school_id (nome),
          courses:course_id (nome),
          class_groups:class_group_id (nome),
          subjects:subject_id (nome)
        `)
        .eq('professor_id', professorId)
        .eq('status', 'ACTIVE')
        .order('start_time');

      const entries: ScheduleEntry[] = (scheduleData || []).map((s: any) => ({
        id: s.id,
        weekday: s.weekday,
        start_time: s.start_time,
        end_time: s.end_time,
        school_name: s.schools?.nome || '',
        course_name: s.courses?.nome || '',
        class_group_name: s.class_groups?.nome || '',
        subject_name: s.subjects?.nome || '',
        schedule_type: s.schedule_type,
      }));
      setSchedule(entries);
      setScheduleCount(entries.length);

      // Load planning status summary
      const { data: plannings } = await supabase
        .from('teacher_plannings')
        .select('status')
        .eq('professor_id', professorId);

      const statusMap: Record<string, number> = {};
      (plannings || []).forEach(p => {
        const s = p.status as string;
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const stats = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
      setPlanningStats(stats);
      setPlanningCount(plannings?.length || 0);
    } catch (error) {
      console.error('Error loading professor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Professor não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/professores')}>
          Voltar
        </Button>
      </div>
    );
  }

  const status = statusLabels[professor.status] || statusLabels.ACTIVE;
  const uniqueSchools = [...new Set(bindings.map(b => b.school_name))].filter(Boolean);

  // Group schedule by weekday
  const scheduleByDay = WEEKDAY_ORDER.reduce<Record<string, ScheduleEntry[]>>((acc, day) => {
    acc[day] = schedule
      .filter(s => s.weekday === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {});

  const modules = [
    {
      title: 'Vínculos',
      description: `${bindings.length} vínculo(s) ativo(s)`,
      icon: Link2,
      count: bindings.length,
      color: 'bg-primary/10 text-primary',
      iconColor: 'text-primary',
      action: () => setBindingsOpen(true),
      actionLabel: 'Gerenciar',
    },
    {
      title: 'Grade Horária',
      description: `${scheduleCount} horário(s) cadastrado(s)`,
      icon: Clock,
      count: scheduleCount,
      color: 'bg-accent text-accent-foreground',
      iconColor: 'text-accent-foreground',
      action: () => navigate('/grade-horaria'),
      actionLabel: 'Ver Grade',
    },
    {
      title: 'Planejamentos',
      description: `${planningCount} planejamento(s)`,
      icon: FileText,
      count: planningCount,
      color: 'bg-secondary text-secondary-foreground',
      iconColor: 'text-secondary-foreground',
      action: () => navigate('/planejamento'),
      actionLabel: 'Ver Planejamentos',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          ...(fromSchool ? [
            { label: 'Escolas', href: '/escolas' },
            { label: fromSchoolName || 'Escola', href: `/escolas/${fromSchool}` },
            { label: 'Professores', href: `/escolas/${fromSchool}/professores` },
          ] : [
            { label: 'Professores', href: '/professores' },
          ]),
          { label: professor.full_name },
        ]}
        title={professor.full_name}
        description="Detalhes e gestão do professor"
        icon={GraduationCap}
        backTo={fromSchool ? `/escolas/${fromSchool}/professores` : '/professores'}
        badge={{
          label: status.label,
          tone: status.variant === 'default' ? 'success' : 'default',
        }}
      />

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {professor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{professor.email}</span>
              </div>
            )}
            {professor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{professor.phone}</span>
              </div>
            )}
            {professor.specialization && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{professor.specialization}</span>
              </div>
            )}
            {uniqueSchools.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <School className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{uniqueSchools.length} escola(s)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <Card
            key={mod.title}
            className="group hover:shadow-md transition-shadow cursor-pointer"
            onClick={mod.action}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${mod.color}`}>
                  <mod.icon className={`h-5 w-5 ${mod.iconColor}`} />
                </div>
                <span className="text-2xl font-bold text-foreground">{mod.count}</span>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-base mb-1">{mod.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{mod.description}</p>
              <Button variant="link" className="px-0 mt-2 text-sm" tabIndex={-1}>
                {mod.actionLabel} →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Schedule grouped by School (collapsed by default) */}
      {schedule.length > 0 && (() => {
        const SEM_ESCOLA = 'Planejamento / Sem escola';
        const bySchool = schedule.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
          const key = e.school_name?.trim() || SEM_ESCOLA;
          (acc[key] ||= []).push(e);
          return acc;
        }, {});
        const schoolNames = Object.keys(bySchool).sort((a, b) => {
          if (a === SEM_ESCOLA) return 1;
          if (b === SEM_ESCOLA) return -1;
          return a.localeCompare(b, 'pt-BR');
        });
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Grade Horária Semanal
                <Badge variant="outline" className="ml-1 font-normal">{schedule.length} horário(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {schoolNames.map(schoolName => {
                  const entries = bySchool[schoolName];
                  const byDay = entries.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
                    (acc[e.weekday] ||= []).push(e);
                    return acc;
                  }, {});
                  return (
                    <AccordionItem
                      key={schoolName}
                      value={schoolName}
                      className="border rounded-lg bg-card px-3"
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2 text-left">
                          <School className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm">{schoolName}</span>
                          <Badge variant="secondary" className="ml-1 font-normal">
                            {entries.length} horário(s)
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-3">
                          {WEEKDAY_ORDER.map(day => {
                            const dayEntries = byDay[day];
                            if (!dayEntries || dayEntries.length === 0) return null;
                            return (
                              <div key={day}>
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                                  {WEEKDAY_LABELS[day]}
                                </h4>
                                <div className="space-y-1.5">
                                  {dayEntries.map(entry => (
                                    <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 text-sm">
                                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                      </Badge>
                                      {entry.schedule_type === 'PLANNING' ? (
                                        <span className="text-muted-foreground italic">Planejamento</span>
                                      ) : (
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium">{entry.subject_name || '-'}</span>
                                          <span className="text-muted-foreground mx-1.5">•</span>
                                          <span className="text-muted-foreground">{entry.class_group_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        );
      })()}

      {/* Planning Status Summary */}
      {planningStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Planejamentos por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {planningStats
                .sort((a, b) => b.count - a.count)
                .map(({ status: s, count }) => {
                  const info = PLANNING_STATUS_LABELS[s] || { label: s, variant: 'outline' as const };
                  return (
                    <div key={s} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                      <Badge variant={info.variant}>{info.label}</Badge>
                      <span className="text-lg font-bold">{count}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Bindings Summary */}
      {bindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Vínculos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bindings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{b.school_name}</span>
                      <span className="text-muted-foreground mx-2">→</span>
                      <span className="text-sm">{b.course_name}</span>
                    </div>
                  </div>
                  {b.is_coordinator && (
                    <Badge variant="secondary" className="text-xs">Coordenador</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <BindingsDialog
        open={bindingsOpen}
        onOpenChange={(open) => {
          setBindingsOpen(open);
          if (!open) loadData();
        }}
        professor={professor}
      />
    </div>
  );
}