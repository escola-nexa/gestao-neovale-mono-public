import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useFinancialEntries,
  STATUS_LABEL,
  STATUS_VARIANT,
  type EntryStatus,
} from './useContasPagar';
import { ContaPagarFormDialog } from './components/ContaPagarFormDialog';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

export default function ContasPagarPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EntryStatus | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useFinancialEntries({ search, status, from, to, page, pageSize: 25 });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 25));

  return (
    <div className="container max-w-7xl py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Contas a Pagar</h1>
            <p className="text-sm text-muted-foreground">
              Lançamento, aprovação por alçada e acompanhamento de despesas.
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo título
        </Button>
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
              {(Object.keys(STATUS_LABEL) as EntryStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} placeholder="De" />
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} placeholder="Até" />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-12 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.rows.length ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum título encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/financeiro/contas-a-pagar/${r.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{r.description}</div>
                    {r.document_number && (
                      <div className="text-xs text-muted-foreground">Nº {r.document_number}</div>
                    )}
                  </TableCell>
                  <TableCell>{r.party?.name ?? '—'}</TableCell>
                  <TableCell>{r.category?.name ?? '—'}</TableCell>
                  <TableCell>{fmtDate(r.due_date)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(Number(r.total_amount))}</TableCell>
                  <TableCell>{r.installments_count}x</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ContaPagarFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
