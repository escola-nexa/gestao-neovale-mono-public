import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Settings2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useOrganization } from '@/hooks/useOrganization';
import { useSchoolTimeSlots, type CreateSlotDTO } from '../hooks/useSchoolTimeSlots';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';

interface SchoolTimeSlotsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SchoolOption {
  id: string;
  nome: string;
}

export function SchoolTimeSlotsManager({ open, onOpenChange }: SchoolTimeSlotsManagerProps) {
  const { organization } = useOrganization();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({ start_time: '', end_time: '', label: '' });
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday>('SEGUNDA');
  const [copyFromDay, setCopyFromDay] = useState<Weekday | null>(null);

  const { slots, isLoading, createSlot, deleteSlot, getSlotsByWeekday, getNextSlotNumber, refetch } = useSchoolTimeSlots(selectedSchoolId);

  // Load schools
  useEffect(() => {
    if (!organization?.id || !open) return;
    const load = async () => {
      const data = await fetchSchoolsWithCourses({ organizationId: organization.id });
      setSchools(data);
    };
    load();
  }, [organization?.id, open]);

  const handleAddSlot = async () => {
    if (!selectedSchoolId || !newSlot.start_time || !newSlot.end_time) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('Horário de início deve ser anterior ao término');
      return;
    }

    try {
      const slotNumber = getNextSlotNumber(selectedWeekday);
      await createSlot({
        school_id: selectedSchoolId,
        weekday: selectedWeekday,
        slot_number: slotNumber,
        slot_label: newSlot.label || `${slotNumber}ª Aula`,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
      });
      setNewSlot({ start_time: '', end_time: '', label: '' });
      toast.success('Horário adicionado');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar horário');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Remover este horário?')) return;
    try {
      await deleteSlot(id);
      toast.success('Horário removido');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover');
    }
  };

  const handleCopyFromDay = async () => {
    if (!copyFromDay || !selectedSchoolId) return;
    
    const sourceSlots = getSlotsByWeekday(copyFromDay);
    if (sourceSlots.length === 0) {
      toast.error('Dia de origem não possui horários');
      return;
    }

    const targetSlots = getSlotsByWeekday(selectedWeekday);
    if (targetSlots.length > 0) {
      if (!confirm(`${selectedWeekday} já possui ${targetSlots.length} horário(s). Deseja adicionar os horários de ${copyFromDay}?`)) {
        return;
      }
    }

    try {
      let created = 0;
      const baseNumber = getNextSlotNumber(selectedWeekday);
      
      for (let i = 0; i < sourceSlots.length; i++) {
        const source = sourceSlots[i];
        await createSlot({
          school_id: selectedSchoolId,
          weekday: selectedWeekday,
          slot_number: baseNumber + i,
          slot_label: source.slot_label,
          start_time: source.start_time,
          end_time: source.end_time,
        });
        created++;
      }

      toast.success(`${created} horário(s) copiado(s) para ${selectedWeekday}`);
      setCopyFromDay(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao copiar horários');
      refetch();
    }
  };

  const currentDaySlots = getSlotsByWeekday(selectedWeekday);

  // Count slots per weekday for badge
  const getWeekdayCount = (weekday: Weekday) => getSlotsByWeekday(weekday).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Gerenciar Horários da Escola
          </DialogTitle>
          <DialogDescription>
            Defina os horários padrão de aula para cada dia da semana
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-5">
            {/* School Selection */}
            <div className="space-y-2">
              <Label>Escola</Label>
              <SearchableSelect
                value={selectedSchoolId || ''}
                onValueChange={setSelectedSchoolId}
                placeholder="Selecione a escola"
                searchPlaceholder="Buscar escola..."
                options={schools.map(s => ({ value: s.id, label: s.nome ?? '' }))}
              />
            </div>

            {selectedSchoolId && (
              <>
                <Separator />

                {/* Weekday Tabs */}
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={selectedWeekday === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedWeekday(value as Weekday)}
                      className="gap-1.5"
                    >
                      {label.split('-')[0].trim()}
                      {getWeekdayCount(value as Weekday) > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {getWeekdayCount(value as Weekday)}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Current Day Slots */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">
                      Horários - {WEEKDAY_OPTIONS.find(w => w.value === selectedWeekday)?.label}
                    </h3>

                    {/* Copy from another day */}
                    <div className="flex items-center gap-2">
                      <Select value={copyFromDay || ''} onValueChange={(v) => setCopyFromDay(v as Weekday)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue placeholder="Copiar de..." />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAY_OPTIONS.filter(w => w.value !== selectedWeekday && getWeekdayCount(w.value as Weekday) > 0).map(({ value, label }) => (
                            <SelectItem key={value} value={value} className="text-xs">
                              {label.split('-')[0].trim()} ({getWeekdayCount(value as Weekday)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {copyFromDay && (
                        <Button size="sm" variant="outline" onClick={handleCopyFromDay} className="h-8 text-xs gap-1">
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Existing slots */}
                  {currentDaySlots.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 w-16">#</th>
                            <th className="text-left p-2">Label</th>
                            <th className="text-left p-2">Início</th>
                            <th className="text-left p-2">Término</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDaySlots.map(slot => (
                            <tr key={slot.id} className="border-t">
                              <td className="p-2">
                                <Badge variant="outline">{slot.slot_number}</Badge>
                              </td>
                              <td className="p-2 font-medium">{slot.slot_label || `${slot.slot_number}ª Aula`}</td>
                              <td className="p-2">{slot.start_time.slice(0, 5)}</td>
                              <td className="p-2">{slot.end_time.slice(0, 5)}</td>
                              <td className="p-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed text-sm">
                      <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      Nenhum horário definido para este dia
                    </div>
                  )}

                  {/* Add new slot */}
                  <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Label (opcional)</Label>
                      <Input
                        placeholder={`${getNextSlotNumber(selectedWeekday)}ª Aula`}
                        value={newSlot.label}
                        onChange={e => setNewSlot(prev => ({ ...prev, label: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1 w-28">
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="time"
                        value={newSlot.start_time}
                        onChange={e => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1 w-28">
                      <Label className="text-xs">Término</Label>
                      <Input
                        type="time"
                        value={newSlot.end_time}
                        onChange={e => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <Button size="icon" className="h-9 w-9" onClick={handleAddSlot}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
