import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { professoresApi } from '@/features/professores/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useBranding } from '@/hooks/useBranding';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText, School as SchoolIcon, Users, Clock, Sun, Sunset, Moon, FileDown } from 'lucide-react';
import { generateProfessoresReportPdf, type ReportTemplate } from './relatorioProfessoresPdf';
import { generateProfessoresReportXlsx } from './relatorioProfessoresXlsx';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Turno = 'matutino' | 'vespertino' | 'noturno';

interface SchoolBreakdown {
  school_id: string;
  school_name: string;
  hours: { matutino: number; vespertino: number; noturno: number };
  totalHours: number; // soma dos turnos OU fallback contractual quando não há grade
  hasSchedule: boolean;
}

interface ProfessorReportRow {
  professor_id: string;
  professor_name: string;
  registration_code: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | string;
  contractual_hours: number | null;
  schools: SchoolBreakdown[];
  totalsByTurno: { matutino: number; vespertino: number; noturno: number };
  totalHours: number;
}

const statusLabel = (s: string) =>
  s === 'ACTIVE' ? 'Ativo' : s === 'INACTIVE' ? 'Inativo' : s === 'ON_LEAVE' ? 'Afastado' : s || '—';

// Carga horária por turno agora vem diretamente do vínculo (professor_school_courses).
// Mantemos apenas helpers de formatação abaixo.


const fmtH = (h: number | null) =>
  h == null || h === 0 ? '—' : `${Number(h).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}h`;

export function RelatorioProfessoresDialog({ open, onOpenChange }: Props) {
  const { organizationId } = useOrganization();
  const { branding } = useBranding();
  const [filterSchoolId, setFilterSchoolId] = useState('all');
  const [filterProfessorId, setFilterProfessorId] = useState('all');
  const [filterTurno, setFilterTurno] = useState<'all' | Turno>('all');
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'all'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>('completo');
  const [generating, setGenerating] = useState(false);

  const { data: schools } = useQuery({
    queryKey: ['rel-prof-schools', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('status', 'ativo')
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId && open,
  });

  const { data: professors_report, isLoading } = useQuery({
    queryKey: ['rel-prof-data-v6-status', organizationId, filterStatus],
    queryFn: async (): Promise<ProfessorReportRow[]> => {
      // Relatório respeita o filtro de status (default ACTIVE)
      let q = supabase
        .from('professors')
        .select('id, full_name, registration_code, status')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('full_name');
      if (filterStatus !== 'all') {
        q = q.eq('status', filterStatus);
      }
      const { data: professors } = await q;

      const profIds = (professors || []).map(p => p.id);
      if (!profIds.length) return [];

      // Vínculos professor x escola — trazendo a CH por turno informada no vínculo.
      // IMPORTANTE: só consideramos CH quando o vínculo foi efetivamente confirmado
      // pelo coordenador (workload_filled_at != null). Vínculos legacy/sem CH cadastrada
      // não devem aparecer com valores no relatório — devem mostrar "—".
      const { data: bindings } = await supabase
        .from('professor_school_courses')
        .select(
          'professor_id, school_id, workload_morning_hours, workload_afternoon_hours, workload_night_hours, workload_filled_at, schools(nome)'
        )
        .in('professor_id', profIds)
        .eq('status', 'ACTIVE');


      // Agregação a partir do vínculo: profId -> schoolId -> { nome, turnos }
      // Como pode haver múltiplas linhas (vários cursos na mesma escola) com a mesma CH por turno,
      // usamos o MAX por turno para não duplicar a carga horária do professor naquela escola.
      const agg = new Map<
        string,
        Map<string, { nome: string; matutino: number; vespertino: number; noturno: number }>
      >();
      (bindings || []).forEach((b: any) => {
        if (!b.school_id) return;
        if (!agg.has(b.professor_id)) agg.set(b.professor_id, new Map());
        const schoolMap = agg.get(b.professor_id)!;
        const prev =
          schoolMap.get(b.school_id) ||
          { nome: b.schools?.nome || '—', matutino: 0, vespertino: 0, noturno: 0 };
        prev.nome = b.schools?.nome || prev.nome;
        // Só soma CH quando o coordenador efetivamente preencheu (workload_filled_at != null).
        // Vínculos legacy ficam zerados → exibem "—" no relatório.
        const confirmed = b.workload_filled_at != null;
        if (confirmed) {
          prev.matutino = Math.max(prev.matutino, Number(b.workload_morning_hours) || 0);
          prev.vespertino = Math.max(prev.vespertino, Number(b.workload_afternoon_hours) || 0);
          prev.noturno = Math.max(prev.noturno, Number(b.workload_night_hours) || 0);
        }
        schoolMap.set(b.school_id, prev);
      });

      // Construir resultado
      const result: ProfessorReportRow[] = (professors || []).map((p: any) => {
        const schoolAgg = agg.get(p.id) || new Map();

        const schoolsArr: SchoolBreakdown[] = Array.from(schoolAgg.entries()).map(
          ([sid, info]: [string, any]) => {
            const hours = {
              matutino: info.matutino || 0,
              vespertino: info.vespertino || 0,
              noturno: info.noturno || 0,
            };
            const total = hours.matutino + hours.vespertino + hours.noturno;
            return {
              school_id: sid,
              school_name: info.nome,
              hours,
              totalHours: total,
              hasSchedule: total > 0,
            };
          }
        );

        // Totais por professor
        const totalsByTurno = { matutino: 0, vespertino: 0, noturno: 0 };
        let totalAll = 0;
        schoolsArr.forEach((s) => {
          totalsByTurno.matutino += s.hours.matutino;
          totalsByTurno.vespertino += s.hours.vespertino;
          totalsByTurno.noturno += s.hours.noturno;
          totalAll += s.totalHours;
        });

        // Total final: soma das CHs por turno informadas nos vínculos
        const totalHours = totalAll;

        return {
          professor_id: p.id,
          professor_name: p.full_name,
          registration_code: p.registration_code,
          status: p.status || 'ACTIVE',
          contractual_hours: null,
          schools: schoolsArr,
          totalsByTurno,
          totalHours,
        };
      });

      return result;
    },
    enabled: !!organizationId && open,
    staleTime: 30_000,
  });

  // Recalcula linhas APLICANDO os filtros de escola e turno:
  // - Filtro de escola: mantém apenas a escola selecionada nas linhas do professor
  // - Filtro de turno: zera horas dos turnos não selecionados
  // Assim, KPIs e tabela refletem somente os dados filtrados, mesmo quando o
  // professor leciona em mais de uma escola.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const turnos: Turno[] = ['matutino', 'vespertino', 'noturno'];

    return (professors_report || [])
      .filter((p) => {
        if (filterProfessorId !== 'all' && p.professor_id !== filterProfessorId) return false;
        if (filterSchoolId !== 'all' && !p.schools.some((s) => s.school_id === filterSchoolId)) return false;
        if (filterTurno !== 'all' && p.totalsByTurno[filterTurno] <= 0) return false;
        if (q && !p.professor_name.toLowerCase().includes(q) && !(p.registration_code || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .map<ProfessorReportRow>((p) => {
        // 1) Restringe escolas pela escola selecionada
        const baseSchools = filterSchoolId === 'all'
          ? p.schools
          : p.schools.filter((s) => s.school_id === filterSchoolId);

        // 2) Restringe horas pelo turno selecionado
        const adjustedSchools: SchoolBreakdown[] = baseSchools.map((s) => {
          const hours = {
            matutino: filterTurno === 'all' || filterTurno === 'matutino' ? s.hours.matutino : 0,
            vespertino: filterTurno === 'all' || filterTurno === 'vespertino' ? s.hours.vespertino : 0,
            noturno: filterTurno === 'all' || filterTurno === 'noturno' ? s.hours.noturno : 0,
          };
          const total = hours.matutino + hours.vespertino + hours.noturno;
          return { ...s, hours, totalHours: total, hasSchedule: total > 0 };
        });

        // 3) Recalcula totais do professor já filtrados
        const totalsByTurno = { matutino: 0, vespertino: 0, noturno: 0 };
        let totalHours = 0;
        adjustedSchools.forEach((s) => {
          turnos.forEach((t) => { totalsByTurno[t] += s.hours[t]; });
          totalHours += s.totalHours;
        });

        return {
          ...p,
          schools: adjustedSchools,
          totalsByTurno,
          totalHours,
        };
      });
  }, [professors_report, search, filterSchoolId, filterProfessorId, filterTurno]);

  // KPIs agora consomem `filtered` (já com escolas/turnos limitados pelos filtros)
  const totals = useMemo(() => {
    const totalsByTurno = { matutino: 0, vespertino: 0, noturno: 0 };
    let totalHours = 0;
    const schoolSet = new Set<string>();
    filtered.forEach((p) => {
      totalsByTurno.matutino += p.totalsByTurno.matutino;
      totalsByTurno.vespertino += p.totalsByTurno.vespertino;
      totalsByTurno.noturno += p.totalsByTurno.noturno;
      totalHours += p.totalHours;
      p.schools.forEach((s) => schoolSet.add(s.school_id));
    });
    return {
      professores: filtered.length,
      escolas: schoolSet.size,
      totalsByTurno,
      totalHours,
    };
  }, [filtered]);

  const exportCsv = () => {
    const header = [
      'Professor',
      'Matrícula',
      'Escola',
      'CH Matutino (h)',
      'CH Vespertino (h)',
      'CH Noturno (h)',
      'CH Total Escola (h)',
    ];
    const lines: string[][] = [];
    filtered.forEach((p) => {
      if (p.schools.length === 0) {
        lines.push([
          p.professor_name,
          p.registration_code || '',
          'Sem escola vinculada',
          '0',
          '0',
          '0',
          String(p.contractual_hours ?? 0).replace('.', ','),
        ]);
        return;
      }
      p.schools.forEach((s, idx) => {
        lines.push([
          idx === 0 ? p.professor_name : '',
          idx === 0 ? p.registration_code || '' : '',
          s.school_name,
          String(s.hours.matutino).replace('.', ','),
          String(s.hours.vespertino).replace('.', ','),
          String(s.hours.noturno).replace('.', ','),
          String(s.totalHours).replace('.', ','),
        ]);
      });
      lines.push([
        '',
        '',
        `→ Total ${p.professor_name}`,
        String(p.totalsByTurno.matutino).replace('.', ','),
        String(p.totalsByTurno.vespertino).replace('.', ','),
        String(p.totalsByTurno.noturno).replace('.', ','),
        String(p.totalHours).replace('.', ','),
      ]);
    });
    lines.push([]);
    lines.push(['', '', 'TOTAL GERAL',
      String(totals.totalsByTurno.matutino).replace('.', ','),
      String(totals.totalsByTurno.vespertino).replace('.', ','),
      String(totals.totalsByTurno.noturno).replace('.', ','),
      String(totals.totalHours).replace('.', ','),
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-professores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (filtered.length === 0) return;
    setGenerating(true);
    try {
      await generateProfessoresReportPdf({
        template: reportTemplate,
        rows: filtered,
        totals,
        logoUrl: branding.logo_url,
        iconUrl: branding.icon_url,
        organizationName: branding.display_name,
      });
      toast.success('Relatório PDF gerado com sucesso.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível gerar o PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const profOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos os professores' },
      ...((professors_report || []).map((p) => ({ value: p.professor_id, label: p.professor_name }))),
    ],
    [professors_report],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório de Professores
          </DialogTitle>
          <DialogDescription>
            Professor • Escolas vinculadas • Carga horária por turno (matutino/vespertino/noturno) • Total semanal.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <Card>
          <CardContent className="p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Buscar</Label>
              <Input
                placeholder="Nome ou matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <SearchableSelect
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as any)}
                placeholder="Status"
                options={[
                  { value: 'ACTIVE', label: 'Ativos' },
                  { value: 'INACTIVE', label: 'Inativos' },
                  { value: 'ON_LEAVE', label: 'Afastados' },
                  { value: 'all', label: 'Todos os status' },
                ]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Escola</Label>
              <SearchableSelect
                value={filterSchoolId}
                onValueChange={setFilterSchoolId}
                placeholder="Todas as escolas"
                options={[
                  { value: 'all', label: 'Todas as escolas' },
                  ...((schools || []).map((s) => ({ value: s.id, label: s.nome }))),
                ]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Professor</Label>
              <SearchableSelect
                value={filterProfessorId}
                onValueChange={setFilterProfessorId}
                placeholder="Todos os professores"
                options={profOptions}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Turno</Label>
              <SearchableSelect
                value={filterTurno}
                onValueChange={(v) => setFilterTurno(v as any)}
                placeholder="Todos os turnos"
                options={[
                  { value: 'all', label: 'Todos os turnos' },
                  { value: 'matutino', label: 'Matutino' },
                  { value: 'vespertino', label: 'Vespertino' },
                  { value: 'noturno', label: 'Noturno' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totais */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Users className="h-3 w-3" /> Professores</div>
              <div className="text-xl font-bold">{totals.professores}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><SchoolIcon className="h-3 w-3" /> Escolas</div>
              <div className="text-xl font-bold">{totals.escolas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Sun className="h-3 w-3" /> Matutino</div>
              <div className="text-xl font-bold">{fmtH(totals.totalsByTurno.matutino)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Sunset className="h-3 w-3" /> Vespertino</div>
              <div className="text-xl font-bold">{fmtH(totals.totalsByTurno.vespertino)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Moon className="h-3 w-3" /> Noturno</div>
              <div className="text-xl font-bold">{fmtH(totals.totalsByTurno.noturno)}</div>
            </CardContent>
          </Card>
          <Card className="border-primary/40">
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Clock className="h-3 w-3" /> Total CH</div>
              <div className="text-xl font-bold text-primary">{fmtH(totals.totalHours)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela detalhada */}
        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Nenhum registro encontrado para os filtros selecionados.</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[220px]">Professor</TableHead>
                  <TableHead className="min-w-[220px]">Escola</TableHead>
                  <TableHead className="text-right w-[110px]"><span className="inline-flex items-center gap-1"><Sun className="h-3 w-3" />Matutino</span></TableHead>
                  <TableHead className="text-right w-[120px]"><span className="inline-flex items-center gap-1"><Sunset className="h-3 w-3" />Vespertino</span></TableHead>
                  <TableHead className="text-right w-[110px]"><span className="inline-flex items-center gap-1"><Moon className="h-3 w-3" />Noturno</span></TableHead>
                  <TableHead className="text-right w-[120px]">Total CH</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const schoolsToShow = p.schools;
                  const rowSpan = Math.max(1, schoolsToShow.length);
                  return (
                    <Fragment key={p.professor_id}>
                      {schoolsToShow.length === 0 ? (
                        <TableRow key={p.professor_id} className="border-b-2 border-primary/20">
                          <TableCell rowSpan={1} className="align-top">
                            <div className="font-semibold">{p.professor_name}</div>
                            <div className="text-[11px] text-muted-foreground">{p.registration_code || 'Sem matrícula'}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground italic text-sm">Sem escola vinculada</TableCell>
                          <TableCell className="text-right tabular-nums">—</TableCell>
                          <TableCell className="text-right tabular-nums">—</TableCell>
                          <TableCell className="text-right tabular-nums">—</TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-primary">{fmtH(p.totalHours)}</TableCell>
                        </TableRow>
                      ) : (
                        schoolsToShow.map((s, idx) => (
                          <TableRow key={`${p.professor_id}-${s.school_id}`} className={idx === schoolsToShow.length - 1 ? 'border-b-2 border-primary/20' : ''}>
                            {idx === 0 && (
                              <TableCell rowSpan={rowSpan} className="align-top bg-muted/20">
                                <div className="font-semibold">{p.professor_name}</div>
                                <div className="text-[11px] text-muted-foreground">{p.registration_code || 'Sem matrícula'}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-[10px]">{p.schools.length} escola{p.schools.length > 1 ? 's' : ''}</Badge>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <SchoolIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{s.school_name}</span>
                                {!s.hasSchedule && (
                                  <Badge variant="outline" className="text-[9px] ml-1">sem grade</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmtH(s.hours.matutino)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtH(s.hours.vespertino)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtH(s.hours.noturno)}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{fmtH(s.totalHours)}</TableCell>
                          </TableRow>
                        ))
                      )}
                      {/* Linha de subtotal por professor (quando há mais de 1 escola) */}
                      {schoolsToShow.length > 1 && (
                        <TableRow key={`${p.professor_id}-sub`} className="bg-primary/5 border-b-2 border-primary/20">
                          <TableCell colSpan={2} className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Total {p.professor_name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{fmtH(p.totalsByTurno.matutino)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{fmtH(p.totalsByTurno.vespertino)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{fmtH(p.totalsByTurno.noturno)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-primary">{fmtH(p.totalHours)}</TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-between items-end pt-2 border-t gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground max-w-xl">
            CH por turno informada no vínculo professor × escola. Vínculos sem CH cadastrada aparecem como "—".
            O PDF é gerado nas cores Neovale e inclui a logo da organização.
          </p>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1 min-w-[240px]">
              <Label className="text-xs">Modelo do PDF</Label>
              <SearchableSelect
                value={reportTemplate}
                onValueChange={(v) => setReportTemplate(v as ReportTemplate)}
                placeholder="Selecione um modelo"
                options={[
                  { value: 'completo', label: '📄 Completo (detalhado por escola)' },
                  { value: 'consolidado', label: '📋 Consolidado (1 linha por professor)' },
                  { value: 'por-escola', label: '🏫 Agrupado por escola' },
                  { value: 'por-professor', label: '👤 Agrupado por professor' },
                  { value: 'sintetico-kpi', label: '📊 Painel executivo (KPIs + Top 10)' },
                ]}
              />
            </div>
            <Button
              onClick={handleDownloadPdf}
              disabled={filtered.length === 0 || generating}
              className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold"
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Baixar PDF
            </Button>
            <Button
              onClick={() => {
                try {
                  generateProfessoresReportXlsx({
                    template: reportTemplate,
                    rows: filtered,
                    totals,
                    organizationName: branding.display_name,
                  });
                  toast.success('Planilha XLSX gerada.');
                } catch (e) {
                  console.error(e);
                  toast.error('Não foi possível gerar a planilha.');
                }
              }}
              disabled={filtered.length === 0}
              variant="outline"
              className="font-semibold"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Baixar XLSX
            </Button>
            <Button onClick={exportCsv} disabled={filtered.length === 0} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
