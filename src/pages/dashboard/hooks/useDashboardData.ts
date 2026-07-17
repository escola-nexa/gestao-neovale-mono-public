import { useState, useEffect } from 'react';
import { dashboardApi } from '../api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';

export interface DashboardStats {
  totalEscolas: number;
  totalProfessores: number;
  totalAlunos: number;
  totalTurmas: number;
}

export interface PlanningStats {
  pendingReview: number;
  returned: number;
  awaitingSignature: number;
  signed: number;
  draft: number;
  total: number;
}

export interface TodayClass {
  id: string;
  /** Nomes das disciplinas que compartilham este slot (UC). */
  subjects: string[];
  classGroupName: string;
  schoolName: string;
  startTime: string;
  endTime: string;
  weekday: string;
}

export interface OrientationPending {
  id: string;
  type: string;
  scheduledDate: string | null;
  status: string;
}

export interface AttendanceOverview {
  totalClassesToday: number;
  attendanceTakenToday: number;
  pendingAttendance: number;
}

export interface BimesterInfo {
  currentBimester: number;
  academicYear: number;
  bimesterEndDate: string | null;
  daysRemaining: number | null;
}

export interface CoordinatorPendencies {
  planningsToReview: number;
  orientationsOverdue: number;
  orientationsPending: number;
  attendancePendingToday: number;
  gradesPending: number;
  planningsSigned: number;
  planningsTotal: number;
}

export interface ProfessorPendencies {
  planningsDraft: number;
  planningsReturned: number;
  planningsToSign: number;
  orientationsToSign: number;
  attendancePendingToday: number;
}

export function useDashboardData() {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const { organizationId } = useOrganization();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [planningStats, setPlanningStats] = useState<PlanningStats | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [pendingOrientations, setPendingOrientations] = useState<OrientationPending[]>([]);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview | null>(null);
  const [bimesterInfo, setBimesterInfo] = useState<BimesterInfo | null>(null);
  const [academicYear, setAcademicYear] = useState<number | null>(null);
  const [hasActiveCalendar, setHasActiveCalendar] = useState(true);
  const [coordinatorPendencies, setCoordinatorPendencies] = useState<CoordinatorPendencies | null>(null);
  const [professorPendencies, setProfessorPendencies] = useState<ProfessorPendencies | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const promises: Promise<void>[] = [];

        if (!isProfessor) {
          promises.push(loadAdminStats());
          promises.push(loadCoordinatorPlanningStats());
          promises.push(loadCoordinatorAttendanceOverview());
          promises.push(loadCoordinatorPendencies());
        }

        if (isProfessor && professorId) {
          promises.push(loadProfessorClasses(professorId));
          promises.push(loadProfessorPlanningStats(professorId));
          promises.push(loadProfessorOrientations(professorId));
          promises.push(loadProfessorAttendanceOverview(professorId));
          promises.push(loadProfessorPendencies(professorId));
        }

        promises.push(loadAcademicInfo());

        await Promise.all(promises);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id, isProfessor, professorId, organizationId]);

  const loadAdminStats = async () => {
    const stats = await dashboardApi.getAdminStats();
    setStats(stats);
  };

  const loadCoordinatorPlanningStats = async () => {
    const stats = await dashboardApi.getCoordinatorPlanningStats();
    setPlanningStats(stats);
  };

  const loadCoordinatorPendencies = async () => {
    const pendencies = await dashboardApi.getCoordinatorPendencies();
    setCoordinatorPendencies(pendencies);
  };

  const loadCoordinatorAttendanceOverview = async () => {
    const overview = await dashboardApi.getCoordinatorAttendanceOverview();
    setAttendanceOverview(overview);
  };

  const loadProfessorClasses = async (profId: string) => {
    const classes = await dashboardApi.getProfessorClasses(profId);
    setTodayClasses(classes);
  };

  const loadProfessorPlanningStats = async (profId: string) => {
    const stats = await dashboardApi.getProfessorPlanningStats(profId);
    if (stats) setPlanningStats(stats);
  };

  const loadProfessorOrientations = async (profId: string) => {
    const orientations = await dashboardApi.getProfessorOrientations(profId);
    setPendingOrientations(orientations);
  };

  const loadProfessorPendencies = async (profId: string) => {
    const pendencies = await dashboardApi.getProfessorPendencies(profId);
    setProfessorPendencies(pendencies);
  };

  const loadProfessorAttendanceOverview = async (profId: string) => {
    const overview = await dashboardApi.getProfessorAttendanceOverview(profId);
    setAttendanceOverview(overview);
  };

  const loadAcademicInfo = async () => {
    const info = await dashboardApi.getAcademicInfo(organizationId || null);
    setHasActiveCalendar(info.hasActiveCalendar);
    setAcademicYear(info.academicYear);
    if (info.bimesterInfo) {
      setBimesterInfo(info.bimesterInfo);
    }
  };

  return {
    stats,
    planningStats,
    todayClasses,
    pendingOrientations,
    attendanceOverview,
    bimesterInfo,
    academicYear,
    loading,
    isProfessor,
    hasActiveCalendar,
    coordinatorPendencies,
    professorPendencies,
  };
}
