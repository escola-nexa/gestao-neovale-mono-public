import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Upload, FileText, X, Info, Loader2, GraduationCap,
  MapPin, Phone, User, Award, BookMarked, ArrowLeft, CheckCircle2,
  Mail, Calendar, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/useBranding';
import {
  TalentCandidate, TalentFormData,
  PERIODS, WEEKDAYS, PERIOD_LABELS, WEEKDAY_LABELS,
  TalentPeriod, TalentWeekday, MAX_PDF_SIZE_MB,
  CLASSIFICATIONS, CLASSIFICATION_META, TalentClassification,
} from '../types';
import { useTalentPool } from '../hooks/useTalentPool';
import { toast } from 'sonner';

interface Props {
  candidate?: TalentCandidate | null;
}

const EMPTY: TalentFormData = {
  full_name: '', email: '', phone: '', phone_is_whatsapp: false,
  state_id: '', city_id: '',
  free_periods: [], free_weekdays: [],
  formation_area: '', has_licentiate: false, notes: '',
  classifications: [],
};

export function TalentFormView({ candidate }: Props) {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { states, cities, create, update } = useTalentPool();
  const [form, setForm] = useState<TalentFormData>(EMPTY);
  const [resume, setResume] = useState<File | null>(null);
  const [schooling, setSchooling] = useState<File | null>(null);
  const [graduate, setGraduate] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (candidate) {
      setForm({
        full_name: candidate.full_name,
        email: candidate.email || '',
        phone: candidate.phone,
        phone_is_whatsapp: candidate.phone_is_whatsapp,
        state_id: candidate.state_id || '',
        city_id: candidate.city_id || '',
        free_periods: candidate.free_periods || [],
        free_weekdays: candidate.free_weekdays || [],
        formation_area: candidate.formation_area || '',
        has_licentiate: candidate.has_licentiate,
        notes: candidate.notes || '',
        classifications: candidate.classifications ?? [],
      });
    }
  }, [candidate]);

  const filteredCities = useMemo(
    () => cities.filter(c => c.state_id === form.state_id),
    [cities, form.state_id],
  );

  const togglePeriod = (p: TalentPeriod) => setForm(f => ({
    ...f, free_periods: f.free_periods.includes(p) ? f.free_periods.filter(x => x !== p) : [...f.free_periods, p],
  }));
  const toggleWeekday = (d: TalentWeekday) => setForm(f => ({
    ...f, free_weekdays: f.free_weekdays.includes(d) ? f.free_weekdays.filter(x => x !== d) : [...f.free_weekdays, d],
  }));

  const validatePdf = (f: File | null): boolean => {
    if (!f) return true;
    if (f.type !== 'application/pdf') return false;
    if (f.size > MAX_PDF_SIZE_MB * 1024 * 1024) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error('Informe o nome completo'); return; }
    if (!form.phone.trim()) { toast.error('Informe o telefone'); return; }
    if (!candidate && !resume) { toast.error('Currículo (PDF) é obrigatório'); return; }
    if (![resume, schooling, graduate].every(validatePdf)) {
      toast.error('Algum arquivo enviado não é PDF válido ou excede o limite');
      return;
    }
    setSaving(true);
    const files = { resume, schooling, graduate };
    const ok = candidate
      ? await update(candidate.id, form, files, candidate)
      : !!(await create(form, files));
    setSaving(false);
    if (ok) navigate('/banco-talentos');
  };

  const isEdit = !!candidate;

  // Step completion tracking
  const steps = useMemo(() => {
    const identification = !!form.full_name.trim() && !!form.phone.trim();
    const location = !!form.state_id && !!form.city_id;
    const availability = form.free_periods.length > 0 || form.free_weekdays.length > 0;
    const formation = !!form.formation_area.trim();
    const documents = isEdit ? true : !!resume;
    return { identification, location, availability, formation, documents };
  }, [form, resume, isEdit]);

  const completedSteps = Object.values(steps).filter(Boolean).length;
  const progress = (completedSteps / 5) * 100;

  return (
    <div className="space-y-6">
      {/* HERO compacto Neovale */}
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(228_18%_14%)] text-white px-5 py-4 sm:px-6">
        <div className="absolute top-3 right-5 flex gap-1 rotate-[-20deg] pointer-events-none opacity-80">
          <span className="block h-6 w-0.5 bg-primary rounded-full" />
          <span className="block h-6 w-0.5 bg-primary rounded-full" />
          <span className="block h-6 w-0.5 bg-primary rounded-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="relative flex items-center gap-4">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate('/banco-talentos')}
            className="text-white/70 hover:text-white hover:bg-white/5 h-9 px-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-primary/40">
            <img
              src={branding.icon_url || '/nexa-logo.svg'}
              alt={branding.display_name || 'Neovale'}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary/80 mb-0.5">
              Neovale · Banco de Talentos
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              {isEdit ? 'Editar candidato' : 'Novo talento docente'}
            </h1>
            <p className="text-xs text-white/60 italic mt-1">
              "Onde o talento encontra a oportunidade certa."
            </p>
          </div>

          {/* Progresso */}
          <div className="hidden md:flex flex-col items-end gap-1.5 min-w-[180px]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/60">Progresso</span>
              <span className="font-bold text-primary">{completedSteps}/5</span>
            </div>
            <Progress value={progress} className="w-[180px] h-1.5 bg-white/10" />
          </div>
        </div>
      </div>

      {/* Layout 2 colunas: nav lateral + form */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar steps (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 px-2">
              Etapas do cadastro
            </p>
            <StepNav num={1} label="Identificação" anchor="sec-1" done={steps.identification} required />
            <StepNav num={2} label="Localização" anchor="sec-2" done={steps.location} />
            <StepNav num={3} label="Disponibilidade" anchor="sec-3" done={steps.availability} />
            <StepNav num={4} label="Formação" anchor="sec-4" done={steps.formation} />
            <StepNav num={5} label="Documentos" anchor="sec-5" done={steps.documents} required={!isEdit} />
            <StepNav num={6} label="Observações" anchor="sec-6" done={!!form.notes.trim()} optional />

            <div className="mt-4 mx-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">Dica:</span> campos com{' '}
                <span className="text-destructive font-bold">*</span> são obrigatórios.
              </p>
            </div>
          </div>
        </aside>

        {/* Form */}
        <div className="space-y-5 min-w-0">
          {/* SEÇÃO 1 — Identificação */}
          <SectionCard id="sec-1" icon={User} title="Identificação" tag="01" required>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome completo" required full>
                <Input
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ex: Maria da Silva Santos"
                />
              </Field>
              <Field label="Telefone de contato" required icon={Phone}>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="E-mail (opcional)" icon={Mail}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </Field>
              <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-primary/25 bg-primary/5">
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <Label className="flex-1 text-sm cursor-pointer" htmlFor="whats">
                  <span className="font-medium block">Este telefone tem WhatsApp?</span>
                  <span className="text-xs text-muted-foreground">Facilita o contato direto com o candidato</span>
                </Label>
                <Switch id="whats" checked={form.phone_is_whatsapp} onCheckedChange={v => setForm({ ...form, phone_is_whatsapp: v })} />
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO 2 — Localização */}
          <SectionCard id="sec-2" icon={MapPin} title="Localização" tag="02">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Estado">
                <Select value={form.state_id || undefined} onValueChange={v => setForm({ ...form, state_id: v, city_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um estado" /></SelectTrigger>
                  <SelectContent>
                    {states.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.sigla} · {s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Cidade de residência">
                <Select value={form.city_id || undefined} onValueChange={v => setForm({ ...form, city_id: v })} disabled={!form.state_id}>
                  <SelectTrigger>
                    <SelectValue placeholder={form.state_id ? 'Selecione a cidade' : 'Escolha o estado primeiro'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCities.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          {/* SEÇÃO 3 — Disponibilidade */}
          <SectionCard id="sec-3" icon={BookMarked} title="Disponibilidade para ministrar aulas" tag="03">
            <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span><strong className="text-foreground">Dica:</strong> clique nos cartões abaixo para selecionar os períodos e dias da semana disponíveis. Clique novamente para desmarcar.</span>
            </p>
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Períodos livres</Label>
                  {form.free_periods.length > 0 && (
                    <span className="text-[10px] font-mono text-primary">{form.free_periods.length} selecionado(s)</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PERIODS.map(p => {
                    const active = form.free_periods.includes(p);
                    return (
                      <button
                        type="button" key={p} onClick={() => togglePeriod(p)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center gap-0.5",
                          active
                            ? "bg-primary text-[hsl(228_18%_14%)] border-primary shadow-[0_4px_14px_-4px_hsl(48_100%_64%/0.6)]"
                            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <span>{PERIOD_LABELS[p]}</span>
                        <span className="text-[10px] opacity-60 font-normal">
                          {p === 'MANHA' ? '06h–12h' : p === 'TARDE' ? '12h–18h' : '18h–22h'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dias da semana livres</Label>
                  {form.free_weekdays.length > 0 && (
                    <span className="text-[10px] font-mono text-primary">{form.free_weekdays.length} dia(s)</span>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map(d => {
                    const active = form.free_weekdays.includes(d);
                    return (
                      <button
                        type="button" key={d} onClick={() => toggleWeekday(d)}
                        className={cn(
                          "h-14 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center",
                          active
                            ? "bg-primary text-[hsl(228_18%_14%)] border-primary shadow-[0_4px_14px_-4px_hsl(48_100%_64%/0.6)]"
                            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <span className="text-sm">{d}</span>
                        <span className="text-[9px] opacity-60 font-normal hidden sm:block">
                          {WEEKDAY_LABELS[d].slice(0, 3)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO 4 — Formação */}
          <SectionCard id="sec-4" icon={GraduationCap} title="Formação acadêmica" tag="04">
            <div className="space-y-4">
              <Field
                label="Área de formação ou afins"
                hint='Áreas afins: cursos correlatos à matéria pretendida (ex: Biologia para "Ciências"; Engenharia para "Matemática"). Aceita-se formação na disciplina exata ou em campos diretamente relacionados.'
              >
                <Input
                  value={form.formation_area}
                  onChange={e => setForm({ ...form, formation_area: e.target.value })}
                  placeholder="Ex: Matemática, Engenharia, Biologia..."
                />
              </Field>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-primary/25 bg-primary/5">
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <Label htmlFor="lic" className="flex-1 cursor-pointer">
                  <span className="font-medium block">Possui licenciatura?</span>
                  <span className="text-xs text-muted-foreground">Formação específica para docência</span>
                </Label>
                <Switch id="lic" checked={form.has_licentiate} onCheckedChange={v => setForm({ ...form, has_licentiate: v })} />
              </div>
            </div>
          </SectionCard>

          {/* SEÇÃO 5 — Documentos */}
          <SectionCard id="sec-5" icon={FileText} title="Documentos anexos" tag="05" required={!isEdit}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground -mt-1 mb-2">
                Apenas arquivos PDF · máximo {MAX_PDF_SIZE_MB}MB por arquivo
              </p>
              <PdfUpload
                label="Currículo"
                required={!isEdit}
                file={resume}
                existingPath={candidate?.resume_path || null}
                onChange={setResume}
              />
              <PdfUpload
                label="Comprovante de escolaridade"
                hint="Ensino Superior ou Técnico"
                file={schooling}
                existingPath={candidate?.schooling_path || null}
                onChange={setSchooling}
              />
              <PdfUpload
                label="Comprovante de Pós-Graduação"
                hint="Especialização, Mestrado ou Doutorado"
                file={graduate}
                existingPath={candidate?.graduate_path || null}
                onChange={setGraduate}
              />
            </div>
          </SectionCard>

          {/* SEÇÃO 6 — Observações + Etiqueta */}
          <SectionCard id="sec-6" icon={Info} title="Etiqueta & observações internas" tag="06" optional>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                  Classificação <span className="text-muted-foreground/60 normal-case">— pode marcar várias</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CLASSIFICATIONS.map(c => {
                    const meta = CLASSIFICATION_META[c];
                    const active = form.classifications.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          classifications: active
                            ? form.classifications.filter(v => v !== c)
                            : [...form.classifications, c as TalentClassification],
                        })}
                        title={meta.description}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all',
                          active ? meta.badgeClass + ' ring-2 ring-offset-1 ring-foreground/20' : 'bg-background border-border text-muted-foreground hover:border-foreground/40'
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
                        {meta.short}
                      </button>
                    );
                  })}
                  {form.classifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, classifications: [] })}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {form.classifications.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">
                    Sem etiqueta atribuída
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Observações</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anotações adicionais sobre o candidato (visível apenas internamente)..."
                />
              </div>
            </div>
          </SectionCard>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-4 z-10">
            <div className="bg-card/95 backdrop-blur-md border-2 border-primary/30 rounded-2xl shadow-[0_8px_32px_-8px_hsl(228_18%_14%/0.25)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-10 w-10 rounded-lg bg-primary/15 items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">
                    {completedSteps === 5 ? 'Pronto para salvar!' : `${completedSteps} de 5 etapas concluídas`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Campos com <span className="text-destructive font-bold">*</span> são obrigatórios
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/banco-talentos')} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  size="lg"
                  className="bg-primary text-[hsl(228_18%_14%)] hover:bg-primary/90 font-bold shadow-[0_4px_14px_-4px_hsl(48_100%_64%/0.6)]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isEdit ? 'Salvar alterações' : 'Cadastrar talento'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function StepNav({
  num, label, anchor, done, required, optional,
}: { num: number; label: string; anchor: string; done: boolean; required?: boolean; optional?: boolean }) {
  return (
    <a
      href={`#${anchor}`}
      className={cn(
        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors group",
        done ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all flex-shrink-0",
        done
          ? "bg-primary text-[hsl(228_18%_14%)] border-primary"
          : "bg-background border-border text-muted-foreground group-hover:border-primary/40"
      )}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : num}
      </div>
      <span className="flex-1 truncate">{label}</span>
      {required && <span className="text-destructive text-xs font-bold">*</span>}
      {optional && <span className="text-[9px] uppercase font-mono text-muted-foreground/60">opc</span>}
    </a>
  );
}

function SectionCard({
  id, icon: Icon, title, tag, required, optional, children,
}: {
  id: string; icon: any; title: string; tag: string;
  required?: boolean; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-card border rounded-2xl p-5 sm:p-6 scroll-mt-4 hover:border-primary/20 transition-colors"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            {title}
            {required && <span className="text-destructive text-xs">*</span>}
            {optional && (
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted">
                opcional
              </span>
            )}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest flex-shrink-0">/ {tag}</span>
      </div>
      {children}
    </section>
  );
}

function Field({
  label, hint, required, full, icon: Icon, children,
}: {
  label: string; hint?: string; required?: boolean; full?: boolean; icon?: any;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <Label className="text-xs font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

function PdfUpload({
  label, hint, required, file, existingPath, onChange,
}: {
  label: string; hint?: string; required?: boolean; file: File | null;
  existingPath: string | null; onChange: (f: File | null) => void;
}) {
  const id = `pdf-${label}`;
  const hasFile = !!file;
  const hasExisting = !!existingPath && !file;
  const ready = hasFile || hasExisting;

  return (
    <div className={cn(
      "rounded-xl border-2 border-dashed transition-all p-4",
      ready
        ? "border-primary/50 bg-primary/5"
        : required
          ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
          : "border-border hover:border-primary/30 hover:bg-muted/30",
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
          ready ? "bg-primary/20" : "bg-muted"
        )}>
          {ready
            ? <CheckCircle2 className="h-5 w-5 text-primary" />
            : <FileText className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer block">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          {hint && !ready && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          )}
          {hasFile && (
            <p className="text-xs text-foreground/80 truncate mt-0.5">
              📎 {file!.name} · {(file!.size / 1024 / 1024).toFixed(2)}MB
            </p>
          )}
          {hasExisting && (
            <p className="text-xs text-primary/80 mt-0.5">✓ Anexado · envie outro para substituir</p>
          )}
          {!hasFile && !hasExisting && !hint && (
            <p className="text-xs text-muted-foreground mt-0.5">Clique em "Anexar" para enviar</p>
          )}
        </div>
        <Input
          id={id} type="file" accept="application/pdf" className="hidden"
          onChange={e => onChange(e.target.files?.[0] || null)}
        />
        {hasFile ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor={id} className="cursor-pointer">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Anexar
            </label>
          </Button>
        )}
      </div>
    </div>
  );
}
