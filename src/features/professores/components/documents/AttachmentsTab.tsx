import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Download, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { ProfessorDocFile } from '../../hooks/useProfessorDocuments';

interface Props {
  files: ProfessorDocFile[];
  canEdit: boolean;
  gender?: string | null;
  onUpload: (file: File, category: string) => Promise<void>;
  onDelete: (file: ProfessorDocFile) => Promise<void>;
  onGetUrl: (path: string) => Promise<string | null>;
}

interface RequiredDoc {
  value: string;
  label: string;
  description?: string;
  optional?: boolean;
  /** URL pública do PDF modelo (em /public). Quando definido, exibe botão "Baixar modelo". */
  templateUrl?: string;
  /** Orientações em destaque (Neovale yellow + dark blue). */
  highlight?: {
    title: string;
    body: React.ReactNode;
  };
}

const buildRequiredDocs = (gender?: string | null): RequiredDoc[] => {
  const isMale = gender === 'Homem';
  return [
    {
      value: 'declaracao_etnia',
      label: 'Autodeclaração Étnico-Racial',
      description: 'Lei nº 12.288/2010 — obrigatório para formalização do contrato',
      templateUrl: '/documentos/Autodeclaracao_Etnico_Racial.pdf',
      highlight: {
        title: 'Documento obrigatório para a formalização do contrato',
        body: (
          <>
            <p>
              Acesse a <strong>Autodeclaração Étnico-Racial</strong>, documento de preenchimento{' '}
              <strong>obrigatório e indispensável</strong> para a formalização do seu contrato.
            </p>
            <p className="mt-2 font-semibold">Após o preenchimento, a assinatura poderá ser realizada de duas formas:</p>
            <ul className="mt-1 space-y-1">
              <li className="flex gap-2">
                <span>✅</span>
                <span><strong>Impressão + assinatura manuscrita</strong> — imprima o documento, assine à mão e envie uma foto ou scan; ou</span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>Assinatura eletrônica via Gov.br</strong> —{' '}
                  <a
                    href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    saiba mais
                  </a>
                </span>
              </li>
            </ul>
            <p className="mt-2 italic text-xs">
              Cadastre o documento assinado o quanto antes — sua ausência impede o prosseguimento do processo de contratação.
            </p>
          </>
        ),
      },
    },
    { value: 'aso', label: 'Exame admissional (ASO)' },
    { value: 'foto_3x4', label: 'Fotos 3x4' },
    { value: 'carteira_trabalho', label: 'Cópia da Carteira de Trabalho e Previdência Social (CTPS)' },
    { value: 'rg', label: 'Cópia do RG ou RNE para estrangeiros' },
    { value: 'cpf', label: 'Cópia do CPF' },
    { value: 'titulo_eleitor', label: 'Cópia do Título de Eleitor' },
    { value: 'certidao_casamento', label: 'Cópia da certidão de casamento', description: 'Se aplicável', optional: true },
    { value: 'comprovante_residencia', label: 'Comprovante de residência em seu nome' },
    { value: 'diploma', label: 'Cópia do comprovante de escolaridade (diploma)' },
    {
      value: 'reservista',
      label: 'Cópia do certificado de alistamento militar ou reservista',
      description: isMale
        ? 'Obrigatório para homens entre 18 e 45 anos'
        : 'Para homens entre 18 e 45 anos',
      optional: !isMale,
    },
    { value: 'estado_civil_conjuge', label: 'Estado Civil (se casado, nome do cônjuge)', description: 'Declaração ou documento comprobatório', optional: true },
    { value: 'documentacao_dependentes', label: 'Documentação para dependentes (Certidão de Nascimento / CPF)', description: 'Se aplicável', optional: true },
    { value: 'atestado_sanidade', label: 'Atestado de sanidade física e mental', description: 'Diferente do ASO admissional', optional: true },
    { value: 'certidao_justica_eleitoral', label: 'Certidão da Justiça Eleitoral (Regional/Federal)' },
    { value: 'certidao_estadual_criminal', label: 'Certidão Estadual Criminal' },
    { value: 'certidao_acoes_criminais', label: 'Certidão de Ações Criminais' },
    { value: 'certidao_judicial_criminal_negativa', label: 'Certidão Judicial Criminal Negativa (Regional/Federal)' },
    { value: 'certidao_antecedentes_criminais', label: 'Certidão de Antecedentes Criminais' },
    { value: 'certidao_acoes_civeis', label: 'Certidão de Ações Cíveis' },
    { value: 'certidao_judicial_civel', label: 'Certidão Judicial Cível' },
  ];
};

const ACCEPT_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*';
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const formatSize = (bytes: number | null | undefined) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const isImage = (mime?: string | null, name?: string) => {
  if (mime?.startsWith('image/')) return true;
  if (name && /\.(jpe?g|png|webp|gif)$/i.test(name)) return true;
  return false;
};

export function AttachmentsTab({ files, canEdit, gender, onUpload, onDelete, onGetUrl }: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const REQUIRED_DOCUMENTS = buildRequiredDocs(gender);

  const handleFileChange = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error('Arquivo excede o limite de 20MB');
      return;
    }
    const validType = file.type === 'application/pdf' || file.type.startsWith('image/');
    if (!validType) {
      toast.error('Apenas arquivos PDF ou imagem são permitidos');
      return;
    }
    setUploadingKey(category);
    await onUpload(file, category);
    setUploadingKey(null);
    if (inputRefs.current[category]) inputRefs.current[category]!.value = '';
  };

  const handleView = async (file: ProfessorDocFile) => {
    const url = await onGetUrl(file.file_path);
    if (url) window.open(url, '_blank');
  };

  const filesByCategory = (cat: string) => files.filter(f => f.category === cat);
  const otherFiles = files.filter(f => !REQUIRED_DOCUMENTS.some(r => r.value === f.category));

  const requiredCount = REQUIRED_DOCUMENTS.filter(d => !d.optional).length;
  const completedRequired = REQUIRED_DOCUMENTS.filter(d => !d.optional && filesByCategory(d.value).length > 0).length;
  const missingRequired = REQUIRED_DOCUMENTS.filter(d => !d.optional && filesByCategory(d.value).length === 0);
  const progressPct = requiredCount > 0 ? Math.round((completedRequired / requiredCount) * 100) : 0;
  const allComplete = completedRequired === requiredCount;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Documentos obrigatórios</p>
              <p className="text-xs text-muted-foreground">
                {completedRequired} de {requiredCount} documentos enviados
              </p>
            </div>
            <Badge variant={allComplete ? 'default' : 'secondary'}>
              {allComplete ? 'Completo' : `${progressPct}%`}
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Missing required documents alert */}
      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {missingRequired.length === 1
              ? '1 documento obrigatório pendente'
              : `${missingRequired.length} documentos obrigatórios pendentes`}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              {missingRequired.map(doc => (
                <li key={doc.value}>{doc.label}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Required documents checklist */}
      <div className="space-y-3">
        {REQUIRED_DOCUMENTS.map(doc => {
          const items = filesByCategory(doc.value);
          const hasFiles = items.length > 0;
          const isMissingRequired = !hasFiles && !doc.optional;
          const inputId = `upload-${doc.value}`;
          const isUploading = uploadingKey === doc.value;

          return (
            <Card
              key={doc.value}
              className={
                doc.highlight
                  ? 'relative overflow-hidden border-[3px] border-[#FFDA45] ring-4 ring-[#FFDA45]/25 shadow-[0_18px_38px_-14px_rgba(255,218,69,0.55)]'
                  : hasFiles
                    ? 'border-primary/30'
                    : isMissingRequired
                      ? 'border-destructive/50 bg-destructive/5'
                      : ''
              }
            >
              {doc.highlight && (
                <div className="relative bg-[#1B1E2C] text-white px-4 py-3 overflow-hidden">
                  {/* Barras diagonais Neovale */}
                  <div className="absolute top-2 right-3 flex gap-1 rotate-[-18deg] opacity-90 pointer-events-none">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className="h-7 w-1 bg-[#FFDA45] rounded-full" />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold bg-[#FFDA45] text-[#1B1E2C] px-2 py-0.5 rounded-full animate-pulse">
                      ★ Prioridade
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#FFDA45]/90 font-semibold">
                      Documento obrigatório
                    </span>
                  </div>
                </div>
              )}
              <CardContent className={doc.highlight ? 'pt-4 space-y-3 bg-[#FFDA45]/5' : 'pt-4 space-y-3'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {hasFiles ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    ) : isMissingRequired ? (
                      <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${doc.highlight ? 'text-[#1B1E2C]' : 'text-destructive'}`} />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`leading-snug ${doc.highlight ? 'text-base font-bold text-[#1B1E2C]' : 'text-sm font-medium'}`}>
                        {doc.label}
                        {doc.optional ? (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0">Opcional</Badge>
                        ) : (
                          <span className="text-destructive ml-1">*</span>
                        )}
                        {isMissingRequired && (
                          <Badge variant="destructive" className="ml-2 text-[10px] py-0">Obrigatório pendente</Badge>
                        )}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <>
                      <input
                        ref={el => (inputRefs.current[doc.value] = el)}
                        type="file"
                        accept={ACCEPT_TYPES}
                        onChange={e => handleFileChange(doc.value, e)}
                        className="hidden"
                        id={inputId}
                        disabled={isUploading}
                      />
                      {!doc.highlight && (
                        <Button
                          asChild
                          size="sm"
                          variant={hasFiles ? 'outline' : 'default'}
                          disabled={isUploading}
                        >
                          <label htmlFor={inputId} className="cursor-pointer">
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1" />
                            )}
                            {hasFiles ? 'Adicionar' : 'Anexar assinado'}
                          </label>
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Highlight box (orientações) */}
                {doc.highlight && (
                  <div className="rounded-lg border-2 border-[#FFDA45] bg-white p-4 ml-7 space-y-2 text-sm text-foreground shadow-sm">
                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B1E2C]">
                      {doc.highlight.title}
                    </div>
                    <div className="leading-relaxed">{doc.highlight.body}</div>
                  </div>
                )}

                {(doc.templateUrl || (doc.highlight && canEdit)) && (
                  <div className="ml-7 flex flex-wrap items-center gap-2">
                    {doc.templateUrl && (
                      <a href={doc.templateUrl} download target="_blank" rel="noopener noreferrer">
                        <Button
                          type="button"
                          className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-bold shadow-md"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar modelo PDF
                        </Button>
                      </a>
                    )}
                    {doc.highlight && canEdit && (
                      <Button
                        asChild
                        type="button"
                        disabled={isUploading}
                        variant={hasFiles ? 'outline' : 'default'}
                        className={!hasFiles ? 'bg-[#1B1E2C] text-white hover:bg-[#1B1E2C]/90 font-semibold' : ''}
                      >
                        <label htmlFor={inputId} className="cursor-pointer">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {hasFiles ? 'Adicionar assinado' : 'Anexar assinado'}
                        </label>
                      </Button>
                    )}
                  </div>
                )}


                {/* Attached files list */}
                {items.length > 0 && (
                  <div className="space-y-2 pl-7">
                    {items.map(file => (
                      <div key={file.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                        {isImage(file.mime_type, file.file_name) ? (
                          <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{file.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(file)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(file)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legacy / other files (uploaded under categories no longer in checklist) */}
      {otherFiles.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Outros anexos</h3>
          <div className="space-y-2">
            {otherFiles.map(file => (
              <div key={file.id} className="flex items-center gap-2 p-2 rounded-md border">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {file.category} · {formatSize(file.file_size)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(file)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(file)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Aceita PDF ou imagens (JPG, PNG, WEBP). Tamanho máximo: 20MB.
      </p>
    </div>
  );
}
