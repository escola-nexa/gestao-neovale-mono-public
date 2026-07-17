import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Network, Plus, Pencil, Trash2, Power, Download, Replace } from 'lucide-react';
import {
  FinancialCategory,
  FinancialCategoryNature,
  FinancialEntryType,
  useDeleteRegister,
  useFinancialCategories,
  useReplaceAndDeactivateCategory,
  useSaveRegister,
  useToggleActive,
} from './useFinancialRegisters';

const ENTRY_LABEL: Record<FinancialEntryType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  transfer: 'Transferência',
  adjustment: 'Ajuste',
};
const NATURE_LABEL: Record<FinancialCategoryNature, string> = {
  operational: 'Operacional',
  administrative: 'Administrativa',
  personnel: 'Pessoal',
  tax: 'Tributária',
  financial: 'Financeira',
  investment: 'Investimento',
  other: 'Outras',
};

function CategoryDialog({
  open, onOpenChange, initial, all,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinancialCategory | null;
  all: FinancialCategory[];
}) {
  const save = useSaveRegister<any>('financial_categories', 'Categoria');
  const [form, setForm] = useState<any>(
    initial ?? {
      name: '',
      entry_type: 'expense' as FinancialEntryType,
      category_nature: 'operational' as FinancialCategoryNature,
      code: '',
      parent_id: null,
      description: '',
      accepts_entries: true,
      active: true,
    },
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save.mutateAsync(form);
    onOpenChange(false);
  };

  const parents = all.filter(
    (c) => c.entry_type === form.entry_type && c.id !== (initial?.id ?? ''),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogDescription>Plano de contas hierárquico.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Tipo de lançamento *</Label>
              <Select
                value={form.entry_type}
                onValueChange={(v) => setForm({ ...form, entry_type: v, parent_id: null })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTRY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Natureza *</Label>
              <Select
                value={form.category_nature}
                onValueChange={(v) => setForm({ ...form, category_nature: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NATURE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={form.code ?? ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Categoria pai</Label>
            <SearchableSelect
              value={form.parent_id ?? ''}
              onValueChange={(v) => setForm({ ...form, parent_id: v || null })}
              options={[
                { value: '', label: '— Nenhuma (raiz) —' },
                ...parents.map((c) => ({
                  value: c.id,
                  label: `${'— '.repeat(Math.max(0, c.level - 1))}${c.code ? c.code + ' · ' : ''}${c.name}`,
                })),
              ]}
              placeholder="Selecione..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              A categoria filha herda o mesmo tipo de lançamento do pai.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              checked={!!form.accepts_entries}
              onCheckedChange={(v) => setForm({ ...form, accepts_entries: v })}
            />
            <div>
              <div className="text-sm font-medium">Aceita lançamentos</div>
              <p className="text-xs text-muted-foreground">
                Desligue para usar como grupo/sintética. Lançamentos só podem usar categorias analíticas.
              </p>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceDialog({
  open, onOpenChange, source, all,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source: FinancialCategory | null;
  all: FinancialCategory[];
}) {
  const replace = useReplaceAndDeactivateCategory();
  const [targetId, setTargetId] = useState('');

  const targets = useMemo(
    () =>
      all.filter(
        (c) =>
          source &&
          c.id !== source.id &&
          c.entry_type === source.entry_type &&
          c.accepts_entries &&
          c.active,
      ),
    [all, source],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Substituir categoria em massa</DialogTitle>
          <DialogDescription>
            Todos os lançamentos vinculados a <strong>{source?.name}</strong> serão movidos
            para a categoria escolhida. Em seguida, a categoria original será inativada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nova categoria</Label>
          <SearchableSelect
            value={targetId}
            onValueChange={setTargetId}
            options={targets.map((c) => ({
              value: c.id,
              label: `${c.code ? c.code + ' · ' : ''}${c.name}`,
            }))}
            placeholder="Selecione a categoria de destino..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!targetId || replace.isPending}
            onClick={async () => {
              if (!source) return;
              await replace.mutateAsync({ fromId: source.id, toId: targetId });
              onOpenChange(false);
            }}
          >
            {replace.isPending ? 'Substituindo...' : 'Substituir e inativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportCsv(rows: FinancialCategory[], byId: Map<string, FinancialCategory>) {
  const head = [
    'codigo','nome','tipo','natureza','pai','nivel','aceita_lancamentos','ativa','descricao',
  ];
  const lines = [head.join(';')];
  rows.forEach((r) => {
    const parent = r.parent_id ? byId.get(r.parent_id)?.name ?? '' : '';
    const vals = [
      r.code ?? '', r.name, ENTRY_LABEL[r.entry_type], NATURE_LABEL[r.category_nature],
      parent, String(r.level), r.accepts_entries ? 'sim' : 'não',
      r.active ? 'sim' : 'não', (r.description ?? '').replace(/[\r\n;]/g, ' '),
    ];
    lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plano-de-contas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlanoContasPage() {
  const { data = [], isLoading } = useFinancialCategories();
  const toggle = useToggleActive('financial_categories', 'Categoria');
  const remove = useDeleteRegister('financial_categories', 'Categoria');
  const [q, setQ] = useState('');
  const [entryFilter, setEntryFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<FinancialCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FinancialCategory | null>(null);
  const [replaceSrc, setReplaceSrc] = useState<FinancialCategory | null>(null);

  const byId = useMemo(() => new Map(data.map((c) => [c.id, c])), [data]);

  // Ordenação hierárquica: percorre raízes e descendentes em DFS.
  const tree = useMemo(() => {
    const children = new Map<string | null, FinancialCategory[]>();
    data.forEach((c) => {
      const key = c.parent_id ?? null;
      if (!children.has(key)) children.set(key, []);
      children.get(key)!.push(c);
    });
    children.forEach((arr) =>
      arr.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '') || a.name.localeCompare(b.name)),
    );
    const out: FinancialCategory[] = [];
    const walk = (parent: string | null) => {
      (children.get(parent) ?? []).forEach((c) => {
        out.push(c);
        walk(c.id);
      });
    };
    walk(null);
    return out;
  }, [data]);

  const filtered = useMemo(
    () =>
      tree.filter((d) => {
        const matchQ =
          !q || [d.name, d.code].filter(Boolean).some((v) => v!.toLowerCase().includes(q.toLowerCase()));
        const matchE = entryFilter === 'ALL' || d.entry_type === entryFilter;
        return matchQ && matchE;
      }),
    [tree, q, entryFilter],
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Configurações Financeiras', href: '/administracao/financeiro' },
          { label: 'Plano de contas' },
        ]}
      />
      <PageHeader
        icon={Network}
        title="Plano de Contas"
        description="Plano de contas hierárquico de receitas, despesas, transferências e ajustes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportCsv(filtered, byId)}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova categoria
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por nome ou código..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
            <Select value={entryFilter} onValueChange={setEntryFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {Object.entries(ENTRY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Natureza</TableHead>
                  <TableHead>Tipo de conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma categoria cadastrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id} className={!c.active ? 'opacity-60' : undefined}>
                    <TableCell className="font-mono text-xs">{c.code ?? '—'}</TableCell>
                    <TableCell className="font-medium">
                      <span style={{ paddingLeft: `${(c.level - 1) * 16}px` }}>
                        {c.level > 1 && <span className="text-muted-foreground mr-1">└</span>}
                        {c.name}
                        {c.is_system && (
                          <Badge variant="outline" className="ml-2 text-[10px]">sistema</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.entry_type === 'income' ? 'default' : 'secondary'}>
                        {ENTRY_LABEL[c.entry_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {NATURE_LABEL[c.category_nature]}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.accepts_entries ? 'default' : 'outline'}>
                        {c.accepts_entries ? 'Analítica' : 'Sintética'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? 'default' : 'secondary'}>
                        {c.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="Editar"
                        onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {c.active && c.accepts_entries && (
                        <Button variant="ghost" size="icon" title="Substituir em massa"
                          onClick={() => setReplaceSrc(c)}>
                          <Replace className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title={c.active ? 'Inativar' : 'Reativar'}
                        onClick={() => toggle.mutate({ id: c.id, active: !c.active })}>
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir"
                        disabled={c.is_system}
                        onClick={() => setConfirmDel(c)}>
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

      <CategoryDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        all={data}
      />

      <ReplaceDialog
        open={!!replaceSrc}
        onOpenChange={(o) => !o && setReplaceSrc(null)}
        source={replaceSrc}
        all={data}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Categorias já utilizadas em lançamentos serão automaticamente inativadas
              em vez de excluídas (para preservar o histórico).
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
