import { supabase } from '@/integrations/supabase/client';
import { nestApi } from '@/lib/api-adapter';
const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';

export const dashboardApi = {
  getAdminStats: async () => ({
    totalEscolas: 0,
    totalProfessores: 0,
    totalAlunos: 0,
    totalTurmas: 0,
  }),
  getCoordinatorPlanningStats: async () => ({
    pendingReview: 0,
    returned: 0,
    awaitingSignature: 0,
    signed: 0,
    draft: 0,
    total: 0,
  }),
  getCoordinatorPendencies: async () => ({
    planningsToReview: 0,
    orientationsOverdue: 0,
    orientationsPending: 0,
    attendancePendingToday: 0,
    gradesPending: 0,
    planningsSigned: 0,
    planningsTotal: 0,
  }),
  getCoordinatorAttendanceOverview: async () => ({
    totalClassesToday: 0,
    attendanceTakenToday: 0,
    pendingAttendance: 0,
  }),
  getProfessorClasses: async () => [],
  getProfessorPlanningStats: async () => ({
    pendingReview: 0,
    returned: 0,
    awaitingSignature: 0,
    signed: 0,
    draft: 0,
    total: 0,
  }),
  getProfessorOrientations: async () => [],
  getProfessorPendencies: async () => ({
    planningsDraft: 0,
    planningsReturned: 0,
    planningsToSign: 0,
    orientationsToSign: 0,
    attendancePendingToday: 0,
  }),
  getProfessorAttendanceOverview: async () => ({
    totalClassesToday: 0,
    attendanceTakenToday: 0,
    pendingAttendance: 0,
  }),
  getAcademicInfo: async () => ({
    hasActiveCalendar: true,
    academicYear: new Date().getFullYear(),
    bimesterInfo: {
      currentBimester: 1,
      academicYear: new Date().getFullYear(),
      bimesterEndDate: null,
      daysRemaining: null,
    },
  }),
};
