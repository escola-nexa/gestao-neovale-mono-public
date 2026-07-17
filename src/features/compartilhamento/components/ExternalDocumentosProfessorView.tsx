import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ShieldCheck, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { ProfessorChild, ProfessorDocFile, ProfessorDocumentData, ProfessorMedicalReport } from '@/features/professores/hooks/useProfessorDocuments';
import { PersonalDataTab } from '@/features/professores/components/documents/PersonalDataTab';
import { DocumentsTab } from '@/features/professores/components/documents/DocumentsTab';
import { AddressContactTab } from '@/features/professores/components/documents/AddressContactTab';
import { BankingTab } from '@/features/professores/components/documents/BankingTab';
import { FamilyTab } from '@/features/professores/components/documents/FamilyTab';
import { AttachmentsTab } from '@/features/professores/components/documents/AttachmentsTab';
import { PROFESSOR_DOC_TABS } from '@/features/professores/components/documents/tabsConfig';

interface ExternalProfessorContent {
  professor: any;
  doc: ProfessorDocumentData | null;
  children: ProfessorChild[];
  files: ProfessorDocFile[];
  medicalReports: ProfessorMedicalReport[];
}

export interface ExternalDocumentosProfessorViewProps {
  data: ExternalProfessorContent;
  saving?: boolean;
  onSave?: (patch: Partial<ProfessorDocumentData>) => Promise<void>;
  onAddChild?: (child: Omit<ProfessorChild, 'id' | 'professor_id' | 'organization_id'>) => Promise<void>;
  onUpdateChild?: (id: string, patch: Partial<ProfessorChild>) => Promise<void>;
  onDeleteChild?: (id: string) => Promise<void>;
  onUpload?: (file: File, category: string) => Promise<void>;
  onDeleteFile?: (file: ProfessorDocFile) => Promise<void>;
  onGetUrl?: (path: string) => Promise<string | null>;
}

// ⚠️ Paginação oficial vem de PROFESSOR_DOC_TABS — não declarar localmente.
const tabItems = PROFESSOR_DOC_TABS;

function emptyDocument(professor: any, existing?: ProfessorDocumentData | null): ProfessorDocumentData {
  return {
    professor_id: professor.id,
    organization_id: professor.organization_id,
    full_name: professor.full_name,
    cpf: professor.cpf,
    phone: professor.phone,
    registration_code: professor.registration_code,
    specialization: professor.specialization,
    admission_status: 'em_analise',
    ...(existing || {}),
  } as ProfessorDocumentData;
}

export function ExternalDocumentosProfessorView({
  data,
  saving = false,
  onSave,
  onAddChild,
  onUpdateChild,
  onDeleteChild,
  onUpload,
  onDeleteFile,
  onGetUrl,
}: ExternalDocumentosProfessorViewProps) {
  const safeData = (data || {}) as Partial<ExternalProfessorContent>;
  const professor = safeData.professor || null;
  const doc = safeData.doc || null;
  const children = Array.isArray(safeData.children) ? safeData.children : [];
  const files = Array.isArray(safeData.files) ? safeData.files : [];
  const medicalReports = Array.isArray(safeData.medicalReports) ? safeData.medicalReports : [];
  const [activeTab, setActiveTab] = useState('personal');

  if (!professor) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Documentos do professor não encontrados ou indisponíveis para este link.
        </CardContent>
      </Card>
    );
  }

  const editableDoc = emptyDocument(professor, doc);
  const canEdit = Boolean(onSave);

  // Salvar manual (botão da aba): apenas confirma o salvamento.
  // A troca de aba é decisão do usuário (clique na aba) — nunca automática.
  const handleSave = async (patch: Partial<ProfessorDocumentData>) => {
    if (!onSave) return;
    try {
      await onSave(patch);
      toast.success('Dados salvos');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível salvar');
    }
  };

  // Auto-save em background: silencioso, sem avanço de aba
  const handleAutoSave = async (patch: Partial<ProfessorDocumentData>) => {
    if (!onSave) return;
    try {
      await onSave(patch);
    } catch {
      /* silencioso — botão manual fica como fallback */
    }
  };

  return (
    <div className="notranslate space-y-4" translate="no">
      <Card className="overflow-hidden border-border/60">
        <div className="bg-primary/10 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Cadastro externo seguro</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{editableDoc.full_name || professor.full_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Matrícula: {professor.registration_code || editableDoc.registration_code || '—'}
              </p>
            </div>
            <Badge variant="outline" className="w-fit gap-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Edição autorizada por link
            </Badge>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Indicador de passos (paginação oficial) */}
        <Card className="border-border/60">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Passo {tabItems.findIndex(t => t.value === activeTab) + 1} de {tabItems.length}
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Dados pessoais → Documentos → Endereço → Bancário → Família → Anexos
              </p>
            </div>
            <div className="overflow-x-auto pb-1">
              <TabsList className="h-auto min-w-max flex-wrap justify-start gap-1 bg-muted/50 p-1">
                {tabItems.map(({ value, label, icon: Icon }, idx) => {
                  const currentIdx = tabItems.findIndex(t => t.value === activeTab);
                  const isDone = idx < currentIdx;
                  return (
                    <TabsTrigger key={value} value={value} className="gap-2 whitespace-nowrap">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/60 text-[10px] font-bold tabular-nums">
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : idx + 1}
                      </span>
                      <Icon className="h-4 w-4" /> {label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <TabsContent value="personal" className="mt-0">
              <PersonalDataTab doc={editableDoc} canEdit={canEdit} saving={saving} onSave={handleSave} onAutoSave={handleAutoSave} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <DocumentsTab
                doc={editableDoc}
                canEdit={canEdit}
                saving={saving}
                onSave={handleSave}
                onAutoSave={handleAutoSave}
                medicalReports={medicalReports}
                onAddMedicalReport={async () => { toast.error('Laudos médicos devem ser gerenciados internamente.'); }}
                onDeleteMedicalReport={async () => { toast.error('Laudos médicos devem ser gerenciados internamente.'); }}
                onGetUrl={onGetUrl || (async () => null)}
                showMedicalReports={false}
              />
            </TabsContent>
            <TabsContent value="address" className="mt-0">
              <AddressContactTab doc={editableDoc} canEdit={canEdit} saving={saving} onSave={handleSave} onAutoSave={handleAutoSave} />
            </TabsContent>
            <TabsContent value="banking" className="mt-0">
              <BankingTab doc={editableDoc} canEdit={canEdit} saving={saving} onSave={handleSave} onAutoSave={handleAutoSave} />
            </TabsContent>
            <TabsContent value="family" className="mt-0">
              <FamilyTab
                doc={editableDoc}
                children={children}
                canEdit={canEdit}
                saving={saving}
                onSave={handleSave}
                onAutoSave={handleAutoSave}
                onAddChild={onAddChild || (async () => undefined)}
                onUpdateChild={onUpdateChild || (async () => undefined)}
                onDeleteChild={onDeleteChild || (async () => undefined)}
              />
            </TabsContent>
            <TabsContent value="attachments" className="mt-0">
              <AttachmentsTab
                files={files}
                canEdit={canEdit}
                gender={editableDoc.gender}
                onUpload={onUpload || (async () => undefined)}
                onDelete={onDeleteFile || (async () => undefined)}
                onGetUrl={onGetUrl || (async () => null)}
              />
            </TabsContent>
          </CardContent>
        </Card>

        {/* Navegação Anterior / Próximo */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={tabItems.findIndex(t => t.value === activeTab) === 0}
            onClick={() => {
              const i = tabItems.findIndex(t => t.value === activeTab);
              if (i > 0) setActiveTab(tabItems[i - 1].value);
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {tabItems.find(t => t.value === activeTab)?.label}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={tabItems.findIndex(t => t.value === activeTab) === tabItems.length - 1}
            onClick={() => {
              const i = tabItems.findIndex(t => t.value === activeTab);
              if (i < tabItems.length - 1) setActiveTab(tabItems[i + 1].value);
            }}
          >
            Próximo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Tabs>
    </div>
  );
}
