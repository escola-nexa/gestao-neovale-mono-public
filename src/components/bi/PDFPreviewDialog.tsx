import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PDFCanvasPreview } from '@/components/bi/PDFCanvasPreview';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBuffer: ArrayBuffer | null;
  title: string;
  onDownload?: () => void;
}

export function PDFPreviewDialog({ open, onOpenChange, pdfBuffer, title, onDownload }: PDFPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0" aria-describedby={undefined}>
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={onDownload}>
                <Download className="h-3 w-3" />
                Baixar PDF
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 px-4 pb-4 min-h-0">
          <PDFCanvasPreview pdfBuffer={pdfBuffer} title={title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
