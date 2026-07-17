import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  ComposedChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { BarChart3, Loader2, FileText, AlertTriangle, Percent, ShieldAlert, Activity } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import { useAttendanceBiReport, useAttendanceDailySeries, STATUS_LABEL } from './hooks/useTeacherAttendance';

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

const COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142 71% 45%)',
  warning: 'hsl(38 92% 50%)',
  danger: 'hsl(0 84% 60%)',
  info: 'hsl(217 91% 60%)',
  muted: 'hsl(var(--muted-foreground))',
};

const MIN_ENTRIES_FOR_RANKING = 4;
const RISK_PRESENCE_THRESHOLD = 80;

function minutesToHours(m: number) {
  if (!m) return '0h';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function PresencaBiPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [schoolId, setSchoolId] = useState<string>('');
  const [professorId, setProfessorId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');

  const { organizationId } = useOrganization();

  const { data: professors = [] } = useQuery({
    queryKey: ['professors-list', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('professors')
        .select('id, full_name')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('full_name');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-list-with-courses', organizationId],
    queryFn: async () => fetchSchoolsWithCourses({ organizationId: organizationId!, onlyActive: false }),
    enabled: !!organizationId,
  });

  const filters = {
    schoolId: schoolId || null,
    professorId: professorId || null,
    status: statusFilter === '__all__' ? null : statusFilter,
  };

  const { data: biReport, isLoading } = useAttendanceBiReport(year, month, filters);
  const { data: dailyReport } = useAttendanceDailySeries(year, month, filters);

  const kpis = biReport?.kpis || {} as any;
  const bySchool = biReport?.by_school || [];
  const byProfessor = biReport?.by_professor || [];
  const bySubjectAbsent = biReport?.by_subject_absent || [];
  const dailySeries = dailyReport?.series || [];

  const presencePct = Number(kpis.presence_percent ?? 0);
  const expectedMinutes = Number(kpis.expected_workload_minutes ?? 0);
  const confirmedMinutes = Number(kpis.confirmed_workload_minutes ?? 0);
  const divergences = Number(kpis.entries_divergent ?? 0);
  const sheetsTotal = Number(kpis.sheets_total ?? 0);
  const sheetsClosed = Number(kpis.sheets_closed ?? 0);
  const adesaoPct = sheetsTotal > 0 ? Math.round((sheetsClosed / sheetsTotal) * 100) : 0;
  const chPct = expectedMinutes > 0 ? Math.round((confirmedMinutes / expectedMinutes) * 100) : 0;

  const professorsAtRisk = useMemo(
    () => byProfessor.filter((p: any) =>
      Number(p.entries) >= MIN_ENTRIES_FOR_RANKING &&
      Number(p.presence_percent) < RISK_PRESENCE_THRESHOLD
    ).length,
    [byProfessor]
  );

  const schoolChartData = useMemo(() =>
    bySchool.slice(0, 10).map((r: any) => ({
      name: truncate(r.school_name || '—', 18),
      Presentes: Number(r.present) || 0,
      Ausências: Number(r.absent) || 0,
    })), [bySchool]);

  const dailyChartData = useMemo(() =>
    dailySeries.map((d: any) => ({
      day: d.day ? String(d.day).slice(8, 10) : '',
      Aulas: Number(d.entries) || 0,
      'Presença %': Number(d.presence_percent) || 0,
    })), [dailySeries]);

  const presenceRanking = useMemo(() =>
    [...byProfessor]
      .filter((r: any) => Number(r.entries) >= MIN_ENTRIES_FOR_RANKING)
      .sort((a: any, b: any) => Number(b.presence_percent) - Number(a.presence_percent))
      .slice(0, 10)
      .map((r: any) => ({
        name: truncate(r.professor_name || '—', 22),
        'Presença %': Number(r.presence_percent) || 0,
      })), [byProfessor]);

  const absenceRanking = useMemo(() =>
    [...byProfessor]
      .filter((r: any) => (Number(r.absent) || 0) > 0)
      .sort((a: any, b: any) => (Number(b.absent) || 0) - (Number(a.absent) || 0))
      .slice(0, 10)
      .map((r: any) => ({
        name: truncate(r.professor_name || '—', 22),
        Ausências: Number(r.absent) || 0,
      })), [byProfessor]);

  const subjectAbsenceData = useMemo(() =>
    [...bySubjectAbsent]
      .filter((r: any) => Number(r.absent_count) > 0)
      .slice(0, 10)
      .map((r: any) => ({
        name: truncate(r.subject_name || '— sem disciplina —', 20),
        Ausências: Number(r.absent_count) || 0,
      })), [bySubjectAbsent]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Relatórios BI' },
        ]}
        title="Relatórios BI — Presença Docente"
        description="Indicadores estratégicos de presença, adesão, risco operacional e ausências."
        icon={BarChart3}
        backTo="/presenca-professores"
      />

      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
            <SearchableSelect
              value={schoolId}
              onValueChange={setSchoolId}
              options={[{ value: '', label: 'Todas as escolas' }, ...schools.map((s: any) => ({ value: s.id, label: s.nome }))]}
              placeholder="Escola"
            />
            <SearchableSelect
              value={professorId}
              onValueChange={setProfessorId}
              options={[{ value: '', label: 'Todos os professores' }, ...professors.map((p: any) => ({ value: p.id, label: p.full_name }))]}
              placeholder="Professor"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>
      )}

      {!isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi
              title="Presença docente"
              value={`${presencePct}%`}
              icon={Percent}
              color="text-emerald-600"
              hint={`${kpis.entries_present || 0}/${kpis.entries_total || 0} aulas`}
              progress={presencePct}
              progressColor="bg-emerald-500"
            />
            <Kpi
              title="Adesão à folha"
              value={`${adesaoPct}%`}
              icon={FileText}
              color="text-sky-600"
              hint={`${sheetsClosed}/${sheetsTotal} folhas fechadas`}
              progress={adesaoPct}
              progressColor="bg-sky-500"
            />
            <Kpi
              title="CH realizada"
              value={`${chPct}%`}
              icon={Activity}
              color="text-violet-600"
              hint={`${minutesToHours(confirmedMinutes)} / ${minutesToHours(expectedMinutes)}`}
              progress={chPct}
              progressColor="bg-violet-500"
            />
            <Kpi
              title="Professores em risco"
              value={String(professorsAtRisk)}
              icon={ShieldAlert}
              color="text-red-600"
              hint={`Presença < ${RISK_PRESENCE_THRESHOLD}% (mín. ${MIN_ENTRIES_FOR_RANKING} aulas)`}
            />
            <Kpi
              title="Divergências"
              value={String(divergences)}
              icon={AlertTriangle}
              color="text-amber-600"
              hint="Aulas em revisão manual"
            />
          </div>

          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold text-sm mb-3">Tendência diária — aulas previstas × presença (%)</h3>
              {dailyChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Sem dados diários no período.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }}/>
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }}/>
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%"/>
                      <RTooltip/>
                      <Legend wrapperStyle={{ fontSize: 12 }}/>
                      <Bar yAxisId="left" dataKey="Aulas" fill={COLORS.info} radius={[4,4,0,0]}/>
                      <Line yAxisId="right" type="monotone" dataKey="Presença %" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5">
                <h3 className="font-semibold text-sm mb-3">Ranking de presença — Top 10</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Professores com maior % de presença (mín. {MIN_ENTRIES_FOR_RANKING} aulas no mês).
                </p>
                {presenceRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Sem dados suficientes.</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={presenceRanking} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%"/>
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150}/>
                        <RTooltip formatter={(v: any) => `${v}%`}/>
                        <Bar dataKey="Presença %" fill={COLORS.success} radius={[0,4,4,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h3 className="font-semibold text-sm mb-3">Ranking de ausências — Top 10</h3>
                <p className="text-xs text-muted-foreground mb-2">Professores com maior número absoluto de ausências.</p>
                {absenceRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Sem ausências no período.</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={absenceRanking} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }}/>
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150}/>
                        <RTooltip/>
                        <Bar dataKey="Ausências" fill={COLORS.danger} radius={[0,4,4,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardContent className="pt-5">
                <h3 className="font-semibold text-sm mb-3">Presenças × Ausências por escola</h3>
                {schoolChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schoolChartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60}/>
                        <YAxis tick={{ fontSize: 11 }}/>
                        <RTooltip/>
                        <Legend wrapperStyle={{ fontSize: 12 }}/>
                        <Bar dataKey="Presentes" fill={COLORS.success} radius={[4,4,0,0]}/>
                        <Bar dataKey="Ausências" fill={COLORS.danger} radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h3 className="font-semibold text-sm mb-3">Disciplinas com mais ausências — Top 10</h3>
                {subjectAbsenceData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Sem ausências por disciplina.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectAbsenceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }}/>
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130}/>
                        <RTooltip/>
                        <Bar dataKey="Ausências" fill={COLORS.warning} radius={[0,4,4,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-5">
              <h3 className="font-semibold text-sm mb-3">Resumo por escola</h3>
              {bySchool.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período.</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-auto pr-1">
                  {bySchool.map((r: any, i: number) => {
                    const exp = Number(r.expected_min) || 0;
                    const conf = Number(r.confirmed_min) || 0;
                    const pct = exp > 0 ? Math.round((conf / exp) * 100) : 0;
                    return (
                      <li key={i} className="border rounded-md p-2.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-medium break-words">{r.school_name || '— sem escola —'}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }}/>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                          <span>{r.present}/{r.entries} aulas</span>
                          <span>CH {minutesToHours(conf)}/{minutesToHours(exp)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({
  title, value, icon: Icon, color, hint, progress, progressColor,
}: {
  title: string; value: string; icon: any; color?: string;
  hint?: string; progress?: number; progressColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
          </div>
          <Icon className={`h-6 w-6 shrink-0 ${color || 'text-muted-foreground'}`}/>
        </div>
        {typeof progress === 'number' && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full ${progressColor || 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}/>
          </div>
        )}
        {hint && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}
