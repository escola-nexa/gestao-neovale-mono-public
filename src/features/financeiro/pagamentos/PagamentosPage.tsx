import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, Search } from 'lucide-react';
import { financeiroApi } from '@/features/financeiro/api';
import { useOrganization } from '@/hooks/useOrganization';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PaymentRow = {
  id: string;
  kind: 'PAGAMENTO' | 'RECEBIMENTO' | 'ESTORNO';
  amount: number;
  payment_date: string;
  reference: string | null;
  reversal_of_id: string | null;
  account?: { name: string } | null;
  method?: { name: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  PAGAMENTO: 'Pagamento',
  RECEBIMENTO: 'Recebimento',
  ESTORNO: 'Estorno',
};

const KIND_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PAGAMENTO: 'default',
  RECEBIMENTO: 'secondary',
  ESTORNO: 'destructive',
};

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PagamentosPage() {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<string>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const { data = [], isLoading } = useQuery({
    enabled: !!organizationId,
    queryKey: ['financial_payments', organizationId, kind, from, to],
    queryFn: async () => {
      let q = supabase
        .from('financial_payments')
        .select(
          'id, kind, amount, payment_date, reference, reversal_of_id, account:financial_accounts(name), method:financial_payment_methods(name)',
        )
        .eq('organization_id', organizationId!)
        .order('payment_date', { ascending: false })
        .limit(500);
      if (kind !== 'all') q = q.eq('kind', kind as any);
      if (from) q = q.gte('payment_date', from);
      if (to) q = q.lte('payment_date', to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r) =>
      [r.reference, r.account?.name, r.method?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [data, search]);

  const totals = useMemo(() => {
    let pago = 0;
    let recebido = 0;
    let estornado = 0;
    rows.forEach((r) => {
      if (r.kind === 'PAGAMENTO') pago += Number(r.amount);
      else if (r.kind === 'RECEBIMENTO') recebido += Number(r.amount);
      else estornado += Number(r.amount);
    });
    return { pago, recebido, estornado };
  }, [rows]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Pagamentos' },
        ]}
      />
      <PageHeader
        icon={CreditCard}
        title="Pagamentos"
        description="Histórico de pagamentos, recebimentos e estornos lançados no financeiro."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="text-lg font-semibold">{currency(totals.pago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total recebido</p>
            <p className="text-lg font-semibold">{currency(totals.recebido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estornos</p>
            <p className="text-lg font-semibold">{currency(totals.estornado)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por referência, conta ou método"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
                <SelectItem value="RECEBIMENTO">Recebimento</SelectItem>
                <SelectItem value="ESTORNO">Estorno</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {format(parseISO(r.payment_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={KIND_VARIANT[r.kind]}>{KIND_LABEL[r.kind]}</Badge>
                      </TableCell>
                      <TableCell>{r.account?.name ?? '—'}</TableCell>
                      <TableCell>{r.method?.name ?? '—'}</TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {r.reference ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {currency(Number(r.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
