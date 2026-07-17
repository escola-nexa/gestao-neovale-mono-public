import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { Weekday } from '@/types/academic';
import { gradeHorariaApi, type SchoolTimeSlot, type CreateSlotDTO } from '../api';



export function useSchoolTimeSlots(schoolId?: string | null) {
  const { organization } = useOrganization();
  const [slots, setSlots] = useState<SchoolTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!organization?.id || !schoolId) {
      setSlots([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await gradeHorariaApi.getSchoolTimeSlots(organization.id, schoolId);
      setSlots(data);
    } catch (error) {
      console.error('Error fetching school time slots:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, schoolId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Realtime: outras telas (Planilha, Horários da Escola, Planejamento
  // Professor, Grade Horária) refletem criação/edição/exclusão imediatamente.
  useEffect(() => {
    if (!organization?.id || !schoolId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { fetchSlots(); }, 200);
    };
    return gradeHorariaApi.subscribeToSchoolTimeSlots(organization.id, schoolId, scheduleRefetch);
  }, [organization?.id, schoolId, fetchSlots]);

  const createSlot = async (data: CreateSlotDTO): Promise<SchoolTimeSlot> => {
    if (!organization?.id) throw new Error('Organização não encontrada');

    try {
      const slot = await gradeHorariaApi.createSchoolTimeSlot({
        organization_id: organization.id,
        school_id: data.school_id,
        weekday: data.weekday,
        slot_number: data.slot_number,
        slot_label: data.slot_label,
        start_time: data.start_time,
        end_time: data.end_time,
      } as any);
      await fetchSlots();
      return slot;
    } catch (error: any) {
      if (error.message?.includes('Conflito') || error.message?.includes('sobrepõe')) {
        throw new Error('Conflito: já existe um horário que se sobrepõe neste dia');
      }
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        throw new Error('Já existe um slot com este número neste dia');
      }
      throw error;
    }
  };

  const createBulkSlots = async (slotsData: CreateSlotDTO[]): Promise<number> => {
    if (!organization?.id) throw new Error('Organização não encontrada');

    let created = 0;
    const errors: string[] = [];

    for (const data of slotsData) {
      try {
        await createSlot(data);
        created++;
      } catch (error: any) {
        errors.push(`Slot ${data.slot_number} (${data.weekday}): ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.error('Errors creating slots:', errors);
      if (created > 0) {
        toast.warning(`${created} slot(s) criado(s), ${errors.length} erro(s)`);
      } else {
        throw new Error(errors[0]);
      }
    }

    return created;
  };

  const updateSlot = async (id: string, data: Partial<CreateSlotDTO>): Promise<void> => {
    await gradeHorariaApi.updateSchoolTimeSlot(id, data);
    await fetchSlots();
  };

  const deleteSlot = async (id: string): Promise<void> => {
    await gradeHorariaApi.deleteSchoolTimeSlot(id);
    await fetchSlots();
  };

  const getSlotsByWeekday = useCallback((weekday: Weekday): SchoolTimeSlot[] => {
    return slots.filter(s => s.weekday === weekday).sort((a, b) => a.slot_number - b.slot_number);
  }, [slots]);

  const getNextSlotNumber = useCallback((weekday: Weekday): number => {
    const weekdaySlots = getSlotsByWeekday(weekday);
    if (weekdaySlots.length === 0) return 1;
    return Math.max(...weekdaySlots.map(s => s.slot_number)) + 1;
  }, [getSlotsByWeekday]);

  return {
    slots,
    isLoading,
    createSlot,
    createBulkSlots,
    updateSlot,
    deleteSlot,
    getSlotsByWeekday,
    getNextSlotNumber,
    refetch: fetchSlots,
  };
}
