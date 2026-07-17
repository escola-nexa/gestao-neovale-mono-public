import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, AlertTriangle, CheckCircle2, Layers, ArrowRight, Sparkles, Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { ApiAdapter } from '@/lib/api-adapter';
import { hrApi } from '../../api';
import { AssignProfessorsBulkDialog } from '@/features/grade-horaria/components/AssignProfessorsBulkDialog';

const WEEKDAY_LABEL: Record<string, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui', SEXTA: 'Sex', SABADO: 'Sáb',
};

interface Props {
  schoolId: string;
  courseId: string;
  anoLetivo: string;
}

export function CoberturaTab({ schoolId, courseId, anoLetivo }: Props) {
  const navigate = useNavigate();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkScopeTurmaId, setBulkScopeTurmaId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isReady = !!schoolId && !!courseId;

  const coverageQuery = useQuery({
    queryKey: ['rh-alocar', 'coverage', schoolId, courseId, anoLetivo],
    enabled: isReady && !!anoLetivo,
    queryFn: () => hrApi.getCurriculumCoverage({ school_id: schoolId, course_id: courseId, ano_letivo: anoLetivo }),
  });

  const refsQuery = useQuery({
    queryKey: ['rh-alocar', 'refs', schoolId, courseId],
    enabled: isReady,
    queryFn: async () => {
      const [school, course] = await Promise.all([
        ApiAdapter.escolas.getById(schoolId),
        ApiAdapter.cursos.getById(courseId),
      ]);
      return { schoolNome: school?.nome ?? '—', courseNome: course?.nome ?? '—' };
    },
  });

  const cov = coverageQuery.data;

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

  if (!isReady) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Selecione escola e curso acima para visualizar a cobertura curricular.
        </CardContent>
      </Card>
    );
  }

  if (coverageQuery.isLoading) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Carregando cobertura…</CardContent></Card>;
  }

  if (cov && cov.turmas.length === 0) {
    return (
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
    );
  }

  if (!cov) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">{refsQuery.data?.courseNome}</CardTitle>
              <CardDescription>
                {refsQuery.data?.schoolNome} · {cov.totals.turmas} turma(s) · Ano {anoLetivo}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openPlanilha()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Abrir planilha visual
              </Button>
              {allUnassigned.length > 0 && (
                <Button onClick={() => { setBulkScopeTurmaId(null); setBulkDialogOpen(true); }}>
                  <Users className="h-4 w-4 mr-2" />
                  Atribuir {allUnassigned.length} vaga{allUnassigned.length === 1 ? '' : 's'}
                </Button>
              )}
            </div>
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
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                          Cobertura por disciplina
                        </p>
                        <div className="border rounded-lg divide-y">
                          {t.cobertura.map((c) => (
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
                          ))}
                        </div>
                      </div>

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
