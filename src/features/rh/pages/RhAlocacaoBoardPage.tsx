import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutGrid, AlertTriangle, CheckCircle2, ChevronRight, Calculator, Users,
  ExternalLink, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { ApiAdapter } from '@/lib/api-adapter';
import { hrApi } from '../api';
import { AssignProfessorPopover, type AssignSelection } from '../components/AssignProfessorPopover';
import { IndicationsSidePanel } from '../components/IndicationsSidePanel';

const WEEKDAY_LABEL: Record<string, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui', SEXTA: 'Sex', SABADO: 'Sáb',
};

export default function RhAlocacaoBoardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear().toString();

  const [schoolId, setSchoolId] = useState(searchParams.get('schoolId') ?? '');
  const [courseId, setCourseId] = useState(searchParams.get('courseId') ?? '');
  const [anoLetivo, setAnoLetivo] = useState(searchParams.get('ano') ?? currentYear);
  const qc = useQueryClient();

  const updateUrl = (next: { schoolId?: string; courseId?: string; ano?: string }) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    setSearchParams(p, { replace: true });
  };

  const schoolsQuery = useQuery({
    queryKey: ['rh-board', 'schools'],
    queryFn: async () => {
      return hrApi.listSchools();
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['rh-board', 'courses', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      return hrApi.listCoursesBySchool(schoolId);
    },
  });

  const isReady = !!schoolId && !!courseId;

  const coverageQuery = useQuery({
    queryKey: ['rh-board', 'coverage', schoolId, courseId, anoLetivo],
    enabled: isReady,
    queryFn: () => hrApi.getCurriculumCoverage({ school_id: schoolId, course_id: courseId, ano_letivo: anoLetivo }),
  });

  const cov = coverageQuery.data;
  const totals = cov?.totals;
  const pct = totals && totals.demanda_h > 0 ? Math.round((totals.alocado_h / totals.demanda_h) * 100) : 0;
  const vagas = useMemo(() => {
    if (!cov) return 0;
    return cov.turmas.reduce((s, t) => s + t.modelos_sem_professor.length, 0);
  }, [cov]);

  // Mutation: atribuir professor a uma vaga (slot weekly_teaching_models)
  const assignMut = useMutation({
    mutationFn: async (input: { wtmId: string; sel: AssignSelection }) => {
      const { wtmId, sel } = input;
      let professor_id: string | null = sel.professor_id ?? null;

      // TALENTO ou INDICACAO sem professor existente: precisa converter
      if (sel.source === 'TALENTO' && !professor_id) {
        throw new Error('Esse candidato ainda não é professor do sistema. Promova-o em Banco de Talentos antes de alocar.');
      }
      if (sel.source === 'INDICACAO' && !professor_id) {
        // Se a indicação está vinculada a um professor existente, usa; senão pede conversão.
        const ind = await hrApi.getIndication(sel.indication_id!);
        if (ind?.professor_id) {
          professor_id = ind.professor_id;
        } else {
          throw new Error('Indicação ainda não vinculada a um professor cadastrado. Aprove e converta no Banco de Talentos primeiro.');
        }
      }

      if (sel.source === 'INDICACAO' && professor_id) {
        await hrApi.assignIndicationToVaga({
          indication_id: sel.indication_id!,
          weekly_teaching_model_id: wtmId,
          professor_id,
        });
      } else {
        await hrApi.assignProfessorToVaga(wtmId, professor_id);
      }
    },
    onSuccess: () => {
      toast.success('Professor atribuído à vaga');
      qc.invalidateQueries({ queryKey: ['rh-board', 'coverage'] });
      qc.invalidateQueries({ queryKey: ['rh-aloc', 'sidepanel-indications'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao atribuir'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Alocação de Professores' }]}
        title="Alocação de Professores"
        description="Liste turmas e disciplinas do curso, veja vagas em aberto e atribua professores em um clique."
        icon={LayoutGrid}
        backTo="/rh"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/rh/professores')}>
              <Users className="h-4 w-4 mr-1" /> Professores
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/rh/demanda')}>
              <Calculator className="h-4 w-4 mr-1" /> Calc. demanda
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contexto</CardTitle>
          <CardDescription>Escolha escola, curso e ano letivo para visualizar a alocação.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Escola</Label>
              <SearchableSelect
                value={schoolId}
                onValueChange={(v) => { setSchoolId(v); setCourseId(''); updateUrl({ schoolId: v, courseId: '' }); }}
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
                onValueChange={(v) => { setCourseId(v); updateUrl({ courseId: v }); }}
                options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.nome }))}
                placeholder={schoolId ? 'Selecione um curso' : 'Escolha a escola antes'}
                searchPlaceholder="Buscar curso..."
                emptyMessage="Nenhum curso vinculado"
                disabled={!schoolId}
              />
            </div>
            <div>
              <Label>Ano letivo</Label>
              <Select value={anoLetivo} onValueChange={(v) => { setAnoLetivo(v); updateUrl({ ano: v }); }}>
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

      {!isReady ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Selecione escola e curso acima para iniciar.
          </CardContent>
        </Card>
      ) : coverageQuery.isLoading ? (
        <Card><CardContent className="py-10 text-sm text-muted-foreground text-center">Carregando…</CardContent></Card>
      ) : !cov ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
          <div className="space-y-6">
            {/* Resumo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo do curso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Turmas</div>
                    <div className="text-2xl font-bold">{totals?.turmas ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Demanda total</div>
                    <div className="text-2xl font-bold">{totals?.demanda_h ?? 0}h</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Alocado</div>
                    <div className="text-2xl font-bold">{totals?.alocado_h ?? 0}h</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Vagas em aberto</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      {vagas}
                      {vagas > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Cobertura</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              </CardContent>
            </Card>

            {/* Turmas com vagas */}
            {cov.turmas.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground text-center">
                  Nenhuma turma ativa neste contexto.
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" defaultValue={cov.turmas.filter((t) => t.modelos_sem_professor.length > 0).map((t) => t.id)}>
                {cov.turmas.map((t) => {
                  const cobPct = t.demanda_h > 0 ? Math.round((t.alocado_h / t.demanda_h) * 100) : 0;
                  const hasVagas = t.modelos_sem_professor.length > 0;
                  return (
                    <AccordionItem key={t.id} value={t.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{t.nome}</span>
                            {hasVagas ? (
                              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                                {t.modelos_sem_professor.length} vaga{t.modelos_sem_professor.length > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> completa
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{t.alocado_h}h / {t.demanda_h}h</span>
                            <Progress value={cobPct} className="w-24" />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {!hasVagas ? (
                          <p className="text-xs text-muted-foreground py-2">Todas as vagas desta turma já têm professor.</p>
                        ) : (
                          <div className="space-y-2">
                            {t.modelos_sem_professor.map((m) => (
                              <div key={m.id} className="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/50">
                                <div className="text-sm min-w-0 flex-1">
                                  <div className="font-medium whitespace-normal break-words">
                                    {m.subject_name ?? '(disciplina não definida)'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {WEEKDAY_LABEL[m.weekday] ?? m.weekday} · {m.start_time?.slice(0, 5)}–{m.end_time?.slice(0, 5)}
                                  </div>
                                </div>
                                <AssignProfessorPopover
                                  schoolId={schoolId}
                                  courseId={courseId}
                                  trigger={
                                    <Button size="sm" variant="default">
                                      Atribuir <ChevronRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  }
                                  onSelect={(sel) => assignMut.mutate({ wtmId: m.id, sel })}
                                  disabled={assignMut.isPending}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => navigate(`/grade-horaria?tab=planilha&schoolId=${schoolId}&courseId=${courseId}&classGroupId=${t.id}`)}
                          >
                            Abrir grade desta turma <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>

          {/* Painel lateral de indicações */}
          <div className="space-y-4">
            <IndicationsSidePanel
              schoolId={schoolId}
              courseId={courseId}
              onPickIndication={() => navigate('/rh/indicacoes')}
            />
            <Card>
              <CardContent className="py-4 text-xs text-muted-foreground">
                Para abrir indicações pendentes diretamente em uma vaga, use o botão <strong>Atribuir → aba Indicações</strong> em cada slot.
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
