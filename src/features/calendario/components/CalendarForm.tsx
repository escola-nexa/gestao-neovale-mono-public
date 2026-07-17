import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AcademicCalendar, CreateAcademicCalendarDTO } from '@/types/academic';

interface CalendarFormProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  calendar?: AcademicCalendar | null;
  onSuccess?: () => void;
  createCalendar: (data: CreateAcademicCalendarDTO) => Promise<AcademicCalendar | null>;
  updateCalendar: (id: string, data: Partial<CreateAcademicCalendarDTO>) => Promise<boolean>;
}

export function CalendarForm({ open, onClose, organizationId, calendar, onSuccess, createCalendar, updateCalendar }: CalendarFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datesChanged, setDatesChanged] = useState(false);
  
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (calendar) {
      setAcademicYear(calendar.academic_year);
      setStartDate(calendar.start_date);
      setEndDate(calendar.end_date);
      setDatesChanged(false);
    } else {
      setAcademicYear(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setDatesChanged(false);
    }
  }, [calendar]);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (calendar) setDatesChanged(true);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (calendar) setDatesChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) return;

    setIsSubmitting(true);

    try {
      let success = false;
      if (calendar) {
        success = await updateCalendar(calendar.id, {
          academic_year: academicYear,
          start_date: startDate,
          end_date: endDate,
        });
      } else {
        const result = await createCalendar({
          organization_id: organizationId,
          academic_year: academicYear,
          start_date: startDate,
          end_date: endDate,
        });
        success = !!result;
      }
      if (success) {
        onClose();
        if (calendar && datesChanged) {
          onSuccess?.();
          setTimeout(() => {
            if (window.confirm(
              'As datas do calendário foram alteradas. Deseja popular novamente os dias letivos para refletir as novas datas?'
            )) {
              window.dispatchEvent(new CustomEvent('repopulate-letivo-days', { detail: { calendarId: calendar.id } }));
            }
          }, 300);
        } else {
          onSuccess?.();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {calendar ? 'Editar Ano Letivo' : 'Novo Ano Letivo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year">Ano Letivo</Label>
            <Input
              id="year"
              type="number"
              min={2020}
              max={2050}
              value={academicYear}
              onChange={(e) => setAcademicYear(parseInt(e.target.value))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !startDate || !endDate}>
              {isSubmitting ? 'Salvando...' : calendar ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
