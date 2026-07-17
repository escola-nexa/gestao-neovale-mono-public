import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Power, ExternalLink, Loader2, Search, Trash2, KeyRound, FileDown, ClipboardCheck, CalendarCheck2, RotateCcw, Send } from 'lucide-react';
import { exportSchoolIndicationsPdf } from '@/features/rh/utils/schoolIndicationsPdf';
import { Link as RouterLink } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

import { indicationLinksApi, buildPublicUrl } from '@/features/rh/lib/indicationLinksApi';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function RhLinksEscolasPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const isCoord = user?.perfil === 'coordenador';
  const canReopen = isAdmin || isCoord;
  const [search, setSearch] = useState('');
  const [reopenTarget, setReopenTarget] = useState<any>(null);
  const [reopenMotivo, setReopenMotivo] = useState('');

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['rh-school-indication-links'],
    queryFn: () => indicationLinksApi.list(),
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return links;
    return links.filter((l) => l.school_nome.toLowerCase().includes(term));
  }, [links, search]);

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      indicationLinksApi.toggleActive(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      toast.success('Link atualizado');
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      indicationLinksApi.deleteLink(id, motivo),
    onSuccess: (res) => {
      // Invalida tudo que depende do link/indicações para refletir o cascade em outras telas de R.H.
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-indications'] });
      qc.invalidateQueries({ queryKey: ['rh-allocation-board'] });
      qc.invalidateQueries({ queryKey: ['rh-demanda'] });
      qc.invalidateQueries({ queryKey: ['external-links'] });
      const parts = [
        `${res.indications} indicação(ões)`,
        `${res.classes} turma(s)`,
        `${res.logs} log(s)`,
      ];
      if (res.allocation_items_unlinked > 0) {
        parts.push(`${res.allocation_items_unlinked} alocação(ões) desvinculada(s)`);
      }
      toast.success('Link excluído em cascata', {
        description: parts.join(' • '),
      });
    },
    onError: (e: any) => toast.error('Falha ao excluir link', { description: e?.message }),
  });

  const reopenMut = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      indicationLinksApi.reopen(id, motivo),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      qc.invalidateQueries({ queryKey: ['rh-indications'] });
      toast.success('Horários reabertos', {
        description: 'Edite a grade no portal externo e clique em Enviar novamente.',
      });
      // abre o portal externo em nova aba para edição
      if (res?.token) {
        window.open(buildPublicUrl(res.token), '_blank', 'noopener,noreferrer');
      }
      setReopenTarget(null);
      setReopenMotivo('');
    },
    onError: (e: any) => toast.error('Falha ao reabrir', { description: e?.message }),
  });

  function copyLink(token: string) {
    const url = buildPublicUrl(token);
    navigator.clipboard.writeText(url);
    toast.success('Link copiado', {
      description: 'A palavra-chave de acesso é a Palavra-Chave Trimestral ativa.',
    });
  }

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  async function handleDownloadPdf(linkId: string, schoolName: string) {
    try {
      setDownloadingId(linkId);
      await exportSchoolIndicationsPdf({ linkId, schoolName });
      toast.success('PDF gerado');
    } catch (e: any) {
      toast.error('Falha ao gerar PDF', { description: e?.message });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Links Externos' }]}
        title="Links Externos por Escola"
        description="Gere e envie links públicos para que cada diretor indique professores para os cursos vinculados à sua escola."
      />

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por escola…" className="pl-9" />
        </div>
        <GenerateLinksDialog />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum link gerado. Use o botão "Gerar links" para criar um link único por escola (contemplando todos os cursos vinculados).
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#FAFBFD]">
                <TableRow className="hover:bg-transparent">
                  <TableHead rowSpan={2} className="align-bottom min-w-[220px] border-r border-[#1B1E2C]/10">
                    Escola
                  </TableHead>
                  <TableHead rowSpan={2} className="align-bottom text-center w-[170px] border-r border-[#1B1E2C]/10">
                    Resumo
                  </TableHead>
                  <TableHead rowSpan={2} className="align-bottom text-center w-[90px] border-r border-[#1B1E2C]/10">
                    Status
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/60 border-r border-[#1B1E2C]/10 border-b border-[#1B1E2C]/10"
                  >
                    Compartilhar
                  </TableHead>
                  <TableHead
                    colSpan={1}
                    className="text-center text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/60 border-r border-[#1B1E2C]/10 border-b border-[#1B1E2C]/10"
                  >
                    Exportar
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center text-[10px] font-bold uppercase tracking-wider text-[#1B1E2C]/60 border-b border-[#1B1E2C]/10"
                  >
                    Gerenciar
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center text-[11px] w-[80px]">Copiar</TableHead>
                  <TableHead className="text-center text-[11px] w-[110px]">Palavra-chave</TableHead>
                  <TableHead className="text-center text-[11px] w-[60px] border-r border-[#1B1E2C]/10">Abrir</TableHead>
                  <TableHead className="text-center text-[11px] w-[80px] border-r border-[#1B1E2C]/10">PDF</TableHead>
                  <TableHead className="text-center text-[11px] w-[110px]">Conferir</TableHead>
                  <TableHead className="text-center text-[11px] w-[80px]">Ativar</TableHead>
                  <TableHead className="text-center text-[11px] w-[80px]">Reabrir</TableHead>
                  <TableHead className="text-center text-[11px] w-[80px]">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const submitted = !!l.submitted_at;
                  return (
                  <TableRow
                    key={l.link_id}
                    className={cn(
                      'align-middle',
                      submitted && 'bg-[#FFF7CC] hover:bg-[#FFEFA8]',
                    )}
                  >
                    <TableCell className="border-r border-[#1B1E2C]/10">
                      <div className="font-semibold text-sm text-[#1B1E2C] break-words">{l.school_nome}</div>
                      <div className="text-xs text-muted-foreground">{l.qtd_cursos} curso(s) vinculado(s)</div>
                    </TableCell>
                    <TableCell className="border-r border-[#1B1E2C]/10">
                      <div className="flex flex-col items-center gap-1 text-[11px]">
                        <Badge variant="secondary" className="font-normal" title="Turmas declaradas pelo diretor">
                          {l.qtd_turmas} turma(s)
                        </Badge>
                        <Badge variant="secondary" className="font-normal" title="Professores indicados distintos (e-mail/telefone)">
                          {l.qtd_professores ?? 0} prof.
                        </Badge>
                        <Badge variant="secondary" className="font-normal" title="Aulas/disciplinas preenchidas na grade horária">
                          {l.qtd_aulas ?? l.qtd_indicacoes} aula(s)
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center border-r border-[#1B1E2C]/10">
                      <div className="flex flex-col items-center gap-1">
                        {l.is_active
                          ? <Badge className="bg-emerald-600">Ativo</Badge>
                          : <Badge variant="outline">Inativo</Badge>}
                        {submitted && (
                          <Badge className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45] text-[10px] font-bold px-2 py-0.5 h-5 gap-1 border border-[#1B1E2C] shadow-sm" title={`Enviado pelo diretor em ${new Date(l.submitted_at!).toLocaleString('pt-BR')}`}>
                            <Send className="h-3 w-3" /> Enviado
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Compartilhar */}
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 mx-auto" onClick={() => copyLink(l.token)} title="Copiar link público">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 mx-auto" asChild title="Palavra-chave de acesso é a Trimestral ativa">
                        <RouterLink to="/compartilhamento/keywords"><KeyRound className="h-4 w-4" /></RouterLink>
                      </Button>
                    </TableCell>
                    <TableCell className="text-center border-r border-[#1B1E2C]/10">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 mx-auto" asChild title="Abrir link público em nova aba">
                        <a href={buildPublicUrl(l.token)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    </TableCell>

                    {/* Exportar */}
                    <TableCell className="text-center border-r border-[#1B1E2C]/10">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 mx-auto"
                        onClick={() => handleDownloadPdf(l.link_id, l.school_nome)}
                        disabled={l.qtd_indicacoes === 0 || downloadingId === l.link_id}
                        title={l.qtd_indicacoes === 0 ? 'Sem indicações para exportar' : 'Baixar indicações em PDF (paisagem)'}
                      >
                        {downloadingId === l.link_id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <FileDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>

                    {/* Conferir */}
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 mx-auto gap-1"
                        asChild
                        title="Conferir indicações e gerar grade horária"
                      >
                        <RouterLink to={`/rh/links-escolas/${l.link_id}/conferir`}>
                          {l.materialized_at ? (
                            <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ClipboardCheck className="h-4 w-4" />
                          )}
                          {(l.qtd_aprovadas ?? 0) > 0 && (l.qtd_aprovadas === l.qtd_indicacoes) && !l.materialized_at && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 h-4">Pronto</Badge>
                          )}
                          {l.materialized_at && (
                            <Badge className="bg-emerald-600 text-[9px] px-1 py-0 h-4">Materializado</Badge>
                          )}
                        </RouterLink>
                      </Button>
                    </TableCell>

                    {/* Gerenciar */}
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 mx-auto"
                        onClick={() => toggleMut.mutate({ id: l.link_id, active: !l.is_active })}
                        title={l.is_active ? 'Desativar link' : 'Ativar link'}
                      >
                        <Power className={`h-4 w-4 ${l.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      {canReopen ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 mx-auto"
                          disabled={!submitted || !!l.materialized_at}
                          onClick={() => { setReopenTarget(l); setReopenMotivo(''); }}
                          title={
                            !submitted
                              ? 'Disponível após o diretor enviar'
                              : l.materialized_at
                                ? 'Desmaterialize a grade antes de reabrir'
                                : 'Reabrir horários para edição interna'
                          }
                        >
                          <RotateCcw className={`h-4 w-4 ${submitted && !l.materialized_at ? 'text-amber-600' : 'text-muted-foreground/40'}`} />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 mx-auto text-muted-foreground/40 cursor-not-allowed"
                          disabled
                          title="Somente Admin/Coordenador pode reabrir"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isAdmin ? (
                        <DeleteLinkDialog
                          link={l}
                          onConfirm={(motivo) => deleteMut.mutate({ id: l.link_id, motivo })}
                          loading={deleteMut.isPending}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 mx-auto text-muted-foreground/40 cursor-not-allowed"
                          disabled
                          title="Somente administradores podem excluir links externos"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AlertDialog open={!!reopenTarget} onOpenChange={(o) => { if (!o) { setReopenTarget(null); setReopenMotivo(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir horários — {reopenTarget?.school_nome}</AlertDialogTitle>
            <AlertDialogDescription>
              O link voltará ao estado editável. Após salvar, abriremos o portal externo em nova aba para que você revise/edite a grade do diretor e clique em "Enviar" novamente. O motivo fica registrado em auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Label htmlFor="reopen-motivo" className="text-xs">Motivo (mínimo 5 caracteres)</Label>
            <Textarea
              id="reopen-motivo"
              placeholder="Ex.: Ajuste de carga horária solicitado pela coordenação"
              value={reopenMotivo}
              onChange={(e) => setReopenMotivo(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={reopenMotivo.trim().length < 5 || reopenMut.isPending}
              onClick={() => reopenTarget && reopenMut.mutate({ id: reopenTarget.link_id, motivo: reopenMotivo.trim() })}
            >
              {reopenMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reabrir e abrir portal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GenerateLinksDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data: schools = [] } = useQuery({
    queryKey: ['active-schools-with-courses-for-links'],
    queryFn: async () => {
      return indicationLinksApi.listActiveSchoolsWithCourses();
    },
    enabled: open,
  });

  // Escolas que já possuem link gerado (qualquer status) — vêm da lista exibida na página
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['rh-school-indication-links'],
    queryFn: () => indicationLinksApi.list(),
    enabled: open,
  });
  const schoolsWithLink = useMemo(
    () => new Set((existingLinks ?? []).map((l: any) => l.school_id)),
    [existingLinks],
  );

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    if (!t) return schools;
    return schools.filter((s) => s.nome.toLowerCase().includes(t) || (s.codigo ?? '').toLowerCase().includes(t));
  }, [schools, search]);

  const totalSchools = schools.length;
  const alreadyLinked = useMemo(
    () => schools.filter((s) => schoolsWithLink.has(s.id)).length,
    [schools, schoolsWithLink],
  );
  const available = totalSchools - alreadyLinked;

  const generateMut = useMutation({
    mutationFn: (ids: string[]) => indicationLinksApi.generateBatch(ids),
    onSuccess: (rows) => {
      const created = rows.filter((r) => r.created).length;
      const existing = rows.length - created;
      qc.invalidateQueries({ queryKey: ['rh-school-indication-links'] });
      toast.success(`${created} novo(s) link(s) gerado(s)${existing ? `, ${existing} já existia(m)` : ''}.`);
      setOpen(false);
      setSelected(new Set());
    },
    onError: (e: any) => {
      const raw = e?.message || e?.details || 'Erro desconhecido';
      const hint = e?.hint ? `\nDica: ${e.hint}` : '';
      toast.error('Falha ao gerar links externos', {
        description: `${raw}${hint}`,
        duration: 8000,
      });
      console.error('[RhLinksEscolas] generateBatch error:', e);
    },
  });

  function toggle(id: string) {
    if (schoolsWithLink.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90"><Plus className="h-4 w-4 mr-1" /> Gerar links</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        {/* Cabeçalho padrão Neovale */}
        <DialogHeader className="bg-[#1B1E2C] text-white px-6 py-5 border-b-4 border-[#FFDA45] space-y-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#FFDA45] font-semibold">
            R.H. · Links Externos
          </div>
          <DialogTitle className="text-white text-xl font-bold">
            Gerar links externos por escola
          </DialogTitle>
          <p className="text-xs text-white/70 leading-relaxed">
            Será criado <strong className="text-[#FFDA45]">1 link único por escola</strong> contemplando todos os cursos vinculados. Links já existentes são preservados.
          </p>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col overflow-hidden px-6 py-4">
          {/* Contadores */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border bg-card px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Escolas</div>
              <div className="text-lg font-bold text-[#1B1E2C]">{totalSchools}</div>
            </div>
            <div className="rounded-md border bg-card px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponíveis</div>
              <div className="text-lg font-bold text-emerald-600">{available}</div>
            </div>
            <div className="rounded-md border bg-card px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Já com link</div>
              <div className="text-lg font-bold text-muted-foreground">{alreadyLinked}</div>
            </div>
          </div>

          <Input placeholder="Buscar escola…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex-1 min-h-0 overflow-auto border rounded-md divide-y">
            {filtered.map((s) => {
              const disabled = schoolsWithLink.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2 ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/40' : 'cursor-pointer hover:bg-accent'}`}
                >
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                    disabled={disabled}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium break-words">{s.nome}</div>
                    {s.codigo && <div className="text-xs text-muted-foreground">{s.codigo}</div>}
                  </div>
                  {disabled && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">Link já gerado</Badge>
                  )}
                </label>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6">Nenhuma escola encontrada.</div>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={selected.size === 0 || generateMut.isPending}
            onClick={() => generateMut.mutate(Array.from(selected))}
            className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90"
          >
            {generateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Gerar (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLinkDialog({
  link,
  onConfirm,
  loading,
}: {
  link: { link_id: string; school_nome: string; qtd_indicacoes: number; qtd_turmas: number };
  onConfirm: (motivo: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const trimmed = motivo.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 5;
  const canSubmit = trimmed.length >= 5 && !loading;

  function reset() {
    setMotivo('');
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 mx-auto text-destructive hover:bg-destructive/10"
          title="Excluir link (somente administradores)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir link de {link.school_nome}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Esta ação é <strong>irreversível</strong> e fará exclusão em cascata de:
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>
                  <strong>{link.qtd_indicacoes}</strong> indicação(ões) registrada(s) por este link
                </li>
                <li>
                  <strong>{link.qtd_turmas}</strong> turma(s) declarada(s) pelo diretor
                </li>
                <li>Todos os logs de acesso ao link</li>
                <li>O próprio link público (deixará de funcionar)</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Itens já alocados em planos de R.H. <strong>não</strong> serão apagados — apenas perderão a referência ao link de origem.
                Talentos já convertidos a partir das indicações <strong>permanecem</strong> no Banco de Talentos.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="motivo-exclusao-link" className="text-sm font-medium">
            Motivo da exclusão <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo-exclusao-link"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo (mín. 5 caracteres). Esta justificativa fica registrada na auditoria."
            rows={3}
            className={tooShort ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {tooShort && (
            <p className="text-xs text-destructive">
              O motivo deve ter no mínimo 5 caracteres.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              if (!canSubmit) {
                e.preventDefault();
                return;
              }
              onConfirm(trimmed);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Excluindo…' : 'Excluir definitivamente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
