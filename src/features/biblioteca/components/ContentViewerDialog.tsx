import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { bibliotecaApi } from '@/features/biblioteca/api';
import type { LibraryContentWithRefs } from '../types';

GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: LibraryContentWithRefs | null;
}

function getYoutubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // /embed/ID ou /shorts/ID
      const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (m) return `https://www.youtube.com/embed/${m[2]}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function canvasToImageUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  return blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');
}

async function renderPdfToImages(
  pdfData: ArrayBuffer,
  signal: AbortSignal,
  onPage: (pageUrl: string, pageNumber: number, totalPages: number) => void,
): Promise<void> {
  const loadingTask = getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (signal.aborted) break;

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('canvas indisponível');

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const pageUrl = await canvasToImageUrl(canvas);
      if (!signal.aborted) onPage(pageUrl, pageNumber, pdf.numPages);
    }
  } finally {
    await loadingTask.destroy();
  }
}

function PdfNativeViewer({ storagePath, title }: { storagePath: string; title: string }) {
  // Renderização 100% nativa via PDF.js (sem iframe/visualizador do navegador).
  // Baixa o arquivo via SDK do Supabase e converte cada página para imagem.
  const [pages, setPages] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const createdUrls: string[] = [];
    setRendering(true);
    setPages([]);
    setError(null);
    setTotalPages(null);

    (async () => {
      try {
        const { data, error: dlErr } = await bibliotecaApi.client.storage
          .from('library-content')
          .download(storagePath);
        if (dlErr || !data) throw dlErr || new Error('download falhou');
        const buffer = await data.arrayBuffer();
        if (controller.signal.aborted) return;

        await renderPdfToImages(buffer, controller.signal, (pageUrl, _pn, total) => {
          createdUrls.push(pageUrl);
          setTotalPages(total);
          setPages((curr) => [...curr, pageUrl]);
        });
      } catch (err) {
        console.error('[Biblioteca] PDF.js falhou:', err);
        if (!controller.signal.aborted) {
          setError('Não foi possível abrir o PDF nesta visualização. Use o botão "Baixar" para abrir o arquivo no seu dispositivo.');
        }
      } finally {
        if (!controller.signal.aborted) setRendering(false);
      }
    })();

    return () => {
      controller.abort();
      createdUrls.forEach((u) => { if (u.startsWith('blob:')) URL.revokeObjectURL(u); });
    };
  }, [storagePath]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
        <p className="font-medium">Não foi possível visualizar o PDF</p>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {rendering && (
          <div className="rounded-md border bg-background px-3 py-2 text-center text-sm text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            {totalPages ? `Carregando páginas ${pages.length} de ${totalPages}...` : 'Preparando visualização...'}
          </div>
        )}
        {pages.map((src, index) => (
          <img
            key={`${title}-pdf-page-${index + 1}`}
            src={src}
            alt={`${title} - página ${index + 1}`}
            className="w-full rounded-md border bg-background shadow-sm"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}



export function ContentViewerDialog({ open, onOpenChange, item }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = item?.content_type ?? null;
  const isFile = type === 'pdf' || type === 'image' || type === 'video';

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    setError(null);
    if (!open || !item) return;

    if (isFile && item.storage_path) {
      setLoading(true);
      (async () => {
        try {
          const { data, error: signErr } = await bibliotecaApi.client.storage
            .from('library-content')
            .createSignedUrl(item.storage_path!, 60 * 60);
          if (signErr || !data?.signedUrl) {
            throw signErr || new Error('signed url missing');
          }
          if (cancelled) return;
          setSignedUrl(data.signedUrl);
        } catch (e) {
          if (!cancelled) {
            setError('Não foi possível carregar o arquivo. Verifique sua conexão, suas permissões de acesso ou se o arquivo ainda existe na biblioteca.');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [open, item, isFile, type]);

  const handleDownload = async () => {
    if (!item?.storage_path) return;
    const filename = item.storage_path.split('/').pop() || 'arquivo';
    try {
      const { data, error } = await bibliotecaApi.client.storage
        .from('library-content')
        .download(item.storage_path);
      if (error || !data) throw error || new Error('falha');
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch {
      // fallback: abre signed url se disponível
      if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">{item.title}</DialogTitle>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {isFile && item.storage_path && (
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1.5" /> Baixar
                </Button>
              )}
              {!isFile && item.content_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(item.content_url!, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir em nova aba
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30">
          {loading && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
              <p className="font-medium">Erro ao carregar</p>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {type === 'pdf' && item.storage_path && (
                <PdfNativeViewer
                  storagePath={item.storage_path}
                  title={item.title}
                />
              )}


              {type === 'image' && signedUrl && (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <img src={signedUrl} alt={item.title} className="max-w-full max-h-full object-contain" />
                </div>
              )}

              {type === 'video' && signedUrl && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <video src={signedUrl} controls className="max-w-full max-h-full" />
                </div>
              )}

              {type === 'video_link' && item.content_url && (() => {
                const embed = getYoutubeEmbed(item.content_url);
                return embed ? (
                  <iframe
                    src={embed}
                    title={item.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                    <p className="text-muted-foreground">Não foi possível incorporar este vídeo.</p>
                    <Button onClick={() => window.open(item.content_url!, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir vídeo
                    </Button>
                  </div>
                );
              })()}

              {type === 'link' && item.content_url && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                  <ExternalLink className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Conteúdo externo</p>
                  <p className="text-sm text-muted-foreground break-all max-w-xl">{item.content_url}</p>
                  <Button onClick={() => window.open(item.content_url!, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir link
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
