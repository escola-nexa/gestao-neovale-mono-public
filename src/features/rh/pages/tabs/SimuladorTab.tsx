import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Sparkles, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { hrApi } from '../../api';
import { classifyUCP, UCP_LABELS, UCP_COLORS, type UcpType } from '../../lib/classifyUCP';
import type { HrPeriod } from '../../types';
import { PERIOD_LABEL } from '../../types';

interface Props {
  schoolId: string;
  courseId: string;
}

interface SubjectRow { id: string; nome: string; carga_horaria_semanal: number; }

export function SimuladorTab({ schoolId, courseId }: Props) {
  const [periodo, setPeriodo] = useState<HrPeriod>('MANHA');
  const [qtdTurmas, setQtdTurmas] = useState<number>(3);

  const isReady = !!schoolId && !!courseId && qtdTurmas > 0;

  const settingsQuery = useQuery({ queryKey: ['hr', 'settings'], queryFn: () => hrApi.getSettings() });
  const teto = settingsQuery.data?.teto_ch_semanal ?? 20;

  const subjectsQuery = useQuery({
    queryKey: ['hr', 'course-subjects', courseId],
    enabled: !!courseId,
    queryFn: () => hrApi.listSubjects(courseId),
  });

  const overridesQuery = useQuery({ queryKey: ['hr', 'overrides'], queryFn: () => hrApi.listOverrides() });
  const overridesMap = useMemo(() => {
    const m = new Map<string, UcpType>();
    for (const o of overridesQuery.data ?? []) m.set(o.subject_id, o.ucp_type);
    return m;
  }, [overridesQuery.data]);

  const ucpSubjects = useMemo(() => {
    const subs = subjectsQuery.data ?? [];
    return subs
      .map((s) => ({ ...s, ucp: overridesMap.get(s.id) ?? classifyUCP(s.nome) }))
      .filter((s) => s.ucp !== 'OUTRA') as (SubjectRow & { ucp: UcpType })[];
  }, [subjectsQuery.data, overridesMap]);

  const demanda = useMemo(() => {
    const linhas = ucpSubjects.map((s) => {
      const chTotal = qtdTurmas * s.carga_horaria_semanal;
      return { ...s, chPorTurma: s.carga_horaria_semanal, chTotal, vagas: Math.ceil(chTotal / Math.max(1, teto)) };
    });
    const totalAulas = linhas.reduce((acc, l) => acc + l.chTotal, 0);
    const minProfs = Math.ceil(totalAulas / Math.max(1, teto));
    return { linhas, totalAulas, minProfs };
  }, [ucpSubjects, qtdTurmas, teto]);

  const sugestao = useMemo(() => {
    if (demanda.linhas.length === 0) return [];
    const byUcp = new Map<UcpType, { nome: string; chTotal: number }[]>();
    for (const l of demanda.linhas) {
      const arr = byUcp.get(l.ucp) ?? [];
      arr.push({ nome: l.nome, chTotal: l.chTotal });
      byUcp.set(l.ucp, arr);
    }
    const grupos = Array.from(byUcp.entries())
      .map(([ucp, items]) => ({ ucp, items, chTotal: items.reduce((a, b) => a + b.chTotal, 0) }))
      .sort((a, b) => b.chTotal - a.chTotal);

    const profs: { label: string; carga: number; itens: { ucp: UcpType; nome: string; ch: number }[] }[] = [];
    for (const g of grupos) {
      let target = profs.find((p) => p.carga + g.chTotal <= teto);
      if (!target) {
        target = { label: `Professor ${profs.length + 1}`, carga: 0, itens: [] };
        profs.push(target);
      }
      for (const i of g.items) {
        if (target.carga + i.chTotal <= teto) {
          target.itens.push({ ucp: g.ucp, nome: i.nome, ch: i.chTotal });
          target.carga += i.chTotal;
        } else {
          const novo = { label: `Professor ${profs.length + 1}`, carga: i.chTotal, itens: [{ ucp: g.ucp, nome: i.nome, ch: i.chTotal }] };
          profs.push(novo);
          target = novo;
        }
      }
    }
    return profs;
  }, [demanda, teto]);

  if (!isReady) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Selecione escola e curso acima para simular o headcount necessário.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" /> Parâmetros de simulação
          </CardTitle>
          <CardDescription>
            Calcula carga total e quantos professores são necessários. Não persiste nada — use a aba <strong>Cobertura</strong> para alocar de fato.
            Teto atual: <strong>{teto}h/semana</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Período (referência)</Label>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carga horária por UCP</CardTitle>
          <CardDescription>Total semanal considerando {qtdTurmas} {qtdTurmas === 1 ? 'turma' : 'turmas'}.</CardDescription>
        </CardHeader>
        <CardContent>
          {ucpSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Este curso não tem disciplinas classificadas como UCP I, UCP II, UCP III ou Pedagógica. Ajuste em <strong>Configurações → Classificação UCP</strong>.
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

      {sugestao.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugestão de distribuição
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
