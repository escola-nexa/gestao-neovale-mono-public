import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CalendarPlus, Users, ShieldCheck, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

import { classifyUCP, UCP_LABELS, UCP_COLORS, type UcpType } from '../lib/classifyUCP';
import { indicationLinksApi } from '../lib/indicationLinksApi';

export type BimesterFilterItem = { subject_id: string; bimester: number; enabled: boolean };
export type PlanningFilterItem = { professor_id: string; enabled: boolean; count?: number | null };
export type SemesterScope = 'FIRST' | 'SECOND';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  linkId: string;
  schoolName: string;
  anoLetivo: string;
  alreadyMaterialized: boolean;
  loading: boolean;
  /**
   * Confirma a geração de UM semestre por vez. O `scope` indica qual semestre
   * está sendo gerado, `filter` traz os bimestres válidos daquele semestre e
   * `planningFilter` traz a seleção de PL por professor (todos marcados por padrão).
   */
  onConfirm: (filter: BimesterFilterItem[], scope: SemesterScope, planningFilter: PlanningFilterItem[]) => void;
}

type Sem = 'ANNUAL' | 'FIRST' | 'SECOND';
const SEM_LABEL: Record<Sem, string> = { ANNUAL: 'Anual', FIRST: '1º Semestre', SECOND: '2º Semestre' };
const VALID_BIM: Record<Sem, number[]> = { ANNUAL: [1, 2, 3, 4], FIRST: [1, 2], SECOND: [3, 4] };
const SCOPE_BIMS: Record<SemesterScope, number[]> = { FIRST: [1, 2], SECOND: [3, 4] };
const WEEKS_PER_BIMESTER = 8;

export function SubjectBimesterFilterDialog({
  open, onOpenChange, linkId, schoolName, anoLetivo, alreadyMaterialized, loading, onConfirm,
}: Props) {
  const [step, setStep] = useState<SemesterScope>('FIRST');
  const [doneFirst, setDoneFirst] = useState(false);
  const [doneSecond, setDoneSecond] = useState(false);

  const subjectsQuery = useQuery({
    queryKey: ['rh-link-bim-filter-subjects', linkId],
    enabled: open && !!linkId,
    queryFn: async () => {
      const subs = await indicationLinksApi.getBimesterFilterSubjects(linkId);
      return (subs ?? []) as Array<{
        id: string; nome: string; nome_boletim: string | null;
        semester: Sem | null; carga_horaria_semanal: number; course_id: string;
      }>;
    },
  });

  const existingFilterQuery = useQuery({
    queryKey: ['rh-link-bim-filter-existing', linkId],
    enabled: open && !!linkId,
    queryFn: async () => {
      return indicationLinksApi.getBimesterFilter(linkId);
    },
  });

  // Indicações APROVADAS — usadas para construir a conferência por professor
  const indicationsQuery = useQuery({
    queryKey: ['rh-link-bim-filter-indications', linkId],
    enabled: open && !!linkId,
    queryFn: async () => {
      const data = await indicationLinksApi.getApprovedIndications(linkId);
      return data;
    },
  });

  const [selection, setSelection] = useState<Map<string, Set<number>>>(new Map());
  const [approved, setApproved] = useState(false);

  // Reset estado quando reabre
  useEffect(() => {
    if (!open) {
      setApproved(false);
      setStep('FIRST');
      setDoneFirst(false);
      setDoneSecond(false);
      return;
    }
    const subs = subjectsQuery.data;
    if (!subs) return;
    const existing = existingFilterQuery.data ?? [];
    const existingMap = new Map<string, Map<number, boolean>>();
    existing.forEach((e) => {
      if (!existingMap.has(e.subject_id)) existingMap.set(e.subject_id, new Map());
      existingMap.get(e.subject_id)!.set(e.bimester, e.enabled);
    });
    const next = new Map<string, Set<number>>();
    subs.forEach((s) => {
      const sem: Sem = (s.semester as Sem) ?? 'ANNUAL';
      const set = new Set<number>();
      VALID_BIM[sem].forEach((b) => {
        const prior = existingMap.get(s.id)?.get(b);
        if (prior === undefined || prior === true) set.add(b);
      });
      next.set(s.id, set);
    });
    setSelection(next);
  }, [open, subjectsQuery.data, existingFilterQuery.data]);

  // Mudou de etapa ou seleção → exige nova aprovação
  useEffect(() => { setApproved(false); }, [selection, step]);

  /**
   * Disciplinas pertinentes à etapa atual:
   *   • FIRST  → semester = FIRST ou ANNUAL
   *   • SECOND → semester = SECOND ou ANNUAL
   * Bimestres exibidos: apenas os da etapa (B1/B2 ou B3/B4), mesmo para ANUAL.
   */
  const stepSubjects = useMemo(() => {
    const subs = subjectsQuery.data ?? [];
    const allowed = step === 'FIRST' ? new Set(['FIRST', 'ANNUAL']) : new Set(['SECOND', 'ANNUAL']);
    return subs
      .filter((s) => allowed.has((s.semester as Sem) ?? 'ANNUAL'))
      .sort((a, b) =>
        (a.nome_boletim || a.nome).localeCompare(b.nome_boletim || b.nome, 'pt-BR', { numeric: true }),
      );
  }, [subjectsQuery.data, step]);

  const stepBims = SCOPE_BIMS[step];

  /**
   * Conferência por professor — SOMENTE da etapa atual.
   * Sem expansão automática de pares de UC: usa apenas o que está em
   * candidato_grade (mesmo critério da função SQL de materialização).
   */
  type SubjectRow = {
    subject_id: string;
    nome: string;
    ucp: UcpType;
    ucpLabel: string;
    ucpColorClass: string;
    ch: number;
    bims: number[];
    semestreLessons: number;
    sem: Sem;
  };
  type TeacherRow = {
    key: string;
    nome: string;
    turmas: Set<string>;
    items: SubjectRow[];
    chSemanal: number;
    lessons: number;
    pl: number;
  };

  const perTeacher = useMemo(() => {
    const subs = subjectsQuery.data;
    const inds = indicationsQuery.data;
    if (!subs || !inds) return null;
    const subMap = new Map(subs.map((s) => [s.id, s] as const));
    const allowedSem: Set<Sem> = step === 'FIRST' ? new Set(['FIRST', 'ANNUAL']) : new Set(['SECOND', 'ANNUAL']);

    // ── Pareamento UCP (FIRST <-> SECOND) por (course_id, classe UCP) ──
    // Espelha o critério da função SQL materialize_grade_from_indications_internal:
    // se o diretor indicou apenas o lado de um semestre, o sistema considera
    // automaticamente a UCP par do semestre oposto para o mesmo professor/slot.
    const ucPairs = new Map<string, { FIRST: string[]; SECOND: string[] }>();
    subs.forEach((s) => {
      if (s.semester !== 'FIRST' && s.semester !== 'SECOND') return;
      const ucp = classifyUCP(s.nome || s.nome_boletim);
      if (ucp === 'OUTRA') return;
      const key = `${s.course_id}::${ucp}`;
      const entry = ucPairs.get(key) ?? { FIRST: [], SECOND: [] };
      entry[s.semester as 'FIRST' | 'SECOND'].push(s.id);
      ucPairs.set(key, entry);
    });

    const map = new Map<string, TeacherRow>();
    const subjPairs = new Set<string>();

    inds.forEach((i) => {
      const g: any = i.candidato_grade ?? {};
      const profKey = i.candidato_email || i.candidato_nome || i.id;
      const nome = i.candidato_nome || '—';

      const baseSubjIds = Array.from(new Set(
        ['subject_id', 'first_subject_id', 'second_subject_id', 'annual_subject_id']
          .map((k) => g[k])
          .filter((v) => typeof v === 'string' && v) as string[],
      ));
      if (!baseSubjIds.length) return;

      // Expansão UCP: para cada disciplina FIRST/SECOND, inclui a par
      // do semestre oposto (se existir e for da mesma UCP).
      const expanded = new Set<string>(baseSubjIds);
      baseSubjIds.forEach((sid) => {
        const s = subMap.get(sid);
        if (!s || (s.semester !== 'FIRST' && s.semester !== 'SECOND')) return;
        const ucp = classifyUCP(s.nome || s.nome_boletim);
        if (ucp === 'OUTRA') return;
        const pair = ucPairs.get(`${s.course_id}::${ucp}`);
        if (!pair) return;
        const opposite = s.semester === 'FIRST' ? pair.SECOND : pair.FIRST;
        opposite.forEach((pid) => expanded.add(pid));
      });
      const subjIds = Array.from(expanded);

      const row: TeacherRow = map.get(profKey) ?? {
        key: profKey, nome,
        turmas: new Set(), items: [],
        chSemanal: 0, lessons: 0, pl: 0,
      };
      if (i.indication_class_id) row.turmas.add(i.indication_class_id);

      subjIds.forEach((sid) => {
        const s = subMap.get(sid);
        if (!s) return;
        const sem: Sem = (s.semester as Sem) ?? 'ANNUAL';
        if (!allowedSem.has(sem)) return;
        const ch = s.carga_horaria_semanal || 0;
        if (ch <= 0) return;
        const enabledBims = Array.from(selection.get(sid) ?? new Set<number>())
          .filter((b) => stepBims.includes(b))
          .sort((a, b) => a - b);
        if (!enabledBims.length) return;

        const pairKey = `${profKey}::${sid}`;
        if (subjPairs.has(pairKey)) return;
        subjPairs.add(pairKey);

        const subjectName = s.nome_boletim || s.nome || '—';
        const ucp = classifyUCP(s.nome || subjectName);
        const semestreLessons = ch * enabledBims.length * WEEKS_PER_BIMESTER;

        row.chSemanal += ch;
        row.lessons += semestreLessons;
        row.items.push({
          subject_id: sid,
          nome: subjectName,
          ucp,
          ucpLabel: UCP_LABELS[ucp],
          ucpColorClass: UCP_COLORS[ucp],
          ch,
          bims: enabledBims,
          semestreLessons,
          sem,
        });
      });
      if (row.items.length === 0) {
        return;
      }
      map.set(profKey, row);
    });

    const rows = Array.from(map.values())
      .map((r) => {
        r.items.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        const ch = Math.round(r.chSemanal * 10) / 10;
        return { ...r, chSemanal: ch, pl: ch > 0 ? Math.max(1, Math.round(ch / 3)) : 0 };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const totals = rows.reduce(
      (acc, r) => ({ ch: acc.ch + r.chSemanal, pl: acc.pl + r.pl, lessons: acc.lessons + r.lessons }),
      { ch: 0, pl: 0, lessons: 0 },
    );
    return { rows, totals: { ...totals, ch: Math.round(totals.ch * 10) / 10 } };
  }, [subjectsQuery.data, indicationsQuery.data, selection, step, stepBims]);

  const toggle = (subjectId: string, bim: number, checked: boolean) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const s = new Set(next.get(subjectId) ?? []);
      if (checked) s.add(bim); else s.delete(bim);
      next.set(subjectId, s);
      return next;
    });
  };

  const toggleAllStep = (enabled: boolean) => {
    setSelection((prev) => {
      const next = new Map(prev);
      stepSubjects.forEach((s) => {
        const sem: Sem = (s.semester as Sem) ?? 'ANNUAL';
        const validInStep = VALID_BIM[sem].filter((b) => stepBims.includes(b));
        const cur = new Set(next.get(s.id) ?? []);
        // mantém escolhas do outro semestre, só altera os bimestres da etapa
        stepBims.forEach((b) => cur.delete(b));
        if (enabled) validInStep.forEach((b) => cur.add(b));
        next.set(s.id, cur);
      });
      return next;
    });
  };

  const handleConfirm = () => {
    // Apenas bimestres da etapa atual, para todas as disciplinas pertinentes.
    const filter: BimesterFilterItem[] = [];
    stepSubjects.forEach((s) => {
      const sem: Sem = (s.semester as Sem) ?? 'ANNUAL';
      const set = selection.get(s.id) ?? new Set();
      VALID_BIM[sem].filter((b) => stepBims.includes(b)).forEach((b) => {
        filter.push({ subject_id: s.id, bimester: b, enabled: set.has(b) });
      });
    });
    // PL por professor: enviado vazio = comportamento padrão (todos marcados, regra max(1,round(turmas/3))).
    // A auditoria detalhada vem no resumo pós-geração via planning_breakdown.
    onConfirm(filter, step, []);
    if (step === 'FIRST') setDoneFirst(true);
    else setDoneSecond(true);
  };

  const goNextStep = () => {
    setStep('SECOND');
    setApproved(false);
  };
  const goPrevStep = () => {
    setStep('FIRST');
    setApproved(false);
  };

  const isLoading = subjectsQuery.isLoading || existingFilterQuery.isLoading || indicationsQuery.isLoading;
  const canGenerate = approved && !loading && !isLoading && (perTeacher?.rows.length ?? 0) > 0;

  const stepStats = useMemo(() => {
    let aulasTotal = 0;
    let aulasEnabled = 0;
    stepSubjects.forEach((s) => {
      const sem: Sem = (s.semester as Sem) ?? 'ANNUAL';
      const validCount = VALID_BIM[sem].filter((b) => stepBims.includes(b)).length;
      const enabledCount = Array.from(selection.get(s.id) ?? new Set<number>()).filter((b) => stepBims.includes(b)).length;
      const ch = s.carga_horaria_semanal || 0;
      aulasTotal += ch * validCount;
      aulasEnabled += ch * enabledCount;
    });
    return { aulasTotal, aulasEnabled };
  }, [stepSubjects, selection, stepBims]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
        aria-describedby={undefined}
      >
        {/* Header Neovale */}
        <div className="bg-[#1B1E2C] text-white px-6 py-4 border-b-4 border-[#FFDA45] shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle
              className="text-white text-base sm:text-lg font-bold flex items-center gap-2"
              style={{ fontFamily: 'Sora, system-ui, sans-serif' }}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#FFDA45] text-[#1B1E2C]">
                <CalendarPlus className="h-4 w-4" />
              </span>
              {alreadyMaterialized ? 'Atualizar' : 'Gerar'} grade horária — {schoolName}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-xs sm:text-sm">
              Geração em duas etapas: <strong className="text-[#FFDA45]">1º Semestre</strong> (B1/B2) e{' '}
              <strong className="text-[#FFDA45]">2º Semestre</strong> (B3/B4). Disciplinas anuais aparecem em ambas.
              Ano letivo: <strong className="text-[#FFDA45]">{anoLetivo}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="mt-3 flex items-center gap-2 text-[11px]">
            <StepChip
              active={step === 'FIRST'}
              done={doneFirst}
              label="1) 1º Semestre · B1/B2"
            />
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <StepChip
              active={step === 'SECOND'}
              done={doneSecond}
              label="2) 2º Semestre · B3/B4"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Etapa atual: <strong>{SEM_LABEL[step]}</strong>. Edite os bimestres a serem gerados. As escolhas do outro semestre são preservadas.
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleAllStep(true)}>Marcar tudo</Button>
              <Button size="sm" variant="outline" onClick={() => toggleAllStep(false)}>Limpar tudo</Button>
            </div>
          </div>

          {/* ===== Tabela: Disciplinas da etapa × Bimestres da etapa ===== */}
          <div className="border rounded-md overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Carregando disciplinas…
              </div>
            ) : stepSubjects.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Nenhuma disciplina ativa para esta etapa.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">Disciplina</th>
                    <th className="text-center px-2 py-1.5 font-medium w-20">Tipo</th>
                    <th className="text-center px-2 py-1.5 font-medium w-16">CH/sem</th>
                    {stepBims.map((b) => (
                      <th key={b} className="text-center px-2 py-1.5 font-medium w-14">B{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stepSubjects.map((s) => {
                    const sem: Sem = (s.semester as Sem) ?? 'ANNUAL';
                    const set = selection.get(s.id) ?? new Set();
                    return (
                      <tr key={s.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-1.5">
                          <div className="font-medium text-[#1B1E2C]">{s.nome_boletim || s.nome}</div>
                          {s.nome_boletim && s.nome_boletim !== s.nome && (
                            <div className="text-[11px] text-muted-foreground truncate">{s.nome}</div>
                          )}
                        </td>
                        <td className="text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                            sem === 'ANNUAL'
                              ? 'bg-[#FFDA45]/30 text-[#1B1E2C]'
                              : 'bg-[#1B1E2C]/10 text-[#1B1E2C]'
                          }`}>
                            {SEM_LABEL[sem]}
                          </span>
                        </td>
                        <td className="text-center text-xs">{s.carga_horaria_semanal || 0}</td>
                        {stepBims.map((b) => (
                          <td key={b} className="text-center">
                            <Checkbox
                              checked={set.has(b)}
                              onCheckedChange={(v) => toggle(s.id, b, !!v)}
                              aria-label={`B${b} ${s.nome}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ===== Conferência por professor — etapa atual ===== */}
          {perTeacher && perTeacher.rows.length > 0 && (
            <div className="border border-[#1B1E2C]/10 rounded-md overflow-hidden shadow-sm">
              <div className="bg-[#1B1E2C] text-white px-4 py-3 border-b-4 border-[#FFDA45] flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#FFDA45] text-[#1B1E2C]">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <h4
                      className="text-sm font-bold tracking-tight"
                      style={{ fontFamily: 'Sora, system-ui, sans-serif' }}
                    >
                      Conferência — {SEM_LABEL[step]}
                    </h4>
                  </div>
                  <p className="mt-1 text-[11px] sm:text-xs text-white/70">
                    Apenas disciplinas e bimestres desta etapa. Sem expansão automática — reflete exatamente o que o diretor indicou.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px]">
                  <span className="rounded-md bg-white/10 px-2.5 py-1 text-white tabular-nums">
                    <span className="text-white/60 uppercase tracking-wider">Aulas etapa</span>{' '}
                    <strong>{perTeacher.totals.lessons}</strong>
                  </span>
                  <span className="rounded-md bg-white/10 px-2.5 py-1 text-white tabular-nums">
                    <span className="text-white/60 uppercase tracking-wider">CH</span>{' '}
                    <strong>{perTeacher.totals.ch} h/sem</strong>
                  </span>
                  <span className="rounded-md bg-[#FFDA45] text-[#1B1E2C] px-2.5 py-1 tabular-nums font-bold">
                    PL: {perTeacher.totals.pl}
                  </span>
                </div>
              </div>

              <div className="bg-white divide-y divide-[#1B1E2C]/10">
                {perTeacher.rows.map((r) => (
                  <div key={r.key}>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#1B1E2C]/[0.04]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-[#FFDA45] text-[#1B1E2C] inline-flex items-center justify-center text-[11px] font-bold uppercase">
                          {r.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('') || '?'}
                        </div>
                        <span className="font-semibold text-[#1B1E2C] truncate">{r.nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                        <span className="rounded bg-white border border-[#1B1E2C]/10 px-2 py-0.5 text-[#1B1E2C]/80 tabular-nums">
                          Turmas <strong className="text-[#1B1E2C]">{r.turmas.size}</strong>
                        </span>
                        <span className="rounded bg-white border border-[#1B1E2C]/10 px-2 py-0.5 text-[#1B1E2C]/80 tabular-nums">
                          Discipl. <strong className="text-[#1B1E2C]">{r.items.length}</strong>
                        </span>
                        <span className="rounded bg-white border border-[#1B1E2C]/10 px-2 py-0.5 text-[#1B1E2C]/80 tabular-nums">
                          CH <strong className="text-[#1B1E2C]">{r.chSemanal}</strong> h/sem
                        </span>
                        <span className="rounded bg-[#FFDA45] text-[#1B1E2C] px-2 py-0.5 tabular-nums font-bold">
                          PL {r.pl}
                        </span>
                      </div>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {r.items.map((it) => (
                          <tr key={`${it.subject_id}`} className="border-t border-[#1B1E2C]/5 hover:bg-[#FFDA45]/10">
                            <td className="px-4 py-2 w-[48%]">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide shrink-0 ${it.ucpColorClass}`}>
                                  {it.ucpLabel}
                                </span>
                                <span className="text-[#1B1E2C] font-medium truncate">{it.nome}</span>
                                <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                  it.sem === 'ANNUAL'
                                    ? 'bg-[#FFDA45]/30 text-[#1B1E2C]'
                                    : 'bg-[#1B1E2C]/10 text-[#1B1E2C]/70'
                                }`}>
                                  {SEM_LABEL[it.sem]}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center w-20 tabular-nums text-[#1B1E2C]/80 text-xs">
                              {it.ch} h/sem
                            </td>
                            <td className="px-2 py-2 w-32">
                              <div className="flex items-center justify-center gap-1">
                                {stepBims.map((b) => {
                                  const on = it.bims.includes(b);
                                  return (
                                    <span
                                      key={b}
                                      className={`inline-flex items-center justify-center h-5 w-7 rounded text-[10px] font-bold tabular-nums ${
                                        on
                                          ? 'bg-[#FFDA45] text-[#1B1E2C] shadow-[inset_0_-2px_0_rgba(27,30,44,0.15)]'
                                          : 'bg-[#1B1E2C]/5 text-[#1B1E2C]/30'
                                      }`}
                                    >
                                      B{b}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold text-[#1B1E2C] text-xs">
                              {it.semestreLessons} <span className="text-[#1B1E2C]/50 font-normal">aulas</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estatísticas resumidas da etapa */}
          <div className="rounded-md border bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div>
              Aulas/sem habilitadas na etapa:{' '}
              <strong className="text-[#1B1E2C]">{stepStats.aulasEnabled}</strong>
              <span className="text-muted-foreground"> / {stepStats.aulasTotal}</span>
            </div>
            <Badge className="bg-[#1B1E2C] text-white hover:bg-[#1B1E2C]/90">
              Etapa: {SEM_LABEL[step]}
            </Badge>
          </div>
        </div>

        {/* Footer: aprovação + geração da etapa */}
        <div className="border-t bg-white px-5 py-3 space-y-3 shrink-0">
          <label
            className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
              approved
                ? 'border-[#FFDA45] bg-[#FFDA45]/10'
                : 'border-[#1B1E2C]/15 bg-[#1B1E2C]/[0.02] hover:bg-[#1B1E2C]/[0.04]'
            }`}
          >
            <Checkbox
              checked={approved}
              onCheckedChange={(v) => setApproved(!!v)}
              className="mt-0.5"
              aria-label="Confirmo a conferência desta etapa"
            />
            <div className="text-sm">
              <div className="font-semibold text-[#1B1E2C] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#1B1E2C]" />
                Confirmo a conferência do {SEM_LABEL[step]}.
              </div>
              <div className="text-[12px] text-[#1B1E2C]/70">
                Após confirmar, o botão <strong>Gerar {SEM_LABEL[step]}</strong> será habilitado. Apenas este semestre será materializado — o outro permanece intacto.
              </div>
            </div>
          </label>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Fechar
              </Button>
              {step === 'SECOND' && (
                <Button variant="outline" onClick={goPrevStep} disabled={loading}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> 1º Semestre
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConfirm}
                disabled={!canGenerate}
                className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title={!approved ? 'Confirme a conferência para habilitar' : undefined}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
                Gerar {SEM_LABEL[step]}
              </Button>
              {step === 'FIRST' && (
                <Button
                  variant="outline"
                  onClick={goNextStep}
                  disabled={loading}
                  className="border-[#1B1E2C] text-[#1B1E2C]"
                  title="Avançar para o 2º Semestre (gere depois)"
                >
                  2º Semestre <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepChip({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold ${
        active
          ? 'bg-[#FFDA45] text-[#1B1E2C]'
          : done
          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
          : 'bg-white/10 text-white/60'
      }`}
    >
      {done && <CheckCircle2 className="h-3 w-3" />}
      {label}
    </span>
  );
}
