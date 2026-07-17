import { useMemo, useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useOrganization } from '@/hooks/useOrganization';
import { useEffect } from 'react';
import {
  loadBimestersForOrg,
  rangeForSelection,
  detectCurrentBimester,
  type BimesterInfo,
  type SemesterKey,
} from '../utils/bimesterRange';
import type { ScheduleFilterValues } from './ScheduleFilters';

interface ProfessorScheduleFiltersProps {
  value: ScheduleFilterValues;
  onChange: (filters: ScheduleFilterValues) => void;
  /**
   * Modelos já filtrados pela RLS (apenas do professor logado).
   * Usados para derivar opções de Escola/Curso/Turma/Disciplina vinculadas.
   */
  models: Array<{
    school_id: string;
    school_name?: string;
    course_id: string;
    course_name?: string;
    class_group_id: string | null;
    class_group_name?: string;
    subject_id: string | null;
    subject_name?: string;
  }>;
}

export function ProfessorScheduleFilters({ value, onChange, models }: ProfessorScheduleFiltersProps) {
  const { organization } = useOrganization();
  const [bimesters, setBimesters] = useState<BimesterInfo[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    loadBimestersForOrg(organization.id).then(setBimesters);
  }, [organization?.id]);

  // Derivações: somente vínculos do professor
  const schools = useMemo(() => {
    const map = new Map<string, string>();
    models.forEach(m => { if (m.school_id) map.set(m.school_id, m.school_name || '—'); });
    return [...map.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [models]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    models
      .filter(m => !value.schoolId || m.school_id === value.schoolId)
      .forEach(m => { if (m.course_id) map.set(m.course_id, m.course_name || '—'); });
    return [...map.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [models, value.schoolId]);

  const classGroups = useMemo(() => {
    const map = new Map<string, string>();
    models
      .filter(m =>
        (!value.schoolId || m.school_id === value.schoolId) &&
        (!value.courseId || m.course_id === value.courseId)
      )
      .forEach(m => { if (m.class_group_id) map.set(m.class_group_id, m.class_group_name || '—'); });
    return [...map.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [models, value.schoolId, value.courseId]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    models
      .filter(m =>
        (!value.schoolId || m.school_id === value.schoolId) &&
        (!value.courseId || m.course_id === value.courseId) &&
        (!value.classGroupId || m.class_group_id === value.classGroupId)
      )
      .forEach(m => { if (m.subject_id) map.set(m.subject_id, m.subject_name || '—'); });
    return [...map.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [models, value.schoolId, value.courseId, value.classGroupId]);

  const updateFilter = (partial: Partial<ScheduleFilterValues>) => onChange({ ...value, ...partial });

  const handleSchoolChange = (raw: string) => {
    const id = raw === '__all__' ? null : raw;
    onChange({ ...value, schoolId: id, courseId: null, classGroupId: null, subjectId: null });
  };
  const handleCourseChange = (raw: string) => {
    const id = raw === '__all__' ? null : raw;
    onChange({ ...value, courseId: id, classGroupId: null, subjectId: null });
  };
  const handleClassChange = (raw: string) => {
    const id = raw === '__all__' ? null : raw;
    onChange({ ...value, classGroupId: id, subjectId: null });
  };

  const applySemester = (semester: SemesterKey | null, bimester: number | null) => {
    const range = rangeForSelection(bimesters, semester, bimester);
    onChange({ ...value, semester, bimester, startDate: range?.start ?? null, endDate: range?.end ?? null });
  };

  const handleSemesterChange = (raw: string) => {
    const sem = raw === '__all__' ? null : (raw as SemesterKey);
    let nextBim = value.bimester;
    if (sem === 'FIRST' && nextBim && nextBim > 2) nextBim = null;
    if (sem === 'SECOND' && nextBim && nextBim < 3) nextBim = null;
    applySemester(sem, nextBim);
  };

  const handleBimesterChange = (raw: string) => {
    const bim = raw === '__all__' ? null : Number(raw);
    let sem = value.semester;
    if (bim === 1 || bim === 2) sem = 'FIRST';
    else if (bim === 3 || bim === 4) sem = 'SECOND';
    applySemester(sem, bim);
  };

  const handleManualDateChange = (partial: Partial<ScheduleFilterValues>) => {
    onChange({ ...value, ...partial, semester: null, bimester: null });
  };

  const presetCurrentBimester = () => {
    const b = detectCurrentBimester(bimesters);
    if (b) handleBimesterChange(String(b));
  };

  const clearAll = () => onChange({
    schoolId: null, courseId: null, classGroupId: null, professorId: value.professorId,
    subjectId: null, startDate: null, endDate: null, semester: null, bimester: null,
  });

  const bimesterOptions = useMemo(() => {
    const allowed = value.semester === 'FIRST' ? [1, 2]
      : value.semester === 'SECOND' ? [3, 4]
      : [1, 2, 3, 4];
    return [
      { value: '__all__', label: 'Todos' },
      ...allowed.filter(n => bimesters.some(b => b.number === n)).map(n => ({ value: String(n), label: `${n}º Bimestre` })),
    ];
  }, [value.semester, bimesters]);

  const activeChips = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = [];
    if (value.schoolId) {
      const s = schools.find(x => x.id === value.schoolId);
      chips.push({ label: `Escola: ${s?.label ?? '...'}`, onClear: () => handleSchoolChange('__all__') });
    }
    if (value.courseId) {
      const c = courses.find(x => x.id === value.courseId);
      chips.push({ label: `Curso: ${c?.label ?? '...'}`, onClear: () => handleCourseChange('__all__') });
    }
    if (value.classGroupId) {
      const cg = classGroups.find(x => x.id === value.classGroupId);
      chips.push({ label: `Turma: ${cg?.label ?? '...'}`, onClear: () => handleClassChange('__all__') });
    }
    if (value.subjectId) {
      const sj = subjects.find(x => x.id === value.subjectId);
      chips.push({ label: `Disciplina: ${sj?.label ?? '...'}`, onClear: () => updateFilter({ subjectId: null }) });
    }
    if (value.semester) {
      const label = value.semester === 'FIRST' ? '1º Semestre' : value.semester === 'SECOND' ? '2º Semestre' : 'Anual';
      chips.push({ label, onClear: () => applySemester(null, null) });
    }
    if (value.bimester) {
      chips.push({ label: `${value.bimester}º Bimestre`, onClear: () => applySemester(value.semester, null) });
    }
    return chips;
  }, [value, schools, courses, classGroups, subjects]);

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Meus filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">{activeChips.length} ativo{activeChips.length > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(c => !c)} className="text-xs">
            {collapsed ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronUp className="h-3 w-3 mr-1" />}
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </Button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((c, i) => (
            <Badge key={i} variant="outline" className="gap-1 pl-2 pr-1 py-0.5">
              <span className="text-xs">{c.label}</span>
              <button type="button" onClick={c.onClear} className="rounded-sm hover:bg-muted p-0.5" aria-label="Remover filtro">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Escola</Label>
              <SearchableSelect
                value={value.schoolId || '__all__'}
                onValueChange={handleSchoolChange}
                placeholder="Todas as minhas escolas"
                searchPlaceholder="Buscar escola..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todas' }, ...schools.map(s => ({ value: s.id, label: s.label }))]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Curso</Label>
              <SearchableSelect
                value={value.courseId || '__all__'}
                onValueChange={handleCourseChange}
                placeholder="Todos"
                searchPlaceholder="Buscar curso..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todos' }, ...courses.map(c => ({ value: c.id, label: c.label }))]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Turma</Label>
              <SearchableSelect
                value={value.classGroupId || '__all__'}
                onValueChange={handleClassChange}
                placeholder="Todas"
                searchPlaceholder="Buscar turma..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todas' }, ...classGroups.map(cg => ({ value: cg.id, label: cg.label }))]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Disciplina</Label>
              <SearchableSelect
                value={value.subjectId || '__all__'}
                onValueChange={v => updateFilter({ subjectId: v === '__all__' ? null : v })}
                placeholder="Todas"
                searchPlaceholder="Buscar disciplina..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todas' }, ...subjects.map(s => ({ value: s.id, label: s.label }))]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Semestre</Label>
              <SearchableSelect
                value={value.semester ?? '__all__'}
                onValueChange={handleSemesterChange}
                placeholder="Todos"
                triggerClassName="h-9"
                options={[
                  { value: '__all__', label: 'Todos' },
                  { value: 'FIRST', label: '1º Semestre' },
                  { value: 'SECOND', label: '2º Semestre' },
                  { value: 'ANNUAL', label: 'Anual' },
                ]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bimestre</Label>
              <SearchableSelect
                value={value.bimester ? String(value.bimester) : '__all__'}
                onValueChange={handleBimesterChange}
                placeholder="Todos"
                triggerClassName="h-9"
                disabled={bimesters.length === 0}
                options={bimesterOptions}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input type="date" className="h-9" value={value.startDate || ''}
                onChange={e => handleManualDateChange({ startDate: e.target.value || null })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" className="h-9" value={value.endDate || ''}
                onChange={e => handleManualDateChange({ endDate: e.target.value || null })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
              onClick={presetCurrentBimester}
              disabled={!detectCurrentBimester(bimesters)}>
              <CalendarRange className="h-3 w-3 mr-1" /> Bimestre Atual
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
