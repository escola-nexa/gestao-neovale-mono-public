import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Replace, Save, ArrowLeft, ArrowRight, Check, AlertTriangle, Filter, FileText, User, Calculator, Paperclip } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { substitutionApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { useCreateTSR, useCreateTSRWithOccurrences } from './hooks/useTeacherSubstitution';
import { useSemester } from '@/hooks/useSemester';
import {
  useProfessorWeeklyGrid,
  longWeekdayLabel,
  weekdayFromDateString,
  type ProfessorWeeklyClass,
} from './hooks/useProfessorWeeklyGrid';
import { AbsenceDatesPanel, type AbsenceDateEntry } from './components/AbsenceDatesPanel';
import { TeacherScheduleGridSelector } from './components/TeacherScheduleGridSelector';
import { AbsenceAttachmentsField, type AbsenceAttachment } from './components/AbsenceAttachmentsField';
import { SubstituteSourceSelector, type SubstituteSource } from './components/SubstituteSourceSelector';
import { useEligibleSubstituteProfessors } from './hooks/useEligibleSubstituteProfessors';
import { useEligibleSubstituteTalents } from './hooks/useEligibleSubstituteTalents';

const BRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

const STEPS = [
  { n: 1, label: 'Professor', hint: 'Quem será substituído' },
  { n: 2, label: 'Aulas', hint: 'Datas e horários a substituir' },
  { n: 3, label: 'Motivo & Indicação', hint: 'Justificativa e sugestão de substituto' },
  { n: 4, label: 'Revisão', hint: 'Confirmação final' },
];

function newDateEntry(date: string = new Date().toISOString().slice(0, 10)): AbsenceDateEntry {
  return { uid: crypto.randomUUID(), date };
}

export default function SubstituicaoNovaPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organizationId, userRole } = useOrganization();
  const create = useCreateTSR();
  const createWithOcc = useCreateTSRWithOccurrences();
  const isAdminOrRh = userRole === 'admin' || userRole === 'rh';
  const isAdmin = userRole === 'admin';
  const DEFAULT_HOUR_CLASS_VALUE = 36.11;

  const [step, setStep] = useState(1);

  // Etapa 1 — Professor
  const [profId, setProfId] = useState('');
  const [profName, setProfName] = useState('');
  const [profCpf, setProfCpf] = useState('');
  const [profRg, setProfRg] = useState('');
  const [profReg, setProfReg] = useState('');
  const hasProfessor = !!profId;

  // Etapa 2 — Datas + seleção visual
  const [absenceDates, setAbsenceDates] = useState<AbsenceDateEntry[]>([newDateEntry()]);
  const [activeDateUid, setActiveDateUid] = useState<string | null>(absenceDates[0]?.uid ?? null);
  const [selectionByDate, setSelectionByDate] = useState<Record<string, ProfessorWeeklyClass[]>>({});
  const [schoolFilter, setSchoolFilter] = useState<string>('');

  // Etapa 3
  const [reason, setReason] = useState('');
  const [absenceAttachments, setAbsenceAttachments] = useState<AbsenceAttachment[]>([]);
  const batchTempId = useMemo(() => crypto.randomUUID(), []);
  const [substituteSource, setSubstituteSource] = useState<SubstituteSource>('professor');
  const [substituteRefId, setSubstituteRefId] = useState<string>('');
  const [showWithConflicts, setShowWithConflicts] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCpf, setSubCpf] = useState('');
  const [subRg, setSubRg] = useState('');
  const [rate, setRate] = useState<number>(DEFAULT_HOUR_CLASS_VALUE);
  const [overrideTotal, setOverrideTotal] = useState<number | null>(null);

  // Etapa 4
  const [performedBy, setPerformedBy] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankData, setBankData] = useState('');
  const [notes, setNotes] = useState('');

  // -------- Queries de apoio --------
  const { data: settings } = useQuery({
    enabled: !!organizationId,
    queryKey: ['tsr_settings', organizationId],
    queryFn: async () => {
      const data = await substitutionApi.getSettings(organizationId!);
      return data || {};
    },
  });
  useEffect(() => {
    const cfg = Number(settings?.default_hour_class_value);
    if (cfg && cfg > 0 && rate === DEFAULT_HOUR_CLASS_VALUE) setRate(cfg);
  }, [settings]);

  const { data: profs = [] } = useQuery({
    enabled: !!organizationId,
    queryKey: ['eligible_substituted_profs', organizationId],
    queryFn: async () => {
      const data = await substitutionApi.getEligibleSubstitutedProfessors(organizationId!);
      return data as Array<{
        id: string; full_name: string; cpf: string | null; registration_code: string | null;
      }>;
    },
  });

  const { currentSemester } = useSemester();

  // Grade horária do professor (fonte única)
  const { data: weeklyClassesRaw = [], isLoading: loadingGrid } = useProfessorWeeklyGrid(profId);
  // Aplica regras: somente disciplina ativa + semestre vigente (ou ANNUAL)
  const weeklyClasses = useMemo(
    () => weeklyClassesRaw.filter(c => {
      if (c.subject_status && c.subject_status !== 'ativo') return false;
      if (currentSemester && c.subject_semester
        && c.subject_semester !== 'ANNUAL'
        && c.subject_semester !== currentSemester) return false;
      return true;
    }),
    [weeklyClassesRaw, currentSemester]
  );

  // Reset ao trocar professor
  useEffect(() => {
    if (!hasProfessor) {
      setProfName(''); setProfCpf(''); setProfRg(''); setProfReg('');
      setSelectionByDate({});
      setSchoolFilter('');
      return;
    }
    const p: any = profs.find((x: any) => x.id === profId);
    if (p) {
      setProfName(p.full_name || '');
      setProfCpf(p.cpf || '');
      setProfReg(p.registration_code || '');
    }
    setSelectionByDate({});
    setSchoolFilter('');
  }, [profId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantém activeDateUid sempre válido
  useEffect(() => {
    if (!activeDateUid || !absenceDates.find(d => d.uid === activeDateUid)) {
      setActiveDateUid(absenceDates[0]?.uid ?? null);
    }
  }, [absenceDates, activeDateUid]);

  // Limpa seleções inválidas se a grade mudar
  useEffect(() => {
    const validIds = new Set(weeklyClasses.map(c => c.id));
    setSelectionByDate(prev => {
      const next: Record<string, ProfessorWeeklyClass[]> = {};
      let changed = false;
      Object.entries(prev).forEach(([uid, arr]) => {
        const filtered = arr.filter(c => validIds.has(c.id));
        if (filtered.length !== arr.length) changed = true;
        next[uid] = filtered;
      });
      return changed ? next : prev;
    });
  }, [weeklyClasses]);

  // Limpa seleções de datas removidas
  useEffect(() => {
    const validUids = new Set(absenceDates.map(d => d.uid));
    setSelectionByDate(prev => {
      let changed = false;
      const next: Record<string, ProfessorWeeklyClass[]> = {};
      Object.entries(prev).forEach(([uid, arr]) => {
        if (validUids.has(uid)) next[uid] = arr;
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [absenceDates]);

  // Sempre que troca a data ativa OU a data muda, descarta seleções incompatíveis com o novo weekday
  useEffect(() => {
    setSelectionByDate(prev => {
      let changed = false;
      const next = { ...prev };
      absenceDates.forEach(d => {
        const wd = weekdayFromDateString(d.date);
        const arr = next[d.uid] || [];
        const filtered = arr.filter(c => wd && c.weekday === wd);
        if (filtered.length !== arr.length) { next[d.uid] = filtered; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [absenceDates]);

  // -------- Derivados --------
  const activeDate = absenceDates.find(d => d.uid === activeDateUid)?.date ?? '';
  const activeWeekday = weekdayFromDateString(activeDate);
  const activeSelectedIds = useMemo(
    () => new Set((activeDateUid && selectionByDate[activeDateUid] || []).map(c => c.id)),
    [selectionByDate, activeDateUid]
  );
  const availableWeekdays = useMemo(() => {
    const s = new Set<NonNullable<ReturnType<typeof weekdayFromDateString>>>();
    weeklyClasses.forEach(c => s.add(c.weekday));
    return s;
  }, [weeklyClasses]);
  /** JS getDay() correspondente aos dias com aula (1=SEG…5=SEX). */
  const allowedJsDays = useMemo(() => {
    const map: Record<string, number> = { SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5 };
    const s = new Set<number>();
    availableWeekdays.forEach(w => { const n = map[w]; if (n) s.add(n); });
    return s;
  }, [availableWeekdays]);
  const isDateAllowed = useMemo(
    () => (d: Date) => allowedJsDays.has(d.getDay()),
    [allowedJsDays]
  );

  const countsByUid = useMemo(() => {
    const out: Record<string, number> = {};
    absenceDates.forEach(d => { out[d.uid] = (selectionByDate[d.uid] || []).length; });
    return out;
  }, [absenceDates, selectionByDate]);

  const totalHours = useMemo(
    () => Object.values(selectionByDate).reduce((s, arr) => s + arr.length, 0),
    [selectionByDate]
  );
  const computedTotal = useMemo(() => totalHours * Number(rate || 0), [totalHours, rate]);
  const total = overrideTotal ?? computedTotal;

  const schoolOptions = useMemo(() => {
    const m = new Map<string, string>();
    weeklyClasses.forEach(c => m.set(c.school_id, c.school_name));
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome }));
  }, [weeklyClasses]);

  // Cidades das escolas dos slots selecionados (para filtrar substitutos)
  const selectedClassesAll = useMemo(
    () => Object.values(selectionByDate).flat(),
    [selectionByDate]
  );
  const targetCidades = useMemo(() => {
    const s = new Set<string>();
    selectedClassesAll.forEach(c => { if (c.city) s.add(c.city); });
    return Array.from(s);
  }, [selectedClassesAll]);
  const selectedSlots = useMemo(() => {
    const seen = new Set<string>();
    const out: { weekday: string; start_time: string; end_time: string }[] = [];
    selectedClassesAll.forEach(c => {
      const k = `${c.weekday}@${c.start_time}-${c.end_time}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ weekday: c.weekday, start_time: c.start_time, end_time: c.end_time });
    });
    return out;
  }, [selectedClassesAll]);

  const eligibleProfsQ = useEligibleSubstituteProfessors({
    organizationId,
    excludeProfessorId: profId || null,
    cidades: targetCidades,
    selectedSlots,
    enabled: step === 3 && substituteSource === 'professor',
  });
  const eligibleTalentsQ = useEligibleSubstituteTalents({
    organizationId,
    cidades: targetCidades,
    enabled: step === 3 && substituteSource === 'talent',
  });
  // Sempre habilitado para Banco de Talentos (lista todos, mesmo sem cidade)

  // Datas duplicadas?
  const dateStrings = absenceDates.map(d => d.date).filter(Boolean);
  const hasDuplicateDates = new Set(dateStrings).size !== dateStrings.length;
  const hasEmptyDates = absenceDates.some(d => !d.date);
  const everyDateHasSelection = absenceDates.length > 0
    && absenceDates.every(d => (selectionByDate[d.uid] || []).length > 0);

  const stepValid = (s: number): boolean => {
    if (s === 1) return hasProfessor;
    if (s === 2) return !hasEmptyDates && !hasDuplicateDates && everyDateHasSelection && totalHours > 0;
    if (s === 3) return !!reason.trim() && totalHours > 0;
    return true;
  };
  const canAdvance = stepValid(step);
  const allValid = stepValid(1) && stepValid(2) && stepValid(3);

  function goNext() { if (canAdvance && step < 4) setStep(step + 1); }
  function goBack() { if (step > 1) setStep(step - 1); }

  // -------- Handlers de datas --------
  function addDate() {
    const entry = newDateEntry('');
    setAbsenceDates(prev => [...prev, entry]);
    setActiveDateUid(entry.uid);
  }
  function removeDate(uid: string) {
    setAbsenceDates(prev => prev.length > 1 ? prev.filter(d => d.uid !== uid) : prev);
  }
  function changeDate(uid: string, date: string) {
    setAbsenceDates(prev => prev.map(d => d.uid === uid ? { ...d, date } : d));
  }

  // -------- Handlers de seleção --------
  function toggleClassForActiveDate(cls: ProfessorWeeklyClass) {
    if (!activeDateUid || !activeWeekday || cls.weekday !== activeWeekday) return;
    setSelectionByDate(prev => {
      const arr = prev[activeDateUid] || [];
      const exists = arr.some(c => c.id === cls.id);
      const nextArr = exists ? arr.filter(c => c.id !== cls.id) : [...arr, cls];
      return { ...prev, [activeDateUid]: nextArr };
    });
  }
  function toggleAllForActiveDay(mode: 'select' | 'clear') {
    if (!activeDateUid || !activeWeekday) return;
    setSelectionByDate(prev => {
      if (mode === 'clear') return { ...prev, [activeDateUid]: [] };
      const dayClasses = weeklyClasses.filter(c => c.weekday === activeWeekday
        && (!schoolFilter || c.school_id === schoolFilter));
      return { ...prev, [activeDateUid]: dayClasses };
    });
  }

  // -------- Salvar --------
  async function onSave() {
    if (!allValid || !organizationId) return;

    // Manual → cria automaticamente no Banco de Talentos
    if (substituteSource === 'manual' && subName.trim()) {
      try {
        const cpfClean = (subCpf || '').replace(/\D/g, '');
        let exists: any = null;
        if (cpfClean) {
          const data = await substitutionApi.getTalentPoolCandidateByCpf(organizationId, subCpf);
          exists = data;
        }
        if (!exists) {
          const userData = await substitutionApi.getUser();
          await substitutionApi.insertTalentPoolCandidate({
            organization_id: organizationId,
            full_name: subName.trim(),
            cpf: subCpf || null,
            phone: '',
            phone_is_whatsapp: false,
            free_periods: [],
            free_weekdays: [],
            has_licentiate: false,
            notes: `Cadastro automático via Substituição em ${new Date().toLocaleDateString('pt-BR')}`,
            classifications: ['Sem Histórico'],
            created_by: userData.user?.id || null,
          });
        }
      } catch (err) {
        console.warn('Falha ao adicionar ao Banco de Talentos (ignorando):', err);
      }
    }

    // ===== Agrupa seleção por ESCOLA =====
    // Regra de negócio: 1 solicitação = 1 professor + 1 escola, podendo conter
    // N datas e N disciplinas/turmas (linhas em teacher_substitution_occurrences).
    type SchoolBucket = {
      school_id: string;
      first: ProfessorWeeklyClass;
      occurrences: { date: string; cls: ProfessorWeeklyClass }[];
    };
    const bySchool = new Map<string, SchoolBucket>();
    for (const d of absenceDates) {
      const arr = selectionByDate[d.uid] || [];
      for (const cls of arr) {
        let bucket = bySchool.get(cls.school_id);
        if (!bucket) {
          bucket = { school_id: cls.school_id, first: cls, occurrences: [] };
          bySchool.set(cls.school_id, bucket);
        }
        bucket.occurrences.push({ date: d.date, cls });
      }
    }
    const buckets = Array.from(bySchool.values());
    if (buckets.length === 0) return;

    const batchId = buckets.length > 1 ? crypto.randomUUID() : null;
    const createdIds: string[] = [];
    let totalDates = 0;
    let totalAulas = 0;

    try {
      for (const bucket of buckets) {
        const dates = bucket.occurrences.map(o => o.date).sort();
        const minDate = dates[0];
        const sumHours = bucket.occurrences.length; // 1 hora-aula por slot
        const cls0 = bucket.first;

        const newId = await createWithOcc.mutateAsync({
          request: {
            organization_id: organizationId,
            substituted_professor_id: profId,
            substituted_professor_data: { name: profName, cpf: profCpf, rg: profRg, registration: profReg },
            school_id: cls0.school_id,
            course_id: cls0.course_id,
            class_group_id: cls0.class_group_id,
            subject_id: cls0.subject_id,
            absence_reason: reason,
            absence_date: minDate,
            total_class_hours: sumHours,
            hour_class_value: rate,
            context: {
              source_type: 'manual',
              notes,
              municipality: cls0.city || '',
              state: null,
              director_name: cls0.director || '',
              adjunct_director_name: cls0.adjunct || '',
              coordinator_name: cls0.coordinator || '',
              performed_by_name: performedBy,
              substitute_data: { name: subName, cpf: subCpf, rg: subRg },
              payment_method: paymentMethod,
              bank_data: bankData,
              batch_id: batchId,
              batch_total: buckets.length,
            },
          },
          occurrences: bucket.occurrences.map(({ date, cls }) => ({
            scheduled_date: date,
            school_id: cls.school_id,
            course_id: cls.course_id,
            class_group_id: cls.class_group_id,
            subject_id: cls.subject_id,
            class_hours: 1,
            hour_class_value: rate,
            snapshot: {
              school_name: cls.school_name,
              course_name: cls.course_name,
              class_group_name: cls.class_group_name,
              subject_name: cls.subject_name,
              weekday: cls.weekday,
              start_time: cls.start_time,
              end_time: cls.end_time,
              slot_label: cls.slot_label,
              slot_number: cls.slot_number,
              weekly_model_id: cls.id,
              school_time_slot_id: cls.school_time_slot_id,
            },
          })),
        });

        // Anexos do motivo + batch_id no próprio request
        const patch: any = {};
        if (batchId) patch.batch_id = batchId;
        if (absenceAttachments.length) patch.absence_attachments = absenceAttachments;
        if (Object.keys(patch).length) {
          await substitutionApi.updateTSR(newId, patch);
        }

        createdIds.push(newId);
        totalDates += new Set(dates).size;
        totalAulas += sumHours;
      }

      const msg = buckets.length === 1
        ? `1 solicitação criada — ${totalDates} ${totalDates === 1 ? 'data' : 'datas'}, ${totalAulas} ${totalAulas === 1 ? 'aula' : 'aulas'}.`
        : `${buckets.length} solicitações criadas (uma por escola) — ${totalAulas} aulas no total.`;
      toast({ title: 'Substituição registrada', description: msg });

      if (createdIds.length === 1) {
        navigate(`/presenca-professores/substituicao/${createdIds[0]}`);
      } else {
        navigate(`/presenca-professores/substituicao?batch=${batchId}`);
      }
    } catch (e: any) {
      toast({
        title: 'Erro ao criar',
        description: `${createdIds.length} solicitação(ões) criada(s) antes da falha. ${e.message || ''}`,
        variant: 'destructive',
      });
    }
  }


  const professorComboOptions = profs.map((p: any) => ({
    value: p.id,
    label: p.full_name,
    description: [p.registration_code, p.cpf].filter(Boolean).join(' · ') || undefined,
    keywords: `${p.cpf || ''} ${p.registration_code || ''}`,
  }));

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        breadcrumbs={[
          { label: 'Presença dos Professores', href: '/presenca-professores' },
          { label: 'Substituição', href: '/presenca-professores/substituicao' },
          { label: 'Nova solicitação' },
        ]}
        title="Nova Solicitação de Substituição"
        description="Registre a ausência do professor e, se possível, indique um substituto. A confirmação final é feita pelo R.H."
        icon={Replace}
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        }
      />

      <WizardStepper current={step} onJump={(n) => setStep(n)} validity={(n) => stepValid(n)} />

      {step === 1 && (
        <Section title="Professor a ser substituído"
          description="Apenas professores ativos com alocação e grade horária ativas podem ser selecionados.">

          <div className="md:col-span-3">
            <Label className="text-xs text-muted-foreground">Professor *</Label>
            <div className="mt-1">
              <SearchableSelect
                value={profId}
                onValueChange={setProfId}
                options={professorComboOptions}
                placeholder={profs.length
                  ? 'Buscar professor por nome, CPF ou matrícula'
                  : 'Nenhum professor ativo com alocação e grade ativa'}
                emptyMessage="Nenhum professor elegível encontrado"
                disabled={!profs.length}
              />
            </div>
          </div>

          {!profs.length && (
            <div className="md:col-span-3 rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Nenhum professor elegível</div>
                <div className="mt-1">
                  Para solicitar uma substituição, o professor precisa estar <b>ativo</b>, ter <b>alocação ativa</b> em escola/curso e possuir <b>grade horária ativa</b>.
                </div>
              </div>
            </div>
          )}

          {hasProfessor && (
            <div className="md:col-span-3 rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Nome</div><div className="font-medium">{profName || '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">CPF</div><div className="font-medium">{profCpf || '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">Matrícula</div><div className="font-medium">{profReg || '—'}</div></div>
              </div>
            </div>
          )}
        </Section>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Resumo topo */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Datas</div>
                <div className="text-xl font-semibold">{absenceDates.length}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Total de horas-aula</div>
                <div className="text-xl font-semibold">{totalHours}</div>
              </div>
              {schoolOptions.length > 1 && (
                <div className="ml-auto w-full md:w-72">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Filtrar grade por escola
                  </Label>
                  <SearchableSelect
                    value={schoolFilter || '__ALL__'}
                    onValueChange={(v) => setSchoolFilter(v === '__ALL__' ? '' : v)}
                    options={[
                      { value: '__ALL__', label: 'Todas as escolas' },
                      ...schoolOptions.map(s => ({ value: s.id, label: s.nome })),
                    ]}
                    placeholder="Todas as escolas"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {hasDuplicateDates && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Há datas duplicadas. Cada data deve aparecer apenas uma vez na solicitação.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            <AbsenceDatesPanel
              dates={absenceDates}
              activeUid={activeDateUid}
              onSetActive={setActiveDateUid}
              onChangeDate={changeDate}
              onAdd={addDate}
              onRemove={removeDate}
              countsByUid={countsByUid}
              availableWeekdays={availableWeekdays}
              isDateAllowed={isDateAllowed}
            />

            <div className="space-y-3">
              {loadingGrid ? (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                  Carregando grade horária do professor…
                </div>
              ) : (
                <TeacherScheduleGridSelector
                  classes={weeklyClasses}
                  activeDate={activeDate}
                  selectedIds={activeSelectedIds}
                  onToggle={toggleClassForActiveDate}
                  onToggleAllActiveDay={toggleAllForActiveDay}
                  schoolFilter={schoolFilter}
                />
              )}

              {/* Lista resumo por data */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Aulas marcadas por data
                  </div>
                  {absenceDates.map(d => {
                    const arr = selectionByDate[d.uid] || [];
                    return (
                      <div key={d.uid} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">
                            {d.date ? new Date(d.date + 'T00:00').toLocaleDateString('pt-BR') : '— sem data —'}
                          </Badge>
                          {d.date && (
                            <span className="text-xs text-muted-foreground">{longWeekdayLabel(d.date)}</span>
                          )}
                          <Badge variant="outline" className="ml-auto text-[11px]">
                            {arr.length} {arr.length === 1 ? 'aula' : 'aulas'}
                          </Badge>
                        </div>
                        {arr.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            Nenhuma aula marcada — selecione na grade ao lado (use o painel de datas para ativar esta data).
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {arr.map(c => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="text-[11px] cursor-pointer hover:bg-destructive/10"
                                onClick={() => setSelectionByDate(prev => ({
                                  ...prev,
                                  [d.uid]: (prev[d.uid] || []).filter(x => x.id !== c.id),
                                }))}
                                title="Remover esta aula"
                              >
                                {c.class_group_name} · {c.subject_name} · {c.start_time}–{c.end_time} ✕
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* MOTIVO + ANEXOS — bloco âmbar */}
          <ColoredSection
            tone="amber"
            icon={FileText}
            title="Motivo da Substituição"
            description="Justificativa da ausência e comprovantes (atestado, licença, etc.)."
          >
            <div>
              <Label className="text-xs font-medium text-amber-900 dark:text-amber-200">Motivo da ausência *</Label>
              <Textarea
                className="mt-1 bg-white dark:bg-background border-amber-200 dark:border-amber-900 focus-visible:ring-amber-400"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: atestado médico, licença, motivo familiar…"
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <Label className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Comprovantes do motivo
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">(opcional)</span>
                </Label>
                {absenceAttachments.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {absenceAttachments.length} {absenceAttachments.length === 1 ? 'arquivo' : 'arquivos'}
                  </Badge>
                )}
              </div>
              {organizationId && (
                <AbsenceAttachmentsField
                  value={absenceAttachments}
                  onChange={setAbsenceAttachments}
                  organizationId={organizationId}
                  batchTempId={batchTempId}
                />
              )}
            </div>
          </ColoredSection>

          {/* SUBSTITUTO + VALOR — bloco azul */}
          <ColoredSection
            tone="sky"
            icon={User}
            title="Indicação de Substituto (opcional)"
            description="Sugira um substituto se possível. O R.H. faz a confirmação final ou indica outro nome."
          >
            <div className="space-y-4">
              <SubstituteSourceSelector
                value={substituteSource}
                onChange={(v) => {
                  setSubstituteSource(v);
                  setSubstituteRefId('');
                  if (v !== 'manual') { setSubName(''); setSubCpf(''); setSubRg(''); }
                }}
                cidades={targetCidades}
              />

              {substituteSource === 'professor' && (() => {
                const list = eligibleProfsQ.data || [];
                const visible = showWithConflicts ? list : list.filter(p => !p.hasConflict);
                const options = visible.map(p => ({
                  value: p.id,
                  label: p.full_name + (p.hasConflict ? ' (conflito)' : ''),
                  description: [p.registration_code, p.cpf].filter(Boolean).join(' · ') || undefined,
                  keywords: `${p.cpf || ''} ${p.registration_code || ''}`,
                  disabled: p.hasConflict,
                }));
                return (
                  <div>
                    <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">Selecionar professor</Label>
                    <div className="mt-1">
                      <SearchableSelect
                        value={substituteRefId}
                        onValueChange={(id) => {
                          setSubstituteRefId(id);
                          const p = list.find(x => x.id === id);
                          if (p) { setSubName(p.full_name); setSubCpf(p.cpf || ''); setSubRg(''); }
                        }}
                        options={options}
                        placeholder={
                          targetCidades.length === 0
                            ? 'Selecione as aulas (Etapa 2) para liberar a busca'
                            : eligibleProfsQ.isLoading
                              ? 'Carregando…'
                              : options.length === 0
                                ? 'Nenhum professor disponível na(s) cidade(s) selecionada(s)'
                                : 'Buscar por nome, CPF ou matrícula'
                        }
                        emptyMessage="Nenhum resultado"
                        disabled={targetCidades.length === 0 || eligibleProfsQ.isLoading}
                      />
                    </div>
                    {list.some(p => p.hasConflict) && (
                      <button
                        type="button"
                        onClick={() => setShowWithConflicts(v => !v)}
                        className="mt-1.5 text-[11px] text-sky-700 dark:text-sky-300 hover:underline"
                      >
                        {showWithConflicts ? 'Ocultar' : 'Mostrar'} professores com conflito ({list.filter(p => p.hasConflict).length})
                      </button>
                    )}
                  </div>
                );
              })()}

              {substituteSource === 'talent' && (() => {
                const list = eligibleTalentsQ.data || [];
                const options = list.map(t => {
                  const localizacao = t.city_name
                    ? `${t.city_name}${t.state_sigla ? `/${t.state_sigla}` : ''}`
                    : '(sem localização)';
                  const formacao = t.formation_area || '(sem formação)';
                  const label = `${t.full_name} — ${localizacao} — ${formacao}`;
                  const tags: string[] = [];
                  if (t.priorCount > 0) tags.push(`★ já substituiu ${t.priorCount}x`);
                  if (targetCidades.length > 0 && t.inCity && t.city_name) tags.push('📍 mesma cidade da escola');
                  if (t.cpf) tags.push(`CPF ${t.cpf}`);
                  if (t.phone) tags.push(t.phone);
                  (t.classifications || []).forEach(c => {
                    if (c === 'PRIORIDADE') tags.push('Prioridade');
                    else if (c === 'NAO_CONTRATAR') tags.push('⚠ Não contratar');
                    else if (c === 'NAD') tags.push('NAD');
                  });
                  return {
                    value: t.id,
                    label,
                    description: tags.length ? tags.join(' · ') : undefined,
                    keywords: `${t.full_name} ${t.cpf || ''} ${t.formation_area || ''} ${t.city_name || ''} ${t.state_sigla || ''}`,
                  };
                });
                const suggestedCount = list.filter(t => t.priorCount > 0 && t.inCity).length;
                return (
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">Selecionar candidato</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {list.length} candidato(s) no Banco de Talentos
                        {suggestedCount > 0 && ` · ★ ${suggestedCount} já substituíram nesta cidade`}
                      </span>
                    </div>
                    <div className="mt-1">
                      <SearchableSelect
                        value={substituteRefId}
                        onValueChange={(id) => {
                          setSubstituteRefId(id);
                          const t = list.find(x => x.id === id);
                          if (t) { setSubName(t.full_name); setSubCpf(t.cpf || ''); setSubRg(''); }
                        }}
                        options={options}
                        contentWidth="auto"
                        contentClassName="min-w-[var(--radix-popover-trigger-width)] max-w-[min(680px,calc(100vw-2rem))]"
                        placeholder={
                          eligibleTalentsQ.isLoading
                            ? 'Carregando…'
                            : options.length === 0
                              ? 'Nenhum candidato no Banco de Talentos'
                              : 'Buscar por nome, CPF, formação, cidade ou UF'
                        }
                        searchPlaceholder="Buscar por nome, CPF, formação, cidade ou UF"
                        emptyMessage="Nenhum resultado"
                        disabled={eligibleTalentsQ.isLoading}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Lista <b>todos</b> os candidatos. Quem é da mesma cidade da escola e já realizou substituições aparece no topo.
                    </p>
                  </div>
                );
              })()}

              {substituteSource === 'manual' && (
                <div className="rounded-md border border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 p-3">
                  <p className="text-[11px] text-sky-900/80 dark:text-sky-200/80 mb-2">
                    Ao salvar, este substituto será adicionado automaticamente ao <b>Banco de Talentos</b> (sem currículo).
                  </p>
                  <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">Nome do substituto</Label>
                  <Input
                    className="mt-1 bg-white dark:bg-background border-sky-200 dark:border-sky-900 focus-visible:ring-sky-400"
                    value={subName} onChange={(e) => setSubName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">CPF</Label>
                  <Input className="mt-1 bg-white dark:bg-background border-sky-200 dark:border-sky-900"
                    value={subCpf} onChange={(e) => setSubCpf(e.target.value)}
                    readOnly={substituteSource !== 'manual' && !!substituteRefId} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">RG</Label>
                  <Input className="mt-1 bg-white dark:bg-background border-sky-200 dark:border-sky-900"
                    value={subRg} onChange={(e) => setSubRg(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">Total de horas-aula</Label>
                  <Input className="mt-1 bg-muted/40" value={totalHours} readOnly />
                </div>
                <div>
                  <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">
                    Valor da hora-aula {!isAdmin && <span className="text-[10px] text-muted-foreground">(somente admin)</span>}
                  </Label>
                  <Input
                    className={cn(
                      "mt-1 border-sky-200 dark:border-sky-900",
                      isAdmin ? "bg-white dark:bg-background" : "bg-muted/40 cursor-not-allowed"
                    )}
                    type="number" min={0} step="0.01" value={rate}
                    readOnly={!isAdmin}
                    disabled={!isAdmin}
                    onChange={(e) => isAdmin && setRate(Number(e.target.value))} />
                </div>
              </div>
            </div>


            <div className="mt-4 rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-900 p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Calculator className="h-5 w-5 text-emerald-700 dark:text-emerald-300 mt-0.5" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Valor total calculado</div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">{BRL(total)}</div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">{totalHours} h × {BRL(rate)}</div>
                </div>
              </div>
              {isAdminOrRh && (
                <div className="w-40">
                  <Label className="text-[10px] text-emerald-800 dark:text-emerald-200">Ajuste (Admin/RH)</Label>
                  <Input type="number" step="0.01" value={total}
                    onChange={(e) => setOverrideTotal(Number(e.target.value))}
                    className="mt-1 bg-white dark:bg-background border-emerald-200 dark:border-emerald-900" />
                </div>
              )}
            </div>
          </ColoredSection>
        </div>
      )}



      {step === 4 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Revisão</div>
              <p className="text-sm text-muted-foreground">
                Serão geradas <b>{totalHours}</b> {totalHours === 1 ? 'solicitação' : 'solicitações'} (uma por horário marcado),
                distribuídas em <b>{absenceDates.length}</b> {absenceDates.length === 1 ? 'data' : 'datas'}.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Valor total do lote</div>
                <div className="text-3xl font-semibold mt-1">{BRL(total)}</div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>{totalHours} h × {BRL(rate)}</div>
              </div>
            </div>

            <ReviewBlock title="Professor a ser substituído" items={[
              ['Nome', profName || '—'],
              ['CPF', profCpf || '—'],
              ['Matrícula', profReg || '—'],
            ]} />

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Aulas por data ({absenceDates.length})
              </div>
              <div className="space-y-3">
                {absenceDates.map((d) => {
                  const arr = selectionByDate[d.uid] || [];
                  return (
                    <div key={d.uid} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>
                          {d.date ? new Date(d.date + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{longWeekdayLabel(d.date)}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {arr.length} {arr.length === 1 ? 'aula' : 'aulas'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {arr.map(c => (
                          <div key={c.id} className="text-xs flex flex-wrap items-center gap-x-2">
                            <span className="font-medium">{c.slot_label}</span>
                            <span className="text-muted-foreground">{c.start_time}–{c.end_time}</span>
                            <span>·</span>
                            <span>{c.school_name}</span>
                            <span>·</span>
                            <span>{c.class_group_name}</span>
                            <span>·</span>
                            <span>{c.subject_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ReviewBlock title="Motivo & Indicação de Substituto" items={[
              ['Motivo da ausência', reason || '—'],
              ['Substituto indicado', subName || '— (a definir pelo R.H.)'],
              ['CPF do substituto', subCpf || '—'],
              ['Valor hora-aula', BRL(rate)],
            ]} />

          </CardContent>
        </Card>
      )}

      {/* Barra fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="text-xs text-muted-foreground">
            Etapa {step} de {STEPS.length} · <span className="font-medium text-foreground">{STEPS[step - 1].label}</span>
            {step === 2 && totalHours > 0 && (
              <> · <span className="font-medium text-foreground">{totalHours} {totalHours === 1 ? 'aula' : 'aulas'} · {absenceDates.length} {absenceDates.length === 1 ? 'data' : 'datas'}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button variant="outline" onClick={goBack} disabled={step === 1}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            {step < 4 ? (
              <Button onClick={goNext} disabled={!canAdvance}>
                Próximo <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onSave} disabled={!allValid || create.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {create.isPending ? 'Salvando…' : `Criar ${totalHours > 1 ? `${totalHours} solicitações` : 'solicitação'}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardStepper({ current, onJump, validity }:
  { current: number; onJump: (n: number) => void; validity: (n: number) => boolean }) {
  const pct = ((current - 1) / (STEPS.length - 1)) * 100;
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <ol className="hidden md:flex items-center justify-between gap-2">
          {STEPS.map((s, idx) => {
            const isCurrent = s.n === current;
            const isDone = s.n < current && validity(s.n);
            const canJump = s.n < current || validity(current);
            return (
              <li key={s.n} className="flex-1 flex items-center">
                <button
                  type="button"
                  onClick={() => canJump && onJump(s.n)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn('flex items-center gap-3 text-left',
                    canJump ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
                >
                  <span className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isCurrent && 'bg-primary text-primary-foreground border-primary',
                    isDone && !isCurrent && 'bg-emerald-500 text-white border-emerald-500',
                    !isCurrent && !isDone && 'bg-background text-muted-foreground'
                  )}>
                    {isDone ? <Check className="h-4 w-4" /> : s.n}
                  </span>
                  <div>
                    <div className={cn('text-sm font-medium', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</div>
                    <div className="text-[11px] text-muted-foreground">{s.hint}</div>
                  </div>
                </button>
                {idx < STEPS.length - 1 && <div className="flex-1 mx-3 h-px bg-border" />}
              </li>
            );
          })}
        </ol>
        <div className="md:hidden space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Etapa {current} de {STEPS.length}</span>
            <span className="text-muted-foreground">{STEPS[current - 1].label}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground">{STEPS[current - 1].hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, description, children }:
  { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
      </CardContent>
    </Card>
  );
}

type Tone = 'amber' | 'sky';
const TONE_STYLES: Record<Tone, { wrap: string; header: string; iconBox: string; title: string; desc: string }> = {
  amber: {
    wrap: 'border-amber-200 dark:border-amber-900/60',
    header: 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60',
    iconBox: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    title: 'text-amber-900 dark:text-amber-100',
    desc: 'text-amber-800/70 dark:text-amber-200/70',
  },
  sky: {
    wrap: 'border-sky-200 dark:border-sky-900/60',
    header: 'bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-900/60',
    iconBox: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    title: 'text-sky-900 dark:text-sky-100',
    desc: 'text-sky-800/70 dark:text-sky-200/70',
  },
};

function ColoredSection({ tone, icon: Icon, title, description, children }: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const s = TONE_STYLES[tone];
  return (
    <Card className={cn('overflow-hidden', s.wrap)}>
      <div className={cn('flex items-start gap-3 px-5 py-3', s.header)}>
        <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-md', s.iconBox)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className={cn('text-sm font-semibold uppercase tracking-wide', s.title)}>{title}</div>
          {description && <p className={cn('text-xs mt-0.5', s.desc)}>{description}</p>}
        </div>
      </div>
      <CardContent className="p-5 space-y-3">{children}</CardContent>
    </Card>
  );
}

function ReviewBlock({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
