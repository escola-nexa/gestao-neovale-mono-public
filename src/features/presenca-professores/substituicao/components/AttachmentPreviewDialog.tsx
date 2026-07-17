import { useEffect, useState } from 'react';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  path: string | null;
  name: string;
  mime: string;
}

function isImage(mime: string) { return !!mime && mime.startsWith('image/'); }
function isPdf(mime: string) { return mime === 'application/pdf'; }

export function AttachmentPreviewDialog({ open, onOpenChange, bucket, path, name, mime }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!open || !path) { setUrl(null); setErr(null); return; }
    setLoading(true); setErr(null); setUrl(null);
    substitutionApi.createSignedUrl(bucket, path, 600).then(({ data, error }) => {
      if (!alive) return;
      if (error || !data?.signedUrl) {
        setErr(error?.message || 'Não foi possível gerar o link.');
      } else {
        setUrl(data.signedUrl);
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [open, path, bucket]);

  async function handleDownload() {
    if (!path) return;
    try {
      const { data, error } = await substitutionApi.createSignedUrl(bucket, path, 600);
      if (error || !data?.signedUrl) throw error || new Error('URL inválida');
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = name || '';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      // Fallback: blob download
      try {
        const { data, error } = await substitutionApi.downloadFile(bucket, path);
        if (error || !data) throw error;
        const blobUrl = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name || 'arquivo';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } catch (e2: any) {
        toast({ title: 'Erro ao baixar', description: e2?.message || e?.message, variant: 'destructive' });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b">
          <DialogTitle className="truncate pr-8 text-base">{name || 'Arquivo'}</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/30 min-h-[60vh] max-h-[80vh] flex items-center justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}
          {!loading && err && (
            <div className="flex flex-col items-center gap-2 text-sm text-destructive p-8 text-center">
              <AlertTriangle className="h-5 w-5" />
              <div>Não foi possível abrir o arquivo.</div>
              <div className="text-xs text-muted-foreground max-w-md">{err}</div>
            </div>
          )}
          {!loading && !err && url && isImage(mime) && (
            <img src={url} alt={name} className="max-h-[78vh] max-w-full object-contain" />
          )}
          {!loading && !err && url && isPdf(mime) && (
            <iframe
              src={url}
              title={name}
              className="w-full h-[78vh] bg-white"
            />
          )}
          {!loading && !err && url && !isImage(mime) && !isPdf(mime) && (
            <div className="flex flex-col items-center gap-3 p-10 text-sm text-muted-foreground text-center">
              <div>Pré-visualização não disponível para este tipo de arquivo.</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir em nova aba
                  </a>
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-background">
          {url && (
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Nova aba
              </a>
            </Button>
          )}
          <Button size="sm" onClick={handleDownload} disabled={!path}>
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
