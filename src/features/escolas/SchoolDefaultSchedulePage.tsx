import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Clock, Copy, Sun, Sunset, Moon, Pencil, Check, X, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { escolasApi } from '@/features/escolas/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useSchoolTimeSlots } from '@/features/grade-horaria/hooks/useSchoolTimeSlots';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';

const WEEKDAYS: Weekday[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
const WEEKDAY_SHORT: Record<Weekday, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui', SEXTA: 'Sex',
};

type Shift = 'MATUTINO' | 'VESPERTINO' | 'NOTURNO';

const SHIFT_CONFIG: Record<Shift, { label: string; icon: typeof Sun; minHour: number; maxHour: number }> = {
  MATUTINO: { label: 'Matutino', icon: Sun, minHour: 0, maxHour: 12 },
  VESPERTINO: { label: 'Vespertino', icon: Sunset, minHour: 12, maxHour: 18 },
  NOTURNO: { label: 'Noturno', icon: Moon, minHour: 18, maxHour: 24 },
};

function getShift(startTime: string): Shift {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour < 12) return 'MATUTINO';
  if (hour < 18) return 'VESPERTINO';
  return 'NOTURNO';
}

interface SortableSlotRowProps {
  slot: { id: string; slot_number: number; slot_label: string; start_time: string; end_time: string };
  isEditing: boolean;
  editSlot: { start_time: string; end_time: string; label: string };
  setEditSlot: React.Dispatch<React.SetStateAction<{ start_time: string; end_time: string; label: string }>>;
  onStartEdit: (slot: any) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

function SortableSlotRow({ slot, isEditing, editSlot, setEditSlot, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: SortableSlotRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id, disabled: isEditing });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? 'hsl(var(--muted))' : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-t">
      <td className="p-2 text-muted-foreground">
        <div className="flex items-center gap-1">
          {!isEditing && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground touch-none"
              aria-label="Arrastar para reordenar"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <span>{slot.slot_number}</span>
        </div>
      </td>
      {isEditing ? (
        <>
          <td className="p-1.5">
            <Input
              value={editSlot.label}
              onChange={e => setEditSlot(prev => ({ ...prev, label: e.target.value }))}
              className="h-7 text-sm"
            />
          </td>
          <td className="p-1.5">
            <Input
              type="time"
              value={editSlot.start_time}
              onChange={e => setEditSlot(prev => ({ ...prev, start_time: e.target.value }))}
              className="h-7 text-sm"
            />
          </td>
          <td className="p-1.5">
            <Input
              type="time"
              value={editSlot.end_time}
              onChange={e => setEditSlot(prev => ({ ...prev, end_time: e.target.value }))}
              className="h-7 text-sm"
            />
          </td>
          <td className="p-1.5">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={onSaveEdit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onCancelEdit}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="p-2 font-medium">{slot.slot_label}</td>
          <td className="p-2">{slot.start_time.slice(0, 5)}</td>
          <td className="p-2">{slot.end_time.slice(0, 5)}</td>
          <td className="p-2">
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onStartEdit(slot)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(slot.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}


export default function SchoolDefaultSchedulePage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [schoolName, setSchoolName] = useState('');
  const [selectedDay, setSelectedDay] = useState<Weekday>('SEGUNDA');
  const [newSlot, setNewSlot] = useState({ start_time: '', end_time: '', label: '' });
  const [copyFromDay, setCopyFromDay] = useState<Weekday | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editSlot, setEditSlot] = useState({ start_time: '', end_time: '', label: '' });

  const {
    slots, isLoading, createSlot, updateSlot, deleteSlot,
    getSlotsByWeekday, getNextSlotNumber, refetch,
  } = useSchoolTimeSlots(schoolId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleReorderShift = async (shift: Shift, activeId: string, overId: string) => {
    if (activeId === overId) return;
    const shiftSlots = [...slotsByShift[shift]];
    const oldIndex = shiftSlots.findIndex(s => s.id === activeId);
    const newIndex = shiftSlots.findIndex(s => s.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(shiftSlots, oldIndex, newIndex);
    // Build target slot_number list using the original numbers (sorted asc)
    const targetNumbers = shiftSlots.map(s => s.slot_number).sort((a, b) => a - b);
    try {
      // Phase 1: move all to negative temporary numbers to avoid unique conflicts
      for (let i = 0; i < reordered.length; i++) {
        await updateSlot(reordered[i].id, { slot_number: -(1000 + i) } as any);
      }
      // Phase 2: assign final numbers in new order
      for (let i = 0; i < reordered.length; i++) {
        await updateSlot(reordered[i].id, { slot_number: targetNumbers[i] } as any);
      }
      toast.success('Ordem atualizada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reordenar');
      refetch();
    }
  };


  // Load school name
  useEffect(() => {
    if (!schoolId) return;
    escolasApi.client.from('schools').select('nome').eq('id', schoolId).single()
      .then(({ data }) => { if (data) setSchoolName(data.nome); });
  }, [schoolId]);

  const currentDaySlots = useMemo(() => getSlotsByWeekday(selectedDay), [slots, selectedDay]);

  // Group slots by shift
  const slotsByShift = useMemo(() => {
    const grouped: Record<Shift, typeof currentDaySlots> = {
      MATUTINO: [], VESPERTINO: [], NOTURNO: [],
    };
    currentDaySlots.forEach(slot => {
      grouped[getShift(slot.start_time)].push(slot);
    });
    return grouped;
  }, [currentDaySlots]);

  const handleAddSlot = async () => {
    if (!schoolId || !newSlot.start_time || !newSlot.end_time) {
      toast.error('Preencha horário de início e término');
      return;
    }
    if (newSlot.start_time >= newSlot.end_time) {
      toast.error('Horário de início deve ser anterior ao término');
      return;
    }
    try {
      const slotNumber = getNextSlotNumber(selectedDay);
      await createSlot({
        school_id: schoolId,
        weekday: selectedDay,
        slot_number: slotNumber,
        slot_label: newSlot.label || `${slotNumber}ª Aula`,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
      });
      setNewSlot({ start_time: '', end_time: '', label: '' });
      toast.success('Horário adicionado');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar');
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

  const handleStartEdit = (slot: { id: string; start_time: string; end_time: string; slot_label: string }) => {
    setEditingSlotId(slot.id);
    setEditSlot({ start_time: slot.start_time.slice(0, 5), end_time: slot.end_time.slice(0, 5), label: slot.slot_label });
  };

  const handleCancelEdit = () => {
    setEditingSlotId(null);
    setEditSlot({ start_time: '', end_time: '', label: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingSlotId) return;
    if (!editSlot.start_time || !editSlot.end_time) {
      toast.error('Preencha horário de início e término');
      return;
    }
    if (editSlot.start_time >= editSlot.end_time) {
      toast.error('Horário de início deve ser anterior ao término');
      return;
    }
    try {
      await updateSlot(editingSlotId, {
        start_time: editSlot.start_time,
        end_time: editSlot.end_time,
        slot_label: editSlot.label,
      } as any);
      toast.success('Horário atualizado');
      handleCancelEdit();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar');
    }
  };

  const handleCopyDay = async (fromDay: Weekday) => {
    if (!schoolId) return;
    const sourceSlots = getSlotsByWeekday(fromDay);
    if (sourceSlots.length === 0) { toast.error('Dia de origem sem horários'); return; }
    
    const targetSlots = getSlotsByWeekday(selectedDay);
    if (targetSlots.length > 0) {
      if (!confirm(`${WEEKDAY_SHORT[selectedDay]} já possui ${targetSlots.length} horário(s). Deseja adicionar mais?`)) return;
    }

    try {
      let created = 0;
      const baseNumber = getNextSlotNumber(selectedDay);
      for (let i = 0; i < sourceSlots.length; i++) {
        const source = sourceSlots[i];
        await createSlot({
          school_id: schoolId,
          weekday: selectedDay,
          slot_number: baseNumber + i,
          slot_label: source.slot_label,
          start_time: source.start_time,
          end_time: source.end_time,
        });
        created++;
      }
      toast.success(`${created} horário(s) copiado(s) para ${WEEKDAY_SHORT[selectedDay]}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao copiar');
      refetch();
    }
  };

  const getDayCount = (day: Weekday) => getSlotsByWeekday(day).length;

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || '...', href: `/escolas/${schoolId}` },
          { label: 'Horários Padrão' },
        ]}
        title="Horário Padrão da Escola"
        description={`${schoolName ? `${schoolName} — ` : ''}Defina os horários de aula por dia da semana e turno`}
        backTo={`/escolas/${schoolId}`}
      />

      {/* Day selector */}
      <div className="flex items-center gap-1.5">
        {WEEKDAYS.map(day => (
          <Button
            key={day}
            variant={selectedDay === day ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDay(day)}
            className="flex-1 gap-1.5"
          >
            {WEEKDAY_SHORT[day]}
            {getDayCount(day) > 0 && (
              <Badge
                variant={selectedDay === day ? 'secondary' : 'outline'}
                className="h-5 px-1.5 text-[10px]"
              >
                {getDayCount(day)}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Slots grouped by shift */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-4">
          <h3 className="font-semibold text-sm">
            {WEEKDAY_OPTIONS.find(w => w.value === selectedDay)?.label}
            {currentDaySlots.length > 0 && (
              <span className="text-muted-foreground font-normal ml-2">
                ({currentDaySlots.length} {currentDaySlots.length === 1 ? 'horário' : 'horários'})
              </span>
            )}
          </h3>

          {currentDaySlots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              <Clock className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum horário configurado para este dia</p>
              <p className="text-xs mt-1">Adicione horários usando o formulário abaixo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.keys(SHIFT_CONFIG) as Shift[]).map(shift => {
                const shiftSlots = slotsByShift[shift];
                if (shiftSlots.length === 0) return null;
                const ShiftIcon = SHIFT_CONFIG[shift].icon;
                return (
                  <div key={shift} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <ShiftIcon className="h-3.5 w-3.5" />
                      {SHIFT_CONFIG[shift].label}
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{shiftSlots.length}</Badge>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event: DragEndEvent) => {
                          const { active, over } = event;
                          if (!over) return;
                          handleReorderShift(shift, String(active.id), String(over.id));
                        }}
                      >
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 w-16">#</th>
                              <th className="text-left p-2">Nome</th>
                              <th className="text-left p-2 w-24">Início</th>
                              <th className="text-left p-2 w-24">Término</th>
                              <th className="w-20"></th>
                            </tr>
                          </thead>
                          <SortableContext items={shiftSlots.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <tbody>
                              {shiftSlots.map(slot => (
                                <SortableSlotRow
                                  key={slot.id}
                                  slot={slot}
                                  isEditing={editingSlotId === slot.id}
                                  editSlot={editSlot}
                                  setEditSlot={setEditSlot}
                                  onStartEdit={handleStartEdit}
                                  onSaveEdit={handleSaveEdit}
                                  onCancelEdit={handleCancelEdit}
                                  onDelete={handleDeleteSlot}
                                />
                              ))}
                            </tbody>
                          </SortableContext>
                        </table>
                      </DndContext>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          {/* Add new slot */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Adicionar horário</Label>
            <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Nome (opcional)</Label>
                <Input
                  placeholder={`${getNextSlotNumber(selectedDay)}ª Aula`}
                  value={newSlot.label}
                  onChange={e => setNewSlot(prev => ({ ...prev, label: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1 w-24">
                <Label className="text-xs">Início</Label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={e => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1 w-24">
                <Label className="text-xs">Término</Label>
                <Input
                  type="time"
                  value={newSlot.end_time}
                  onChange={e => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" className="h-8 gap-1" onClick={handleAddSlot}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Copy from another day */}
          {WEEKDAYS.filter(d => d !== selectedDay && getDayCount(d) > 0).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar horários de:</span>
              {WEEKDAYS.filter(d => d !== selectedDay && getDayCount(d) > 0).map(day => (
                <Button
                  key={day}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleCopyDay(day)}
                >
                  {WEEKDAY_SHORT[day]} ({getDayCount(day)})
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-4">
        <Button variant="outline" onClick={() => navigate(`/escolas/${schoolId}`)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
