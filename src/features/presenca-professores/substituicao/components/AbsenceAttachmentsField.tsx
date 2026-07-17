import { supabase } from '@/integrations/supabase/client';
import { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Eye, Loader2 } from 'lucide-react';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog';

export type AbsenceAttachment = {
  name: string;
  path: string;
  mime: string;
  size: number;
  uploaded_at: string;
};

const BUCKET = 'substitution-docs';
const MAX_FILES = 10;
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPT = 'image/*,application/pdf';

function isImage(mime: string) { return mime.startsWith('image/'); }
function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  value: AbsenceAttachment[];
  onChange: (next: AbsenceAttachment[]) => void;
  organizationId: string;
  batchTempId: string;
}

export function AbsenceAttachmentsField({ value, onChange, organizationId, batchTempId }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<AbsenceAttachment | null>(null);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    if (value.length + arr.length > MAX_FILES) {
      toast({ title: `Máximo de ${MAX_FILES} arquivos`, variant: 'destructive' });
      return;
    }
    const invalid = arr.find(f => f.size > MAX_SIZE);
    if (invalid) {
      toast({ title: 'Arquivo muito grande', description: `"${invalid.name}" excede 20 MB.`, variant: 'destructive' });
      return;
    }
    const wrongType = arr.find(f => !(f.type.startsWith('image/') || f.type === 'application/pdf'));
    if (wrongType) {
      toast({ title: 'Tipo não suportado', description: 'Use apenas imagens ou PDF.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const uploaded: AbsenceAttachment[] = [];
    try {
      for (const f of arr) {
        const safeName = f.name.replace(/[^\w.\-]+/g, '_');
        const path = `${organizationId}/absence/${batchTempId}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
          contentType: f.type, upsert: false,
        });
        if (error) throw error;
        uploaded.push({
          name: f.name, path, mime: f.type, size: f.size,
          uploaded_at: new Date().toISOString(),
        });
      }
      onChange([...value, ...uploaded]);
    } catch (e: any) {
      toast({ title: 'Falha no upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  function handleView(att: AbsenceAttachment) {
    setPreview(att);
  }

  async function handleRemove(att: AbsenceAttachment) {
    try {
      await substitutionApi.removeFile(BUCKET, att.path);
    } catch { /* ignore */ }
    onChange(value.filter(a => a.path !== att.path));
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors',
          'bg-white/60 dark:bg-amber-950/10',
          dragOver
            ? 'border-amber-500 bg-amber-100/60 dark:bg-amber-900/20'
            : 'border-amber-300/70 hover:border-amber-400 hover:bg-amber-50/80 dark:border-amber-800 dark:hover:bg-amber-950/20',
        )}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-sm">
            <Upload className="h-6 w-6 text-amber-600" />
            <div className="font-medium">Clique ou arraste arquivos aqui</div>
            <div className="text-xs text-muted-foreground">
              PDF ou imagens · até {MAX_FILES} arquivos · 20 MB cada
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((a) => (
            <li
              key={a.path}
              className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
            >
              {isImage(a.mime)
                ? <ImageIcon className="h-4 w-4 text-sky-600 shrink-0" />
                : <FileText className="h-4 w-4 text-rose-600 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.mime || 'arquivo'} · {fmtSize(a.size)}
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => handleView(a)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> Ver
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                onClick={() => handleRemove(a)}
                title="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AttachmentPreviewDialog
        open={!!preview}
        onOpenChange={(o) => { if (!o) setPreview(null); }}
        bucket={BUCKET}
        path={preview?.path ?? null}
        name={preview?.name ?? ''}
        mime={preview?.mime ?? ''}
      />
    </div>
  );
}
