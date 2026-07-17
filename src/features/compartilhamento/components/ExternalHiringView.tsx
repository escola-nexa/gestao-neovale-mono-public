import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Upload, CheckCircle2, FileText, ShieldCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const DOC_KIND_LABELS: Record<string, string> = {
  CONTRATO: 'Contrato',
  TERMO: 'Termo',
  ADITIVO: 'Aditivo',
  OUTRO: 'Outro',
};

export interface ExternalHiringDoc {
  id: string;
  doc_kind: string;
  title: string;
  file_name: string;
  file_size?: number | null;
  uploaded_at: string;
  original_url: string | null;
  signed: null | { id: string; file_name: string; uploaded_at: string; url: string | null };
}

export interface ExternalHiringContent {
  professor: { id: string; full_name: string; cpf: string | null; registration_code?: string | null } | null;
  candidate: { id: string; status: string; notes?: string | null } | null;
  documents: ExternalHiringDoc[];
}

interface Props {
  data: ExternalHiringContent;
  onUploadSigned: (parentDocumentId: string, file: File) => Promise<void>;
  onLogDownload: (documentId: string) => void;
}

export function ExternalHiringView({ data, onUploadSigned, onLogDownload }: Props) {
  const { professor, documents } = data;
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  if (!professor) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Conteúdo indisponível.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Documentos de contratação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>{professor.full_name}</strong> {professor.cpf && <span className="text-muted-foreground">• CPF {professor.cpf}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            Baixe cada documento, assine (digitalmente ou imprima/assine/digitalize) e envie de volta o PDF assinado em cada item correspondente.
          </p>
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          Nenhum documento foi anexado ainda. Aguarde o R.H. enviar os contratos.
        </CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              uploading={uploadingId === doc.id}
              onDownload={() => onLogDownload(doc.id)}
              onUpload={async (file) => {
                setUploadingId(doc.id);
                try {
                  await onUploadSigned(doc.id, file);
                } finally {
                  setUploadingId(null);
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocRow({ doc, uploading, onDownload, onUpload }: {
  doc: ExternalHiringDoc;
  uploading: boolean;
  onDownload: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Envie um PDF'); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error('Máximo 20MB'); return; }
    try {
      await onUpload(f);
      toast.success('Documento assinado enviado!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <li>
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{DOC_KIND_LABELS[doc.doc_kind] || doc.doc_kind}</Badge>
              <Badge variant="secondary">Original</Badge>
            </div>
            <p className="font-bold text-sm">{doc.title}</p>
            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
            <p className="text-xs text-muted-foreground">Disponibilizado em {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            {doc.original_url && (
              <Button size="sm" variant="default" asChild onClick={onDownload}>
                <a href={doc.original_url} target="_blank" rel="noreferrer" download={doc.file_name}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar para assinar
                </a>
              </Button>
            )}
          </div>
          <div className="space-y-2 md:border-l md:pl-4">
            {doc.signed ? (
              <>
                <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Assinado em {format(new Date(doc.signed.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</Badge>
                <p className="text-xs text-muted-foreground">{doc.signed.file_name}</p>
                <Button size="sm" variant="outline" onClick={handlePick} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                  Reenviar versão assinada
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handlePick} disabled={uploading} className="bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C]">
                {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                Enviar versão assinada
              </Button>
            )}
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            <p className="text-[11px] text-muted-foreground">PDF até 20MB. O envio registra IP e data/hora.</p>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
