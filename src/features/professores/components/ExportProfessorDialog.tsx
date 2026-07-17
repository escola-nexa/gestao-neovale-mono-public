import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, FileSpreadsheet, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportProfessor, type ExportFormat } from '../utils/exportProfessorRegistration';
import type { ProfessorData } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professor: ProfessorData | null;
}

export function ExportProfessorDialog({ open, onOpenChange, professor }: Props) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!professor) return;
    setBusy(true);
    const toastId = toast.loading('Preparando exportação...');
    try {
      const result: any = await exportProfessor(professor.id, format, includeAttachments, (msg) =>
        toast.loading(msg, { id: toastId })
      );
      if (includeAttachments && result?.failedAttachments > 0) {
        toast.warning(
          `Exportado, mas ${result.failedAttachments} de ${result.totalAttachments} anexo(s) falharam. Veja anexos/_relatorio.txt no ZIP.`,
          { id: toastId, duration: 8000 }
        );
      } else {
        toast.success('Exportação concluída', { id: toastId });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao exportar: ' + (err.message || 'desconhecido'), { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const formatCard = (value: ExportFormat, icon: React.ReactNode, title: string, desc: string) => (
    <button
      type="button"
      onClick={() => setFormat(value)}
      disabled={busy}
      className={cn(
        'flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all',
        format === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        busy && 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', format === value ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar cadastro</DialogTitle>
          <DialogDescription>
            {professor?.full_name ? `Gerar relatório completo de ${professor.full_name}.` : 'Escolha o formato do relatório.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Formato</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {formatCard('pdf', <FileText className="h-5 w-5" />, 'PDF', 'Dados cadastrais')}
              {formatCard('excel', <FileSpreadsheet className="h-5 w-5" />, 'Excel', 'Planilha de dados')}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="include-att" className="text-sm font-medium cursor-pointer">
                  Incluir anexos do professor
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Os anexos serão entregues em um arquivo .zip junto com o relatório principal.
              </p>
            </div>
            <Switch
              id="include-att"
              checked={includeAttachments}
              onCheckedChange={setIncludeAttachments}
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={busy || !professor}>
            {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</>) : 'Exportar cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
