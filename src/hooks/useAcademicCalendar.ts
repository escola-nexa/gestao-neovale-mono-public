import { useState, useEffect, useCallback } from 'react';

import { 
  AcademicCalendar, 
  AcademicBimester, 
  CalendarEvent,
  CreateAcademicCalendarDTO,
  CreateAcademicBimesterDTO,
  CreateCalendarEventDTO
} from '@/types/academic';
import { useToast } from '@/hooks/use-toast';
import { calendarioApi } from '@/features/calendario/api';

interface UseAcademicCalendarReturn {
  calendars: AcademicCalendar[];
  activeCalendar: AcademicCalendar | null;
  isLoading: boolean;
  error: string | null;
  createCalendar: (data: CreateAcademicCalendarDTO) => Promise<AcademicCalendar | null>;
  updateCalendar: (id: string, data: Partial<CreateAcademicCalendarDTO>) => Promise<boolean>;
  deleteCalendar: (id: string) => Promise<boolean>;
  activateCalendar: (id: string) => Promise<boolean>;
  closeCalendar: (id: string) => Promise<boolean>;
  // Bimesters
  createBimester: (data: CreateAcademicBimesterDTO) => Promise<AcademicBimester | null>;
  updateBimester: (id: string, data: Partial<CreateAcademicBimesterDTO>) => Promise<boolean>;
  deleteBimester: (id: string) => Promise<boolean>;
  // Events
  createEvent: (data: CreateCalendarEventDTO) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, data: Partial<CreateCalendarEventDTO>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  populateLetivoDays: (calendarId: string) => Promise<number | null>;
  // Utilities
  refetch: () => Promise<void>;
  getCalendarEvents: (calendarId: string, month?: number, year?: number) => CalendarEvent[];
}

export function useAcademicCalendar(organizationId?: string): UseAcademicCalendarReturn {
  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCalendars = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await calendarioApi.getCalendars(organizationId);

      // Sort bimesters by number
      const sortedData = (data || []).map(cal => ({
        ...cal,
        bimesters: (cal.bimesters || []).sort((a: any, b: any) => a.number - b.number),
        events: (cal.events || []).sort((a: any, b: any) => 
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        ),
      })) as AcademicCalendar[];

      setCalendars(sortedData);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError('Erro ao carregar calendários');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const activeCalendar = calendars.find(c => c.status === 'ACTIVE') || null;

  const createCalendar = async (data: CreateAcademicCalendarDTO): Promise<AcademicCalendar | null> => {
    try {
      const newCalendar = await calendarioApi.createCalendar(data);

      toast({ title: 'Calendário criado com sucesso!' });
      await fetchCalendars();
      return newCalendar;
    } catch (err: any) {
      console.error('Error creating calendar:', err);
      
      // Check for duplicate calendar error
      if (err.code === '23505' && err.message?.includes('academic_calendars_organization_id_academic_year_key')) {
        toast({ 
          title: 'Calendário já existe', 
          description: `Já existe um calendário para o ano ${data.academic_year}. Edite o calendário existente ou escolha outro ano.`,
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Erro ao criar calendário', 
          description: err.message,
          variant: 'destructive' 
        });
      }
      return null;
    }
  };

  const updateCalendar = async (id: string, data: Partial<CreateAcademicCalendarDTO>): Promise<boolean> => {
    try {
      await calendarioApi.updateCalendar(id, data);

      toast({ title: 'Calendário atualizado com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error updating calendar:', err);
      toast({ 
        title: 'Erro ao atualizar calendário', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteCalendar = async (id: string): Promise<boolean> => {
    try {
      await calendarioApi.deleteCalendar(id);

      toast({ title: 'Calendário excluído com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error deleting calendar:', err);
      toast({ 
        title: 'Erro ao excluir calendário', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  const activateCalendar = async (id: string): Promise<boolean> => {
    try {
      await calendarioApi.activateCalendar(id);

      toast({ title: 'Calendário ativado com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error activating calendar:', err);
      toast({ 
        title: 'Erro ao ativar calendário', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  const closeCalendar = async (id: string): Promise<boolean> => {
    try {
      await calendarioApi.closeCalendar(id);

      toast({ title: 'Calendário encerrado com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error closing calendar:', err);
      toast({ 
        title: 'Erro ao encerrar calendário', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  // Bimesters
  const createBimester = async (data: CreateAcademicBimesterDTO): Promise<AcademicBimester | null> => {
    try {
      const newBimester = await calendarioApi.createBimester(data);

      toast({ title: 'Bimestre criado com sucesso!' });
      await fetchCalendars();
      return newBimester as AcademicBimester;
    } catch (err: any) {
      console.error('Error creating bimester:', err);
      toast({ 
        title: 'Erro ao criar bimestre', 
        description: err.message,
        variant: 'destructive' 
      });
      return null;
    }
  };

  const updateBimester = async (id: string, data: Partial<CreateAcademicBimesterDTO>): Promise<boolean> => {
    try {
      await calendarioApi.updateBimester(id, data);

      toast({ title: 'Bimestre atualizado com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error updating bimester:', err);
      toast({ 
        title: 'Erro ao atualizar bimestre', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteBimester = async (id: string): Promise<boolean> => {
    try {
      await calendarioApi.deleteBimester(id);

      toast({ title: 'Bimestre excluído com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error deleting bimester:', err);
      toast({ 
        title: 'Erro ao excluir bimestre', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  // Events
  const createEvent = async (data: CreateCalendarEventDTO): Promise<CalendarEvent | null> => {
    try {
      const newEvent = await calendarioApi.createEvent(data);

      toast({ title: 'Evento criado com sucesso!' });
      await fetchCalendars();
      return newEvent;
    } catch (err: any) {
      console.error('Error creating event:', err);
      toast({ 
        title: 'Erro ao criar evento', 
        description: err.message,
        variant: 'destructive' 
      });
      return null;
    }
  };

  const updateEvent = async (id: string, data: Partial<CreateCalendarEventDTO>): Promise<boolean> => {
    try {
      await calendarioApi.updateEvent(id, data);

      toast({ title: 'Evento atualizado com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error updating event:', err);
      toast({ 
        title: 'Erro ao atualizar evento', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      await calendarioApi.deleteEvent(id);

      toast({ title: 'Evento excluído com sucesso!' });
      await fetchCalendars();
      return true;
    } catch (err: any) {
      console.error('Error deleting event:', err);
      toast({ 
        title: 'Erro ao excluir evento', 
        description: err.message,
        variant: 'destructive' 
      });
      return false;
    }
  };

  const populateLetivoDays = async (calendarId: string): Promise<number | null> => {
    try {
      const count = await calendarioApi.populateLetivoDays(calendarId);

      toast({ 
        title: 'Dias letivos populados!', 
        description: `${count} dias letivos foram adicionados ao calendário.`
      });
      await fetchCalendars();
      return count;
    } catch (err: any) {
      console.error('Error populating letivo days:', err);
      toast({ 
        title: 'Erro ao popular dias letivos', 
        description: err.message,
        variant: 'destructive' 
      });
      return null;
    }
  };

  const getCalendarEvents = (calendarId: string, month?: number, year?: number): CalendarEvent[] => {
    const calendar = calendars.find(c => c.id === calendarId);
    if (!calendar?.events) return [];

    if (month !== undefined && year !== undefined) {
      return calendar.events.filter(e => {
        const date = new Date(e.event_date);
        return date.getMonth() === month && date.getFullYear() === year;
      });
    }

    return calendar.events;
  };

  return {
    calendars,
    activeCalendar,
    isLoading,
    error,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    activateCalendar,
    closeCalendar,
    createBimester,
    updateBimester,
    deleteBimester,
    createEvent,
    updateEvent,
    deleteEvent,
    populateLetivoDays,
    refetch: fetchCalendars,
    getCalendarEvents,
  };
}
