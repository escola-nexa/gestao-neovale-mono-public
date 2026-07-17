import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, KeyRound, Search, Settings, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganization } from '@/hooks/useOrganization';
import { useUnifiedCascadingFilters } from '@/hooks/useUnifiedCascadingFilters';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { isAdminRole } from '@/lib/roles';
import { FinancialAccessGuard } from './components/FinancialAccessGuard';
import {
  useTSRFinancialKpis,
  useTSRPaymentsList,
  TSR_PAYMENT_STATUS_LABEL,
  TSR_PAYMENT_STATE_ORDER,
  formatTSRPaymentStatus,
  type TSRPaymentState,
} from './hooks/useTeacherSubstitutionFinancial';

const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

function maskCpf(cpf?: string | null) {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length < 11) return cpf;
  return `${d.slice(0, 3)}.***.***-${d.slice(9, 11)}`;
}

function InnerPanel() {
  const { userRole } = useOrganization();
  const f = useUrlFilters({ year: String(new Date().getFullYear()) });

  const year = Number(f.get('year')) || new Date().getFullYear();
  const monthRaw = f.get('month');
  const month = monthRaw ? Number(monthRaw) : null;
  const status = (f.get('status') || null) as TSRPaymentState | null;
  const schoolId = f.get('schoolId') || null;
  const payeeSearch = f.get('payee') || null;
  const cpf = f.get('cpf') || null;
  const dateFrom = f.get('dateFrom') || null;
  const dateTo = f.get('dateTo') || null;

  const { schools } = useUnifiedCascadingFilters();

  const { data: kpis } = useTSRFinancialKpis({ year, month });
  const { data: paged, isLoading } = useTSRPaymentsList({
    year, month, status, schoolId, payeeSearch, cpf, dateFrom, dateTo,
    page: f.page, pageSize: f.pageSize,
  });

  const rows = paged?.rows ?? [];
  const total = paged?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / f.pageSize));

  const hasAnyFilter = useMemo(
    () => Boolean(monthRaw || status || schoolId || payeeSearch || cpf || dateFrom || dateTo),
    [monthRaw, status, schoolId, payeeSearch, cpf, dateFrom, dateTo],
  );

  return (
    <>
      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-end">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Ano</div>
            <Select value={String(year)} onValueChange={(v) => f.set('year', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Mês</div>
            <Select value={month ? String(month) : 'all'} onValueChange={(v) => f.set('month', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, '0')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Select value={status ?? 'all'} onValueChange={(v) => f.set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TSR_PAYMENT_STATE_ORDER.map((k) => (
                  <SelectItem key={k} value={k}>{TSR_PAYMENT_STATUS_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Escola</div>
            <Select value={schoolId ?? 'all'} onValueChange={(v) => f.set('schoolId', v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(schools ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome ?? s.name ?? '—'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Beneficiário</div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Nome do substituto..."
                defaultValue={payeeSearch ?? ''}
                onBlur={(e) => f.set('payee', e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') f.set('payee', (e.target as HTMLInputElement).value.trim());
                }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">CPF</div>
            <Input
              placeholder="000.000.000-00"
              defaultValue={cpf ?? ''}
              onBlur={(e) => f.set('cpf', e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') f.set('cpf', (e.target as HTMLInputElement).value.trim());
              }}
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Período (de / até)</div>
            <div className="flex gap-1">
              <Input type="date" value={dateFrom ?? ''} onChange={(e) => f.set('dateFrom', e.target.value)} />
              <Input type="date" value={dateTo ?? ''} onChange={(e) => f.set('dateTo', e.target.value)} />
            </div>
          </div>

          {hasAnyFilter && (
            <div className="col-span-2 md:col-span-4 xl:col-span-8 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => f.clear(['month', 'status', 'schoolId', 'payee', 'cpf', 'dateFrom', 'dateTo'])}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Pendentes</div>
          <div className="text-2xl font-semibold">{BRL(Number(kpis?.total_pending ?? 0))}</div>
          <div className="text-xs text-muted-foreground mt-1">{kpis?.count_pending ?? 0} pagamentos</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Aprovados</div>
          <div className="text-2xl font-semibold">{kpis?.count_approved ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{kpis?.count_scheduled ?? 0} agendados</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Pago no período</div>
          <div className="text-2xl font-semibold">{BRL(Number(kpis?.total_paid ?? 0))}</div>
          <div className="text-xs text-muted-foreground mt-1">{kpis?.count_paid ?? 0} pagamentos</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total calculado</div>
          <div className="text-2xl font-semibold">{BRL(Number(kpis?.total_calculated ?? 0))}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpis?.count_returned ?? 0} devolvidos · {kpis?.count_cancelled ?? 0} cancelados
          </div>
        </CardContent></Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Substituto</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Hora-aula</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aprovado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum pagamento neste filtro.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.payee_name || '—'}</TableCell>
                  <TableCell className="text-xs">{maskCpf(p.payee_cpf)}</TableCell>
                  <TableCell className="text-xs">{p.request_school_name || '—'}</TableCell>
                  <TableCell>{Number(p.total_class_hours).toFixed(2)}</TableCell>
                  <TableCell>{BRL(Number(p.hour_class_value))}</TableCell>
                  <TableCell className="font-semibold">{BRL(Number(p.net_amount))}</TableCell>
                  <TableCell className="text-xs">{p.payment_method || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {formatTSRPaymentStatus(p.payment_status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{p.approved_at ? new Date(p.approved_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  <TableCell className="text-right">
                    {p.substitution_request_id && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/presenca-professores/substituicao/${p.substitution_request_id}`}>Abrir</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Paginação server-side */}
          <div className="flex items-center justify-between p-3 border-t text-sm">
            <div className="text-muted-foreground">
              {total === 0 ? '—' : `Mostrando ${(f.page - 1) * f.pageSize + 1}-${Math.min(f.page * f.pageSize, total)} de ${total}`}
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(f.pageSize)} onValueChange={(v) => f.setPageSize(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}/pág</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={f.page <= 1} onClick={() => f.setPage(f.page - 1)}>Anterior</Button>
              <div className="text-xs text-muted-foreground">Página {f.page} de {totalPages}</div>
              <Button variant="outline" size="sm" disabled={f.page >= totalPages} onClick={() => f.setPage(f.page + 1)}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdminRole(userRole) && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/presenca-professores/substituicao/configuracoes">
              <Settings className="h-4 w-4 mr-2" /> Configurações (incl. integração financeira)
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/presenca-professores/substituicao/financeiro/acessos">
              <KeyRound className="h-4 w-4 mr-2" /> Gerenciar acessos financeiros
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}

export default function SubstituicaoFinanceiroPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Financeiro de Substituições"
        description="Visão restrita: valores, recibos, comprovantes e ações de pagamento."
        icon={DollarSign}
        breadcrumbs={[
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: 'Financeiro' },
        ]}
        badge={{ label: 'Acesso restrito', tone: 'warning' }}
      />
      <FinancialAccessGuard>
        <InnerPanel />
      </FinancialAccessGuard>
    </div>
  );
}
