import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { frequenciaApi } from '../api';

export type AttendanceStatus = 'P' | 'F' | 'A';

export interface AttendanceRecord {
  id?: string;
  student_id: string;
  occurrence_date: string;
  start_time: string | null;
  status: AttendanceStatus;
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  total_absences: number;
  total_classes: number;
  absence_percentage: number;
  alert_level: 'none' | 'warning' | 'danger';
}

export function useAttendance(classGroupId: string, subjectId: string, professorId: string | null) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedProfessorId, setResolvedProfessorId] = useState<string | null>(professorId);
  const [callStartedAt] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    if (professorId) {
      setResolvedProfessorId(professorId);
      return;
    }
    if (!classGroupId || !subjectId) return;
    const resolve = async () => {
      const data = await frequenciaApi.getProfessorForClassSubject(classGroupId, subjectId);
      setResolvedProfessorId(data?.professor_id || null);
    };
    resolve();
  }, [professorId, classGroupId, subjectId]);

  const fetchRecords = useCallback(async (startDate: string, endDate: string) => {
    if (!classGroupId || !subjectId) return;
    setIsLoading(true);

    try {
      const data = await frequenciaApi.fetchRecords(classGroupId, subjectId, startDate, endDate);
      setRecords(data.map((d: any) => ({
        ...d,
        status: d.status as AttendanceStatus,
        start_time: d.start_time,
      })));
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
    setIsLoading(false);
  }, [classGroupId, subjectId]);

  const upsertRecord = useCallback(async (studentId: string, date: string, status: AttendanceStatus, startTime: string | null) => {
    if (!organizationId || !resolvedProfessorId) {
      toast({
        title: 'Vínculo não encontrado',
        description: 'Nenhum vínculo professor↔turma↔disciplina encontrado. Solicite ao coordenador a regularização da sua grade.',
        variant: 'destructive',
      });
      return false;
    }

    const nowIso = new Date().toISOString();

    try {
      // NOTE: call_created_by is usually fetched from auth user.
      // Assuming frequenciaApi backend handles it if API_PROVIDER=nestjs.
      // For supabase, we can omit it or fetch if really needed.
      const { inserted, entry } = await frequenciaApi.upsertRecord({
        organizationId,
        classGroupId,
        subjectId,
        studentId,
        professorId: resolvedProfessorId,
        occurrenceDate: date,
        startTime,
        status,
        callStartedAt,
        callSubmittedAt: nowIso,
        callCreatedBy: null // Removed direct supabase usage. Backend will handle this.
      });

      if (entry) {
        const msgMap: Record<string, { title: string; desc: string }> = {
          present: { title: 'Presença registrada', desc: 'Sua presença foi computada no horário.' },
          present_with_delay: { title: 'Presença com atraso', desc: `Registrada com ${entry.late_minutes || 0} min de atraso.` },
          manual_review_required: { title: 'Enviada para revisão', desc: 'A chamada ficou fora da janela esperada e precisará de revisão.' },
        };
        const m = msgMap[entry.final_status as string];
        if (m) toast({ title: m.title, description: m.desc });
      }

      setRecords(prev => {
        const idx = prev.findIndex(r => r.student_id === studentId && r.occurrence_date === date && r.start_time === startTime);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status };
          return updated;
        }
        return [...prev, { student_id: studentId, occurrence_date: date, start_time: startTime, status }];
      });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao salvar frequência', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [organizationId, resolvedProfessorId, classGroupId, subjectId, toast, callStartedAt]);

  const deleteRecord = useCallback(async (studentId: string, date: string, startTime: string | null) => {
    try {
      await frequenciaApi.deleteRecord(classGroupId, subjectId, studentId, date, startTime);
      setRecords(prev => prev.filter(r => !(r.student_id === studentId && r.occurrence_date === date && r.start_time === startTime)));
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao remover registro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [classGroupId, subjectId, toast]);

  const getRecord = useCallback((studentId: string, date: string, startTime: string | null): AttendanceStatus | null => {
    const rec = records.find(r => r.student_id === studentId && r.occurrence_date === date && r.start_time === startTime);
    return rec?.status || null;
  }, [records]);

  return { records, isLoading, fetchRecords, upsertRecord, deleteRecord, getRecord, resolvedProfessorId };
}

export function useAbsenceAlerts(classGroupId: string, subjectId: string) {
  const [summaries, setSummaries] = useState<StudentAttendanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!classGroupId || !subjectId) return;
    setIsLoading(true);

    try {
      const data = await frequenciaApi.getAbsenceAlerts(classGroupId, subjectId);
      setSummaries(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [classGroupId, subjectId]);

  return { summaries, isLoading, fetchAlerts };
}

export interface SchoolAbsenceSummary {
  student_id: string;
  student_name: string;
  class_group_name: string;
  total_absences: number;
  total_records: number;
  absence_percentage: number;
  alert_level: 'none' | 'warning' | 'danger';
}

export function useSchoolAbsenceAlerts(schoolId: string) {
  const [summaries, setSummaries] = useState<SchoolAbsenceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);

    try {
      const data = await frequenciaApi.getSchoolAbsenceAlerts(schoolId);
      setSummaries(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [schoolId]);

  return { summaries, isLoading, fetchAlerts };
}
