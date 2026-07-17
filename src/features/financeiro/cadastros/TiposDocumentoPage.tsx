import { useMemo, useState } from 'react';
import { FileBadge, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FinancialDocumentType,
  useDeleteRegister,
  useFinancialDocumentTypes,
  useSaveRegister,
  useToggleActive,
} from './useFinancialRegisters';

const DIRECTION_OPTIONS = [
  { v: 'IN', l: 'Entrada (recebimentos)' },
  { v: 'OUT', l: 'Saída (pagamentos)' },
  { v: 'BOTH', l: 'Ambos' },
];

const empty: Partial<FinancialDocumentType> = {
  name: '',
  code: '',
  direction: 'BOTH',
  requires_number: false,
  requires_issue_date: false,
  requires_attachment: false,
  allows_duplicate_number: false,
  retention_days: 1825,
  notes: '',
  active: true,
};

export default function TiposDocumentoPage() {
  const { data = [], isLoading } = useFinancialDocumentTypes();
  const save = useSaveRegister<Partial<FinancialDocumentType>>('financial_document_types', 'Tipo de documento');
  const toggle = useToggleActive('financial_document_types', 'Tipo de documento');
  const del = useDeleteRegister('financial_document_types', 'Tipo de documento');

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FinancialDocumentType>>(empty);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter((d) =>
      [d.name, d.code ?? ''].some((v) => v.toLowerCase().includes(s)),
    );
  }, [data, search]);

  function openNew() { setEditing(empty); setOpen(true); }
  function openEdit(d: FinancialDocumentType) { setEditing(d); setOpen(true); }

  async function handleSave() {
    if (!editing.name?.trim()) return;
    await save.mutateAsync(editing);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb items={[
        { label: 'Financeiro', href: '/financeiro' },
        { label: 'Cadastros', href: '/financeiro/cadastros' },
        { label: 'Tipos de Documento' },
      ]} />
      <PageHeader
        title="Tipos de Documento"
        description="Categorias de documentos fiscais e contratuais usados em lançamentos financeiros."
        icon={FileBadge}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo tipo
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar por nome ou código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Obrigatoriedades</TableHead>
                  <TableHead className="text-center">Retenção (dias)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum tipo cadastrado.</TableCell></TableRow>
                )}
                {filtered.map((d) => (
                  <TableRow key={d.id} className={!d.active ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">
                      {d.name}
                      {d.is_system && <Badge variant="secondary" className="ml-2">Sistema</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.code ?? '—'}</TableCell>
                    <TableCell>
                      {DIRECTION_OPTIONS.find((o) => o.v === d.direction)?.l ?? d.direction}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {d.requires_number && <Badge variant="outline">Nº</Badge>}
                      {d.requires_issue_date && <Badge variant="outline">Data</Badge>}
                      {d.requires_attachment && <Badge variant="outline">Anexo</Badge>}
                      {d.allows_duplicate_number && <Badge variant="outline">Duplica nº</Badge>}
                    </TableCell>
                    <TableCell className="text-center">{d.retention_days}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={d.active ? 'default' : 'secondary'}>
                        {d.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(d)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" title={d.active ? 'Inativar' : 'Reativar'}
                        onClick={() => toggle.mutate({ id: d.id, active: !d.active })}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => setConfirmDel(d.id)}
                        disabled={d.is_system}
                        title={d.is_system ? 'Tipo do sistema' : 'Excluir'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Editar tipo de documento' : 'Novo tipo de documento'}</DialogTitle>
            <DialogDescription>
              Defina obrigatoriedades, direção e retenção. Documentos históricos permanecem mesmo se o tipo for inativado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={editing.code ?? ''}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Direção</Label>
              <Select
                value={editing.direction ?? 'BOTH'}
                onValueChange={(v: any) => setEditing({ ...editing, direction: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((o) => (
                    <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Retenção (dias)</Label>
              <Input
                type="number" min={0}
                value={editing.retention_days ?? 0}
                onChange={(e) => setEditing({ ...editing, retention_days: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="m-0">Exige número</Label>
              <Switch
                checked={!!editing.requires_number}
                onCheckedChange={(v) => setEditing({ ...editing, requires_number: v })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="m-0">Exige data de emissão</Label>
              <Switch
                checked={!!editing.requires_issue_date}
                onCheckedChange={(v) => setEditing({ ...editing, requires_issue_date: v })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="m-0">Exige anexo</Label>
              <Switch
                checked={!!editing.requires_attachment}
                onCheckedChange={(v) => setEditing({ ...editing, requires_attachment: v })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label className="m-0">Permite número duplicado</Label>
              <Switch
                checked={!!editing.allows_duplicate_number}
                onCheckedChange={(v) => setEditing({ ...editing, allows_duplicate_number: v })}
              />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={editing.notes ?? ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={save.isPending || !editing.name?.trim()}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se o tipo já estiver vinculado a documentos, ele será apenas inativado para preservar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDel) del.mutate(confirmDel); setConfirmDel(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
