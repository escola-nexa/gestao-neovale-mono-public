import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, X, ChevronDown, ChevronUp, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import {
  loadBimestersForOrg,
  rangeForSelection,
  detectCurrentBimester,
  type BimesterInfo,
  type SemesterKey,
} from '../utils/bimesterRange';

export interface ScheduleFilterValues {
  schoolId: string | null;
  courseId: string | null;
  classGroupId: string | null;
  professorId: string | null;
  subjectId?: string | null;
  startDate: string | null;
  endDate: string | null;
  semester: SemesterKey | null;
  bimester: number | null;
}

interface FilterOption {
  id: string;
  nome?: string;
  full_name?: string;
}

interface ScheduleFiltersProps {
  value: ScheduleFilterValues;
  onChange: (filters: ScheduleFilterValues) => void;
}

export function ScheduleFilters({ value, onChange }: ScheduleFiltersProps) {
  const { organization } = useOrganization();
  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [professors, setProfessors] = useState<FilterOption[]>([]);
  const [bimesters, setBimesters] = useState<BimesterInfo[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // Load all schools
  const loadSchools = useCallback(async () => {
    if (!organization?.id) return;
    const data = await fetchSchoolsWithCourses<{ id: string; nome: string }>({ organizationId: organization.id });
    setSchools(data);
    if (data.length === 1 && !value.schoolId) {
      onChange({ ...value, schoolId: data[0].id });
    }
  }, [organization?.id]);

  const loadProfessors = useCallback(async (schoolId: string | null) => {
    if (!organization?.id) return;
    if (!schoolId) {
      const { data } = await supabase
        .from('professors')
        .select('id, full_name')
        .eq('organization_id', organization.id)
        .eq('status', 'ACTIVE')
        .is('deleted_at', null)
        .order('full_name');
      setProfessors(data || []);
      return;
    }
    const { data: bindings } = await supabase
      .from('professor_school_courses')
      .select('professor_id')
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE');
    const professorIds = [...new Set((bindings || []).map(b => b.professor_id))];
    if (professorIds.length === 0) { setProfessors([]); return; }
    const { data } = await supabase
      .from('professors')
      .select('id, full_name')
      .in('id', professorIds)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .order('full_name');
    setProfessors(data || []);
  }, [organization?.id]);

  const loadCourses = useCallback(async (schoolId: string | null) => {
    if (!organization?.id) return;
    if (!schoolId) { setCourses([]); return; }
    const { data: courseSchools } = await supabase
      .from('course_schools')
      .select('course_id')
      .eq('school_id', schoolId);
    const courseIds = [...new Set((courseSchools || []).map(cs => cs.course_id))];
    if (courseIds.length === 0) { setCourses([]); return; }
    const { data } = await supabase
      .from('courses')
      .select('id, nome')
      .in('id', courseIds)
      .eq('organization_id', organization.id)
      .eq('status', 'ativo')
      .order('nome');
    setCourses(data || []);
  }, [organization?.id]);

  const loadClassGroups = useCallback(async (schoolId: string | null, courseId: string | null) => {
    if (!schoolId || !courseId) { setClassGroups([]); return; }
    const { data } = await supabase
      .from('class_groups')
      .select('id, nome')
      .eq('school_id', schoolId)
      .eq('course_id', courseId)
      .eq('status', 'ativo')
      .order('nome');
    setClassGroups(data || []);
  }, []);

  useEffect(() => {
    loadSchools();
    loadProfessors(null);
  }, [loadSchools, loadProfessors]);

  useEffect(() => {
    loadCourses(value.schoolId);
    loadProfessors(value.schoolId);
  }, [value.schoolId, loadCourses, loadProfessors]);

  useEffect(() => {
    loadClassGroups(value.schoolId, value.courseId);
  }, [value.schoolId, value.courseId, loadClassGroups]);

  // Load bimesters
  useEffect(() => {
    if (!organization?.id) return;
    loadBimestersForOrg(organization.id).then(setBimesters);
  }, [organization?.id]);

  const updateFilter = (partial: Partial<ScheduleFilterValues>) => {
    onChange({ ...value, ...partial });
  };

  const handleSchoolChange = (schoolId: string) => {
    const id = schoolId === '__all__' ? null : schoolId;
    onChange({ ...value, schoolId: id, courseId: null, classGroupId: null });
  };

  const handleCourseChange = (courseId: string) => {
    const id = courseId === '__all__' ? null : courseId;
    onChange({ ...value, courseId: id, classGroupId: null });
  };

  const applySemester = (semester: SemesterKey | null, bimester: number | null) => {
    const range = rangeForSelection(bimesters, semester, bimester);
    onChange({
      ...value,
      semester,
      bimester,
      startDate: range?.start ?? null,
      endDate: range?.end ?? null,
    });
  };

  const handleSemesterChange = (raw: string) => {
    const sem = raw === '__all__' ? null : (raw as SemesterKey);
    // Reset bimestre se sair de seu semestre
    let nextBim = value.bimester;
    if (sem === 'FIRST' && nextBim && nextBim > 2) nextBim = null;
    if (sem === 'SECOND' && nextBim && nextBim < 3) nextBim = null;
    applySemester(sem, nextBim);
  };

  const handleBimesterChange = (raw: string) => {
    const bim = raw === '__all__' ? null : Number(raw);
    // Se escolher um bimestre, ajusta semestre coerente
    let sem = value.semester;
    if (bim === 1 || bim === 2) sem = 'FIRST';
    else if (bim === 3 || bim === 4) sem = 'SECOND';
    applySemester(sem, bim);
  };

  const handleManualDateChange = (partial: Partial<ScheduleFilterValues>) => {
    // Edição manual de data desfaz semestre/bimestre
    onChange({ ...value, ...partial, semester: null, bimester: null });
  };

  const clearAll = () => {
    onChange({
      schoolId: null,
      courseId: null,
      classGroupId: null,
      professorId: null,
      startDate: null,
      endDate: null,
      semester: null,
      bimester: null,
    });
  };

  const presetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    onChange({ ...value, startDate: today, endDate: today, semester: null, bimester: null });
  };

  const presetThisWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Dom
    const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    onChange({
      ...value,
      startDate: monday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10),
      semester: null,
      bimester: null,
    });
  };

  const presetCurrentBimester = () => {
    const b = detectCurrentBimester(bimesters);
    if (b) handleBimesterChange(String(b));
  };

  const bimesterOptions = useMemo(() => {
    const allowed = value.semester === 'FIRST' ? [1, 2]
      : value.semester === 'SECOND' ? [3, 4]
      : [1, 2, 3, 4];
    return [
      { value: '__all__', label: 'Todos' },
      ...allowed
        .filter(n => bimesters.some(b => b.number === n))
        .map(n => ({ value: String(n), label: `${n}º Bimestre` })),
    ];
  }, [value.semester, bimesters]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof ScheduleFilterValues; label: string; onClear: () => void }[] = [];
    if (value.schoolId) {
      const s = schools.find(x => x.id === value.schoolId);
      chips.push({ key: 'schoolId', label: `Escola: ${s?.nome ?? '...'}`, onClear: () => handleSchoolChange('__all__') });
    }
    if (value.courseId) {
      const c = courses.find(x => x.id === value.courseId);
      chips.push({ key: 'courseId', label: `Curso: ${c?.nome ?? '...'}`, onClear: () => handleCourseChange('__all__') });
    }
    if (value.classGroupId) {
      const cg = classGroups.find(x => x.id === value.classGroupId);
      chips.push({ key: 'classGroupId', label: `Turma: ${cg?.nome ?? '...'}`, onClear: () => updateFilter({ classGroupId: null }) });
    }
    if (value.professorId) {
      const p = professors.find(x => x.id === value.professorId);
      chips.push({ key: 'professorId', label: `Professor: ${p?.full_name ?? '...'}`, onClear: () => updateFilter({ professorId: null }) });
    }
    if (value.semester) {
      const label = value.semester === 'FIRST' ? '1º Semestre' : value.semester === 'SECOND' ? '2º Semestre' : 'Anual';
      chips.push({ key: 'semester', label, onClear: () => applySemester(null, null) });
    }
    if (value.bimester) {
      chips.push({ key: 'bimester', label: `${value.bimester}º Bimestre`, onClear: () => applySemester(value.semester, null) });
    }
    if (value.startDate || value.endDate) {
      const txt = `${value.startDate ?? '...'} → ${value.endDate ?? '...'}`;
      chips.push({ key: 'startDate', label: txt, onClear: () => onChange({ ...value, startDate: null, endDate: null, semester: null, bimester: null }) });
    }
    return chips;
  }, [value, schools, courses, classGroups, professors]);

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filtros
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

      {/* Active chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((c, i) => (
            <Badge key={`${String(c.key)}-${i}`} variant="outline" className="gap-1 pl-2 pr-1 py-0.5">
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
          {/* Linha 1 — Acadêmico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Escola</Label>
              <SearchableSelect
                value={value.schoolId || '__all__'}
                onValueChange={handleSchoolChange}
                placeholder="Todas"
                searchPlaceholder="Buscar escola..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todas' }, ...schools.map(s => ({ value: s.id, label: s.nome ?? '' }))]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Curso</Label>
              <SearchableSelect
                value={value.courseId || '__all__'}
                onValueChange={handleCourseChange}
                disabled={!value.schoolId}
                placeholder={value.schoolId ? 'Todos' : 'Selecione escola'}
                searchPlaceholder="Buscar curso..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todos' }, ...courses.map(c => ({ value: c.id, label: c.nome ?? '' }))]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Turma</Label>
              <SearchableSelect
                value={value.classGroupId || '__all__'}
                onValueChange={v => updateFilter({ classGroupId: v === '__all__' ? null : v })}
                disabled={!value.courseId}
                placeholder={value.courseId ? 'Todas' : 'Selecione curso'}
                searchPlaceholder="Buscar turma..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todas' }, ...classGroups.map(cg => ({ value: cg.id, label: cg.nome ?? '' }))]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Professor</Label>
              <SearchableSelect
                value={value.professorId || '__all__'}
                onValueChange={v => updateFilter({ professorId: v === '__all__' ? null : v })}
                placeholder="Todos"
                searchPlaceholder="Buscar professor..."
                triggerClassName="h-9"
                options={[{ value: '__all__', label: 'Todos' }, ...professors.map(p => ({ value: p.id, label: p.full_name ?? '' }))]}
              />
            </div>
          </div>

          {/* Linha 2 — Temporal */}
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
              <Input
                type="date"
                className="h-9"
                value={value.startDate || ''}
                onChange={e => handleManualDateChange({ startDate: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                className="h-9"
                value={value.endDate || ''}
                onChange={e => handleManualDateChange({ endDate: e.target.value || null })}
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={presetToday}>
              <CalendarRange className="h-3 w-3 mr-1" /> Hoje
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={presetThisWeek}>
              <CalendarRange className="h-3 w-3 mr-1" /> Esta Semana
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={presetCurrentBimester}
              disabled={!detectCurrentBimester(bimesters)}
            >
              <CalendarRange className="h-3 w-3 mr-1" /> Bimestre Atual
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
