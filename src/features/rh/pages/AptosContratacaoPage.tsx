import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Loader2, Search, FilePlus2, FileCheck2, Link2, Activity, Copy, ExternalLink,
  XCircle, ShieldCheck, Eye, Download, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { ProfessorViewDialog } from '@/features/professores/components/ProfessorViewDialog';
import { ExportProfessorDialog } from '@/features/professores/components/ExportProfessorDialog';
import { UploadHiringDocDialog } from '../components/UploadHiringDocDialog';
import { DownloadSignedDocsDialog } from '../components/DownloadSignedDocsDialog';
import { TeacherShiftWorkloadTable } from '../components/TeacherShiftWorkloadTable';
import { useTeacherShiftWorkload } from '../hooks/useTeacherShiftWorkload';
import { hrApi } from '../api';
import type { ProfessorData } from '@/features/professores/types';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDENTE_DOC: { label: 'Pendente documento', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  AGUARDANDO_ASSINATURA: { label: 'Aguardando assinatura', className: 'bg-blue-100 text-blue-900 border-blue-300' },
  ASSINADO: { label: 'Assinado', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  CONCLUIDO: { label: 'Concluído', className: 'bg-emerald-600 text-white border-emerald-600' },
  CANCELADO: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border' },
};

const PUBLISHED_URL = 'https://nexa-gestao.lovable.app';

interface CandidateRow {
  id: string;
  status: string;
  sent_at: string;
  notes: string | null;
  professor: { id: string; full_name: string; cpf: string | null; email?: string | null } | null;
  sent_by_label?: string | null;
  originals: number;
  signed: number;
  link?: { id: string; token: string; is_active: boolean; expires_at: string | null; created_at: string } | null;
}

function LinkChip({ link, expired }: { link: NonNullable<CandidateRow['link']>; expired: boolean }) {
  if (!link.is_active) {
    return <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">Link revogado</Badge>;
  }
  if (expired) {
    return <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">Link expirado</Badge>;
  }
  const daysLeft = link.expires_at ? Math.max(0, differenceInDays(new Date(link.expires_at), new Date())) : null;
  return (
    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
      Link ativo{daysLeft !== null ? ` · ${daysLeft}d` : ''}
    </Badge>
  );
}

export default function AptosContratacaoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDocs, setFilterDocs] = useState<'all' | 'no_doc' | 'with_doc'>('all');
  const [pageSize, setPageSize] = useState<number>(30);
  const [page, setPage] = useState<number>(1);
  const [cancelTarget, setCancelTarget] = useState<CandidateRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [viewProf, setViewProf] = useState<{ id: string; name: string } | null>(null);
  const [exportProf, setExportProf] = useState<ProfessorData | null>(null);
  const [uploadTarget, setUploadTarget] = useState<CandidateRow | null>(null);
  const [downloadSignedTarget, setDownloadSignedTarget] = useState<CandidateRow | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ name: string; url: string; expiresAt: string } | null>(null);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const finalRows = await hrApi.listHiringCandidates();
      setRows(finalRows);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar fila de contratação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [organizationId]);

  // Realtime: status do candidato é recalculado automaticamente quando documentos
  // são adicionados/removidos (trigger trg_hr_hiring_docs_recompute). Recarrega
  // a lista para refletir KPIs em tempo real, sem F5.
  useEffect(() => {
    if (!organizationId) return;
    return hrApi.subscribeToHiringCandidates(organizationId, () => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus === 'active' && (r.status === 'CANCELADO' || r.status === 'CONCLUIDO')) return false;
      if (filterStatus !== 'active' && filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterDocs === 'no_doc' && r.originals > 0) return false;
      if (filterDocs === 'with_doc' && r.originals === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = r.professor?.full_name?.toLowerCase() || '';
        const cpf = r.professor?.cpf?.toLowerCase() || '';
        if (!name.includes(q) && !cpf.includes(q)) return false;
      }
      return true;
    }).sort((a, b) =>
      (a.professor?.full_name || '').localeCompare(b.professor?.full_name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [rows, filterStatus, filterDocs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  useEffect(() => { setPage(1); }, [filterStatus, filterDocs, search, pageSize]);

  const filteredProfIds = useMemo(
    () => paged.map(r => r.professor?.id).filter((x): x is string => !!x),
    [paged],
  );
  const workloadQuery = useTeacherShiftWorkload(filteredProfIds);

  const kpis = useMemo(() => {
    const active = rows.filter(r => r.status !== 'CANCELADO' && r.status !== 'CONCLUIDO');
    return {
      total: active.length,
      pending: active.filter(r => r.originals === 0).length,
      awaiting: active.filter(r => r.status === 'AGUARDANDO_ASSINATURA').length,
      signed: rows.filter(r => r.status === 'ASSINADO' || r.status === 'CONCLUIDO').length,
    };
  }, [rows]);

  const generateLink = async (row: CandidateRow) => {
    if (!organizationId || !row.professor) return;
    const tid = toast.loading('Gerando link externo...');
    try {
      const { url, expiresAt } = await hrApi.generateExternalLinkForHiring(row.id, row.professor.id, row.professor.full_name);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link gerado e copiado!', { id: tid });
      setLinkDialog({ name: row.professor.full_name, url, expiresAt });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar link', { id: tid });
    }
  };

  const copyLink = (row: CandidateRow) => {
    if (!row.link) return;
    navigator.clipboard.writeText(`${PUBLISHED_URL}/acesso-externo/${row.link.token}`);
    toast.success('Link copiado!');
  };

  const openLink = (row: CandidateRow) => {
    if (!row.link) return;
    window.open(`${PUBLISHED_URL}/acesso-externo/${row.link.token}`, '_blank', 'noreferrer');
  };

  const revokeLink = async (row: CandidateRow) => {
    if (!row.link) return;
    try {
      await hrApi.revokeExternalLink(row.link.id, row.id, row.professor?.id || '');
      toast.success('Link revogado');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao revogar link');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    try {
      await hrApi.cancelHiringCandidate(cancelTarget.id, cancelReason.trim());
      toast.success('Candidato cancelado');
      setCancelTarget(null);
      setCancelReason('');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao cancelar candidato');
    }
  };

  const goDetail = (row: CandidateRow) => navigate(`/rh/aptos-contratacao/${row.id}`);

  const kpiCards: Array<{ key: string; label: string; value: number; tone: string; filter: string }> = [
    { key: 'active', label: 'Na fila', value: kpis.total, tone: 'text-foreground', filter: 'active' },
    { key: 'pending', label: 'Pendente documento', value: kpis.pending, tone: 'text-amber-700', filter: 'PENDENTE_DOC' },
    { key: 'awaiting', label: 'Aguardando assinatura', value: kpis.awaiting, tone: 'text-blue-700', filter: 'AGUARDANDO_ASSINATURA' },
    { key: 'signed', label: 'Assinados', value: kpis.signed, tone: 'text-emerald-700', filter: 'ASSINADO' },
  ];

  const renderActionsMenu = (r: CandidateRow) => {
    const link = r.link;
    const expired = link?.expires_at ? new Date(link.expires_at) < new Date() : false;
    const linkActive = !!link && link.is_active && !expired;
    const hasOriginal = r.originals > 0;
    const canCancel = r.status !== 'CANCELADO' && r.status !== 'CONCLUIDO';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="min-w-[110px] gap-1.5">
            <MoreHorizontal className="h-4 w-4" />
            Ações
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Cadastro</DropdownMenuLabel>
          {r.professor && (
            <>
              <DropdownMenuItem onClick={() => setViewProf({ id: r.professor!.id, name: r.professor!.full_name })}>
                <Eye className="mr-2 h-4 w-4" /> Visualizar cadastro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportProf({ id: r.professor!.id, full_name: r.professor!.full_name } as ProfessorData)}>
                <Download className="mr-2 h-4 w-4" /> Exportar cadastro e anexos
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Contratação</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => goDetail(r)}>
            <Activity className="mr-2 h-4 w-4" /> Ver detalhes / auditoria
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Link de assinatura</DropdownMenuLabel>
          {linkActive ? (
            <>
              <DropdownMenuItem onClick={() => copyLink(r)}>
                <Copy className="mr-2 h-4 w-4" /> Copiar link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openLink(r)}>
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir em nova aba
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => revokeLink(r)}>
                <XCircle className="mr-2 h-4 w-4" /> Revogar link
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem disabled={!hasOriginal} onClick={() => generateLink(r)}>
              <Link2 className="mr-2 h-4 w-4" /> {hasOriginal ? 'Gerar link' : 'Anexe documento p/ gerar link'}
            </DropdownMenuItem>
          )}

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setCancelTarget(r)}>
                <XCircle className="mr-2 h-4 w-4" /> Cancelar candidato
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.', href: '/rh' }, { label: 'Aptos para Contratação' }]}
        title="Aptos para Contratação"
        description="Fila de professores aprovados para contratação — gerencie contratos, links de assinatura e auditoria."
        icon={Briefcase}
        backTo="/rh"
        actions={
          <Button variant="outline" onClick={() => navigate('/rh/aptos-contratacao/auditoria')}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Auditoria consolidada
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => {
          const active = filterStatus === k.filter;
          return (
            <Card
              key={k.key}
              role="button"
              tabIndex={0}
              onClick={() => setFilterStatus(k.filter)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterStatus(k.filter); } }}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                active && 'ring-2 ring-primary shadow-md',
              )}
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={cn('text-2xl font-bold mt-1', k.tone)}>{k.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Candidatos</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <SearchableSelect
                value={filterStatus}
                onValueChange={setFilterStatus}
                placeholder="Status"
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'active', label: 'Em andamento' },
                  { value: 'PENDENTE_DOC', label: 'Pendente documento' },
                  { value: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
                  { value: 'ASSINADO', label: 'Assinados' },
                  { value: 'CONCLUIDO', label: 'Concluídos' },
                  { value: 'CANCELADO', label: 'Cancelados' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Documentos</label>
              <SearchableSelect
                value={filterDocs}
                onValueChange={(v) => setFilterDocs(v as any)}
                placeholder="Documentos"
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'no_doc', label: 'Sem documento anexado' },
                  { value: 'with_doc', label: 'Com documento anexado' },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Nenhum candidato encontrado.</div>
          ) : (
            <div className="divide-y">
              {paged.map((r) => {
                const st = STATUS_BADGE[r.status] || STATUS_BADGE.PENDENTE_DOC;
                const hasOriginal = r.originals > 0;
                const link = r.link;
                const expired = link?.expires_at ? new Date(link.expires_at) < new Date() : false;
                return (
                  <div
                    key={r.id}
                    className="p-4 sm:p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => goDetail(r)}
                  >
                    {/* Header: nome + status */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight break-words">
                          {r.professor?.full_name || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">CPF:</span> {r.professor?.cpf || '—'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Enviado em {format(new Date(r.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          {r.sent_by_label && <> · por {r.sent_by_label}</>}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end shrink-0">
                        <Badge variant="outline" className={cn('whitespace-nowrap', st.className)}>{st.label}</Badge>
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{r.originals} orig.</Badge>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] whitespace-nowrap', r.signed > 0 && 'bg-emerald-100 text-emerald-900')}
                        >
                          {r.signed} assin.
                        </Badge>
                        {link && <LinkChip link={link} expired={expired} />}
                      </div>
                    </div>

                    {/* Ações */}
                    <div
                      className="mt-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        onClick={() => setUploadTarget(r)}
                        className={cn(
                          'w-full sm:w-auto justify-center sm:justify-start sm:min-w-[220px]',
                          hasOriginal
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C]',
                        )}
                      >
                        {hasOriginal ? <FileCheck2 className="mr-1.5 h-4 w-4" /> : <FilePlus2 className="mr-1.5 h-4 w-4" />}
                        {hasOriginal ? `Documentos (${r.originals}) · anexar +` : 'Anexar documento'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDownloadSignedTarget(r)}
                        disabled={r.signed === 0}
                        title={r.signed === 0 ? 'Sem documentos assinados' : 'Baixar documentos assinados'}
                        className="w-full sm:w-auto justify-center sm:justify-start"
                      >
                        <FileCheck2 className="mr-1.5 h-4 w-4 text-emerald-600" /> Baixar documentos assinados
                      </Button>
                      {r.professor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExportProf({ id: r.professor!.id, full_name: r.professor!.full_name } as ProfessorData)}
                          title="Baixar cadastro e anexos do professor"
                          className="w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Download className="mr-1.5 h-4 w-4" /> Baixar documentos pessoais
                        </Button>
                      )}
                      <div className="sm:ml-auto w-full sm:w-auto">
                        {renderActionsMenu(r)}
                      </div>
                    </div>

                    {/* Carga horária por escola/turno */}
                    {r.professor?.id && (
                      <TeacherShiftWorkloadTable
                        workload={workloadQuery.data?.get(r.professor.id)}
                        loading={workloadQuery.isLoading}
                        className="mt-3 w-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
              <div className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Por página</span>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[30, 50, 70, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar candidato</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.professor?.full_name} será removido da fila ativa. O motivo ficará no histórico de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Textarea
              placeholder="Informe o motivo do cancelamento"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={!cancelReason.trim()} onClick={handleCancel}>Cancelar candidato</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProfessorViewDialog
        open={!!viewProf}
        onOpenChange={(o) => { if (!o) setViewProf(null); }}
        professorId={viewProf?.id || null}
        professorName={viewProf?.name}
      />

      <ExportProfessorDialog
        open={!!exportProf}
        onOpenChange={(o) => { if (!o) setExportProf(null); }}
        professor={exportProf}
      />

      <UploadHiringDocDialog
        open={!!uploadTarget}
        onOpenChange={(o) => { if (!o) setUploadTarget(null); }}
        candidate={uploadTarget ? { id: uploadTarget.id } : null}
        professor={uploadTarget?.professor ? { id: uploadTarget.professor.id } : null}
        organizationId={organizationId}
        userId={user?.id || ''}
        onUploaded={load}
      />

      <DownloadSignedDocsDialog
        open={!!downloadSignedTarget}
        onOpenChange={(o) => { if (!o) setDownloadSignedTarget(null); }}
        candidateId={downloadSignedTarget?.id || null}
        candidateName={downloadSignedTarget?.professor?.full_name}
      />

      <Dialog open={!!linkDialog} onOpenChange={(o) => { if (!o) setLinkDialog(null); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-[#1B1E2C]/15">
          <div className="bg-[#1B1E2C] px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-[#FFDA45] text-[#1B1E2C] flex items-center justify-center">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <DialogHeader className="space-y-0.5 text-left">
                  <DialogTitle className="text-white text-base font-semibold">
                    Link de assinatura gerado
                  </DialogTitle>
                  <DialogDescription className="text-white/70 text-xs">
                    {linkDialog?.name}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-md bg-[#FFDA45]/15 border border-[#FFDA45]/40 p-3 text-[13px] text-[#1B1E2C] leading-relaxed">
              <p className="font-semibold mb-1">O que é este link?</p>
              <p>
                Envie ao candidato para que ele acesse de forma segura sua área externa,
                visualize os documentos enviados e realize a <strong>assinatura digital</strong> dos contratos.
                O acesso é direto, <strong>sem necessidade de palavra-chave</strong>, e pode ser revogado a
                qualquer momento em <em>Ações › Revogar link</em>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#1B1E2C]/70">
                Link para copiar
              </label>
              <div className="flex items-center gap-1 rounded-md border border-[#1B1E2C]/20 bg-background p-1.5">
                <code className="flex-1 break-all text-[11px] px-1 text-[#1B1E2C]">
                  {linkDialog?.url}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-[#FFDA45]/30"
                  onClick={() => {
                    if (!linkDialog) return;
                    navigator.clipboard.writeText(linkDialog.url);
                    toast.success('Link copiado!');
                  }}
                  title="Copiar link"
                >
                  <Copy className="h-4 w-4 text-[#1B1E2C]" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-[#FFDA45]/30" asChild title="Abrir em nova aba">
                  <a href={linkDialog?.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 text-[#1B1E2C]" />
                  </a>
                </Button>
              </div>
              {linkDialog?.expiresAt && (
                <p className="text-[11px] text-muted-foreground">
                  Expira em {format(new Date(linkDialog.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 pt-0 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setLinkDialog(null)}>
              Fechar
            </Button>
            <Button
              className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90"
              onClick={() => {
                if (!linkDialog) return;
                navigator.clipboard.writeText(linkDialog.url);
                toast.success('Link copiado!');
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
