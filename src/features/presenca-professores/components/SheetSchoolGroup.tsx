import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChevronDown, ChevronRight, School as SchoolIcon,
  GraduationCap, Users, BookOpen,
} from 'lucide-react';
import { FINAL_STATUS_LABEL } from '../hooks/useTeacherAttendance';
import { formatSlotDate, formatSlotTime, minutesToHm } from '../utils/slotTime';
import { computeConferenceSeal, SEAL_LABEL, SEAL_CLASS, ConferenceSeal } from '../utils/conferenceSeal';

interface Entry {
  id: string;
  slot_type?: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  actual_call_started_at?: string | null;
  computed_status: string;
  final_status: string;
  is_manual_adjusted: boolean;
  confirmed_workload_minutes: number;
  workload_minutes: number;
  course_id?: string | null;
  class_group_id?: string | null;
  class_groups?: { nome?: string } | null;
  subjects?: { nome?: string } | null;
  courses?: { nome?: string } | null;
}

interface Props {
  schoolName: string;
  entries: Entry[];
  /** Quando há só uma escola, renderiza sem accordion */
  flat?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  present_with_delay: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  justified_absence: 'bg-blue-100 text-blue-700',
  pending: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-slate-100 text-slate-700',
  ignored: 'bg-slate-100 text-slate-700',
  manual_review_required: 'bg-purple-100 text-purple-700',
};

function summarize(entries: Entry[]) {
  let cls = 0, pl = 0, pres = 0, abs = 0, div = 0, ep = 0, cp = 0;
  for (const e of entries) {
    const isPl = e.slot_type === 'PLANNING';
    if (isPl) pl++; else cls++;
    if (e.final_status === 'present' || e.final_status === 'present_with_delay') pres++;
    if (e.final_status === 'absent') abs++;
    if (e.computed_status === 'divergent_professor' || e.computed_status === 'divergent_schedule') div++;
    ep += e.workload_minutes || 0;
    cp += e.confirmed_workload_minutes || 0;
  }
  return { cls, pl, pres, abs, div, ep, cp };
}

function SealBadge({ seal }: { seal: ConferenceSeal }) {
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${SEAL_CLASS[seal]}`}>
      {SEAL_LABEL[seal]}
    </Badge>
  );
}

function sortDateTime(a: Entry, b: Entry) {
  return new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime();
}

export function SheetSchoolGroup({ schoolName, entries, flat = false }: Props) {
  const [open, setOpen] = useState(true);
  const s = summarize(entries);
  const schoolSeal = computeConferenceSeal(entries);

  // Agrupa: Curso → Turma
  const grouped = useMemo(() => {
    const byCourse = new Map<string, {
      courseId: string;
      courseName: string;
      byClass: Map<string, { classId: string; className: string; items: Entry[] }>;
      items: Entry[];
    }>();

    for (const e of entries) {
      const cId = e.course_id || `__nc__${e.courses?.nome || ''}`;
      const cName = e.courses?.nome || '— Sem curso —';
      if (!byCourse.has(cId)) {
        byCourse.set(cId, { courseId: cId, courseName: cName, byClass: new Map(), items: [] });
      }
      const c = byCourse.get(cId)!;
      c.items.push(e);

      const tId = e.class_group_id || `__nt__${e.class_groups?.nome || ''}`;
      const tName = e.class_groups?.nome || '— Sem turma —';
      if (!c.byClass.has(tId)) {
        c.byClass.set(tId, { classId: tId, className: tName, items: [] });
      }
      c.byClass.get(tId)!.items.push(e);
    }

    const courses = Array.from(byCourse.values())
      .sort((a, b) => a.courseName.localeCompare(b.courseName, 'pt-BR'))
      .map((c) => ({
        ...c,
        classes: Array.from(c.byClass.values())
          .sort((a, b) => a.className.localeCompare(b.className, 'pt-BR'))
          .map((t) => ({ ...t, items: [...t.items].sort(sortDateTime) })),
      }));
    return courses;
  }, [entries]);

  // Para barra "X de Y turmas conferidas"
  const classConference = useMemo(() => {
    let total = 0, ok = 0;
    for (const c of grouped) for (const t of c.classes) {
      total++;
      if (computeConferenceSeal(t.items) === 'ok') ok++;
    }
    return { total, ok };
  }, [grouped]);

  const body = (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Horários exibidos conforme a Grade Horária da escola.</span>
        {classConference.total > 0 && (
          <span>
            Conferência: <b className="text-foreground">{classConference.ok}</b> de{' '}
            <b className="text-foreground">{classConference.total}</b> turma(s) sem pendência.
          </span>
        )}
      </div>

      {grouped.map((course) => {
        const cs = summarize(course.items);
        const courseSeal = computeConferenceSeal(course.items);
        return (
          <div key={course.courseId} className="rounded-md border border-muted/60">
            {/* Cabeçalho do curso (único por curso) */}
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/30 border-b">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate">{course.courseName}</span>
                <SealBadge seal={courseSeal} />
              </div>
              <div className="text-[11px] text-muted-foreground hidden md:flex gap-x-3 flex-wrap">
                <span><b className="text-foreground">{cs.cls}</b> aulas</span>
                <span><b className="text-blue-600">{cs.pl}</b> PL</span>
                <span><b className="text-green-600">{cs.pres}</b> pres.</span>
                <span><b className="text-red-600">{cs.abs}</b> aus.</span>
                {cs.div > 0 && <span><b className="text-purple-600">{cs.div}</b> div.</span>}
                <span>CH <b className="text-foreground">{minutesToHm(cs.cp)}</b>/{minutesToHm(cs.ep)}</span>
              </div>
            </div>

            {/* Turmas dentro do curso */}
            <div className="divide-y">
              {course.classes.map((klass) => {
                const ts = summarize(klass.items);
                const turmaSeal = computeConferenceSeal(klass.items);
                return (
                  <div key={klass.classId} className="px-3 py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">Turma {klass.className}</span>
                        <SealBadge seal={turmaSeal} />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex gap-x-3 flex-wrap">
                        <span><b className="text-foreground">{ts.cls}</b> aulas</span>
                        {ts.pl > 0 && <span><b className="text-blue-600">{ts.pl}</b> PL</span>}
                        <span><b className="text-green-600">{ts.pres}</b> pres.</span>
                        <span><b className="text-red-600">{ts.abs}</b> aus.</span>
                        {ts.div > 0 && <span><b className="text-purple-600">{ts.div}</b> div.</span>}
                        <span>CH <b className="text-foreground">{minutesToHm(ts.cp)}</b>/{minutesToHm(ts.ep)}</span>
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8">Data</TableHead>
                            <TableHead className="h-8">Horário</TableHead>
                            <TableHead className="h-8">Disciplina</TableHead>
                            <TableHead className="h-8">Tipo</TableHead>
                            <TableHead className="h-8">Início da chamada</TableHead>
                            <TableHead className="h-8 text-center">
                              <TooltipProvider><Tooltip>
                                <TooltipTrigger asChild><span className="cursor-help">CH (conf./prev.)</span></TooltipTrigger>
                                <TooltipContent>Minutos confirmados sobre minutos previstos</TooltipContent>
                              </Tooltip></TooltipProvider>
                            </TableHead>
                            <TableHead className="h-8">Status calculado</TableHead>
                            <TableHead className="h-8">Status oficial</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {klass.items.map((e) => {
                            const isPlanning = e.slot_type === 'PLANNING';
                            return (
                              <TableRow
                                key={e.id}
                                className={
                                  isPlanning ? 'bg-blue-50/30'
                                  : e.final_status === 'manual_review_required' ? 'bg-purple-50/40'
                                  : e.final_status === 'pending' ? 'bg-amber-50/30' : ''
                                }
                              >
                                <TableCell className="py-2 text-xs whitespace-nowrap">{formatSlotDate(e.scheduled_start_at)}</TableCell>
                                <TableCell className="py-2 text-xs whitespace-nowrap font-medium">
                                  {formatSlotTime(e.scheduled_start_at)} – {formatSlotTime(e.scheduled_end_at)}
                                </TableCell>
                                <TableCell className="py-2 text-sm">
                                  <span className="inline-flex items-center gap-1.5">
                                    <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                                    {e.subjects?.nome || '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2">
                                  {isPlanning ? (
                                    <TooltipProvider><Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="text-xs bg-blue-100 text-blue-700 cursor-help">Planejamento</Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>1/3 da carga horária, confirmado automaticamente pela grade. Não gera divergência.</TooltipContent>
                                    </Tooltip></TooltipProvider>
                                  ) : <Badge variant="outline" className="text-xs">Aula</Badge>}
                                </TableCell>
                                <TableCell className="py-2 text-xs whitespace-nowrap">
                                  {isPlanning
                                    ? <span className="text-blue-600">automático</span>
                                    : e.actual_call_started_at
                                      ? formatSlotTime(e.actual_call_started_at)
                                      : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="py-2 text-center text-xs whitespace-nowrap">
                                  {e.confirmed_workload_minutes}/{e.workload_minutes}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className="text-xs">
                                    {FINAL_STATUS_LABEL[e.computed_status] || e.computed_status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <span className="inline-flex items-center gap-1">
                                    <Badge className={`${STATUS_COLORS[e.final_status] || 'bg-gray-100 text-gray-700'} text-xs`}>
                                      {FINAL_STATUS_LABEL[e.final_status] || e.final_status}
                                    </Badge>
                                    {e.is_manual_adjusted && (
                                      <span title="Ajustado manualmente" className="text-[10px] text-purple-600 font-bold">✎</span>
                                    )}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {grouped.length === 0 && (
        <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma aula prevista neste mês para esta escola.</p>
      )}
    </div>
  );

  if (flat) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2">
              <SchoolIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{schoolName}</span>
              <SealBadge seal={schoolSeal} />
            </div>
          </div>
          <Separator className="mb-4" />
          {body}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 text-left group"
        >
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <SchoolIcon className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">{schoolName}</span>
              <SealBadge seal={schoolSeal} />
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
              <span><b className="text-foreground">{s.cls}</b> aulas</span>
              <span><b className="text-blue-600">{s.pl}</b> PL</span>
              <span><b className="text-green-600">{s.pres}</b> presentes</span>
              <span><b className="text-red-600">{s.abs}</b> ausências</span>
              {s.div > 0 && <span><b className="text-purple-600">{s.div}</b> divergências</span>}
              <span className="text-muted-foreground">
                CH <b className="text-foreground">{minutesToHm(s.cp)}</b> / {minutesToHm(s.ep)}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" tabIndex={-1}>
            {open ? 'Recolher' : 'Expandir'}
          </Button>
        </button>
        {open && (
          <div className="mt-4 pt-4 border-t">
            {body}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
