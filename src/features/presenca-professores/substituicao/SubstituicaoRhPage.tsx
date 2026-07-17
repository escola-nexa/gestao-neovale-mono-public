import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCog, Search, Eye, UserPlus, Send, Filter, Inbox,
  Clock, Timer, CheckCircle2, AlertTriangle, Users, ShieldCheck, Banknote,
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
import { substitutionApi } from './api';
import {
  TSR_STATUS_LABEL, TSR_STATUS_COLOR, useTSRList, TSRRequest,
} from './hooks/useTeacherSubstitution';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

type RhTab = 'queue' | 'mine' | 'team' | 'returned' | 'execution' | 'validation' | 'forwarded' | 'completed' | 'all';

export default function SubstituicaoRhPage() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const now = new Date();
  const [tab, setTab] = useState<RhTab>('queue');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<number | 'all'>(now.getMonth() + 1);
  const [year, setYear] = useState<number | 'all'>(now.getFullYear());
  const [schoolId, setSchoolId] = useState<string>('all');

  const { data: schools = [] } = useQuery({
    enabled: !!organizationId,
    queryKey: ['schools_min_rh', organizationId],
    queryFn: async () => {
      const data = await substitutionApi.getSchools();
      return data || [];
    },
  });

  const { data: allRows = [], isLoading } = useTSRList({ month, year, schoolId, search });

  const counts = useMemo(() => ({
    queue: allRows.filter(r => r.status === 'request_created').length,
    mine: allRows.filter(r => r.status === 'rh_in_progress' && (r as any).attended_by === user?.id).length,
    team: allRows.filter(r => r.status === 'rh_in_progress').length,
    returned: allRows.filter(r => r.status === 'returned_to_coordinator').length,
    execution: allRows.filter(r => r.status === 'in_execution' || r.status === 'execution_completed' || r.status === 'signed_report_pending').length,
    validation: allRows.filter(r => r.status === 'signed_report_uploaded' || r.status === 'pending_rh_validation').length,
    forwarded: allRows.filter(r => r.status === 'approved_for_payment').length,
    completed: allRows.filter(r => r.status === 'payment_completed').length,
  }), [allRows, user?.id]);

  const sla = useMemo(() => {
    const q = allRows.filter(r => r.status === 'request_created');
    if (!q.length) return 0;
    return Math.round(q.reduce((s, r) => s + (Date.now() - new Date(r.created_at).getTime()) / 3600000, 0) / q.length);
  }, [allRows]);




  const rows = useMemo(() => filterByTab(allRows, tab, user?.id), [allRows, tab, user?.id]);
  const filtersActive = (month !== 'all') || (year !== 'all') || schoolId !== 'all';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Rotina Pedagógica' },
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: 'R.H.' },
        ]}
        title="Substituição — R.H."
        description="Fila de atendimento, busca de substitutos e devolução para a coordenação."
        icon={UserCog}
      />

      {/* Painel de prioridade (fila) + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PriorityCard count={counts.queue} onGo={() => setTab('queue')} />
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={Timer} label="Em meu atendimento" value={counts.mine} tone="info" />
          <Kpi icon={ShieldCheck} label="Pendências de validação" value={counts.validation} tone={counts.validation > 0 ? 'warn' : 'neutral'} />
          <Kpi icon={Clock} label="SLA médio fila (h)" value={sla} tone={sla >= 8 ? 'warn' : 'neutral'} />
          <Kpi icon={Banknote} label="Encaminhadas ao Financeiro" value={counts.forwarded} tone="success" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as RhTab)} className="lg:flex-1 overflow-x-auto">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="queue" className="gap-2">
              Fila
              {counts.queue > 0 && <Badge variant="secondary" className="bg-red-100 text-red-900">{counts.queue}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">Em meu atendimento <CountBadge n={counts.mine} /></TabsTrigger>
            <TabsTrigger value="team" className="gap-2">Equipe R.H. <CountBadge n={counts.team} /></TabsTrigger>
            <TabsTrigger value="returned" className="gap-2">Devolvidas <CountBadge n={counts.returned} /></TabsTrigger>
            <TabsTrigger value="execution" className="gap-2">Em execução <CountBadge n={counts.execution} /></TabsTrigger>
            <TabsTrigger value="validation" className="gap-2">
              Validação
              {counts.validation > 0 && <Badge variant="secondary" className="bg-amber-100 text-amber-900">{counts.validation}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="forwarded" className="gap-2">Encaminhadas <CountBadge n={counts.forwarded} /></TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">Pagas <CountBadge n={counts.completed} /></TabsTrigger>
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
                <TableHead>Solicitada em</TableHead>
                <TableHead>Na fila</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Substituto</TableHead>
                <TableHead>Status</TableHead>
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
                const waiting = r.status === 'request_created';
                const inProgressMine = r.status === 'rh_in_progress' && (r as any).attended_by === user?.id;
                const needsValidation = r.status === 'signed_report_uploaded' || r.status === 'pending_rh_validation';
                const forwarded = r.status === 'approved_for_payment';
                return (
                  <TableRow key={r.id} className={waiting ? 'bg-red-50/40 hover:bg-red-50/70' : needsValidation ? 'bg-amber-50/40 hover:bg-amber-50/70' : ''}>
                    <TableCell className="font-mono text-xs">{r.substitution_code}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell><QueueTime created={r.created_at} status={r.status} /></TableCell>
                    <TableCell className="font-medium">{r.substituted_professor_name}</TableCell>
                    <TableCell className="text-sm">{r.school_name_snapshot || '—'}</TableCell>
                    <TableCell className="text-sm">{r.substitute_professor_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <Badge className={TSR_STATUS_COLOR[r.status]} variant="secondary">
                        {TSR_STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {waiting ? (
                        <Button asChild size="sm">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=rh`}>
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Assumir
                          </Link>
                        </Button>
                      ) : inProgressMine ? (
                        <Button asChild size="sm">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=rh`}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Devolver
                          </Link>
                        </Button>
                      ) : needsValidation ? (
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=rh&tab=docs`}>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Validar
                          </Link>
                        </Button>
                      ) : forwarded ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=rh`}>
                            <Banknote className="h-3.5 w-3.5 mr-1" /> Acompanhar
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/presenca-professores/substituicao/${r.id}?from=rh`}>
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

function filterByTab(rows: TSRRequest[], tab: RhTab, uid?: string): TSRRequest[] {
  switch (tab) {
    case 'queue': return rows.filter(r => r.status === 'request_created');
    case 'mine': return rows.filter(r => r.status === 'rh_in_progress' && (r as any).attended_by === uid);
    case 'team': return rows.filter(r => r.status === 'rh_in_progress');
    case 'returned': return rows.filter(r => r.status === 'returned_to_coordinator');
    case 'execution': return rows.filter(r => r.status === 'in_execution' || r.status === 'execution_completed' || r.status === 'signed_report_pending');
    case 'validation': return rows.filter(r => r.status === 'signed_report_uploaded' || r.status === 'pending_rh_validation');
    case 'forwarded': return rows.filter(r => r.status === 'approved_for_payment');
    case 'completed': return rows.filter(r => r.status === 'payment_completed');
    default: return rows;
  }
}

function QueueTime({ created, status }: { created: string; status: string }) {
  if (status !== 'request_created') return <span className="text-muted-foreground text-xs">—</span>;
  const h = (Date.now() - new Date(created).getTime()) / 3600000;
  const cls = h >= 24 ? 'text-red-700 font-semibold' : h >= 8 ? 'text-orange-700 font-medium' : 'text-muted-foreground';
  const fmt = h < 1 ? `${Math.round(h * 60)}min` : `${h.toFixed(1)}h`;
  return <span className={`text-xs ${cls}`}>{fmt}</span>;
}

function PriorityCard({ count, onGo }: { count: number; onGo: () => void }) {
  const has = count > 0;
  return (
    <Card className={has ? 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50' : 'border-dashed'}>
      <CardContent className="p-4 flex items-start gap-3 h-full">
        <div className={`rounded-lg p-2 ${has ? 'bg-red-200/70 text-red-900' : 'bg-muted text-muted-foreground'}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Fila aguardando R.H.</div>
          <div className="text-2xl font-semibold mt-1">{count}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {has ? 'solicitações abertas — assuma para iniciar o atendimento.' : 'Sem solicitações na fila.'}
          </div>
          {has && (
            <Button size="sm" className="mt-3" onClick={onGo}>Ver fila</Button>
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

function EmptyState({ tab }: { tab: RhTab }) {
  const map: Record<RhTab, { icon: any; title: string; hint: string }> = {
    queue: { icon: CheckCircle2, title: 'Fila zerada', hint: 'Sem solicitações abertas. Bom trabalho!' },
    mine: { icon: Inbox, title: 'Nenhum atendimento ativo', hint: 'Assuma uma da fila para iniciar.' },
    team: { icon: Users, title: 'Equipe sem atendimentos em curso', hint: '—' },
    returned: { icon: Send, title: 'Nenhuma devolução no período', hint: 'Ajuste os filtros se necessário.' },
    execution: { icon: Timer, title: 'Sem execuções pendentes', hint: 'Aguardando confirmação de execução.' },
    validation: { icon: AlertTriangle, title: 'Sem validações pendentes', hint: 'Nenhum relatório aguardando validação.' },
    forwarded: { icon: Send, title: 'Nenhuma encaminhada ao Financeiro', hint: 'Itens aprovados aparecerão aqui.' },
    completed: { icon: CheckCircle2, title: 'Sem finalizadas no período', hint: 'Ajuste mês/ano se necessário.' },
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
