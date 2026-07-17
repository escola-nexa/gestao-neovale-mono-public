import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { professoresApi } from '@/features/professores/api';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import {
  School, Clock, FileText, Link2, Loader2, GraduationCap,
  Mail, Phone, BookOpen, Calendar, ClipboardList, User,
} from 'lucide-react';

const WEEKDAY_LABELS: Record<string, string> = {
  SEGUNDA: 'Segunda', TERCA: 'Terça', QUARTA: 'Quarta', QUINTA: 'Quinta', SEXTA: 'Sexta',
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

interface Binding {
  id: string;
  school_name: string;
  course_name: string;
  is_coordinator: boolean;
}

interface OrientationSummary {
  status: string;
  count: number;
}

export default function MeuPerfilPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { professorId, isLoading: profLoading } = useProfessorId();

  const [loading, setLoading] = useState(true);
  const [professor, setProfessor] = useState<any>(null);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [planningStats, setPlanningStats] = useState<{ status: string; count: number }[]>([]);
  const [orientationStats, setOrientationStats] = useState<OrientationSummary[]>([]);

  useEffect(() => {
    if (!profLoading && professorId) loadData();
    if (!profLoading && !professorId) setLoading(false);
  }, [professorId, profLoading]);

  const loadData = async () => {
    if (!professorId) return;
    setLoading(true);
    try {
      const [profRes, bindingsRes, scheduleRes, planningsRes, orientationsRes] = await Promise.all([
        professoresApi.client.from('professors').select('*').eq('id', professorId).single(),
        professoresApi.client.from('professor_school_courses')
          .select('id, is_coordinator, schools:school_id(nome), courses:course_id(nome)')
          .eq('professor_id', professorId)
          .eq('status', 'ACTIVE'),
        professoresApi.client.from('weekly_teaching_models')
          .select(`id, weekday, start_time, end_time, schedule_type,
            schools:school_id(nome), courses:course_id(nome),
            class_groups:class_group_id(nome), subjects:subject_id(nome)`)
          .eq('professor_id', professorId)
          .eq('status', 'ACTIVE')
          .order('start_time'),
        professoresApi.client.from('teacher_plannings').select('status').eq('professor_id', user?.id || ''),
        professoresApi.client.from('orientations').select('status')
          .eq('professor_id', professorId).is('deleted_at', null),
      ]);

      setProfessor(profRes.data);

      setBindings((bindingsRes.data || []).map((b: any) => ({
        id: b.id,
        school_name: b.schools?.nome || '',
        course_name: b.courses?.nome || '',
        is_coordinator: b.is_coordinator,
      })));

      setSchedule((scheduleRes.data || []).map((s: any) => ({
        id: s.id, weekday: s.weekday, start_time: s.start_time, end_time: s.end_time,
        school_name: s.schools?.nome || '', course_name: s.courses?.nome || '',
        class_group_name: s.class_groups?.nome || '', subject_name: s.subjects?.nome || '',
        schedule_type: s.schedule_type,
      })));

      // Planning stats
      const pMap: Record<string, number> = {};
      (planningsRes.data || []).forEach((p: any) => { pMap[p.status] = (pMap[p.status] || 0) + 1; });
      setPlanningStats(Object.entries(pMap).map(([status, count]) => ({ status, count })));

      // Orientation stats
      const oMap: Record<string, number> = {};
      (orientationsRes.data || []).forEach((o: any) => { oMap[o.status] = (oMap[o.status] || 0) + 1; });
      setOrientationStats(Object.entries(oMap).map(([status, count]) => ({ status, count })));
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || profLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Perfil de professor não encontrado.</p>
      </div>
    );
  }

  const uniqueSchools = [...new Set(bindings.map(b => b.school_name))].filter(Boolean);
  const totalPlannings = planningStats.reduce((a, b) => a + b.count, 0);
  const totalOrientations = orientationStats.reduce((a, b) => a + b.count, 0);

  const scheduleByDay = WEEKDAY_ORDER.reduce<Record<string, ScheduleEntry[]>>((acc, day) => {
    acc[day] = schedule.filter(s => s.weekday === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Meu Perfil' }]}
        title={professor.full_name}
        description={professor.specialization || 'Visão geral do seu perfil docente'}
        icon={User}
      />

      {/* Header */}
      <Card className="bg-nexa-gradient text-white border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="p-3 rounded-full bg-white/20">
              <User className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">{professor.full_name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-primary-foreground/80">
                {professor.specialization && (
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{professor.specialization}</span>
                )}
                <span className="flex items-center gap-1.5"><School className="h-3.5 w-3.5" />{uniqueSchools.length} escola(s)</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{schedule.length} aulas/sem</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vínculos', value: bindings.length, icon: Link2, onClick: undefined },
          { label: 'Aulas/Semana', value: schedule.filter(s => s.schedule_type === 'CLASS').length, icon: Clock, onClick: () => navigate('/grade-horaria') },
          { label: 'Planejamentos', value: totalPlannings, icon: FileText, onClick: () => navigate('/planejamento') },
          { label: 'Orientações', value: totalOrientations, icon: ClipboardList, onClick: () => navigate('/orientacoes') },
        ].map((stat) => (
          <Card key={stat.label} className={stat.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={stat.onClick}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grade" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="grade" className="text-xs sm:text-sm">Grade</TabsTrigger>
          <TabsTrigger value="vinculos" className="text-xs sm:text-sm">Vínculos</TabsTrigger>
          <TabsTrigger value="planejamentos" className="text-xs sm:text-sm">Planejamentos</TabsTrigger>
          <TabsTrigger value="orientacoes" className="text-xs sm:text-sm">Orientações</TabsTrigger>
        </TabsList>

        {/* Grade Tab */}
        <TabsContent value="grade" className="mt-4">
          {schedule.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum horário cadastrado</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate('/grade-horaria')}>
                  Ver Grade Horária
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {WEEKDAY_ORDER.map(day => {
                  const entries = scheduleByDay[day];
                  if (!entries || entries.length === 0) return null;
                  return (
                    <div key={day}>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">{WEEKDAY_LABELS[day]}</h4>
                      <div className="space-y-1.5">
                        {entries.map(entry => (
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
                                <span className="text-muted-foreground mx-1.5">•</span>
                                <span className="text-xs text-muted-foreground">{entry.school_name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vínculos Tab */}
        <TabsContent value="vinculos" className="mt-4">
          {bindings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum vínculo ativo</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-2">
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Planejamentos Tab */}
        <TabsContent value="planejamentos" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {planningStats.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum planejamento encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/planejamento')}>
                    <FileText className="mr-2 h-4 w-4" /> Ir para Planejamentos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orientações Tab */}
        <TabsContent value="orientacoes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {orientationStats.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma orientação encontrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {orientationStats
                      .sort((a, b) => b.count - a.count)
                      .map(({ status: s, count }) => (
                        <div key={s} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                          <Badge variant="outline">{s.replace(/_/g, ' ')}</Badge>
                          <span className="text-lg font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/orientacoes')}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Ir para Orientações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
