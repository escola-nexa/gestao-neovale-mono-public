import { useState } from 'react';
import { Upload, FileText, Receipt, Download, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useGenerateTSRDeclaration, useGenerateTSRReceipt, useUploadTSRFile,
  getTSRSignedUrl,
} from '../hooks/useTeacherSubstitution';
import { useHasFinancialAccess } from './FinancialAccessGuard';

const TYPE_LABEL: Record<string, string> = {
  declaration: 'Declaração',
  receipt: 'Recibo',
  signed_report: 'Relatório assinado',
  supporting_document: 'Documentação complementar',
  payment_proof: 'Comprovante de pagamento',
  other: 'Outro',
};

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Rascunho', variant: 'outline' },
  generated: { label: 'Gerado', variant: 'secondary' },
  uploaded: { label: 'Enviado', variant: 'secondary' },
  signed: { label: 'Assinado', variant: 'default' },
  approved: { label: 'Aprovado', variant: 'default' },
  rejected: { label: 'Recusado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

interface Props {
  requestId: string;
  organizationId: string;
  status: string;
  canManage: boolean;
  documents: any[];
}

export function SubstitutionDocumentsPanel({
  requestId, organizationId, status, canManage, documents,
}: Props) {
  const { toast } = useToast();
  const hasFinancialAccess = useHasFinancialAccess();
  const genDecl = useGenerateTSRDeclaration();
  const genRec = useGenerateTSRReceipt();
  const upload = useUploadTSRFile();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<'signed_report' | 'supporting_document' | 'payment_proof' | 'other'>('signed_report');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const isCancelled = status === 'cancelled';
  const hasReceipt = documents.some(d => d.document_type === 'receipt' && d.document_status !== 'cancelled');
  const hasDeclaration = documents.some(d => d.document_type === 'declaration' && d.document_status !== 'cancelled');
  const hasSignedReport = documents.some(d => d.document_type === 'signed_report' && d.document_status !== 'cancelled');

  async function openDoc(d: any) {
    try {
      const url = d.storage_path
        ? await getTSRSignedUrl(d.storage_path)
        : d.file_url;
      if (!url) {
        toast({ title: 'Documento sem arquivo disponível', variant: 'destructive' });
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast({ title: 'Erro ao abrir', description: e.message, variant: 'destructive' });
    }
  }

  async function handleGenerate(kind: 'declaration' | 'receipt') {
    try {
      const fn = kind === 'declaration' ? genDecl : genRec;
      const res = await fn.mutateAsync({ id: requestId });
      toast({ title: kind === 'declaration' ? 'Declaração gerada' : 'Recibo gerado' });
      if (res?.signed_url) window.open(res.signed_url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  }

  async function handleUpload() {
    if (!file) { toast({ title: 'Selecione um arquivo', variant: 'destructive' }); return; }
    try {
      await upload.mutateAsync({
        id: requestId, organization_id: organizationId,
        document_type: docType, file, notes: notes || undefined,
      });
      toast({ title: 'Documento enviado' });
      setFile(null); setNotes(''); setUploadOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                size="sm" variant="outline"
                disabled={isCancelled || genDecl.isPending}
                onClick={() => handleGenerate('declaration')}
              >
                {genDecl.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                {hasDeclaration ? 'Regerar declaração' : 'Gerar declaração'}
              </Button>
              {hasFinancialAccess && (
                <Button
                  size="sm" variant="outline"
                  disabled={isCancelled || genRec.isPending}
                  onClick={() => handleGenerate('receipt')}
                >
                  {genRec.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Receipt className="h-4 w-4 mr-1" />}
                  {hasReceipt ? 'Regerar recibo' : 'Gerar recibo'}
                </Button>
              )}
            </>
          )}
          <Button
            size="sm"
            disabled={isCancelled}
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1" /> Enviar documento
          </Button>
        </div>

        {/* Pendência */}
        {!hasSignedReport && !isCancelled && (
          <div className="text-xs px-3 py-2 rounded border border-amber-300 bg-amber-50 text-amber-900">
            Pendente: envio do <strong>relatório assinado</strong> para aprovação de pagamento.
          </div>
        )}

        {/* Lista */}
        <div>
          <div className="text-sm font-medium mb-2">Documentos ({documents.length})</div>
          {documents.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum documento registrado.</div>
          )}
          <div className="space-y-2">
            {documents.map((d: any) => {
              const badge = STATUS_BADGE[d.document_status] ?? { label: d.document_status, variant: 'outline' as const };
              return (
                <div key={d.id} className="border rounded p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {d.file_name || TYPE_LABEL[d.document_type] || d.document_type}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[d.document_type] ?? d.document_type}</Badge>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                      <span>{new Date(d.created_at).toLocaleString('pt-BR')}</span>
                      {d.file_size_bytes ? <span>· {(d.file_size_bytes / 1024).toFixed(0)} KB</span> : null}
                    </div>
                    {d.notes && <div className="text-xs italic mt-1">"{d.notes}"</div>}
                  </div>
                  {(d.storage_path || d.file_url) && (
                    <Button size="sm" variant="outline" onClick={() => openDoc(d)}>
                      <Download className="h-3 w-3 mr-1" /> Abrir
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* Modal de upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de documento</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signed_report">Relatório assinado</SelectItem>
                  <SelectItem value="supporting_document">Documentação complementar</SelectItem>
                  {hasFinancialAccess && (
                    <SelectItem value="payment_proof">Comprovante de pagamento</SelectItem>
                  )}
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo (PDF, PNG, JPG)</Label>
              <Input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button disabled={!file || upload.isPending} onClick={handleUpload}>
              {upload.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
