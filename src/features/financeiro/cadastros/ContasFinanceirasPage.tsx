import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Wallet, Plus, Pencil, Trash2, Power } from 'lucide-react';
import {
  FinancialAccount,
  useDeleteRegister,
  useFinancialAccounts,
  useToggleActive,
} from './useFinancialRegisters';
import ContaFinanceiraDialog from './components/ContaFinanceiraDialog';

const TYPE_LABELS: Record<string, string> = {
  BANK: 'Bancária',
  CASH: 'Caixa',
  WALLET: 'Carteira',
};

const SUBTYPE_LABELS: Record<string, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  investment: 'Aplicação',
  cash: 'Caixa',
  digital_wallet: 'Carteira digital',
};

const maskAccount = (n?: string | null) => {
  if (!n) return '';
  const s = String(n);
  if (s.length <= 2) return s;
  return s.slice(0, 1) + '•••' + s.slice(-2);
};

export default function ContasFinanceirasPage() {
  const { data = [], isLoading } = useFinancialAccounts();
  const toggle = useToggleActive('financial_accounts', 'Conta');
  const remove = useDeleteRegister('financial_accounts', 'Conta');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FinancialAccount | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FinancialAccount | null>(null);

  const filtered = useMemo(
    () =>
      data.filter((d) =>
        [d.name, d.bank_name, d.account_number]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, q],
  );

  const formatBRL = (n: number) =>
    n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Cadastros', href: '/financeiro/cadastros' },
          { label: 'Contas' },
        ]}
      />
      <PageHeader
        icon={Wallet}
        title="Contas"
        description="Contas bancárias, caixas e carteiras digitais da organização."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova conta
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar por nome, banco ou conta..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Banco / Conta</TableHead>
                <TableHead className="text-right">Saldo atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma conta cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {a.name}
                      {a.is_default && (
                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {SUBTYPE_LABELS[a.account_subtype ?? ''] ??
                      TYPE_LABELS[a.account_type] ??
                      a.account_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.bank_name
                      ? `${a.bank_name} · ${a.agency ?? ''}/${maskAccount(a.account_number)}${a.account_digit ? '-' + a.account_digit : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(Number(a.current_balance))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.active ? 'default' : 'secondary'}>
                      {a.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle.mutate({ id: a.id, active: !a.active })}
                      title={a.active ? 'Inativar' : 'Reativar'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDel(a)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ContaFinanceiraDialog open={open} onOpenChange={setOpen} initial={editing} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se a conta já tiver lançamentos vinculados, ela será apenas inativada
              para preservar o histórico financeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel) remove.mutate(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
