import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Pencil, CheckSquare, Square, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { substitutionApi } from '@/features/presenca-professores/substituicao/api';
import { cn } from '@/lib/utils';

import type { Weekday } from '@/types/academic';

const WEEKDAY_MAP: Record<number, { db: Weekday | null; label: string }> = {
  0: { db: null, label: 'Domingo' },
  1: { db: 'SEGUNDA', label: 'Segunda-feira' },
  2: { db: 'TERCA', label: 'Terça-feira' },
  3: { db: 'QUARTA', label: 'Quarta-feira' },
  4: { db: 'QUINTA', label: 'Quinta-feira' },
  5: { db: 'SEXTA', label: 'Sexta-feira' },
  6: { db: null, label: 'Sábado' },
};

export interface SubstitutionItem {
  uid: string;
  schoolId: string;
  courseId: string;
  classGroupId: string;
  subjectId: string;
  city: string;
  director: string;
  adjunct: string;
  coordinator: string;
  selectedSlots: string[]; // weekly_teaching_models.id
}

export interface SlotOption {
  id: string;
  slot_label: string;
  slot_number: number | null;
  start_time: string;
  end_time: string;
  school_time_slot_id: string | null;
}

interface Props {
  index: number;
  item: SubstitutionItem;
  professorId: string;
  absenceDate: string; // YYYY-MM-DD
  psc: any[];
  activeScheduleSchoolIds?: string[];
  currentSemester?: 'FIRST' | 'SECOND' | 'ANNUAL' | null;
  onChange: (patch: Partial<SubstitutionItem>) => void;
  onRemove?: () => void;
  canRemove: boolean;
  editResponsibles: boolean;
  setEditResponsibles: (v: boolean) => void;
  disabledSubjectIds?: string[];
}

export function SubstitutionItemCard({
  index, item, professorId, absenceDate, psc,
  activeScheduleSchoolIds, currentSemester,
  onChange, onRemove, canRemove, editResponsibles, setEditResponsibles,
  disabledSubjectIds,
}: Props) {
  const weekdayIdx = useMemo(() => {
    if (!absenceDate) return null;
    const d = new Date(absenceDate + 'T00:00');
    return d.getDay();
  }, [absenceDate]);
  const weekdayDb = weekdayIdx !== null ? WEEKDAY_MAP[weekdayIdx].db : null;
  const weekdayLabel = weekdayIdx !== null ? WEEKDAY_MAP[weekdayIdx].label : '';

  // wtm para este professor + escola (descobrir cursos/turmas/disciplinas elegíveis no dia)
  const { data: wtm = [] } = useQuery({
    enabled: !!professorId && !!item.schoolId,
    queryKey: ['wtm_item', professorId, item.schoolId],
    queryFn: async () => {
      const data = await substitutionApi.getProfessorSchoolWtm(professorId, item.schoolId);
      return data || [];
    },
  });

  // Opções derivadas
  const schoolOptions = useMemo(() => {
    const allowed = activeScheduleSchoolIds && activeScheduleSchoolIds.length
      ? new Set(activeScheduleSchoolIds)
      : null;
    const map = new Map<string, any>();
    psc.forEach((r: any) => {
      if (!r.schools) return;
      if (allowed && !allowed.has(r.schools.id)) return;
      map.set(r.schools.id, r.schools);
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [psc, activeScheduleSchoolIds]);

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    psc.filter((r: any) => !item.schoolId || r.school_id === item.schoolId)
      .forEach((r: any) => r.courses && map.set(r.courses.id, r.courses.nome));
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [psc, item.schoolId]);

  const classGroupOptions = useMemo(() => {
    const map = new Map<string, any>();
    wtm.filter((r: any) => !item.courseId || r.course_id === item.courseId)
      .forEach((r: any) => r.class_groups && map.set(r.class_groups.id, r.class_groups));
    return Array.from(map.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [wtm, item.courseId]);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, any>();
    wtm.filter((r: any) =>
      (!item.courseId || r.course_id === item.courseId) &&
      (!item.classGroupId || r.class_group_id === item.classGroupId))
      .forEach((r: any) => {
        const s = r.subjects;
        if (!s) return;
        // Apenas disciplinas ATIVAS
        if (s.status && s.status !== 'ativo') return;
        // Apenas do semestre vigente (ou ANNUAL)
        if (currentSemester && s.semester && s.semester !== 'ANNUAL' && s.semester !== currentSemester) return;
        map.set(s.id, s);
      });
    return Array.from(map.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [wtm, item.courseId, item.classGroupId, currentSemester]);

  // Horários (slots CLASS desse combo no weekday do absenceDate)
  const slotOptions: SlotOption[] = useMemo(() => {
    if (!item.schoolId || !item.courseId || !item.classGroupId || !item.subjectId || !weekdayDb) return [];
    return wtm
      .filter((r: any) =>
        r.course_id === item.courseId &&
        r.class_group_id === item.classGroupId &&
        r.subject_id === item.subjectId &&
        r.weekday === weekdayDb)
      .map((r: any) => ({
        id: r.id,
        slot_label: r.school_time_slots?.slot_label || `Tempo ${r.school_time_slots?.slot_number ?? '?'}`,
        slot_number: r.school_time_slots?.slot_number ?? null,
        start_time: (r.start_time || '').slice(0, 5),
        end_time: (r.end_time || '').slice(0, 5),
        school_time_slot_id: r.school_time_slot_id,
      }))
      .sort((a, b) => (a.slot_number ?? 99) - (b.slot_number ?? 99) || a.start_time.localeCompare(b.start_time));
  }, [wtm, item.schoolId, item.courseId, item.classGroupId, item.subjectId, weekdayDb]);

  // Limpa seleções de slots inválidos quando opções mudarem (combo / dia)
  useEffect(() => {
    if (!item.selectedSlots.length) return;
    const validIds = new Set(slotOptions.map(s => s.id));
    const filtered = item.selectedSlots.filter(id => validIds.has(id));
    if (filtered.length !== item.selectedSlots.length) {
      onChange({ selectedSlots: filtered });
    }
  }, [slotOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-preenche município + responsáveis ao escolher escola
  useEffect(() => {
    if (!item.schoolId) return;
    const s: any = schoolOptions.find((x: any) => x.id === item.schoolId);
    if (s) {
      onChange({
        city: s.cidade || '',
        director: s.diretor || '',
        adjunct: s.diretor_adjunto || '',
        coordinator: s.coordenador_pedagogico || '',
      });
    }
  }, [item.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = slotOptions.length > 0 && item.selectedSlots.length === slotOptions.length;
  const noneSelected = item.selectedSlots.length === 0;

  function toggleSlot(id: string) {
    const has = item.selectedSlots.includes(id);
    onChange({ selectedSlots: has ? item.selectedSlots.filter(x => x !== id) : [...item.selectedSlots, id] });
  }
  function toggleAll() {
    onChange({ selectedSlots: allSelected ? [] : slotOptions.map(s => s.id) });
  }

  const showResponsibles = item.schoolId && (item.director || item.adjunct || item.coordinator || editResponsibles);
  const comboComplete = !!(item.schoolId && item.courseId && item.classGroupId && item.subjectId);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {index + 1}
          </span>
          <div className="text-sm font-semibold uppercase tracking-wide">
            Item {index + 1} — Escola, curso, turma e disciplina
          </div>
          {comboComplete && item.selectedSlots.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {item.selectedSlots.length} {item.selectedSlots.length === 1 ? 'horário' : 'horários'}
            </Badge>
          )}
        </div>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Remover
          </Button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Linha 1: Escola + Município */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Escola *</Label>
            <div className="mt-1">
              <SearchableSelect
                value={item.schoolId}
                onValueChange={(v) => onChange({
                  schoolId: v, courseId: '', classGroupId: '', subjectId: '', selectedSlots: [],
                })}
                options={schoolOptions.map((s: any) => ({ value: s.id, label: s.nome }))}
                placeholder={schoolOptions.length ? 'Selecione a escola' : 'Sem vínculos — escolha outro professor'}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Município</Label>
            <Input className="mt-1" value={item.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Auto-preenchido da escola" />
          </div>
        </div>

        {showResponsibles && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsáveis pela escola</div>
              <Button variant="ghost" size="sm" onClick={() => setEditResponsibles(!editResponsibles)}>
                <Pencil className="h-4 w-4 mr-2" /> {editResponsibles ? 'Concluir' : 'Editar'}
              </Button>
            </div>
            {editResponsibles ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Diretor</Label>
                  <Input className="mt-1" value={item.director} onChange={(e) => onChange({ director: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Diretor Adjunto</Label>
                  <Input className="mt-1" value={item.adjunct} onChange={(e) => onChange({ adjunct: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Coordenador</Label>
                  <Input className="mt-1" value={item.coordinator} onChange={(e) => onChange({ coordinator: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-sm">
                {item.director && <Badge variant="secondary">Diretor: {item.director}</Badge>}
                {item.adjunct && <Badge variant="secondary">Adjunto: {item.adjunct}</Badge>}
                {item.coordinator && <Badge variant="secondary">Coordenador: {item.coordinator}</Badge>}
                {!item.director && !item.adjunct && !item.coordinator &&
                  <span className="text-xs text-muted-foreground">Nenhum responsável cadastrado para esta escola.</span>}
              </div>
            )}
          </div>
        )}

        {/* Linha 2: Curso + Turma + Disciplina */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Curso *</Label>
            <div className="mt-1">
              <SearchableSelect
                value={item.courseId}
                onValueChange={(v) => onChange({ courseId: v, classGroupId: '', subjectId: '', selectedSlots: [] })}
                options={courseOptions.map((c: any) => ({ value: c.id, label: c.nome }))}
                placeholder={item.schoolId ? 'Selecione o curso' : 'Selecione a escola'}
                disabled={!item.schoolId}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Turma *</Label>
            <div className="mt-1">
              <SearchableSelect
                value={item.classGroupId}
                onValueChange={(v) => onChange({ classGroupId: v, subjectId: '', selectedSlots: [] })}
                options={classGroupOptions.map((c: any) => ({ value: c.id, label: c.nome }))}
                placeholder={item.courseId ? 'Selecione a turma' : 'Selecione o curso'}
                disabled={!item.courseId}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Disciplina *</Label>
            <div className="mt-1">
              <SearchableSelect
                value={item.subjectId}
                onValueChange={(v) => onChange({ subjectId: v, selectedSlots: [] })}
                options={subjectOptions.map((s: any) => {
                  const isUsed = !!disabledSubjectIds?.includes(s.id) && s.id !== item.subjectId;
                  return {
                    value: s.id,
                    label: isUsed ? `${s.nome} (já incluída)` : s.nome,
                    disabled: isUsed,
                  };
                })}
                placeholder={item.classGroupId ? 'Selecione a disciplina' : 'Selecione a turma'}
                disabled={!item.classGroupId}
              />
            </div>
          </div>
        </div>

        {/* Horários */}
        {comboComplete && (
          <div className="rounded-lg border bg-background">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">
                  Horários de aula {weekdayLabel ? <>em <span className="lowercase">{weekdayLabel}</span></> : ''}
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {item.selectedSlots.length} de {slotOptions.length} selecionados
                </Badge>
              </div>
              {slotOptions.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAll} className="h-8">
                  {allSelected ? <Square className="h-3.5 w-3.5 mr-1" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />}
                  {allSelected ? 'Limpar' : 'Selecionar todos'}
                </Button>
              )}
            </div>

            <div className="p-2">
              {slotOptions.length === 0 ? (
                <div className="flex items-start gap-3 p-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                  <div>
                    Sem aulas cadastradas na grade do professor para esta combinação em <b>{weekdayLabel.toLowerCase()}</b>.
                    Verifique a data de ausência ou escolha outra turma/disciplina.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {slotOptions.map((s) => {
                    const checked = item.selectedSlots.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                          checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleSlot(s.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{s.slot_label}</div>
                          <div className="text-xs text-muted-foreground">{s.start_time} – {s.end_time}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {comboComplete && slotOptions.length > 0 && noneSelected && (
              <div className="px-4 py-2 text-[11px] text-muted-foreground border-t bg-muted/30">
                Marque ao menos 1 horário para incluir este item na solicitação.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function getSelectedSlotMeta(slots: SlotOption[], id: string) {
  return slots.find(s => s.id === id);
}
