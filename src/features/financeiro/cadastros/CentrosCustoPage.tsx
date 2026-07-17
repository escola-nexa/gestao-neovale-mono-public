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
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Plus, Pencil, Trash2, Power, Download, ArrowLeftRight } from 'lucide-react';
import {
  FinancialCostCenter,
  useDeleteRegister,
  useFinancialCostCenters,
  useFinancialProjects,
  useOrgUsersLite,
  useSaveRegister,
  useSchoolsLite,
  useToggleActive,
  useTransferAllocationsAndDeactivateCC,
} from './useFinancialRegisters';

function CostCenterDialog({
  open, onOpenChange, initial, all,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: FinancialCostCenter | null;
  all: FinancialCostCenter[];
}) {
  const save = useSaveRegister<any>('financial_cost_centers', 'Centro de custo');
  const { data: schools = [] } = useSchoolsLite();
  const { data: projects = [] } = useFinancialProjects();
  const { data: users = [] } = useOrgUsersLite();

  const [form, setForm] = useState<any>(
    initial ?? {
      name: '', code: '', parent_id: null, school_id: null, city_id: null,
      project_id: null, description: '', responsible_user_id: null,
      allows_allocations: true, valid_from: null, valid_until: null,
      notes: '', active: true,
    },
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await save.mutateAsync(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar centro de custo' : 'Novo centro de custo'}</DialogTitle>
          <DialogDescription>
            Centros analíticos recebem rateios; sintéticos apenas agrupam.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Código</Label>
              <Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Centro pai</Label>
            <SearchableSelect
              value={form.parent_id ?? ''}
              onValueChange={(v) => setForm({ ...form, parent_id: v || null })}
              options={[
                { value: '', label: '— Nenhum (raiz) —' },
                ...all
                  .filter((c) => c.id !== (initial?.id ?? ''))
                  .map((c) => ({
                    value: c.id,
                    label: `${'— '.repeat(Math.max(0, c.level - 1))}${c.code ? c.code + ' · ' : ''}${c.name}`,
                  })),
              ]}
              placeholder="Selecione..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Escola vinculada</Label>
              <SearchableSelect
                value={form.school_id ?? ''}
                onValueChange={(v) => setForm({ ...form, school_id: v || null })}
                options={[
                  { value: '', label: '— Nenhuma —' },
                  ...schools.map((s: any) => ({ value: s.id, label: s.name })),
                ]}
                placeholder="Selecione..."
              />
            </div>
            <div>
              <Label>Projeto vinculado</Label>
              <SearchableSelect
                value={form.project_id ?? ''}
                onValueChange={(v) => setForm({ ...form, project_id: v || null })}
                options={[
                  { value: '', label: '— Nenhum —' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
                placeholder="Selecione..."
              />
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <SearchableSelect
              value={form.responsible_user_id ?? ''}
              onValueChange={(v) => setForm({ ...form, responsible_user_id: v || null })}
              options={[
                { value: '', label: '— Nenhum —' },
                ...users.map((u: any) => ({
                  value: u.user_id,
                  label: u.full_name || u.email || u.user_id,
                })),
              ]}
              placeholder="Selecione..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Vigência inicial</Label>
              <Input
                type="date"
                value={form.valid_from ?? ''}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Vigência final</Label>
              <Input
                type="date"
                value={form.valid_until ?? ''}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value || null })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              checked={!!form.allows_allocations}
              onCheckedChange={(v) => setForm({ ...form, allows_allocations: v })}
            />
            <div>
              <div className="text-sm font-medium">Aceita rateios</div>
              <p className="text-xs text-muted-foreground">
                Desligue para usar como grupo sintético. Rateios só podem usar centros analíticos.
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open, onOpenChange, source, all,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source: FinancialCostCenter | null;
  all: FinancialCostCenter[];
}) {
  const transfer = useTransferAllocationsAndDeactivateCC();
  const [targetId, setTargetId] = useState('');

  const targets = useMemo(
    () =>
      all.filter(
        (c) => source && c.id !== source.id && c.allows_allocations && c.active,
      ),
    [all, source],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir rateios e inativar</DialogTitle>
          <DialogDescription>
            Todos os rateios vinculados a <strong>{source?.name}</strong> serão movidos para o
            centro escolhido. Em seguida, este centro será inativado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Novo centro analítico</Label>
          <SearchableSelect
            value={targetId}
            onValueChange={setTargetId}
            options={targets.map((c) => ({
              value: c.id,
              label: `${c.code ? c.code + ' · ' : ''}${c.name}`,
            }))}
            placeholder="Selecione o destino..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!targetId || transfer.isPending}
            onClick={async () => {
              if (!source) return;
              await transfer.mutateAsync({ fromId: source.id, toId: targetId });
              onOpenChange(false);
            }}
          >
            {transfer.isPending ? 'Transferindo...' : 'Transferir e inativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportCsv(rows: FinancialCostCenter[], byId: Map<string, FinancialCostCenter>) {
  const head = [
    'codigo','nome','pai','nivel','responsavel','escola','projeto',
    'aceita_rateios','vigencia_inicio','vigencia_fim','ativa','descricao',
  ];
  const lines = [head.join(';')];
  rows.forEach((r) => {
    const parent = r.parent_id ? byId.get(r.parent_id)?.name ?? '' : '';
    const vals = [
      r.code ?? '', r.name, parent, String(r.level),
      r.responsible_user_id ?? '', r.school_id ?? '', r.project_id ?? '',
      r.allows_allocations ? 'sim' : 'não',
      r.valid_from ?? '', r.valid_until ?? '',
      r.active ? 'sim' : 'não',
      (r.description ?? '').replace(/[\r\n;]/g, ' '),
    ];
    lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `centros-de-custo-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CentrosCustoPage() {
  const { data = [], isLoading } = useFinancialCostCenters();
  const { data: schools = [] } = useSchoolsLite();
  const toggle = useToggleActive('financial_cost_centers', 'Centro de custo');
  const remove = useDeleteRegister('financial_cost_centers', 'Centro de custo');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FinancialCostCenter | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FinancialCostCenter | null>(null);
  const [transferSrc, setTransferSrc] = useState<FinancialCostCenter | null>(null);

  const schoolName = useMemo(
    () => new Map(schools.map((s: any) => [s.id, s.name])),
    [schools],
  );
  const byId = useMemo(() => new Map(data.map((c) => [c.id, c])), [data]);

  const tree = useMemo(() => {
    const children = new Map<string | null, FinancialCostCenter[]>();
    data.forEach((c) => {
      const key = c.parent_id ?? null;
      if (!children.has(key)) children.set(key, []);
      children.get(key)!.push(c);
    });
    children.forEach((arr) =>
      arr.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '') || a.name.localeCompare(b.name)),
    );
    const out: FinancialCostCenter[] = [];
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
      tree.filter((d) =>
        !q ||
        [d.name, d.code].filter(Boolean).some((v) =>
          v!.toLowerCase().includes(q.toLowerCase()),
        ),
      ),
    [tree, q],
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Configurações Financeiras', href: '/administracao/financeiro' },
          { label: 'Centros de custo' },
        ]}
      />
      <PageHeader
        icon={Building2}
        title="Centros de Custo"
        description="Centros de custo hierárquicos, com vínculo opcional a escola, projeto, responsável e vigência."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportCsv(filtered, byId)}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo centro
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar por nome ou código..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Vigência</TableHead>
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
                      Nenhum centro de custo cadastrado.
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
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.allows_allocations ? 'default' : 'outline'}>
                        {c.allows_allocations ? 'Analítico' : 'Sintético'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.school_id && <div>Escola: {schoolName.get(c.school_id) ?? '—'}</div>}
                      {c.project_id && <div>Projeto vinculado</div>}
                      {!c.school_id && !c.project_id && '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.valid_from || c.valid_until
                        ? `${c.valid_from ?? '…'} → ${c.valid_until ?? '…'}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? 'default' : 'secondary'}>
                        {c.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="Editar"
                        onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {c.active && c.allows_allocations && (
                        <Button variant="ghost" size="icon" title="Transferir rateios"
                          onClick={() => setTransferSrc(c)}>
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title={c.active ? 'Inativar' : 'Reativar'}
                        onClick={() => toggle.mutate({ id: c.id, active: !c.active })}>
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir"
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

      <CostCenterDialog open={open} onOpenChange={setOpen} initial={editing} all={data} />

      <TransferDialog
        open={!!transferSrc}
        onOpenChange={(o) => !o && setTransferSrc(null)}
        source={transferSrc}
        all={data}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>
              Centros já utilizados em rateios serão automaticamente inativados em vez de excluídos,
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
