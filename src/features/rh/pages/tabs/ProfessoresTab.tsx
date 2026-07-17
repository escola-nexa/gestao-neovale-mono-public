import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingDown, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { hrApi } from '../../api';
import { formatDuration } from '../../lib/defaultSchoolHours';

export function ProfessoresTab() {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const settingsQuery = useQuery({ queryKey: ['hr', 'settings'], queryFn: () => hrApi.getSettings() });
  const workloadQuery = useQuery({ queryKey: ['hr', 'workload'], queryFn: () => hrApi.listWorkload() });

  const teto = settingsQuery.data?.teto_ch_semanal ?? 24;
  const rows = workloadQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? rows.filter((r) => r.nome_completo.toLowerCase().includes(term)) : rows;
    return [...list].sort((a, b) => b.horas_semana - a.horas_semana);
  }, [rows, q]);

  const summary = useMemo(() => {
    const total = rows.length;
    const sobrecarga = rows.filter((r) => r.horas_semana > teto).length;
    const ociosos = rows.filter((r) => r.horas_semana === 0).length;
    const subutilizados = rows.filter((r) => r.horas_semana > 0 && r.horas_semana < teto * 0.5).length;
    const mediaUtil = total > 0
      ? Math.round((rows.reduce((s, r) => s + Math.min(r.horas_semana, teto), 0) / (total * teto)) * 100)
      : 0;
    return { total, sobrecarga, ociosos, subutilizados, mediaUtil };
  }, [rows, teto]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Professores ativos" value={summary.total} />
        <KpiCard label="Utilização média" value={`${summary.mediaUtil}%`} />
        <KpiCard label="Sobrecarga (> teto)" value={summary.sobrecarga} variant={summary.sobrecarga ? 'danger' : 'neutral'} />
        <KpiCard label="Ociosos / Subutilizados" value={`${summary.ociosos} / ${summary.subutilizados}`} variant="warn" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Carga horária por professor</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Teto configurado: {teto} aulas/semana (hora-aula).</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar professor…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {workloadQuery.isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhum professor encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead className="text-center">Aulas/sem</TableHead>
                    <TableHead className="text-center">Duração real</TableHead>
                    <TableHead className="w-64">Utilização</TableHead>
                    <TableHead>Escolas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const pct = teto > 0 ? Math.round((r.horas_semana / teto) * 100) : 0;
                    const status = r.horas_semana === 0
                      ? { label: 'Ocioso', variant: 'outline' as const, icon: TrendingDown }
                      : r.horas_semana > teto
                      ? { label: 'Sobrecarga', variant: 'destructive' as const, icon: AlertTriangle }
                      : r.horas_semana < teto * 0.5
                      ? { label: 'Subutilizado', variant: 'secondary' as const, icon: TrendingDown }
                      : { label: 'Saudável', variant: 'default' as const, icon: null };
                    const isOpen = expanded.has(r.professor_id);
                    const detail = (r as any).schoolsDetail as Array<{ school_name: string; aulas: number; minutos: number }> | undefined;
                    const hasDetail = (detail?.length ?? 0) > 0;
                    return (
                      <Fragment key={r.professor_id}>
                        <TableRow className={hasDetail ? 'cursor-pointer' : ''} onClick={() => hasDetail && toggle(r.professor_id)}>
                          <TableCell className="p-1 text-center">
                            {hasDetail ? (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggle(r.professor_id); }}>
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium whitespace-normal break-words max-w-[260px]">{r.nome_completo}</TableCell>
                          <TableCell className="text-center">{r.aulas_count}</TableCell>
                          <TableCell className="text-center font-mono whitespace-nowrap">
                            {formatDuration((r as any).minutos_semana ?? 0)}
                            <span className="ml-1.5 text-[10px] text-muted-foreground">({r.aulas_count} aula{r.aulas_count === 1 ? '' : 's'})</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.schools.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {r.schools.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                                {r.schools.length > 3 && <Badge variant="outline" className="text-[10px]">+{r.schools.length - 3}</Badge>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant} className="gap-1">
                              {status.icon && <status.icon className="h-3 w-3" />}
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isOpen && hasDetail && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell colSpan={6} className="py-2">
                              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Detalhamento por escola</div>
                              <div className="rounded-md border bg-background overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="text-left px-3 py-1.5 font-medium">Escola</th>
                                      <th className="text-center px-3 py-1.5 font-medium w-32">Aulas/sem</th>
                                      <th className="text-center px-3 py-1.5 font-medium w-40">Duração real</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail!.map((s, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="px-3 py-1.5">{s.school_name}</td>
                                        <td className="px-3 py-1.5 text-center">{s.aulas}</td>
                                        <td className="px-3 py-1.5 text-center font-mono">{formatDuration(s.minutos)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label, value, variant = 'neutral',
}: { label: string; value: string | number; variant?: 'neutral' | 'danger' | 'warn' }) {
  const tone =
    variant === 'danger' ? 'text-destructive' :
    variant === 'warn' ? 'text-amber-600 dark:text-amber-400' :
    'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
