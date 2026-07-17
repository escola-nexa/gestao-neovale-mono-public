import { useState } from 'react';
import { FileText, Image as ImageIcon, Eye, Download } from 'lucide-react';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog';
import type { AbsenceAttachment } from './AbsenceAttachmentsField';

const BUCKET = 'substitution-docs';

function isImage(mime: string) { return mime?.startsWith('image/'); }
function fmtSize(b: number) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function AbsenceAttachmentsViewer({ attachments }: { attachments: AbsenceAttachment[] }) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<AbsenceAttachment | null>(null);

  async function handleDownload(a: AbsenceAttachment) {
    try {
      const { data, error } = await substitutionApi.createSignedUrl(BUCKET, a.path, 600);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      try {
        const { data, error } = await substitutionApi.downloadFile(BUCKET, a.path);
        if (error || !data) throw error;
        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = a.name || 'arquivo';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } catch (e2: any) {
        toast({ title: 'Erro ao baixar', description: e2?.message || e?.message, variant: 'destructive' });
      }
    }
  }

  if (!attachments?.length) {
    return <div className="text-sm text-muted-foreground">Nenhum comprovante anexado ao motivo.</div>;
  }

  return (
    <>
      <ul className="space-y-2">
        {attachments.map((a) => (
          <li key={a.path} className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
            {isImage(a.mime)
              ? <ImageIcon className="h-4 w-4 text-sky-600 shrink-0" />
              : <FileText className="h-4 w-4 text-rose-600 shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{a.name}</div>
              <div className="text-[11px] text-muted-foreground">{a.mime || 'arquivo'} · {fmtSize(a.size)}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPreview(a)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Ver
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDownload(a)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Baixar
            </Button>
          </li>
        ))}
      </ul>
      <AttachmentPreviewDialog
        open={!!preview}
        onOpenChange={(o) => { if (!o) setPreview(null); }}
        bucket={BUCKET}
        path={preview?.path ?? null}
        name={preview?.name ?? ''}
        mime={preview?.mime ?? ''}
      />
    </>
  );
}
