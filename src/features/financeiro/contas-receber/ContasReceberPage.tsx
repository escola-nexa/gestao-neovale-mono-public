import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, HandCoins, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useReceivableEntries, useRecalculateOverdue,
  RECEIVABLE_STATUS_LABEL, RECEIVABLE_STATUS_VARIANT,
  type ReceivableStatus,
} from './useContasReceber';
import { ContaReceberFormDialog } from './components/ContaReceberFormDialog';
import { exportReceivablesCsv, exportReceivablesPdf } from './utils/exportReceivables';

const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export default function ContasReceberPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReceivableStatus | 'all' | 'overdue_only'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useReceivableEntries({ search, status, from, to, page, pageSize: 25 });
  const recalc = useRecalculateOverdue();
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 25));

  return (
    <div className="container max-w-7xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <HandCoins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Contas a Receber</h1>
            <p className="text-sm text-muted-foreground">
              Faturamento, baixa, juros, multa, desconto e renegociação.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => recalc.mutate()} disabled={recalc.isPending}>
            {recalc.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Recalcular vencidos
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReceivablesCsv(data?.rows ?? [])} disabled={!data?.rows?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReceivablesPdf(data?.rows ?? [])} disabled={!data?.rows?.length}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo título
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou nº documento..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="overdue_only">Apenas vencidos</SelectItem>
              {(Object.keys(RECEIVABLE_STATUS_LABEL) as ReceivableStatus[]).map(s => (
                <SelectItem key={s} value={s}>{RECEIVABLE_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-12 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.rows.length ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum título encontrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Parc.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((r: any) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/financeiro/contas-a-receber/${r.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{r.description}</div>
                    {r.document_number && (
                      <div className="text-xs text-muted-foreground">Nº {r.document_number}</div>
                    )}
                    {r.renegotiated_from_id && (
                      <Badge variant="outline" className="mt-1 text-[10px]">Renegociado</Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.party?.name ?? '—'}</TableCell>
                  <TableCell>{r.category?.name ?? '—'}</TableCell>
                  <TableCell>{fmtDate(r.due_date)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(Number(r.total_amount))}</TableCell>
                  <TableCell>{r.installments_count}x</TableCell>
                  <TableCell>
                    <Badge variant={RECEIVABLE_STATUS_VARIANT[r.status as ReceivableStatus]}>
                      {RECEIVABLE_STATUS_LABEL[r.status as ReceivableStatus]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && data.count > 0 && (
          <div className="flex items-center justify-between p-3 border-t text-sm">
            <span className="text-muted-foreground">
              {data.count} título(s) — página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>

      <ContaReceberFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
