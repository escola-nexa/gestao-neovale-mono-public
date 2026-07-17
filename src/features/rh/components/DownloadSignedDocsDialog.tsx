import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { hrApi } from '../api';
import { ApiAdapter } from '@/lib/api-adapter';

const DOC_KIND_LABELS: Record<string, string> = {
  CONTRATO: 'Contrato',
  TERMO: 'Termo',
  ADITIVO: 'Aditivo',
  FICHA_REGISTRO: 'Ficha de registro',
  RENUNCIA_VT: 'Renúncia de vale transporte',
  DECLARACAO_VT: 'Declaração de vale transporte',
  DEPENDENTE_IR: 'Dependente de imposto de renda',
  OUTRO: 'Outro',
};

interface SignedDoc {
  id: string;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  external_ip?: string | null;
  parent_doc_kind?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidateId: string | null;
  candidateName?: string;
}

export function DownloadSignedDocsDialog({ open, onOpenChange, candidateId, candidateName }: Props) {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<SignedDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !candidateId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const allDocs = await hrApi.listHiringDocuments(candidateId);
        if (cancel) return;
        const signedDocs = allDocs.filter(d => d.kind === 'ASSINADO');
        const kindMap = new Map<string, string>();
        allDocs.forEach(d => kindMap.set(d.id, d.doc_kind));
        
        setDocs(signedDocs.map(r => ({
          id: r.id,
          file_path: r.file_path,
          file_name: r.file_name,
          uploaded_at: r.uploaded_at,
          external_ip: r.external_ip,
          parent_doc_kind: r.parent_document_id ? kindMap.get(r.parent_document_id) : null,
        })));
        setSelected(new Set());
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao listar documentos');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, candidateId]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => s.size === docs.length ? new Set() : new Set(docs.map((d) => d.id)));
  };

  const downloadOne = async (doc: SignedDoc) => {
    const tid = toast.loading(`Baixando ${doc.file_name}...`);
    try {
      const { data: blob, error } = await ApiAdapter.storage.download('hiring-documents', doc.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Download iniciado', { id: tid });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao baixar', { id: tid });
    }
  };

  const downloadSelected = async () => {
    const list = docs.filter((d) => selected.has(d.id));
    if (list.length === 0) return;
    setDownloading(true);
    let ok = 0; let fail = 0;
    for (const doc of list) {
      try {
        const { data: blob, error } = await ApiAdapter.storage.download('hiring-documents', doc.file_path);
        if (error) throw error;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        ok++;
        await new Promise((r) => setTimeout(r, 350));
      } catch {
        fail++;
      }
    }
    setDownloading(false);
    if (fail === 0) toast.success(`${ok} arquivo(s) baixado(s)`);
    else toast.warning(`${ok} baixado(s), ${fail} com erro`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-emerald-600" /> Baixar documentos assinados
          </DialogTitle>
          <DialogDescription>
            {candidateName ? `Documentos assinados de ${candidateName}.` : 'Selecione os documentos para baixar.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhum documento assinado disponível ainda.
          </div>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            <div className="flex items-center gap-2 px-2 py-1.5 border-b text-xs text-muted-foreground">
              <Checkbox
                checked={selected.size === docs.length && docs.length > 0}
                onCheckedChange={toggleAll}
                aria-label="Selecionar todos"
              />
              <span className="flex-1">Selecionar todos ({docs.length})</span>
              <span>{selected.size} selecionado(s)</span>
            </div>
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2 px-2">
                  <Checkbox
                    checked={selected.has(d.id)}
                    onCheckedChange={() => toggle(d.id)}
                    aria-label={`Selecionar ${d.file_name}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.parent_doc_kind && (
                        <Badge variant="outline" className="text-[10px]">
                          {DOC_KIND_LABELS[d.parent_doc_kind] || d.parent_doc_kind}
                        </Badge>
                      )}
                      <Badge className="bg-emerald-600 text-white text-[10px]">Assinado</Badge>
                    </div>
                    <p className="text-sm font-medium break-all mt-0.5">{d.file_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Recebido em {format(new Date(d.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      {d.external_ip ? ` • IP ${d.external_ip}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadOne(d)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            onClick={downloadSelected}
            disabled={selected.size === 0 || downloading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            Baixar selecionados ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
