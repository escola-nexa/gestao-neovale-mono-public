import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, Eye, School, AlertTriangle,
  Clock, CheckCircle2, Inbox, XCircle, Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import {
  TSR_STATUS_LABEL, TSR_STATUS_COLOR, useTSRList, TSRRequest,
} from './hooks/useTeacherSubstitution';
import { schoolsApi } from '@/services/supabaseApi';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

type CoordTab = 'returned' | 'execution' | 'report' | 'mine' | 'waiting_rh' | 'completed' | 'cancelled' | 'all';

export default function SubstituicaoCoordenacaoPage() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const now = new Date();
  const [tab, setTab] = useState<CoordTab>('returned');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<number | 'all'>(now.getMonth() + 1);
  const [year, setYear] = useState<number | 'all'>(now.getFullYear());
  const [schoolId, setSchoolId] = useState<string>('all');

  const { data: schools = [] } = useQuery({
    enabled: !!organizationId,
    queryKey: ['schools_min_coord', organizationId],
    queryFn: async () => {
      const data = await schoolsApi.getByOrganization(organizationId!);
      return data || [];
    },
  });

  const { data: allRows = [], isLoading } = useTSRList({ month, year, schoolId, search });

  const counts = useMemo(() => ({
    returned: allRows.filter(r => r.status === 'returned_to_coordinator').length,
    execution: allRows.filter(r => r.status === 'substitution_completed').length,
    report: allRows.filter(r => ['execution_completed','report_pending','report_generated','signed_report_pending'].includes(r.status)).length,
    mine: allRows.filter(r => (r as any).requested_by === user?.id).length,
    waitingRh: allRows.filter(r => ['request_created','rh_in_progress'].includes(r.status)).length,
    completed: allRows.filter(r => r.status === 'payment_completed').length,
    cancelled: allRows.filter(r => r.status === 'cancelled').length,
  }), [allRows, user?.id]);

  const rows = useMemo(() => filterByTab(allRows, tab, user?.id), [allRows, tab, user?.id]);
  const filtersActive = (month !== 'all') || (year !== 'all') || schoolId !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: 'Coordenação' },
        ]}
        title="Substituição — Coordenação"
        description="Solicite substituições, acompanhe o atendimento do R.H. e informe a escola."
        icon={ClipboardList}
        actions={
          <Button asChild>
            <Link to="/presenca-professores/substituicao/nova">
              <Plus className="h-4 w-4 mr-2" /> Nova solicitação
            </Link>
          </Button>
        }
      />

      {/* Painel de prioridade + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PriorityCard
          count={counts.returned}
          onGo={() => setTab('returned')}
        />
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          <Kpi icon={Inbox} label="Minhas solicitações" value={counts.mine} tone="neutral" />
          <Kpi icon={Clock} label="No R.H. (em curso)" value={counts.waitingRh} tone="info" />
          <Kpi icon={CheckCircle2} label="Finalizadas" value={counts.completed} tone="success" />
        </div>
      </div>

      {/* Toolbar: abas + busca + filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as CoordTab)} className="lg:flex-1 overflow-x-auto">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="returned" className="gap-2">
              Para informar escola
              {counts.returned > 0 && <Badge variant="secondary" className="bg-orange-100 text-orange-900">{counts.returned}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="execution" className="gap-2">Confirmar execução <CountBadge n={counts.execution} /></TabsTrigger>
            <TabsTrigger value="report" className="gap-2">Aguardando relatório <CountBadge n={counts.report} /></TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">Minhas <CountBadge n={counts.mine} /></TabsTrigger>
            <TabsTrigger value="waiting_rh" className="gap-2">No R.H. <CountBadge n={counts.waitingRh} /></TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">Finalizadas <CountBadge n={counts.completed} /></TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">Canceladas <CountBadge n={counts.cancelled} /></TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar código, professor, escola…" className="pl-8 h-9"
            />
          </div>
          <FiltersPopover
            month={month} setMonth={setMonth}
            year={year} setYear={setYear}
            schoolId={schoolId} setSchoolId={setSchoolId}
            schools={schools}
            active={filtersActive}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Código</TableHead>
                <TableHead>Data ausência</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Substituto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Próxima ação</TableHead>
                <TableHead className="w-32 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-12">
                  <EmptyState tab={tab} />
                </TableCell></TableRow>
              )}
              {rows.map((r) => {
                const urgent = r.status === 'returned_to_coordinator';
                return (
                  <TableRow key={r.id} className={urgent ? 'bg-orange-50/40 hover:bg-orange-50/70' : ''}>
                    <TableCell className="font-mono text-xs">{r.substitution_code}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(r.absence_date + 'T00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-medium">{r.substituted_professor_name}</TableCell>
                    <TableCell className="text-sm">{r.school_name_snapshot || '—'}</TableCell>
                    <TableCell className="text-sm">{r.substitute_professor_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge className={TSR_STATUS_COLOR[r.status]} variant="secondary">
                        {TSR_STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{nextActionCoord(r)}</TableCell>
                    <TableCell className="text-right">
                      {urgent ? (
                        <Button asChild size="sm">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=coord`}>
                            <School className="h-3.5 w-3.5 mr-1" /> Informar
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=coord`}>
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function filterByTab(rows: TSRRequest[], tab: CoordTab, uid?: string): TSRRequest[] {
  switch (tab) {
    case 'returned': return rows.filter(r => r.status === 'returned_to_coordinator');
    case 'execution': return rows.filter(r => r.status === 'substitution_completed');
    case 'report': return rows.filter(r => ['execution_completed','report_pending','report_generated','signed_report_pending'].includes(r.status));
    case 'mine': return rows.filter(r => (r as any).requested_by === uid);
    case 'waiting_rh': return rows.filter(r => ['request_created','rh_in_progress'].includes(r.status));
    case 'completed': return rows.filter(r => r.status === 'payment_completed');
    case 'cancelled': return rows.filter(r => r.status === 'cancelled');
    default: return rows;
  }
}

function nextActionCoord(r: TSRRequest): string {
  if (r.status === 'request_created') return 'Aguardando R.H. assumir';
  if (r.status === 'rh_in_progress') return 'R.H. atendendo';
  if (r.status === 'returned_to_coordinator') return 'Informar a escola';
  if (r.status === 'substitution_completed') return 'Confirmar execução';
  if (['execution_completed','report_pending','report_generated','signed_report_pending'].includes(r.status)) return 'Anexar relatório assinado';
  if (['signed_report_uploaded','pending_rh_validation'].includes(r.status)) return 'R.H. validando';
  if (['approved_for_payment','payment_pending'].includes(r.status)) return 'Aguardando pagamento';
  if (r.status === 'payment_completed') return 'Concluído';
  if (r.status === 'cancelled') return 'Cancelado';
  return '—';
}

function PriorityCard({ count, onGo }: { count: number; onGo: () => void }) {
  const has = count > 0;
  return (
    <Card className={has ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50' : 'border-dashed'}>
      <CardContent className="p-4 flex items-start gap-3 h-full">
        <div className={`rounded-lg p-2 ${has ? 'bg-orange-200/70 text-orange-900' : 'bg-muted text-muted-foreground'}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sua ação necessária</div>
          <div className="text-2xl font-semibold mt-1">{count}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {has ? 'solicitações devolvidas pelo R.H. para você informar a escola.' : 'Nada pendente no momento.'}
          </div>
          {has && (
            <Button size="sm" className="mt-3" onClick={onGo}>
              Ver pendentes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ icon: Icon, label, value, tone }: {
  icon: any; label: string; value: number | string; tone: 'neutral' | 'info' | 'success' | 'warn';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-muted text-foreground',
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-orange-100 text-orange-800',
  };
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`rounded-md p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground leading-tight truncate">{label}</div>
          <div className="text-lg font-semibold leading-tight mt-0.5">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{n}</span>;
}

function EmptyState({ tab }: { tab: CoordTab }) {
  const map: Record<CoordTab, { icon: any; title: string; hint: string }> = {
    returned: { icon: CheckCircle2, title: 'Nada para informar', hint: 'Todas as devoluções do R.H. já foram comunicadas.' },
    execution: { icon: CheckCircle2, title: 'Sem execuções pendentes', hint: 'Confirme execução após o dia da aula.' },
    report: { icon: CheckCircle2, title: 'Sem relatórios pendentes', hint: 'Após confirmar execução, anexe o relatório assinado em Documentos.' },
    mine: { icon: Inbox, title: 'Você ainda não criou solicitações', hint: 'Use "Nova solicitação" para começar.' },
    waiting_rh: { icon: Clock, title: 'Nenhuma em andamento no R.H.', hint: 'Solicitações em curso aparecerão aqui.' },
    completed: { icon: CheckCircle2, title: 'Sem finalizadas no período', hint: 'Ajuste mês/ano se necessário.' },
    cancelled: { icon: XCircle, title: 'Nenhuma cancelada', hint: '—' },
    all: { icon: Inbox, title: 'Nenhuma substituição encontrada', hint: 'Tente limpar os filtros.' },
  };
  const { icon: Icon, title, hint } = map[tab];
  return (
    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" />
      <div className="font-medium text-foreground">{title}</div>
      <div className="text-xs">{hint}</div>
    </div>
  );
}

function FiltersPopover(props: {
  month: number | 'all'; setMonth: (v: number | 'all') => void;
  year: number | 'all'; setYear: (v: number | 'all') => void;
  schoolId: string; setSchoolId: (v: string) => void;
  schools: any[]; active: boolean;
}) {
  const now = new Date();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {props.active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Mês</label>
          <Select value={String(props.month)} onValueChange={(v) => props.setMonth(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Ano</label>
          <Select value={String(props.year)} onValueChange={(v) => props.setYear(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Escola</label>
          <Select value={props.schoolId} onValueChange={props.setSchoolId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {props.schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {props.active && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => {
            props.setMonth('all'); props.setYear('all'); props.setSchoolId('all');
          }}>Limpar filtros</Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
