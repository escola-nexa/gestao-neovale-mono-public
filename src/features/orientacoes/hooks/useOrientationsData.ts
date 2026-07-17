import { useState, useEffect, useMemo } from 'react';
import { orientacoesApi } from '../api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { coursesApi, subjectsApi } from '@/lib/api-adapter';
// interface stubs
export interface CourseData { id: string; nome: string; }
export interface SubjectData { id: string; nome: string; }
import type { Orientation } from '@/types/academic';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';
import { isManagerRole } from '@/lib/roles';
import { format, isToday, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useOrientationsData() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const isCoordinator = isManagerRole(user?.perfil);

  const [loading, setLoading] = useState(true);
  const [orientations, setOrientations] = useState<Orientation[]>([]);
  const [professors, setProfessors] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);

  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterProfessor, setFilterProfessor] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await orientacoesApi.getOrientations(isProfessor && professorId ? professorId : undefined);

      const schoolsPromise = isProfessor && professorId
        ? orientacoesApi.getProfessorSchoolBindings(professorId)
        : fetchSchoolsWithCourses({ select: '*', onlyActive: false }).then((data) => data);

      const [profsData, schoolsData, c, s] = await Promise.all([
        orientacoesApi.getProfessors(),
        schoolsPromise,
        coursesApi.getAll(),
        subjectsApi.getAll(),
      ]);

      setOrientations(data as any || []);
      setProfessors(profsData || []);

      if (isProfessor && professorId) {
        const uniqueSchools = new Map<string, any>();
        (schoolsData || []).forEach((row: any) => {
          const school = row.schools;
          if (school && !uniqueSchools.has(school.id)) {
            uniqueSchools.set(school.id, school);
          }
        });
        setSchools(Array.from(uniqueSchools.values()));
      } else {
        setSchools(schoolsData || []);
      }
      setCourses(c);
      setSubjects(s);
    } catch (error) {
      console.error('Error loading orientations:', error);
      toast({ title: 'Erro ao carregar orientações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getProfessorName = (pid: string) => professors.find(p => p.id === pid)?.full_name || '-';
  const getSchoolName = (sid?: string) => sid ? schools.find(s => s.id === sid)?.nome || '-' : '-';
  const getCourseName = (cid?: string) => cid ? courses.find(c => c.id === cid)?.nome || '-' : '-';
  const getSubjectName = (sid?: string) => sid ? subjects.find(s => s.id === sid)?.nome || '-' : '-';

  const getOrientationDate = (orientation: Orientation) => {
    const o = orientation as any;
    return o.scheduled_date ? parseISO(o.scheduled_date) : new Date(orientation.created_at);
  };

  const getOrientationTime = (orientation: Orientation) => {
    const o = orientation as any;
    if (o.scheduled_start_time && o.scheduled_end_time) return `${o.scheduled_start_time.substring(0, 5)} às ${o.scheduled_end_time.substring(0, 5)}`;
    return format(new Date(orientation.created_at), 'HH:mm', { locale: ptBR });
  };

  const applyFilters = (list: Orientation[]) => list.filter(o => {
    const professorName = getProfessorName(o.professor_id).toLowerCase();
    const schoolName = getSchoolName(o.school_id).toLowerCase();
    const matchSearch = !search || professorName.includes(search.toLowerCase()) || schoolName.includes(search.toLowerCase());
    const matchSchool = filterSchool === 'all' || o.school_id === filterSchool;
    const matchType = filterType === 'all' || o.orientation_type === filterType;
    const matchProfessor = filterProfessor === 'all' || o.professor_id === filterProfessor;
    const orientDate = getOrientationDate(o);
    const dateStr = format(orientDate, 'yyyy-MM-dd');
    const matchDateStart = !filterDateStart || dateStr >= filterDateStart;
    const matchDateEnd = !filterDateEnd || dateStr <= filterDateEnd;
    return matchSearch && matchSchool && matchType && matchProfessor && matchDateStart && matchDateEnd;
  });

  const todayOrientations = useMemo(() => orientations.filter(o => isToday(getOrientationDate(o))), [orientations]);
  const scheduledOrientations = useMemo(() => { const today = startOfDay(new Date()); return orientations.filter(o => o.status === 'AGENDADO' && !isBefore(getOrientationDate(o), today)); }, [orientations]);
  const awaitingOrientations = useMemo(() => orientations.filter(o => o.status === 'AGUARDANDO_ASSINATURA_PROFESSOR'), [orientations]);
  const overdueOrientations = useMemo(() => { const today = startOfDay(new Date()); return orientations.filter(o => o.status === 'AGENDADO' && isBefore(getOrientationDate(o), today)); }, [orientations]);
  const signedOrientations = useMemo(() => orientations.filter(o => o.status === 'ASSINADO_PROFESSOR'), [orientations]);
  const cancelledOrientations = useMemo(() => orientations.filter(o => o.status === 'CANCELADO'), [orientations]);

  const filteredToday = useMemo(() => applyFilters(todayOrientations), [todayOrientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);
  const filteredScheduled = useMemo(() => applyFilters(scheduledOrientations), [scheduledOrientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);
  const filteredAwaiting = useMemo(() => applyFilters(awaitingOrientations), [awaitingOrientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);
  const filteredOverdue = useMemo(() => applyFilters(overdueOrientations), [overdueOrientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);
  const filteredSigned = useMemo(() => applyFilters(signedOrientations), [signedOrientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);
  const filteredCancelled = useMemo(() => applyFilters(cancelledOrientations), [cancelledOrientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);
  const filteredAll = useMemo(() => applyFilters(orientations), [orientations, search, filterSchool, filterType, filterProfessor, filterDateStart, filterDateEnd]);

  const stats = useMemo(() => ({
    hoje: todayOrientations.length, agendados: scheduledOrientations.length,
    aguardando: awaitingOrientations.length, emAtraso: overdueOrientations.length,
    assinado: signedOrientations.length, cancelado: cancelledOrientations.length,
    total: orientations.length,
  }), [todayOrientations, scheduledOrientations, awaitingOrientations, overdueOrientations, signedOrientations, cancelledOrientations, orientations]);

  const professorsInOrientations = useMemo(() => {
    const ids = [...new Set(orientations.map(o => o.professor_id))];
    return ids.map(id => ({ id, name: getProfessorName(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orientations, professors]);

  const canProfessorInteract = (orientation: Orientation) => {
    if (!isProfessor || !user) return false;
    const professor = professors.find(p => p.user_id === user.id);
    return professor && professor.id === orientation.professor_id;
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'ASSINADO_PROFESSOR': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'AGUARDANDO_ASSINATURA_PROFESSOR': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'AGENDADO': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const clearFilters = () => { setSearch(''); setFilterSchool('all'); setFilterType('all'); setFilterProfessor('all'); setFilterDateStart(''); setFilterDateEnd(''); };
  const hasActiveFilters = !!(search || filterSchool !== 'all' || filterType !== 'all' || filterProfessor !== 'all' || filterDateStart || filterDateEnd);

  return {
    loading, loadData, orientations,
    professors, schools, courses, subjects,
    search, setSearch, filterSchool, setFilterSchool,
    filterType, setFilterType, filterProfessor, setFilterProfessor,
    filterDateStart, setFilterDateStart, filterDateEnd, setFilterDateEnd,
    getProfessorName, getSchoolName, getCourseName, getSubjectName,
    getOrientationDate, getOrientationTime,
    stats, isCoordinator, isProfessor, professorId, user,
    awaitingOrientations,
    filteredToday, filteredScheduled, filteredAwaiting, filteredOverdue,
    filteredSigned, filteredCancelled, filteredAll,
    professorsInOrientations,
    canProfessorInteract, getStatusBadgeClasses,
    clearFilters, hasActiveFilters,
  };
}
