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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Users, Plus, Pencil, Trash2, Power, Link2 } from 'lucide-react';
import {
  FinancialParty,
  useDeleteRegister,
  useFinancialParties,
  useToggleActive,
} from './useFinancialRegisters';
import BeneficiarioDialog from './components/BeneficiarioDialog';

const TYPE_LABELS: Record<string, string> = {
  SUPPLIER: 'Fornecedor',
  CUSTOMER: 'Cliente',
  BENEFICIARY: 'Beneficiário',
  EMPLOYEE: 'Colaborador',
  PROFESSOR: 'Professor',
  GOVERNMENT: 'Governo',
  OTHER: 'Outro',
};

export default function BeneficiariosPage() {
  const { data = [], isLoading } = useFinancialParties();
  const toggle = useToggleActive('financial_parties', 'Beneficiário');
  const remove = useDeleteRegister('financial_parties', 'Beneficiário');
  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('ALL');
  const [editing, setEditing] = useState<FinancialParty | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FinancialParty | null>(null);

  const filtered = useMemo(
    () =>
      data.filter((d) => {
        const matchQ =
          !q ||
          [d.name, d.trade_name, d.document, d.email]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q.toLowerCase()));
        const matchT = type === 'ALL' || d.party_type === type;
        return matchQ && matchT;
      }),
    [data, q, type],
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Cadastros', href: '/financeiro/cadastros' },
          { label: 'Beneficiários' },
        ]}
      />
      <PageHeader
        icon={Users}
        title="Beneficiários"
        description="Fornecedores, clientes e beneficiários — pode vincular professor existente."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo beneficiário
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por nome, documento, e-mail..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="SUPPLIER">Fornecedores</SelectItem>
                <SelectItem value="CUSTOMER">Clientes</SelectItem>
                <SelectItem value="BENEFICIARY">Beneficiários</SelectItem>
                <SelectItem value="EMPLOYEE">Colaboradores</SelectItem>
                <SelectItem value="PROFESSOR">Professores</SelectItem>
                <SelectItem value="GOVERNMENT">Governo</SelectItem>
                <SelectItem value="OTHER">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
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
                    Nenhum beneficiário cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.name}
                      {p.professor_id && (
                        <Badge variant="outline" className="gap-1">
                          <Link2 className="h-3 w-3" /> Professor
                        </Badge>
                      )}
                    </div>
                    {p.trade_name && (
                      <div className="text-xs text-muted-foreground">{p.trade_name}</div>
                    )}
                  </TableCell>
                  <TableCell>{TYPE_LABELS[p.party_type] ?? p.party_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.document_type ? `${p.document_type}: ` : ''}
                    {p.document ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="text-xs">{p.email ?? '—'}</div>
                    <div className="text-xs">{p.phone ?? ''}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={p.active ? 'default' : 'secondary'}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {p.is_blocked && (
                        <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle.mutate({ id: p.id, active: !p.active })}
                      title={p.active ? 'Inativar' : 'Reativar'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDel(p)}
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

      <BeneficiarioDialog open={open} onOpenChange={setOpen} initial={editing} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir beneficiário?</AlertDialogTitle>
            <AlertDialogDescription>
              Se já houver lançamentos vinculados, o registro será apenas inativado
              para preservar o histórico.
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
