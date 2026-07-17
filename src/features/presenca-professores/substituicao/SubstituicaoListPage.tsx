import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Replace, Plus, Search, Eye, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
import { substitutionApi } from './api';
import {
  TSRFilters, TSRStatus, TSR_STATUS_LABEL, TSR_STATUS_COLOR,
  useTSRKpis, useTSRList, useTSRDashboardKpis,
} from './hooks/useTeacherSubstitution';
import { useHasFinancialAccess } from './components/FinancialAccessGuard';


const BRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function SubstituicaoListPage() {
  const { organizationId } = useOrganization();
  const hasFinancialAccess = useHasFinancialAccess();
  const now = new Date();
  const [phase, setPhase] = useState<'all' | 1 | 2 | 'completed' | 'cancelled'>('all');
  const [filters, setFilters] = useState<TSRFilters>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [search, setSearch] = useState('');

  const merged = { ...filters, search, phase };
  const { data: rows = [], isLoading } = useTSRList(merged);
  const kpis = useTSRKpis(merged);
  const { data: serverKpis } = useTSRDashboardKpis({
    month: typeof filters.month === 'number' ? filters.month : undefined,
    year: typeof filters.year === 'number' ? filters.year : undefined,
    school_id: filters.schoolId && filters.schoolId !== 'all' ? filters.schoolId : undefined,
  });



  const { data: schools = [] } = useQuery({
    enabled: !!organizationId,
    queryKey: ['schools_min_tsr', organizationId],
    queryFn: async () => {
      const data = await substitutionApi.getSchools();
      return data || [];;
    },
  });

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const statusOptions: { value: TSRStatus | 'all'; label: string }[] = useMemo(() => ([
    { value: 'all', label: 'Todos os status' },
    ...(Object.entries(TSR_STATUS_LABEL) as [TSRStatus, string][])
      .map(([v, label]) => ({ value: v, label })),
  ]), []);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição' },
        ]}
        title="Substituição"
        description="Demanda, indicação, execução, documentos e pagamento de substituições docentes."
        icon={Replace}
        actions={
          <div className="flex items-center gap-2">
            {hasFinancialAccess && (
              <Button variant="outline" asChild>
                <Link to="/presenca-professores/substituicao/financeiro">
                  <DollarSign className="h-4 w-4 mr-2" /> Financeiro
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link to="/presenca-professores/substituicao/nova">
                <Plus className="h-4 w-4 mr-2" /> Nova solicitação
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPIs operacionais (sem valores financeiros — ver módulo Financeiro restrito) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Solicitações abertas" value={kpis.open} />
        <Kpi label="Aguardando indicação" value={kpis.awaitingIndication} />
        <Kpi label="Substituto confirmado" value={kpis.confirmed} />
        <Kpi label="Relatório pendente" value={kpis.reportPending} />
        <Kpi label="Aguardando pagamento" value={kpis.awaitingPayment} />
        <Kpi label="Pagas no mês" value={kpis.paidThisMonth} />
      </div>

      {serverKpis && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>Tempo médio até confirmação: <strong>{serverKpis.avg_hours_to_confirmation != null ? `${serverKpis.avg_hours_to_confirmation}h` : '—'}</strong></span>
          <span>Aprovadas p/ pagamento: <strong>{serverKpis.approved_for_payment}</strong></span>
          <span>Canceladas: <strong>{serverKpis.cancelled}</strong></span>
        </div>
      )}

      {/* Pipeline tabs */}
      <Tabs value={String(phase)} onValueChange={(v) => setPhase(v === 'all' ? 'all' : v === '1' || v === '2' ? (Number(v) as 1 | 2) : (v as any))}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="1">Fase 1 — Demanda</TabsTrigger>
          <TabsTrigger value="2">Fase 2 — Execução</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, professor, substituto ou escola" className="pl-8" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mês</label>
            <Select value={String(filters.month ?? 'all')}
              onValueChange={(v) => setFilters(f => ({ ...f, month: v === 'all' ? 'all' : Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ano</label>
            <Select value={String(filters.year ?? 'all')}
              onValueChange={(v) => setFilters(f => ({ ...f, year: v === 'all' ? 'all' : Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Escola</label>
            <Select value={filters.schoolId ?? 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, schoolId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={filters.status ?? 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, status: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pagamento</label>
            <Select value={filters.paymentStatus ?? 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, paymentStatus: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_calculation">Pendente cálculo</SelectItem>
                <SelectItem value="calculated">Calculado</SelectItem>
                <SelectItem value="pending_documentation">Aguardando documentação</SelectItem>
                <SelectItem value="approved_for_payment">Aprovado p/ pagamento</SelectItem>
                <SelectItem value="payment_scheduled">Agendado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="returned_for_correction">Devolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Professor substituído</TableHead>
                <TableHead>Substituto</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Curso / Turma</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead className="text-right">H/A</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma substituição encontrada.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.substitution_code}</TableCell>
                  <TableCell>
                    {(() => {
                      const dates: string[] = Array.isArray((r as any).absence_dates) && (r as any).absence_dates.length
                        ? (r as any).absence_dates
                        : (r.absence_date ? [r.absence_date] : []);
                      if (dates.length === 0) return '—';
                      const first = new Date(dates[0] + 'T00:00').toLocaleDateString('pt-BR');
                      return (
                        <div className="flex items-center gap-1.5">
                          <span>{first}</span>
                          {dates.length > 1 && (
                            <Badge variant="outline" className="text-[10px]" title={dates.join(', ')}>
                              +{dates.length - 1}
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="font-medium">{r.substituted_professor_name}</TableCell>
                  <TableCell>{r.substitute_professor_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{r.school_name_snapshot || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {[r.course_name_snapshot, r.class_group_name_snapshot].filter(Boolean).join(' • ') || '—'}
                  </TableCell>
                  <TableCell className="text-sm">{r.subject_name_snapshot || '—'}</TableCell>
                  <TableCell className="text-right">{Number(r.total_class_hours).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={TSR_STATUS_COLOR[r.status]} variant="secondary">
                      {TSR_STATUS_LABEL[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="icon" variant="ghost">
                      <Link to={`/presenca-professores/substituicao/${r.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
        <div className="text-lg font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
