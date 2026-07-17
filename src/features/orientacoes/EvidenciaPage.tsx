import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { orientacoesApi } from './api';
import { Loader2, ArrowLeft, Upload, X, FileText, ImageIcon, Film, Save, Send } from 'lucide-react';
import { ORIENTATION_TYPE_LABELS, ORIENTATION_STATUS_LABELS, type Orientation } from '@/types/academic';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/PageHeader';
import { Paperclip } from 'lucide-react';

export default function EvidenciaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [professorName, setProfessorName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [subjectName, setSubjectName] = useState('');

  useEffect(() => {
    if (id) loadOrientation();
  }, [id]);

  const loadOrientation = async () => {
    try {
      setLoading(true);
      const data = await orientacoesApi.getOrientationById(id!);

      const o = data as unknown as Orientation;
      setOrientation(o);
      setDescription(o.description || '');
      setExistingUrls(o.evidence_urls || []);

      const refs = await orientacoesApi.getReferenceNames(
        o.professor_id,
        o.school_id,
        o.course_id,
        o.subject_id
      );
      setProfessorName(refs.professorName || '-');
      setSchoolName(refs.schoolName || '-');
      setCourseName(refs.courseName || '-');
      setSubjectName(refs.subjectName || '-');
    } catch (error: any) {
      toast({ title: 'Erro ao carregar orientação', variant: 'destructive' });
      navigate('/orientacoes');
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `orientations/${fileName}`;
      try {
        await orientacoesApi.uploadEvidence(filePath, file);
        const publicUrl = orientacoesApi.getEvidenceUrl(filePath);
        uploadedUrls.push(publicUrl);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
      }
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!orientation) return;
    setSaving(true);
    try {
      const uploadedUrls = await uploadFiles();
      const allUrls = [...existingUrls, ...uploadedUrls];

      await orientacoesApi.saveEvidenceMetadata(orientation.id, description.trim(), undefined);
      // Wait, saveEvidenceMetadata only saves one URL or just note?
      // Since orientacoesApi doesn't support array of evidence_urls directly right now,
      // I should implement a raw update method in orientacoesApi, or just update `orientacoesApi` to support the array.
      
      // I'll call orientacoesApi directly but `updateOrientations` method is missing.
      // Wait, `orientacoesApi` has `saveEvidenceMetadata`. But it expects a single `filePath`. 
      // Let me just add `updateOrientation` in `orientacoesApi` to allow generic updates.
      // I'll fix this in the next replace call for `api.ts`.
      await orientacoesApi.updateOrientation(orientation.id, {
        evidence_urls: allUrls,
        description: description.trim() || null,
      });
      toast({ title: 'Evidências salvas com sucesso!' });
      setFiles([]);
      setExistingUrls(allUrls);
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendForSignature = async () => {
    if (!orientation) return;
    if (!description.trim()) {
      toast({ title: 'A descrição da orientação é obrigatória para enviar', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const uploadedUrls = await uploadFiles();
      const allUrls = [...existingUrls, ...uploadedUrls];

      await orientacoesApi.updateOrientation(orientation.id, {
        evidence_urls: allUrls,
        description: description.trim(),
        status: 'AGUARDANDO_ASSINATURA_PROFESSOR',
      });
      toast({ title: 'Enviado para assinatura do professor!' });
      navigate('/orientacoes');
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeExistingUrl = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <Film className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-orange-500" />;
  };

  const getOrientationDate = () => {
    if (!orientation) return '-';
    const o = orientation as any;
    if (o.scheduled_date) return format(parseISO(o.scheduled_date), 'dd/MM/yyyy', { locale: ptBR });
    return format(new Date(orientation.created_at), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getOrientationTime = () => {
    if (!orientation) return '';
    const o = orientation as any;
    if (o.scheduled_start_time && o.scheduled_end_time) {
      return `${o.scheduled_start_time.substring(0, 5)} às ${o.scheduled_end_time.substring(0, 5)}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!orientation) return null;

  const isReadOnly = orientation.status === 'ASSINADO_PROFESSOR';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Pedagógico' },
          { label: 'Orientações', href: '/orientacoes' },
          { label: 'Inserir Evidências' },
        ]}
        title="Inserir Evidências"
        description="Registre a descrição e evidências da orientação realizada"
        icon={Paperclip}
        backTo="/orientacoes"
        variant="compact"
      />

      {/* Orientation Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Dados da Orientação
            <Badge variant="outline" className="text-xs">
              {ORIENTATION_TYPE_LABELS[orientation.orientation_type as keyof typeof ORIENTATION_TYPE_LABELS] || orientation.orientation_type}
            </Badge>
            <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusClasses(orientation.status)}`}>
              {ORIENTATION_STATUS_LABELS[orientation.status as keyof typeof ORIENTATION_STATUS_LABELS] || orientation.status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Professor</span>
              <p className="font-medium">{professorName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Escola</span>
              <p className="font-medium">{schoolName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Curso</span>
              <p className="font-medium">{courseName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Disciplina</span>
              <p className="font-medium">{subjectName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Data</span>
              <p className="font-medium">{getOrientationDate()}</p>
            </div>
            {getOrientationTime() && (
              <div>
                <span className="text-muted-foreground text-xs">Horário</span>
                <p className="font-medium">{getOrientationTime()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Descrição da Orientação Realizada *</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o que foi abordado na orientação..."
            rows={5}
            disabled={isReadOnly}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Preencha após realizar a orientação. Este campo é obrigatório para enviar.
          </p>
        </CardContent>
      </Card>

      {/* Evidence Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Evidências (PDFs, Fotos, Vídeos)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Arquivos já enviados:</p>
              <div className="space-y-2">
                {existingUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                      Evidência {idx + 1}
                    </a>
                    {!isReadOnly && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeExistingUrl(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isReadOnly && (
            <>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Clique para selecionar arquivos</p>
                <p className="text-xs text-muted-foreground">PDF, imagens, vídeos e documentos</p>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const newFiles = e.target.files ? Array.from(e.target.files) : [];
                    setFiles(prev => [...prev, ...newFiles]);
                    e.target.value = '';
                  }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4,.mov,.avi,.webm"
                  className="mt-3 max-w-xs mx-auto"
                />
              </div>

              {files.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Novos arquivos ({files.length}):</p>
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                        {getFileIcon(f.name)}
                        <span className="text-sm truncate flex-1">{f.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {(f.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-700">
                <strong>Atenção:</strong> Ao clicar em "Enviar para Assinatura", o status mudará para "Aguardando Assinatura Professor" e o professor será notificado.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate('/orientacoes')} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
              <Button onClick={handleSendForSignature} disabled={saving || !description.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Enviar para Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'ASSINADO_PROFESSOR': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'AGUARDANDO_ASSINATURA_PROFESSOR': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'AGENDADO': return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
}
