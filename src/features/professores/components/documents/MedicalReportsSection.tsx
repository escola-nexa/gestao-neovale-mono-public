import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Stethoscope, Upload, Trash2, Download, FileText, Image as ImageIcon, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfessorMedicalReport } from '../../hooks/useProfessorDocuments';

interface Props {
  reports: ProfessorMedicalReport[];
  canEdit: boolean;
  onAdd: (cidCode: string, description: string | null, file: File | null) => Promise<void>;
  onDelete: (report: ProfessorMedicalReport) => Promise<void>;
  onGetUrl: (path: string) => Promise<string | null>;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPT_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*';

const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const isImage = (mime?: string | null, name?: string | null) => {
  if (mime?.startsWith('image/')) return true;
  if (name && /\.(jpe?g|png|webp|gif)$/i.test(name)) return true;
  return false;
};

export function MedicalReportsSection({ reports, canEdit, onAdd, onDelete, onGetUrl }: Props) {
  const [cidCode, setCidCode] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error('Arquivo excede o limite de 20MB');
      return;
    }
    const validType = f.type === 'application/pdf' || f.type.startsWith('image/');
    if (!validType) {
      toast.error('Apenas arquivos PDF ou imagem são permitidos');
      return;
    }
    setFile(f);
  };

  const handleAdd = async () => {
    if (!cidCode.trim() && !description.trim() && !file) {
      toast.error('Informe ao menos o CID-10, descrição ou anexo');
      return;
    }
    setSubmitting(true);
    await onAdd(cidCode.trim().toUpperCase() || 'N/A', description.trim() || null, file);
    setSubmitting(false);
    setCidCode('');
    setDescription('');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleView = async (path?: string | null) => {
    if (!path) return;
    const url = await onGetUrl(path);
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Laudos médicos (CID-10)</h3>
      </div>

      {canEdit && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>CID-10 (opcional)</Label>
                <Input
                  placeholder="Ex: F41.1"
                  value={cidCode}
                  onChange={e => setCidCode(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  placeholder="Breve descrição do laudo"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_TYPES}
                onChange={handleFileChange}
                className="hidden"
                id="medical-report-file"
              />
              <Button asChild variant="outline" size="sm">
                <label htmlFor="medical-report-file" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {file ? 'Trocar arquivo' : 'Anexar laudo (PDF/Imagem)'}
                </label>
              </Button>
              {file && (
                <span className="text-xs text-muted-foreground truncate">
                  {file.name} ({formatSize(file.size)})
                </span>
              )}
              <div className="flex-1" />
              <Button onClick={handleAdd} disabled={submitting || (!cidCode.trim() && !description.trim() && !file)} size="sm">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar laudo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum laudo cadastrado.
        </p>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex items-start gap-3">
                {r.file_path ? (
                  isImage(r.mime_type, r.file_name) ? (
                    <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )
                ) : (
                  <Stethoscope className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {r.cid_code}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-sm mt-1">{r.description}</p>
                  )}
                  {r.file_name && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {r.file_name} · {formatSize(r.file_size)}
                    </p>
                  )}
                </div>
                {r.file_path && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(r.file_path)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
