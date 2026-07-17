import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ExternalFilters {
  contentType: string;
  anoLetivo: string;
  bimestre: string;
  curso: string;
  turma: string;
  disciplina: string;
  professor: string;
  aluno: string;
  search: string;
}

const EMPTY_FILTERS: ExternalFilters = {
  contentType: '',
  anoLetivo: '',
  bimestre: '',
  curso: '',
  turma: '',
  disciplina: '',
  professor: '',
  aluno: '',
  search: '',
};

const PARAM_MAP: Record<keyof Omit<ExternalFilters, 'search'>, string> = {
  contentType: 'tipo',
  anoLetivo: 'ano',
  bimestre: 'bimestre',
  curso: 'curso',
  turma: 'turma',
  disciplina: 'disciplina',
  professor: 'professor',
  aluno: 'aluno',
};

export interface FilterOption {
  id: string;
  name: string;
}

export interface FilterOptions {
  contentTypes: FilterOption[];
  anosLetivos: FilterOption[];
  bimestres: FilterOption[];
  cursos: FilterOption[];
  turmas: FilterOption[];
  disciplinas: FilterOption[];
  professores: FilterOption[];
  alunos: FilterOption[];
}

// Extract filter options from raw data
function extractPlanningOptions(items: any[]): Partial<FilterOptions> {
  const cursos = new Map<string, string>();
  const turmas = new Map<string, string>();
  const disciplinas = new Map<string, string>();
  const professores = new Map<string, string>();
  const bimestres = new Set<number>();

  items.forEach((item) => {
    const courseName = item?.courses?.nome;
    const courseId = item?.course_id;
    if (courseId && courseName) cursos.set(courseId, courseName);

    const className = item?.class_groups?.nome;
    const classId = item?.class_group_id;
    if (classId && className) turmas.set(classId, className);

    const subjName = item?.subjects?.nome;
    const subjId = item?.subject_id;
    if (subjId && subjName) disciplinas.set(subjId, subjName);

    const profName = item?.professors?.full_name;
    const profId = item?.professor_id;
    if (profId && profName) professores.set(profId, profName);

    if (item?.bimester_number) bimestres.add(item.bimester_number);
  });

  return {
    cursos: Array.from(cursos, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    turmas: Array.from(turmas, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    disciplinas: Array.from(disciplinas, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    professores: Array.from(professores, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    bimestres: Array.from(bimestres).sort().map(n => ({ id: String(n), name: `${n}º Bimestre` })),
  };
}

function extractBoletimOptions(boletins: any[]): Partial<FilterOptions> {
  const cursos = new Map<string, string>();
  const turmas = new Map<string, string>();
  const alunos = new Map<string, string>();
  const bimestres = new Set<number>();
  const anosLetivos = new Set<string>();

  boletins.forEach((b) => {
    if (b?.course?.nome) cursos.set(b.course.nome, b.course.nome);
    if (b?.classGroup?.nome) turmas.set(b.classGroupId || b.classGroup.nome, b.classGroup.nome);
    if (b?.classGroup?.anoLetivo) anosLetivos.add(b.classGroup.anoLetivo);
    (b?.bimesterNumbers || []).forEach((n: number) => bimestres.add(n));
    (b?.students || []).forEach((s: any) => {
      if (s?.id && s?.nome) alunos.set(s.id, `${s.numero}. ${s.nome}`);
    });
  });

  return {
    cursos: Array.from(cursos, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    turmas: Array.from(turmas, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    alunos: Array.from(alunos, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    bimestres: Array.from(bimestres).sort().map(n => ({ id: String(n), name: `${n}º Bimestre` })),
    anosLetivos: Array.from(anosLetivos).sort().map(a => ({ id: a, name: a })),
  };
}

function extractAttendanceOptions(items: any[]): Partial<FilterOptions> {
  const cursos = new Map<string, string>();
  const turmas = new Map<string, string>();
  const disciplinas = new Map<string, string>();
  const professores = new Map<string, string>();
  const alunos = new Map<string, string>();

  items.forEach((item) => {
    const courseName = item?.class_groups?.courses?.nome;
    const courseId = item?.class_groups?.course_id;
    if (courseId && courseName) cursos.set(courseId, courseName);

    const className = item?.class_groups?.nome;
    const classId = item?.class_group_id;
    if (classId && className) turmas.set(classId, className);

    const subjName = item?.subjects?.nome;
    const subjId = item?.subject_id;
    if (subjId && subjName) disciplinas.set(subjId, subjName);

    const profName = item?.professors?.full_name;
    const profId = item?.professor_id;
    if (profId && profName) professores.set(profId, profName);

    const studentName = item?.students?.nome_completo;
    const studentId = item?.student_id;
    if (studentId && studentName) alunos.set(studentId, studentName);
  });

  return {
    cursos: Array.from(cursos, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    turmas: Array.from(turmas, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    disciplinas: Array.from(disciplinas, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    professores: Array.from(professores, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    alunos: Array.from(alunos, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// Apply filters to data
function filterPlannings(items: any[], filters: ExternalFilters): any[] {
  return items.filter((item) => {
    if (filters.curso && item.course_id !== filters.curso) return false;
    if (filters.turma && item.class_group_id !== filters.turma) return false;
    if (filters.disciplina && item.subject_id !== filters.disciplina) return false;
    if (filters.professor && item.professor_id !== filters.professor) return false;
    if (filters.bimestre && String(item.bimester_number) !== filters.bimestre) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = [
        item?.professors?.full_name,
        item?.subjects?.nome,
        item?.courses?.nome,
        item?.class_groups?.nome,
      ].some(v => v?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

function filterBoletins(boletins: any[], filters: ExternalFilters): any[] {
  return boletins
    .filter((b) => {
      if (filters.curso && b.course?.nome !== filters.curso) return false;
      if (filters.turma && (b.classGroupId || b.classGroup?.nome) !== filters.turma) return false;
      if (filters.anoLetivo && b.classGroup?.anoLetivo !== filters.anoLetivo) return false;
      return true;
    })
    .map((b) => {
      let students = b.students || [];
      if (filters.aluno) {
        students = students.filter((s: any) => s.id === filters.aluno);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        students = students.filter((s: any) =>
          s.nome?.toLowerCase().includes(q) || s.codigoMatricula?.toLowerCase().includes(q)
        );
      }
      // Filter bimester data within students
      let filteredStudents = students;
      if (filters.bimestre) {
        const bimNum = Number(filters.bimestre);
        filteredStudents = students.map((s: any) => ({
          ...s,
          subjects: (s.subjects || []).map((sub: any) => ({
            ...sub,
            bimesters: (sub.bimesters || []).filter((bim: any) => bim.number === bimNum),
          })),
        }));
      }
      return { ...b, students: filteredStudents };
    })
    .filter(b => b.students.length > 0);
}

function filterAttendance(items: any[], filters: ExternalFilters): any[] {
  return items.filter((item) => {
    if (filters.curso && item?.class_groups?.course_id !== filters.curso) return false;
    if (filters.turma && item.class_group_id !== filters.turma) return false;
    if (filters.disciplina && item.subject_id !== filters.disciplina) return false;
    if (filters.professor && item.professor_id !== filters.professor) return false;
    if (filters.aluno && item.student_id !== filters.aluno) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = [
        item?.students?.nome_completo,
        item?.professors?.full_name,
        item?.subjects?.nome,
      ].some(v => v?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

export function useExternalFilters(contentData: any) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL
  const [filters, setFiltersState] = useState<ExternalFilters>(() => {
    const f = { ...EMPTY_FILTERS };
    Object.entries(PARAM_MAP).forEach(([key, param]) => {
      const val = searchParams.get(param);
      if (val) (f as any)[key] = val;
    });
    const q = searchParams.get('busca');
    if (q) f.search = q;
    return f;
  });

  const updateFilter = useCallback((key: keyof ExternalFilters, value: string) => {
    setFiltersState(prev => {
      const next = { ...prev, [key]: value };
      // Cascading reset: when parent changes, clear children
      if (key === 'curso') {
        next.turma = '';
        next.disciplina = '';
        next.professor = '';
        next.aluno = '';
      }
      if (key === 'turma') {
        next.aluno = '';
      }
      // Sync to URL
      const params = new URLSearchParams();
      Object.entries(PARAM_MAP).forEach(([k, p]) => {
        const v = (next as any)[k];
        if (v) params.set(p, v);
      });
      if (next.search) params.set('busca', next.search);
      setSearchParams(params, { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setFiltersState(EMPTY_FILTERS);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => !!v);
  }, [filters]);

  // Determine content type
  const normalizedType = String(contentData?.contentType || '').toLowerCase();
  const isNotas = ['notas', 'notas_boletins', 'boletins'].includes(normalizedType);
  const isPlanejamentos = normalizedType === 'planejamentos';
  const isFaltas = ['faltas', 'frequencia_faltas'].includes(normalizedType);

  // Extract options from raw data
  const filterOptions = useMemo<FilterOptions>(() => {
    const base: FilterOptions = {
      contentTypes: [],
      anosLetivos: [],
      bimestres: [],
      cursos: [],
      turmas: [],
      disciplinas: [],
      professores: [],
      alunos: [],
    };
    if (!contentData?.content) return base;

    if (isNotas) {
      const boletins = Array.isArray(contentData.content?.boletins)
        ? contentData.content.boletins : [];
      return { ...base, ...extractBoletimOptions(boletins) };
    }
    const items = Array.isArray(contentData.content) ? contentData.content : [];
    if (isPlanejamentos) return { ...base, ...extractPlanningOptions(items) };
    if (isFaltas) return { ...base, ...extractAttendanceOptions(items) };
    return base;
  }, [contentData, isNotas, isPlanejamentos, isFaltas]);

  // Apply filters to produce displayed data
  const filteredData = useMemo(() => {
    if (!contentData?.content) return { items: [], boletins: [], count: 0 };

    if (isNotas) {
      const boletins = Array.isArray(contentData.content?.boletins)
        ? contentData.content.boletins : [];
      const filtered = filterBoletins(boletins, filters);
      const totalStudents = filtered.reduce((s: number, b: any) => s + (b.students?.length || 0), 0);
      return { items: [], boletins: filtered, count: totalStudents };
    }
    const items = Array.isArray(contentData.content) ? contentData.content : [];
    if (isPlanejamentos) {
      const filtered = filterPlannings(items, filters);
      return { items: filtered, boletins: [], count: filtered.length };
    }
    if (isFaltas) {
      const filtered = filterAttendance(items, filters);
      return { items: filtered, boletins: [], count: filtered.length };
    }
    return { items: [], boletins: [], count: 0 };
  }, [contentData, filters, isNotas, isPlanejamentos, isFaltas]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: keyof ExternalFilters; label: string; value: string }[] = [];
    const findName = (options: FilterOption[], id: string) =>
      options.find(o => o.id === id)?.name || id;

    if (filters.anoLetivo) chips.push({ key: 'anoLetivo', label: 'Ano', value: findName(filterOptions.anosLetivos, filters.anoLetivo) });
    if (filters.bimestre) chips.push({ key: 'bimestre', label: 'Bimestre', value: findName(filterOptions.bimestres, filters.bimestre) });
    if (filters.curso) chips.push({ key: 'curso', label: 'Curso', value: findName(filterOptions.cursos, filters.curso) });
    if (filters.turma) chips.push({ key: 'turma', label: 'Turma', value: findName(filterOptions.turmas, filters.turma) });
    if (filters.disciplina) chips.push({ key: 'disciplina', label: 'Disciplina', value: findName(filterOptions.disciplinas, filters.disciplina) });
    if (filters.professor) chips.push({ key: 'professor', label: 'Professor', value: findName(filterOptions.professores, filters.professor) });
    if (filters.aluno) chips.push({ key: 'aluno', label: 'Aluno', value: findName(filterOptions.alunos, filters.aluno) });
    if (filters.search) chips.push({ key: 'search', label: 'Busca', value: filters.search });

    return chips;
  }, [filters, filterOptions]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    filterOptions,
    filteredData,
    activeChips,
    isNotas,
    isPlanejamentos,
    isFaltas,
  };
}
