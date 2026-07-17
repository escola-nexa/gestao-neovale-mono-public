import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Loader2, FileText, Trash2, Download, CheckCircle2, Clock, X, Plus, FilePlus2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { hrApi } from '../api';
import { ApiAdapter } from '@/lib/api-adapter';
import { cn } from '@/lib/utils';

/**
 * Traduz mensagens técnicas do Supabase/Storage/Postgres para algo
 * que o usuário final entenda. Cobre os erros mais frequentes deste fluxo.
 */
function traduzErro(msg?: string | null): string {
  const raw = (msg || '').trim();
  if (!raw) return 'Não foi possível processar o documento. Tente novamente.';
  const m = raw.toLowerCase();
  if (m.includes('row-level security') || m.includes('violates row-level security'))
    return 'Você não tem permissão para enviar este documento. Verifique se seu perfil (Admin, Coordenador ou R.H.) está ativo na organização.';
  if (m.includes('invalid input value for enum'))
    return 'O tipo de documento selecionado ainda não está disponível no sistema. Escolha outro tipo ou avise o administrador.';
  if (m.includes('duplicate key') || m.includes('already exists'))
    return 'Este documento já foi anexado anteriormente. Remova o existente antes de enviar uma nova versão.';
  if (m.includes('payload too large') || m.includes('exceeded the maximum') || m.includes('file size'))
    return 'O arquivo é maior do que o permitido. Reduza o tamanho do PDF e tente novamente.';
  if (m.includes('mime') || m.includes('content-type') || m.includes('content type'))
    return 'Formato inválido. Envie apenas arquivos PDF.';
  if (m.includes('network') || m.includes('failed to fetch') || m.includes('timeout'))
    return 'Falha de conexão durante o envio. Verifique sua internet e tente novamente.';
  if (m.includes('not authenticated') || m.includes('jwt') || m.includes('unauthorized'))
    return 'Sua sessão expirou. Faça login novamente para anexar documentos.';
  if (m.includes('bucket') && m.includes('not found'))
    return 'O repositório de documentos não está disponível. Contate o administrador do sistema.';
  if (m.includes('null value') && m.includes('violates not-null'))
    return 'Faltam informações obrigatórias. Preencha o título e o tipo antes de anexar.';
  return `Não foi possível concluir o envio: ${raw}`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: { id: string } | null;
  professor: { id: string } | null;
  organizationId: string | undefined;
  userId: string;
  onUploaded: () => void;
}

const DOC_KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ADITIVO', label: 'Aditivo' },
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'DECLARACAO_VT', label: 'Declaração de vale transporte' },
  { value: 'DEPENDENTE_IR', label: 'Dependente de imposto de renda' },
  { value: 'FICHA_REGISTRO', label: 'Ficha de registro' },
  { value: 'RENUNCIA_VT', label: 'Renúncia de vale transporte' },
  { value: 'TERMO', label: 'Termo' },
  { value: 'OUTRO', label: 'Outro' },
];
const DOC_KIND_LABEL = Object.fromEntries(DOC_KIND_OPTIONS.map((o) => [o.value, o.label]));

type PendingStatus = 'idle' | 'uploading' | 'done' | 'error';
interface PendingItem {
  id: string;
  file: File;
  title: string;
  docKind: string;
  status: PendingStatus;
  errorMsg?: string;
}

export function UploadHiringDocDialog({ open, onOpenChange, candidate, professor, organizationId, userId, onUploaded }: Props) {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [existing, setExisting] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ docs: any[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadExisting = async () => {
    if (!candidate) return;
    setLoadingExisting(true);
    try {
      const data = await hrApi.listHiringDocuments(candidate.id);
      setExisting((data as any[]) || []);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    if (open && candidate) {
      setPending([]);
      setProgress(null);
      setSelectedIds(new Set());
      loadExisting();
    }
    // eslint-disable-next-line
  }, [open, candidate?.id]);

  const originals = useMemo(() => existing.filter((d) => d.kind === 'ORIGINAL'), [existing]);
  const signedByParent = useMemo(() => {
    const m = new Map<string, any>();
    existing.filter((d) => d.kind === 'ASSINADO' && d.parent_document_id).forEach((d) => m.set(d.parent_document_id, d));
    return m;
  }, [existing]);

  const cleanFileName = (name: string) => name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();

  const handleFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const accepted: PendingItem[] = [];
    const rejected: string[] = [];
    arr.forEach((f) => {
      if (f.type !== 'application/pdf') { rejected.push(f.name); return; }
      accepted.push({
        id: crypto.randomUUID(),
        file: f,
        title: cleanFileName(f.name) || 'Documento',
        docKind: 'CONTRATO',
        status: 'idle',
      });
    });
    if (rejected.length) toast.error(`Apenas PDF: ${rejected.join(', ')}`);
    if (accepted.length) setPending((p) => [...p, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const updatePending = (id: string, patch: Partial<PendingItem>) => {
    setPending((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removePending = (id: string) => {
    setPending((p) => p.filter((it) => it.id !== id));
  };

  const downloadDoc = async (filePath: string, fileName: string) => {
    try {
      const { data: blob, error } = await ApiAdapter.storage.download('hiring-documents', filePath);
      if (error) throw error;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error('Erro ao baixar', { description: traduzErro(e?.message) });
    }
  };

  const requestRemove = (docs: any[]) => {
    if (docs.length === 0) return;
    setConfirmDelete({ docs });
  };

  const executeRemove = async () => {
    if (!confirmDelete) return;
    const docs = confirmDelete.docs;
    setDeleting(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const doc of docs) {
        await hrApi.removeHiringDocument(doc.id, candidate?.id || '', professor?.id || null, doc.file_name);
        ok++;
      }
      if (ok > 0) {
        toast.success(
          ok === 1 ? 'Documento removido' : `${ok} documento(s) removido(s)`,
          fail > 0 ? { description: `${fail} falha(s)` } : undefined,
        );
      }
      setSelectedIds(new Set());
      await loadExisting();
      onUploaded();
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(originals.map((d) => d.id)) : new Set());
  };

  const handleSubmit = async () => {
    if (!organizationId || !candidate || !professor) return;
    const valid = pending.filter((p) => p.title.trim() && p.status !== 'done');
    if (valid.length === 0) { toast.error('Adicione pelo menos um documento'); return; }
    setSubmitting(true);
    setProgress({ current: 0, total: valid.length });
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < valid.length; i++) {
        const item = valid[i];
        setProgress({ current: i + 1, total: valid.length });
        updatePending(item.id, { status: 'uploading', errorMsg: undefined });
        const newId = crypto.randomUUID();
        const filePath = `${organizationId}/${professor.id}/${candidate.id}/${newId}_ORIGINAL.pdf`;
        const { error: upErr } = await ApiAdapter.storage.upload('hiring-documents', filePath, item.file, { contentType: 'application/pdf', upsert: false });
        if (upErr) {
          const msg = traduzErro(upErr.message);
          updatePending(item.id, { status: 'error', errorMsg: msg });
          toast.error(item.title, { description: msg });
          failCount++;
          continue;
        }
        try {
          await hrApi.createHiringDocument({
            id: newId,
            candidate_id: candidate.id,
            organization_id: organizationId,
            professor_id: professor.id,
            doc_kind: item.docKind,
            title: item.title.trim(),
            version: 1,
            kind: 'ORIGINAL',
            file_path: filePath,
            file_name: item.file.name,
            file_size: item.file.size,
            mime_type: 'application/pdf',
          });
        } catch (insErr: any) {
          await ApiAdapter.storage.remove('hiring-documents', [filePath]);
          const msg = traduzErro(insErr.message);
          updatePending(item.id, { status: 'error', errorMsg: msg });
          toast.error(item.title, { description: msg });
          failCount++;
          continue;
        }
        updatePending(item.id, { status: 'done' });
        okCount++;
      }
      if (okCount > 0) {
        // Status do candidato é recalculado automaticamente pelo trigger
        // trg_hr_hiring_docs_recompute em hr_hiring_documents.

        if (failCount === 0) {
          toast.success('Todos os documentos cadastrados para assinatura', {
            description: `${okCount} arquivo(s) prontos para o professor assinar.`,
          });
        } else {
          toast.success(`${okCount} documento(s) anexado(s) · ${failCount} com erro`);
        }
        await loadExisting();
        onUploaded();
        // remove os concluídos com sucesso, mantém os que deram erro p/ retry
        setPending((p) => p.filter((it) => it.status !== 'done'));
      }
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const totalSize = pending.reduce((s, p) => s + p.file.size, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-lg">
        <DialogHeader className="bg-[#FFDA45] px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-[#1B1E2C] space-y-1 shrink-0">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-[#1B1E2C] font-bold text-base sm:text-lg pr-8">
            <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-md bg-[#1B1E2C] text-[#FFDA45]">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="truncate">Documentos para assinatura</span>
          </DialogTitle>
          <DialogDescription className="text-[#1B1E2C]/80 text-xs sm:text-sm">
            Anexe um ou mais PDFs. Cada documento ficará disponível para o professor baixar pelo link externo e devolver assinado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          {/* Callout de orientação em destaque */}
          <div className="rounded-md border-2 border-[#1B1E2C] bg-[#FFDA45]/25 p-3 sm:p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md bg-[#1B1E2C] text-[#FFDA45]">
                <Info className="h-4 w-4" />
              </span>
              <div className="space-y-1 text-[#1B1E2C]">
                <p className="text-sm font-bold uppercase tracking-wide leading-tight">
                  Você pode anexar vários documentos
                </p>
                <p className="text-xs sm:text-sm leading-snug">
                  Arraste ou selecione <strong>quantos PDFs forem necessários</strong> — contrato, aditivo, ficha de registro, vale transporte, etc. Cada arquivo recebe <strong>título</strong> e <strong>tipo</strong> próprios e fica disponível para o professor baixar e devolver assinado. Volte a esta janela quantas vezes precisar para adicionar mais anexos.
                </p>
              </div>
            </div>
          </div>

          {/* Acompanhamento dos já anexados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Já anexados {originals.length > 0 && <Badge variant="secondary" className="text-[10px]">{originals.length}</Badge>}
              </Label>
              {originals.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {originals.filter((d) => signedByParent.has(d.id)).length}/{originals.length} assinados
                </span>
              )}
            </div>

            {/* Barra de seleção em massa */}
            {originals.length > 0 && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-2.5 py-1.5">
                <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === originals.length}
                    onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                    aria-label="Selecionar todos"
                  />
                  <span className="text-muted-foreground">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} selecionado(s)`
                      : 'Selecionar todos'}
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7"
                    onClick={() => requestRemove(originals.filter((d) => selectedIds.has(d.id)))}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir selecionados ({selectedIds.size})
                  </Button>
                )}
              </div>
            )}

            {loadingExisting ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : originals.length === 0 ? (
              <div className="rounded-md border border-dashed text-center py-4 text-xs text-muted-foreground">
                Nenhum documento anexado ainda.
              </div>
            ) : (
              <ScrollArea className="h-[220px] rounded-md border">
                <ul className="divide-y">
                  {originals.map((doc) => {
                    const signed = signedByParent.get(doc.id);
                    const isSelected = selectedIds.has(doc.id);
                    return (
                      <li
                        key={doc.id}
                        className={cn(
                          'px-3 py-2 flex items-center gap-2 text-sm transition-colors',
                          isSelected && 'bg-destructive/5',
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => toggleSelect(doc.id, Boolean(v))}
                          aria-label={`Selecionar ${doc.title}`}
                        />
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{doc.title}</span>
                            <Badge variant="outline" className="text-[10px]">{DOC_KIND_LABEL[doc.doc_kind] || doc.doc_kind}</Badge>
                            {signed ? (
                              <Badge className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-600/90">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Assinado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                                <Clock className="mr-1 h-3 w-3" /> Aguardando
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Enviado em {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadDoc(doc.file_path, doc.file_name)} title="Baixar">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {signed && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadDoc(signed.file_path, signed.file_name)} title="Baixar assinado">
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => requestRemove([doc])} title="Remover">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Novos a anexar */}
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FilePlus2 className="h-3.5 w-3.5" />
                Novos documentos {pending.length > 0 && <Badge variant="secondary" className="text-[10px]">{pending.length}</Badge>}
              </Label>
              {pending.length > 0 && (
                <span className="text-[11px] text-muted-foreground">{(totalSize / 1024).toFixed(0)} KB no total</span>
              )}
            </div>

            <div
              className={cn(
                'rounded-md border-2 border-dashed p-4 text-center transition-colors',
                'hover:border-primary/50 hover:bg-muted/30 cursor-pointer',
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); handleFilesPicked(e.dataTransfer.files); }}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-medium">Arraste PDFs aqui ou clique para selecionar</p>
              <p className="text-[11px] text-muted-foreground">Você pode selecionar vários arquivos de uma vez</p>
              <Input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFilesPicked(e.target.files)}
              />
            </div>

            {pending.length > 0 && (
              <ScrollArea className="flex-1 min-h-[120px] rounded-md border">
                <ul className="divide-y">
                  {pending.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        'p-2 space-y-2 transition-colors',
                        item.status === 'done' && 'bg-emerald-50/60',
                        item.status === 'error' && 'bg-destructive/5',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {item.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 mt-2 shrink-0 text-emerald-600" />
                        ) : item.status === 'uploading' ? (
                          <Loader2 className="h-4 w-4 mt-2 shrink-0 animate-spin text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 mt-2 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Título
                            </Label>
                            <Input
                              placeholder="Título do documento"
                              value={item.title}
                              onChange={(e) => updatePending(item.id, { title: e.target.value })}
                              disabled={submitting || item.status === 'done'}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Tipo
                            </Label>
                            <Select value={item.docKind} onValueChange={(v) => updatePending(item.id, { docKind: v })} disabled={submitting || item.status === 'done'}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DOC_KIND_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          {item.status === 'done' && (
                            <Badge className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-600/90">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Cadastrado
                            </Badge>
                          )}
                          {item.status === 'uploading' && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                              Enviando…
                            </Badge>
                          )}
                          {item.status === 'error' && (
                            <Badge variant="destructive" className="text-[10px]">Erro</Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => removePending(item.id)}
                            disabled={submitting}
                            title="Remover da lista"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className={cn(
                        'text-[11px] pl-6 truncate',
                        item.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
                      )}>
                        {item.status === 'error' && item.errorMsg
                          ? `${item.file.name} — ${item.errorMsg}`
                          : `${item.file.name} • ${(item.file.size / 1024).toFixed(0)} KB`}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 shrink-0">
          {progress && (
            <span className="text-xs text-muted-foreground mr-auto">
              Enviando {progress.current} de {progress.total}...
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {pending.length === 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || pending.length === 0}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {submitting ? 'Enviando...' : `Anexar ${pending.length || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmação de remoção (single ou bulk) */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o && !deleting) setConfirmDelete(null); }}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {confirmDelete && confirmDelete.docs.length > 1
                ? `Remover ${confirmDelete.docs.length} documentos?`
                : `Remover documento?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Esta ação <strong>não pode ser desfeita</strong> e fica registrada na auditoria
                  do sistema (data, hora e usuário responsável).
                </p>
                {confirmDelete && (
                  <div className="rounded-md border bg-muted/40 max-h-40 overflow-auto">
                    <ul className="divide-y text-[12.5px]">
                      {confirmDelete.docs.map((d) => (
                        <li key={d.id} className="px-3 py-1.5 flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate flex-1">{d.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {DOC_KIND_LABEL[d.doc_kind] || d.doc_kind}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  O professor não conseguirá mais baixar nem assinar {confirmDelete && confirmDelete.docs.length > 1 ? 'estes documentos' : 'este documento'} pelo link externo.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); executeRemove(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleting
                ? 'Removendo…'
                : confirmDelete && confirmDelete.docs.length > 1
                  ? `Remover ${confirmDelete.docs.length}`
                  : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
