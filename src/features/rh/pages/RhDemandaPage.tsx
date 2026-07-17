import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Users, Sparkles, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { hrApi } from '../api';
import { classifyUCP, UCP_LABELS, UCP_COLORS, type UcpType } from '../lib/classifyUCP';
import type { HrPeriod } from '../types';
import { PERIOD_LABEL } from '../types';

interface SubjectRow { id: string; nome: string; carga_horaria_semanal: number; }

export default function RhDemandaPage() {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [periodo, setPeriodo] = useState<HrPeriod>('MANHA');
  const [qtdTurmas, setQtdTurmas] = useState<number>(3);
  const anoLetivo = new Date().getFullYear().toString();

  const settingsQuery = useQuery({ queryKey: ['hr', 'settings'], queryFn: () => hrApi.getSettings() });
  const teto = settingsQuery.data?.teto_ch_semanal ?? 24;

  const turmasQuery = useQuery({
    queryKey: ['hr', 'turmas', schoolId, courseId, anoLetivo],
    enabled: !!schoolId && !!courseId,
    queryFn: async (): Promise<Array<{ id: string; nome: string }>> => {
      const data = await hrApi.listClassGroups(schoolId, courseId, anoLetivo);
      return data;
    },
  });

  const schoolsQuery = useQuery({
    queryKey: ['hr', 'schools'],
    queryFn: async () => {
      const data = await hrApi.listSchools();
      return data;
    },
  });

  const coursesQuery = useQuery({
    queryKey: ['hr', 'courses', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const data = await hrApi.listCoursesBySchool(schoolId);
      return data;
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ['hr', 'course-subjects', courseId],
    enabled: !!courseId,
    queryFn: async (): Promise<SubjectRow[]> => {
      const data = await hrApi.listSubjects(courseId);
      return data;
    },
  });

  const overridesQuery = useQuery({ queryKey: ['hr', 'overrides'], queryFn: () => hrApi.listOverrides() });
  const overridesMap = useMemo(() => {
    const m = new Map<string, UcpType>();
    for (const o of overridesQuery.data ?? []) m.set(o.subject_id, o.ucp_type);
    return m;
  }, [overridesQuery.data]);

  // Disciplinas classificadas (apenas UCP1/2/3/PEDAGOGICA entram na demanda)
  const ucpSubjects = useMemo(() => {
    const subs = subjectsQuery.data ?? [];
    return subs
      .map((s) => ({ ...s, ucp: overridesMap.get(s.id) ?? classifyUCP(s.nome) }))
      .filter((s) => s.ucp !== 'OUTRA') as (SubjectRow & { ucp: UcpType })[];
  }, [subjectsQuery.data, overridesMap]);

  const demanda = useMemo(() => {
    const linhas = ucpSubjects.map((s) => {
      const chTotal = qtdTurmas * s.carga_horaria_semanal;
      return {
        ...s,
        chPorTurma: s.carga_horaria_semanal,
        chTotal,
        vagas: Math.ceil(chTotal / Math.max(1, teto)),
      };
    });
    const totalAulas = linhas.reduce((acc, l) => acc + l.chTotal, 0);
    const minProfs = Math.ceil(totalAulas / Math.max(1, teto));
    return { linhas, totalAulas, minProfs };
  }, [ucpSubjects, qtdTurmas, teto]);

  // Sugestão de alocação (algoritmo guloso)
  const sugestao = useMemo(() => {
    if (demanda.linhas.length === 0) return [];
    // Agrupa por UCP, ordena UCPs por CH total desc.
    const byUcp = new Map<UcpType, { nome: string; chTotal: number }[]>();
    for (const l of demanda.linhas) {
      const arr = byUcp.get(l.ucp) ?? [];
      arr.push({ nome: l.nome, chTotal: l.chTotal });
      byUcp.set(l.ucp, arr);
    }
    const grupos = Array.from(byUcp.entries())
      .map(([ucp, items]) => ({
        ucp,
        items,
        chTotal: items.reduce((a, b) => a + b.chTotal, 0),
      }))
      .sort((a, b) => b.chTotal - a.chTotal);

    const profs: { label: string; carga: number; itens: { ucp: UcpType; nome: string; ch: number }[] }[] = [];

    for (const g of grupos) {
      // Tenta encaixar em professor existente que ainda caiba (concentra UCPs no mesmo prof)
      let target = profs.find((p) => p.carga + g.chTotal <= teto);
      if (!target) {
        target = { label: `Professor ${profs.length + 1}`, carga: 0, itens: [] };
        profs.push(target);
      }
      for (const i of g.items) {
        // Se a UCP inteira não cabe num só, fatia entre profs.
        if (target.carga + i.chTotal <= teto) {
          target.itens.push({ ucp: g.ucp, nome: i.nome, ch: i.chTotal });
          target.carga += i.chTotal;
        } else {
          // Cria novo prof para essa disciplina
          const novo = { label: `Professor ${profs.length + 1}`, carga: i.chTotal, itens: [{ ucp: g.ucp, nome: i.nome, ch: i.chTotal }] };
          profs.push(novo);
          target = novo;
        }
      }
    }
    return profs;
  }, [demanda, teto]);

  const isReady = !!schoolId && !!courseId && qtdTurmas > 0;
  const turmasDisponiveis = turmasQuery.data ?? [];
  const turmasInsuficientes = isReady && turmasDisponiveis.length < qtdTurmas;

  const savePlanMut = useMutation({
    mutationFn: async () => {
      const turmasParaUsar = turmasDisponiveis.slice(0, qtdTurmas);
      if (turmasParaUsar.length < qtdTurmas) {
        throw new Error(`Existem apenas ${turmasParaUsar.length} turma(s) cadastrada(s). Crie as turmas em Escolas → Turmas antes de salvar o plano.`);
      }
      // Expandir cada (disciplina UCP) × (turma) em itens individuais.
      // Distribuir os itens nos "professores virtuais" da sugestão (vaga_label).
      const items: Array<{ subject_id: string; class_group_id: string; ucp_type: UcpType; aulas: number; vaga_label: string }> = [];
      for (const linha of demanda.linhas) {
        for (const turma of turmasParaUsar) {
          // Vaga = primeiro professor da sugestão que contenha esta disciplina
          const vaga = sugestao.find((p) => p.itens.some((i) => i.nome === linha.nome));
          items.push({
            subject_id: linha.id,
            class_group_id: turma.id,
            ucp_type: linha.ucp,
            aulas: linha.chPorTurma,
            vaga_label: vaga?.label ?? `Vaga ${linha.ucp}`,
          });
        }
      }
      return hrApi.createPlan({
        school_id: schoolId,
        course_id: courseId,
        periodo,
        ano_letivo: anoLetivo,
        qtd_turmas: qtdTurmas,
        teto_ch_semanal: teto,
        items,
      });
    },
    onSuccess: (plan) => {
      toast.success('Plano salvo como rascunho.');
      navigate(`/rh/planos/${plan.id}`);
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar plano'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Calcular Demanda' }]}
        title="Calcular Demanda de Professores"
        description="Selecione escola, curso, período e quantidade de turmas. O sistema mostra a carga horária total e sugere a distribuição otimizada."
        icon={Calculator}
        backTo="/rh"
        actions={
          isReady && demanda.linhas.length > 0 ? (
            <Button onClick={() => savePlanMut.mutate()} disabled={savePlanMut.isPending || turmasInsuficientes}>
              {savePlanMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar como plano
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros</CardTitle>
          <CardDescription>Teto atual: <strong>{teto}h/semana</strong> por professor (ajuste em Configurações).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label>Período</Label>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as HrPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['MANHA', 'TARDE', 'NOITE'] as HrPeriod[]).map((p) => (
                    <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="turmas">Nº de turmas</Label>
              <Input id="turmas" type="number" min={1} max={50} value={qtdTurmas} onChange={(e) => setQtdTurmas(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isReady && turmasInsuficientes && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm">
            ⚠️ Existem apenas <strong>{turmasDisponiveis.length}</strong> turma(s) cadastrada(s) para este curso/escola em <strong>{anoLetivo}</strong>.
            Para salvar como plano, cadastre as turmas em <strong>Escolas → Turmas</strong> ou reduza a quantidade.
          </CardContent>
        </Card>
      )}

      {isReady && (
        <Card>
          <CardHeader>
            <CardTitle>Carga horária por UCP</CardTitle>
            <CardDescription>Total semanal considerando {qtdTurmas} {qtdTurmas === 1 ? 'turma' : 'turmas'}.</CardDescription>
          </CardHeader>
          <CardContent>
            {ucpSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Este curso não tem disciplinas classificadas como UCP I, UCP II, UCP III ou Pedagógica. Verifique os nomes ou ajuste em <strong>Configurações → Classificação UCP</strong>.
              </p>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UCP</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead className="text-center">Aulas/turma</TableHead>
                        <TableHead className="text-center">× Turmas</TableHead>
                        <TableHead className="text-center">Total semanal</TableHead>
                        <TableHead className="text-center">Vagas mínimas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demanda.linhas.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${UCP_COLORS[l.ucp]}`}>{UCP_LABELS[l.ucp]}</Badge>
                          </TableCell>
                          <TableCell className="font-medium whitespace-normal break-words">{l.nome}</TableCell>
                          <TableCell className="text-center">{l.chPorTurma}</TableCell>
                          <TableCell className="text-center">{qtdTurmas}</TableCell>
                          <TableCell className="text-center font-bold">{l.chTotal}h</TableCell>
                          <TableCell className="text-center">{l.vagas}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Total semanal</div>
                    <div className="text-3xl font-extrabold mt-1">{demanda.totalAulas}h</div>
                  </div>
                  <div className="border rounded-lg p-4 bg-primary/10">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Mínimo de professores</div>
                    <div className="text-3xl font-extrabold mt-1 flex items-center gap-2">
                      <Users className="h-7 w-7 text-primary" />
                      {demanda.minProfs}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {isReady && sugestao.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestão de alocação otimizada
            </CardTitle>
            <CardDescription>
              Concentra UCPs no mesmo professor priorizando maior carga, respeitando o teto de {teto}h/semana.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sugestao.map((p) => (
                <div key={p.label} className="border rounded-xl p-4 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold">{p.label}</div>
                    <Badge variant="secondary">{p.carga}h / {teto}h</Badge>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {p.itens.map((i, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${UCP_COLORS[i.ucp]}`}>{UCP_LABELS[i.ucp]}</Badge>
                        <span className="flex-1">{i.nome}</span>
                        <span className="text-muted-foreground shrink-0">{i.ch}h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Esta é uma sugestão de referência. Na próxima fase você poderá criar um plano persistido, atribuir nomes reais de professores e publicar direto na grade horária oficial.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
