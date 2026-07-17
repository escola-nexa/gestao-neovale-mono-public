import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { disciplinasApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { useSemester, SEMESTER_LABELS } from '@/hooks/useSemester';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Calendar, BookOpen, ChevronDown, ChevronUp, GraduationCap, Clock, Layers } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import WeeklyContentForm from './components/WeeklyContentForm';
import WeeklyCalendarGuide from './components/WeeklyCalendarGuide';
import WeeklyLessonMaterials from './components/WeeklyLessonMaterials';
import { PageHeader } from '@/components/PageHeader';

interface BimesterData {
  number: number;
  start_date: string;
  end_date: string;
}

interface WeekInfo {
  weekNumber: number;
  startDate: string;
  endDate: string;
  classCount: number;
  dates: string[];
}

export default function SubjectWeeklyCalendarPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { semesterDateRanges } = useSemester();

  const [subject, setSubject] = useState<any>(null);
  const [bimesters, setBimesters] = useState<BimesterData[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<{ event_date: string; event_type: string }[]>([]);
  const [filledWeeks, setFilledWeeks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id || !subjectId) return;
    loadData();
  }, [organization?.id, subjectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await disciplinasApi.getSubjectWeeklyCalendarData(organization!.id, subjectId!);
      setSubject(data.subject);
      setBimesters(data.bimesters);
      setCalendarEvents(data.calendarEvents);
      setFilledWeeks(data.filledWeeksSet);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nonLetivoDates = useMemo(() => {
    const set = new Set<string>();
    calendarEvents.forEach(evt => {
      if (evt.event_type === 'FERIADO' || evt.event_type === 'RECESSO') {
        set.add(evt.event_date);
      }
    });
    return set;
  }, [calendarEvents]);

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  };

  const getLetivoDays = (startDate: string, endDate: string): string[] => {
    const days: string[] = [];
    const current = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (isWeekday(current) && !nonLetivoDates.has(dateStr)) {
        days.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const relevantBimesters = useMemo(() => {
    if (!subject) return [];
    if (subject.semester === 'FIRST') return bimesters.filter(b => b.number <= 2);
    if (subject.semester === 'SECOND') return bimesters.filter(b => b.number >= 3);
    return bimesters;
  }, [subject, bimesters]);

  const weeklyDistribution = useMemo(() => {
    if (!subject || relevantBimesters.length === 0) return [];
    const chSemanal = subject.carga_horaria_semanal || 0;

    return relevantBimesters.map(bimester => {
      const letivoDays = getLetivoDays(bimester.start_date, bimester.end_date);
      const weekMap = new Map<string, string[]>();

      letivoDays.forEach(dateStr => {
        const date = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        const weekKey = monday.toISOString().split('T')[0];
        if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
        weekMap.get(weekKey)!.push(dateStr);
      });

      const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));
      const weeks: WeekInfo[] = sortedWeeks.map(([mondayStr, dates], index) => {
        const monday = new Date(mondayStr + 'T12:00:00');
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        return {
          weekNumber: index + 1,
          startDate: mondayStr,
          endDate: friday.toISOString().split('T')[0],
          classCount: Math.min(dates.length, chSemanal),
          dates,
        };
      });

      return {
        bimester,
        weeks,
        totalLetivoDays: letivoDays.length,
        totalClasses: weeks.reduce((sum, w) => sum + w.classCount, 0),
      };
    });
  }, [subject, relevantBimesters, nonLetivoDates]);

  const grandTotal = weeklyDistribution.reduce((sum, b) => sum + b.totalClasses, 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const toggleWeek = (key: string) => {
    setExpandedWeek(prev => prev === key ? null : key);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Disciplina não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/cursos')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Cursos', href: '/cursos' },
          { label: subject?.courses?.nome || '...', href: subject?.course_id ? `/cursos/${subject.course_id}/disciplinas` : '/cursos' },
          { label: subject?.nome || '...' },
          { label: 'Calendário Semanal' },
        ]}
        title="Calendário Semanal"
        description={`${subject.nome} — ${subject.courses?.nome || subject.course_id}`}
        icon={Calendar}
        backTo={subject?.course_id ? `/cursos/${subject.course_id}/disciplinas` : '/cursos'}
      />

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-background rounded-lg border px-3 py-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Semestre</span>
          <span className="text-sm font-semibold">{SEMESTER_LABELS[subject.semester as keyof typeof SEMESTER_LABELS]}</span>
        </div>
        <div className="flex items-center gap-2 bg-background rounded-lg border px-3 py-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">CH Semanal</span>
          <span className="text-sm font-semibold">{subject.carga_horaria_semanal}h</span>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 rounded-lg border border-primary/20 px-3 py-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-xs text-primary/70">Total</span>
          <span className="text-sm font-bold text-primary">{grandTotal} aulas</span>
        </div>
      </div>

      {/* Guide */}
      <WeeklyCalendarGuide />

      {weeklyDistribution.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Nenhum bimestre configurado no calendário acadêmico.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={weeklyDistribution.map((_, i) => `bim-${i}`)} className="space-y-10">
          {(() => {
            // Group bimesters by semester (1-2 = 1º Semestre, 3-4 = 2º Semestre)
            const groups: { label: string; items: typeof weeklyDistribution }[] = [];
            const first = weeklyDistribution.filter(b => b.bimester.number <= 2);
            const second = weeklyDistribution.filter(b => b.bimester.number >= 3);
            if (first.length) groups.push({ label: '1º Semestre', items: first });
            if (second.length) groups.push({ label: '2º Semestre', items: second });
            return groups.map((group, gIdx) => {
              const totalAulas = group.items.reduce((s, b) => s + b.totalClasses, 0);
              const totalSemanas = group.items.reduce((s, b) => s + b.weeks.length, 0);
              return (
                <div key={gIdx} className="space-y-4">
                  {/* Semester header — dark blue Neovale band */}
                  <div className="relative overflow-hidden rounded-2xl bg-[#1B1E2C] px-5 py-4 shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FFDA45]" />
                    <div className="flex items-center justify-between flex-wrap gap-2 pl-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#FFDA45] flex items-center justify-center text-[#1B1E2C] font-extrabold text-sm">
                          {group.label.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{group.label}</h2>
                          <p className="text-[11px] text-white/60">{group.items.length} bimestre(s) • {totalSemanas} semanas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-[#FFDA45]/15 border border-[#FFDA45]/30 px-3 py-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-[#FFDA45]" />
                        <span className="text-xs font-bold text-[#FFDA45]">{totalAulas} aulas</span>
                      </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-[#FFDA45]/10 blur-2xl" />
                  </div>

                  {group.items.map((bimData, bimIndex) => (
            <AccordionItem key={`${gIdx}-${bimIndex}`} value={`bim-${bimData.bimester.number}`} className="relative border-2 border-[#1B1E2C]/15 rounded-2xl overflow-hidden shadow-md hover:border-[#FFDA45] hover:shadow-lg transition-all bg-background mb-4">

              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FFDA45]" />
              <AccordionTrigger className="px-5 py-4 hover:no-underline bg-gradient-to-r from-[#FFDA45]/5 to-transparent hover:from-[#FFDA45]/10 transition-colors pl-6">
                <div className="flex items-center gap-3 flex-1 text-left">
                  <Badge className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]">{bimData.bimester.number}º Bimestre</Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline font-medium">
                    {formatDate(bimData.bimester.start_date)} a {formatDate(bimData.bimester.end_date)}
                  </span>
                  <div className="ml-auto flex items-center gap-2 mr-2">
                    <span className="text-sm font-bold text-[#1B1E2C] dark:text-foreground">{bimData.totalClasses} aulas</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{bimData.weeks.length} semanas</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2">
                <div className="grid gap-2">
                  {bimData.weeks.map((week) => {
                    const weekKey = `${bimData.bimester.number}-${week.weekNumber}`;
                    const isExpanded = expandedWeek === weekKey;
                    const isFilled = filledWeeks.has(weekKey);

                    const containerCls = isExpanded
                      ? 'shadow-md border-primary/40 bg-background'
                      : isFilled
                        ? 'border-emerald-400/60 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        : 'bg-muted/20 hover:bg-muted/40';

                    const badgeCls = isExpanded
                      ? 'bg-primary text-primary-foreground'
                      : isFilled
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground';

                    const pillCls = isFilled
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-primary/10 text-primary';

                    return (
                      <div key={week.weekNumber} className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${containerCls}`}>
                        <button
                          onClick={() => toggleWeek(weekKey)}
                          className="w-full flex items-center justify-between p-3.5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${badgeCls}`}>
                              S{week.weekNumber}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Semana {week.weekNumber}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(week.startDate)} — {formatDate(week.endDate)}
                              </span>
                              {isFilled && (
                                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  Preenchida
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${pillCls}`}>
                              <BookOpen className="h-3.5 w-3.5" />
                              <span className="text-xs font-bold">{week.classCount} {week.classCount === 1 ? 'aula' : 'aulas'}</span>
                            </div>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary/10' : 'bg-muted'}`}>

                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t">
                            {/* Aulas Planejadas Section */}
                            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10">
                              <WeeklyLessonMaterials
                                subjectId={subjectId!}
                                bimesterNumber={bimData.bimester.number}
                                weekNumber={week.weekNumber}
                              />
                            </div>

                            <Separator />

                            {/* Conteúdo Pedagógico Section */}
                            <div className="p-4 bg-purple-50/30 dark:bg-purple-950/10">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <h4 className="text-sm font-semibold">Conteúdo Pedagógico</h4>
                              </div>
                              <WeeklyContentForm
                                subjectId={subjectId!}
                                bimesterNumber={bimData.bimester.number}
                                weekNumber={week.weekNumber}
                                weekLabel={`Semana ${week.weekNumber} — ${formatDate(week.startDate)} a ${formatDate(week.endDate)}`}
                                totalWeeks={bimData.weeks.length}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {bimData.totalLetivoDays} dias letivos
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    Total: {bimData.totalClasses} aulas
                  </Badge>
                </div>
              </AccordionContent>
            </AccordionItem>
                  ))}
                </div>
              );
            });
          })()}
        </Accordion>
      )}
    </div>
  );
}
