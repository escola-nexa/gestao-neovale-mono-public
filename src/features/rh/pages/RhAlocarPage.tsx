import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutGrid, Users, AlertTriangle, CheckCircle2, ExternalLink,
  Layers, ArrowRight, Sparkles, Search,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

import { ApiAdapter } from '@/lib/api-adapter';
import { hrApi } from '../api';
import { AssignProfessorsBulkDialog } from '@/features/grade-horaria/components/AssignProfessorsBulkDialog';

const WEEKDAY_LABEL: Record<string, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui', SEXTA: 'Sex', SABADO: 'Sáb',
};

export default function RhAlocarPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear().toString();

  const [schoolId, setSchoolId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [anoLetivo, setAnoLetivo] = useState(currentYear);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkScopeTurmaId, setBulkScopeTurmaId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const schoolsQuery = useQuery({
    queryKey: ['rh-alocar', 'schools'],
    queryFn: async () => {
      const data = await hrApi.listSchools();
      return data;
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['rh-alocar', 'courses', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const data = await hrApi.listCoursesBySchool(schoolId);
      return data;
    },
  });

  const coverageQuery = useQuery({
    queryKey: ['rh-alocar', 'coverage', schoolId, courseId, anoLetivo],
    enabled: !!schoolId && !!courseId && !!anoLetivo,
    queryFn: () => hrApi.getCurriculumCoverage({ school_id: schoolId, course_id: courseId, ano_letivo: anoLetivo }),
  });

  const refsQuery = useQuery({
    queryKey: ['rh-alocar', 'refs', schoolId, courseId],
    enabled: !!schoolId && !!courseId,
    queryFn: async () => {
      const [school, course] = await Promise.all([
        ApiAdapter.escolas.getById(schoolId),
        ApiAdapter.cursos.getById(courseId),
      ]);
      return { schoolNome: school?.nome ?? '—', courseNome: course?.nome ?? '—' };
    },
  });

  const cov = coverageQuery.data;
  const isReady = !!schoolId && !!courseId;

  // Modelos sem professor agregados (todas as turmas) — alimenta o dialog em massa
  const allUnassigned = useMemo(() => {
    if (!cov) return [];
    return cov.turmas.flatMap((t) =>
      t.modelos_sem_professor.map((m) => ({
        id: m.id,
        school_id: schoolId,
        course_id: courseId,
        subject_id: m.subject_id,
        subject_name: m.subject_name ?? 'Sem disciplina',
        course_name: refsQuery.data?.courseNome ?? '',
        school_name: refsQuery.data?.schoolNome ?? '',
        weekday: m.weekday as any,
        start_time: m.start_time,
        end_time: m.end_time,
        _turma_id: t.id,
      }))
    );
  }, [cov, schoolId, courseId, refsQuery.data]);

  const scopedUnassigned = useMemo(() => {
    if (!bulkScopeTurmaId) return allUnassigned;
    return allUnassigned.filter((m) => (m as any)._turma_id === bulkScopeTurmaId);
  }, [allUnassigned, bulkScopeTurmaId]);

  const turmasFiltradas = useMemo(() => {
    if (!cov) return [];
    const term = search.trim().toLowerCase();
    if (!term) return cov.turmas;
    return cov.turmas.filter((t) => t.nome.toLowerCase().includes(term));
  }, [cov, search]);

  const overallPct = cov && cov.totals.demanda_h > 0
    ? Math.round((cov.totals.alocado_h / cov.totals.demanda_h) * 100)
    : 0;

  const openPlanilha = (classGroupId?: string) => {
    const params = new URLSearchParams({ tab: 'planilha', schoolId, courseId });
    if (classGroupId) params.set('classGroupId', classGroupId);
    params.set('from', 'rh');
    navigate(`/grade-horaria?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Alocar Professores' }]}
        title="Alocar Professores"
        description="Visão de cobertura por turma. Atribua professores às vagas pendentes ou abra a planilha visual para edição completa."
        icon={LayoutGrid}
        backTo="/rh"
        actions={
          isReady ? (
            <Button variant="outline" onClick={() => openPlanilha()}>
              <Sparkles className="h-4 w-4 mr-2" />
              Abrir planilha visual
            </Button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecione contexto</CardTitle>
          <CardDescription>Escola, curso e ano letivo definem o escopo da alocação.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Escola</Label>
              <SearchableSelect
                value={schoolId}
                onValueChange={(v) => { setSchoolId(v); setCourseId(''); }}
                options={(schoolsQuery.data ?? []).map((s) => ({ value: s.id, label: s.nome }))}
                placeholder="Selecione uma escola"
                searchPlaceholder="Buscar escola..."
                emptyMessage="Nenhuma escola"
              />
            </div>
            <div>
              <Label>Curso</Label>
              <SearchableSelect
                value={courseId}
                onValueChange={setCourseId}
                options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.nome }))}
                placeholder={schoolId ? 'Selecione um curso' : 'Escolha a escola antes'}
                searchPlaceholder="Buscar curso..."
                emptyMessage="Nenhum curso vinculado"
                disabled={!schoolId}
              />
            </div>
            <div>
              <Label>Ano letivo</Label>
              <Select value={anoLetivo} onValueChange={setAnoLetivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[Number(currentYear) - 1, Number(currentYear), Number(currentYear) + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isReady && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Selecione escola e curso para visualizar a cobertura curricular.
          </CardContent>
        </Card>
      )}

      {isReady && coverageQuery.isLoading && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Carregando cobertura…</CardContent></Card>
      )}

      {isReady && cov && cov.turmas.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Não há turmas ativas para este curso em {anoLetivo}.</p>
              <p className="text-muted-foreground mt-1">
                Cadastre as turmas em <strong>Escolas → Turmas</strong> antes de prosseguir com a alocação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo do curso */}
      {isReady && cov && cov.turmas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">{refsQuery.data?.courseNome}</CardTitle>
                <CardDescription>
                  {refsQuery.data?.schoolNome} · {cov.totals.turmas} turma(s) · Ano {anoLetivo}
                </CardDescription>
              </div>
              {allUnassigned.length > 0 && (
                <Button onClick={() => { setBulkScopeTurmaId(null); setBulkDialogOpen(true); }}>
                  <Users className="h-4 w-4 mr-2" />
                  Atribuir {allUnassigned.length} vaga{allUnassigned.length === 1 ? '' : 's'} em massa
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Demanda total" value={`${cov.totals.demanda_h} aulas/sem`} />
              <Stat label="Alocado" value={`${cov.totals.alocado_h} aulas/sem`} tone={overallPct >= 100 ? 'ok' : overallPct >= 50 ? 'warn' : 'danger'} />
              <Stat label="Pendente" value={`${cov.totals.pendente_h} aulas/sem`} tone={cov.totals.pendente_h === 0 ? 'ok' : 'danger'} />
              <Stat label="Vagas sem professor" value={allUnassigned.length} tone={allUnassigned.length === 0 ? 'ok' : 'warn'} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Cobertura geral</span>
                <span className="font-mono">{overallPct}%</span>
              </div>
              <Progress value={Math.min(overallPct, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista por turma */}
      {isReady && cov && cov.turmas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Turmas
                </CardTitle>
                <CardDescription>Expanda uma turma para ver disciplinas pendentes e vagas a atribuir.</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar turma…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {turmasFiltradas.map((t) => {
                const pct = t.demanda_h > 0 ? Math.round((t.alocado_h / t.demanda_h) * 100) : 0;
                const pendentes = t.cobertura.filter((c) => c.pendente_h > 0);
                const semProf = t.modelos_sem_professor.length;
                const isFull = t.demanda_h > 0 && t.alocado_h >= t.demanda_h && semProf === 0;
                return (
                  <AccordionItem key={t.id} value={t.id} className="border rounded-lg px-3 data-[state=open]:bg-muted/30">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 text-left">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          {isFull ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                          <span className="font-semibold whitespace-normal break-words">{t.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <Progress value={Math.min(pct, 100)} className="h-2 flex-1 max-w-[200px]" />
                          <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                            {t.alocado_h}/{t.demanda_h} aulas
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          {semProf > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {semProf} vaga{semProf === 1 ? '' : 's'} sem professor
                            </Badge>
                          )}
                          {pendentes.length > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {pendentes.length} disc. pendente{pendentes.length === 1 ? '' : 's'}
                            </Badge>
                          )}
                          {isFull && <Badge variant="default" className="text-[10px]">Completa</Badge>}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 lg:grid-cols-2 pt-2">
                        {/* Cobertura por disciplina */}
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                            Cobertura por disciplina
                          </p>
                          <div className="border rounded-lg divide-y">
                            {t.cobertura.map((c) => {
                              const pctC = c.demanda_h > 0 ? Math.round((c.alocado_h / c.demanda_h) * 100) : 0;
                              return (
                                <div key={c.subject_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium whitespace-normal break-words">{c.nome}</p>
                                  </div>
                                  <span className="text-xs font-mono text-muted-foreground w-24 text-right">
                                    {c.alocado_h}/{c.demanda_h} aulas
                                  </span>
                                  {c.pendente_h > 0 ? (
                                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                                      −{c.pendente_h} aula{c.pendente_h === 1 ? '' : 's'}
                                    </Badge>
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Vagas sem professor */}
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                            Vagas sem professor
                          </p>
                          {t.modelos_sem_professor.length === 0 ? (
                            <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                              Todas as aulas desta turma já têm professor atribuído.
                            </div>
                          ) : (
                            <div className="border rounded-lg divide-y">
                              {t.modelos_sem_professor.map((m) => (
                                <div key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {WEEKDAY_LABEL[m.weekday] ?? m.weekday}
                                  </Badge>
                                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                                    {m.start_time.slice(0, 5)}–{m.end_time.slice(0, 5)}
                                  </span>
                                  <span className="flex-1 min-w-0 whitespace-normal break-words">
                                    {m.subject_name ?? <span className="italic text-muted-foreground">sem disciplina</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                        <Button size="sm" variant="outline" onClick={() => openPlanilha(t.id)}>
                          <Sparkles className="h-4 w-4 mr-2" /> Editar na planilha
                          <ArrowRight className="h-3 w-3 ml-1.5 opacity-60" />
                        </Button>
                        {t.modelos_sem_professor.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() => { setBulkScopeTurmaId(t.id); setBulkDialogOpen(true); }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Atribuir {t.modelos_sem_professor.length} vaga{t.modelos_sem_professor.length === 1 ? '' : 's'}
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {turmasFiltradas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma turma encontrada com este filtro.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Link secundário: planos antigos */}
      {isReady && (
        <div className="text-xs text-muted-foreground text-center">
          Procurando rascunhos antigos?{' '}
          <button
            type="button"
            className="underline hover:text-foreground inline-flex items-center gap-1"
            onClick={() => navigate('/rh/planos')}
          >
            Abrir Planos de Alocação <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}

      <AssignProfessorsBulkDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        unassignedModels={scopedUnassigned}
        onAssigned={() => { coverageQuery.refetch(); setBulkDialogOpen(false); setBulkScopeTurmaId(null); }}
      />
    </div>
  );
}

function Stat({
  label, value, tone = 'neutral',
}: { label: string; value: string | number; tone?: 'neutral' | 'ok' | 'warn' | 'danger' }) {
  const cls =
    tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' :
    tone === 'warn' ? 'text-amber-600 dark:text-amber-400' :
    tone === 'danger' ? 'text-destructive' :
    'text-foreground';
  return (
    <div className="border rounded-lg p-3 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${cls}`}>{value}</p>
    </div>
  );
}
