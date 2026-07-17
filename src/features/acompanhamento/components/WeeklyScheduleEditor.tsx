import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Clock } from 'lucide-react';

export interface TimeShift {
  start: string;
  end: string;
}

export interface WeeklySchedule {
  seg: TimeShift[];
  ter: TimeShift[];
  qua: TimeShift[];
  qui: TimeShift[];
  sex: TimeShift[];
}

const DAY_KEYS: (keyof WeeklySchedule)[] = ['seg', 'ter', 'qua', 'qui', 'sex'];
const DAY_LABELS: Record<string, string> = {
  seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta',
};

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  seg: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
  ter: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
  qua: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
  qui: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
  sex: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
};

interface Props {
  value: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export function WeeklyScheduleEditor({ value, onChange }: Props) {
  const addShift = (day: keyof WeeklySchedule) => {
    if (value[day].length >= 3) return;
    const last = value[day][value[day].length - 1];
    const newStart = last ? last.end : '08:00';
    onChange({ ...value, [day]: [...value[day], { start: newStart, end: '22:00' }] });
  };

  const removeShift = (day: keyof WeeklySchedule, idx: number) => {
    onChange({ ...value, [day]: value[day].filter((_, i) => i !== idx) });
  };

  const updateShift = (day: keyof WeeklySchedule, idx: number, field: 'start' | 'end', val: string) => {
    const shifts = [...value[day]];
    shifts[idx] = { ...shifts[idx], [field]: val };
    onChange({ ...value, [day]: shifts });
  };

  const applyPreset = () => {
    onChange({ ...DEFAULT_SCHEDULE });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          Turnos por Dia da Semana
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={applyPreset} className="text-xs h-7">
          Horário Comercial
        </Button>
      </div>

      <div className="space-y-2">
        {DAY_KEYS.map((day) => (
          <div key={day} className="border rounded-lg p-3 bg-background">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium w-20">{DAY_LABELS[day]}</span>
              <div className="flex items-center gap-2">
                {value[day].length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Sem visitas</span>
                )}
                {value[day].length < 3 && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addShift(day)}>
                    <Plus className="h-3 w-3 mr-0.5" /> Turno
                  </Button>
                )}
              </div>
            </div>
            {value[day].length > 0 && (
              <div className="flex flex-wrap gap-2">
                {value[day].map((shift, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                    <Input
                      type="time"
                      value={shift.start}
                      onChange={(e) => updateShift(day, idx, 'start', e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={shift.end}
                      onChange={(e) => updateShift(day, idx, 'end', e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeShift(day, idx)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
