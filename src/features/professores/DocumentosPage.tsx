import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, Loader2, Briefcase, User, FileBadge, MapPin, Banknote, Users, Paperclip, CheckCircle2, ChevronRight, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { ShareProfessorDialog } from './components/ShareProfessorDialog';
import { useProfessorDocuments } from './hooks/useProfessorDocuments';
import { countFilled } from './components/documents/CompletionBadge';
import { AdmissionalTab } from './components/documents/AdmissionalTab';
import { PersonalDataTab } from './components/documents/PersonalDataTab';
import { DocumentsTab } from './components/documents/DocumentsTab';
import { AddressContactTab } from './components/documents/AddressContactTab';
import { BankingTab } from './components/documents/BankingTab';
import { FamilyTab } from './components/documents/FamilyTab';
import { AttachmentsTab } from './components/documents/AttachmentsTab';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  em_analise: { label: 'Em análise', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'outline' },
  contratado: { label: 'Contratado', variant: 'default' },
  desligado: { label: 'Desligado', variant: 'destructive' },
};

type SectionKey = 'admissional' | 'personal' | 'documents' | 'address' | 'banking' | 'family' | 'attachments';

const SECTIONS: Array<{ key: SectionKey; icon: typeof Briefcase; title: string; subtitle: string }> = [
  { key: 'admissional', icon: Briefcase, title: 'Admissional', subtitle: 'Dados de contratação' },
  { key: 'personal', icon: User, title: 'Dados Pessoais', subtitle: 'Identificação' },
  { key: 'documents', icon: FileBadge, title: 'Documentos', subtitle: 'CPF, RG, CNH e outros' },
  { key: 'address', icon: MapPin, title: 'Endereço', subtitle: 'Endereço e contato' },
  { key: 'banking', icon: Banknote, title: 'Bancário', subtitle: 'Conta e Pix' },
  { key: 'family', icon: Users, title: 'Família', subtitle: 'Filiação, cônjuge, filhos' },
  { key: 'attachments', icon: Paperclip, title: 'Anexos', subtitle: 'Documentos digitalizados' },
];

export default function DocumentosPage() {
  const { professorId } = useParams<{ professorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canShareExternally = isManagerRole(user?.perfil);
  const [activeSection, setActiveSection] = useState<SectionKey>('admissional');
  const [shareOpen, setShareOpen] = useState(false);
  const {
    professor, doc, children, files, medicalReports,
    loading, saving,
    isOwnProfessor, canEditAdmission,
    save, addChild, updateChild, deleteChild,
    uploadFile, deleteFile, getSignedUrl,
    addMedicalReport, deleteMedicalReport,
  } = useProfessorDocuments(professorId);

  const canEditPersonal = isOwnProfessor || canEditAdmission;

  const completion = useMemo(() => {
    if (!doc) return { admissional: { f: 0, t: 4 }, personal: { f: 0, t: 14 }, documents: { f: 0, t: 19 }, address: { f: 0, t: 8 }, banking: { f: 0, t: 6 }, family: { f: 0, t: 7 }, attachments: { f: 0, t: 1 }, total: 0 };

    const adm = countFilled([doc.admission_date, doc.function_title, doc.admission_status, doc.termination_date]);
    const personal = countFilled([doc.full_name, doc.nationality, doc.birth_city, doc.birth_state, doc.birth_date, doc.marital_status, doc.education_level, doc.gender, doc.height, doc.weight, doc.race, doc.hair_color, doc.eye_color, doc.blood_type]);
    const docs = countFilled([doc.cpf, doc.rg_number, doc.rg_issuer, doc.rg_state, doc.rg_issue_date, doc.work_card_number, doc.work_card_series, doc.work_card_state, doc.cnh_number, doc.cnh_state, doc.cnh_category, doc.cnh_issue_date, doc.cnh_expiry, doc.first_license_date, doc.voter_id, doc.voter_zone, doc.voter_section, doc.military_cert, doc.pis_nit]);
    const addr = countFilled([doc.email, doc.phone, doc.zip_code, doc.address, doc.address_complement, doc.neighborhood, doc.address_city, doc.address_state]);
    const bank = countFilled([doc.bank_name, doc.bank_branch, doc.bank_account, doc.has_sicredi_account, doc.pix_type, doc.pix_key]);
    const fam = countFilled([doc.father_name, doc.mother_name, doc.spouse_name, doc.spouse_nationality, doc.spouse_birth_city, doc.spouse_birth_state, doc.spouse_birth_date]);
    const att = files.length > 0 ? 1 : 0;

    const totalFilled = adm + personal + docs + addr + bank + fam + att;
    const totalFields = 5 + 14 + 19 + 8 + 6 + 7 + 1;
    const totalPct = Math.round((totalFilled / totalFields) * 100);

    return {
      admissional: { f: adm, t: 4 },
      personal: { f: personal, t: 14 },
      documents: { f: docs, t: 19 },
      address: { f: addr, t: 8 },
      banking: { f: bank, t: 6 },
      family: { f: fam, t: 7 },
      attachments: { f: att, t: 1 },
      total: totalPct,
    };
  }, [doc, files]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!professor || !doc) {
    return <div className="text-center py-16 text-muted-foreground">Professor não encontrado.</div>;
  }

  const status = STATUS_LABEL[doc.admission_status || 'em_analise'] || STATUS_LABEL.em_analise;
  const initials = professor.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const activeMeta = SECTIONS.find(s => s.key === activeSection)!;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'admissional':
        return <AdmissionalTab doc={doc} canEdit={canEditAdmission} saving={saving} onSave={save} />;
      case 'personal':
        return <PersonalDataTab doc={doc} canEdit={canEditPersonal} saving={saving} onSave={save} />;
      case 'documents':
        return <DocumentsTab
          doc={doc} canEdit={canEditPersonal} saving={saving} onSave={save}
          medicalReports={medicalReports}
          onAddMedicalReport={addMedicalReport}
          onDeleteMedicalReport={deleteMedicalReport}
          onGetUrl={getSignedUrl}
        />;
      case 'address':
        return <AddressContactTab doc={doc} canEdit={canEditPersonal} saving={saving} onSave={save} />;
      case 'banking':
        return <BankingTab doc={doc} canEdit={canEditPersonal} saving={saving} onSave={save} />;
      case 'family':
        return <FamilyTab doc={doc} children={children} canEdit={canEditPersonal} saving={saving}
          onSave={save} onAddChild={addChild} onUpdateChild={updateChild} onDeleteChild={deleteChild} />;
      case 'attachments':
        return <AttachmentsTab files={files} canEdit={canEditPersonal} gender={doc.gender}
          onUpload={uploadFile} onDelete={deleteFile} onGetUrl={getSignedUrl} />;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: 'Professores', href: '/professores' },
          { label: professor.full_name, href: `/professores/${professor.id}` },
          { label: 'Documentos' },
        ]}
        title="Documentos"
        description={professor.full_name}
        backTo={`/professores/${professor.id}`}
      />

      {/* Hero Header */}
      <Card className="overflow-hidden border-border/60">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <Button variant="ghost" size="icon" className="self-start" onClick={() => navigate(`/professores/${professor.id}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-primary/15 text-primary font-semibold text-lg">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{professor.full_name}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>Cadastro admissional</span>
                {doc.function_title && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="truncate">{doc.function_title}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch lg:items-end gap-2 lg:min-w-[260px]">
              {canShareExternally && (
                <Button size="sm" variant="outline" onClick={() => setShareOpen(true)} className="self-start lg:self-end">
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar externamente
                </Button>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Completude geral</span>
                <span className="text-2xl font-bold text-primary tabular-nums">{completion.total}%</span>
              </div>
              <Progress value={completion.total} className="h-2" />
            </div>
          </div>
        </div>
      </Card>

      {/* Main grid: sidebar nav + content */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Sidebar Navigation (desktop) / Horizontal pills (mobile) */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {/* Mobile: horizontal scroll pills */}
          <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-2">
            <div className="flex gap-2 w-max">
              {SECTIONS.map(s => {
                const c = completion[s.key];
                const Icon = s.icon;
                const isActive = activeSection === s.key;
                const isComplete = s.key === 'attachments' ? files.length > 0 : c.f >= c.t;
                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveSection(s.key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card hover:bg-muted border-border"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {s.title}
                    {isComplete ? (
                      <CheckCircle2 className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-emerald-500")} />
                    ) : (
                      <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5">
                        {s.key === 'attachments' ? files.length : `${c.f}/${c.t}`}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: vertical sidebar */}
          <Card className="hidden lg:block">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {SECTIONS.map(s => {
                  const c = completion[s.key];
                  const Icon = s.icon;
                  const isActive = activeSection === s.key;
                  const isComplete = s.key === 'attachments' ? files.length > 0 : c.f >= c.t;
                  const pct = s.key === 'attachments'
                    ? (files.length > 0 ? 100 : 0)
                    : Math.round((c.f / c.t) * 100);

                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveSection(s.key)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-background"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-medium truncate", isActive && "text-foreground")}>{s.title}</p>
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                              {s.key === 'attachments' ? files.length : `${c.f}/${c.t}`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full transition-all", isComplete ? "bg-emerald-500" : "bg-primary/60")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform shrink-0",
                        isActive ? "text-primary translate-x-0.5" : "text-muted-foreground/40"
                      )} />
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content area */}
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Section header */}
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <activeMeta.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold leading-tight">{activeMeta.title}</h2>
                <p className="text-xs text-muted-foreground">{activeMeta.subtitle}</p>
              </div>
              {activeSection !== 'attachments' && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Preenchidos</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {completion[activeSection].f}<span className="text-muted-foreground font-normal">/{completion[activeSection].t}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Section body */}
            <div>{renderSectionContent()}</div>
          </CardContent>
        </Card>
      </div>

      {canShareExternally && professor && (
        <ShareProfessorDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          professorId={professor.id}
          professorName={professor.full_name}
        />
      )}
    </div>
  );
}
