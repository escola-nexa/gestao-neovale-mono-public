import { useEffect, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

interface PDFCanvasPreviewProps {
  pdfBuffer: ArrayBuffer | null;
  title: string;
}

export function PDFCanvasPreview({ pdfBuffer, title }: PDFCanvasPreviewProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBuffer) {
      setPages([]);
      return;
    }

    let cancelled = false;

    const renderPdf = async () => {
      setLoading(true);
      setError(null);
      setPages([]);

      try {
        const loadingTask = getDocument({ data: pdfBuffer });
        const pdf = await loadingTask.promise;
        const renderedPages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) continue;

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
          renderedPages.push(canvas.toDataURL('image/png'));
        }

        if (!cancelled) {
          setPages(renderedPages);
        }

        await loadingTask.destroy();
      } catch (err) {
        console.error('PDF preview render error:', err);
        if (!cancelled) {
          setError('Não foi possível renderizar o PDF nesta visualização.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfBuffer]);

  return (
    <div className="h-full overflow-auto rounded-md border bg-muted/20 p-3">
      {loading && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Gerando visualização do PDF...
        </div>
      )}

      {!loading && error && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!loading && !error && pages.length > 0 && (
        <div className="space-y-4">
          {pages.map((src, index) => (
            <img
              key={`${title}-page-${index + 1}`}
              src={src}
              alt={`${title} - página ${index + 1}`}
              className="w-full rounded-md border bg-background"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </div>
  );
}
