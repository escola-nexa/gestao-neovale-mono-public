import { useState } from 'react';
import { Sun, Sunset, Moon, Plus, Trash2, ChevronDown, Clock, Link2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TimeSlot,
  Turno,
  emptyTimeSlot,
  durationMinutes,
  formatDuration,
} from '../../lib/defaultSchoolHours';

interface SchoolHoursEditorProps {
  timeSlotsByTurno: Record<Turno, TimeSlot[]>;
  onChange: (turno: Turno, slots: TimeSlot[]) => void;
  /** Quando true, abre os 3 turnos (Matutino, Vespertino, Noturno) por padrão. */
  defaultOpenAll?: boolean;
}

interface TurnoVisual {
  label: string;
  icon: typeof Sun;
  text: string;
  leftBorder: string;
  softBg: string;
  chip: string;
  iconRing: string;
  period: string;
}

const TURNO_INFO: Record<Turno, TurnoVisual> = {
  manha: {
    label: 'Matutino',
    icon: Sun,
    text: 'text-amber-600',
    leftBorder: 'border-l-amber-400',
    softBg: 'bg-amber-50/40',
    chip: 'bg-amber-100 text-amber-800 border-amber-300',
    iconRing: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
    period: '07h–12h',
  },
  tarde: {
    label: 'Vespertino',
    icon: Sunset,
    text: 'text-orange-600',
    leftBorder: 'border-l-orange-400',
    softBg: 'bg-orange-50/40',
    chip: 'bg-orange-100 text-orange-800 border-orange-300',
    iconRing: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
    period: '13h–18h',
  },
  noite: {
    label: 'Noturno',
    icon: Moon,
    text: 'text-indigo-600',
    leftBorder: 'border-l-indigo-500',
    softBg: 'bg-indigo-50/40',
    chip: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    iconRing: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300',
    period: '19h–22h',
  },
};

interface SortableRowProps {
  slot: TimeSlot;
  idx: number;
  onUpdate: (patch: Partial<TimeSlot>) => void;
  onRemove: () => void;
}

function SortableTimeSlotRow({ slot: s, idx, onUpdate, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const dur = durationMinutes(s.inicio, s.fim);
  const invalid = dur <= 0;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group grid grid-cols-[20px_28px_1fr_84px_84px_60px_28px] gap-2 items-center rounded-md border bg-white px-2 py-1 transition ${
        isDragging
          ? 'border-[#FFDA45] ring-1 ring-[#FFDA45] shadow-md opacity-70'
          : 'border-[#1B1E2C]/10 hover:border-[#FFDA45] hover:bg-[#FFFCEB]'
      }`}
    >
      {/* Alça de arrastar */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${s.nome || `${idx + 1}º tempo`}`}
        title="Arraste para reordenar"
        className="inline-flex h-6 w-5 items-center justify-center rounded text-[#1B1E2C]/35 hover:text-[#1B1E2C]/80 hover:bg-[#1B1E2C]/5 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* # número */}
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#1B1E2C] text-[#FFDA45] text-[10px] font-mono font-bold">
        {idx + 1}
      </span>

      {/* Nome */}
      <Input
        value={s.nome}
        onChange={(e) => onUpdate({ nome: e.target.value })}
        placeholder={`${idx + 1}º tempo`}
        className="h-7 px-2 bg-transparent border-transparent text-[#1B1E2C] placeholder:text-[#1B1E2C]/35 hover:bg-[#FAFBFD] focus-visible:bg-white focus-visible:border-[#FFDA45] focus-visible:ring-1 focus-visible:ring-[#FFDA45] focus-visible:ring-offset-0 text-sm"
      />

      {/* Início */}
      <Input
        type="time"
        value={s.inicio}
        onChange={(e) => onUpdate({ inicio: e.target.value })}
        aria-label="Início"
        className="h-7 px-2 bg-white border-[#1B1E2C]/10 text-[#1B1E2C] font-mono text-xs text-center focus-visible:ring-1 focus-visible:ring-[#FFDA45] focus-visible:border-[#FFDA45] focus-visible:ring-offset-0"
      />

      {/* Término */}
      <Input
        type="time"
        value={s.fim}
        onChange={(e) => onUpdate({ fim: e.target.value })}
        aria-label="Término"
        className="h-7 px-2 bg-white border-[#1B1E2C]/10 text-[#1B1E2C] font-mono text-xs text-center focus-visible:ring-1 focus-visible:ring-[#FFDA45] focus-visible:border-[#FFDA45] focus-visible:ring-offset-0"
      />

      {/* Duração */}
      <span
        className={`text-[11px] font-mono font-semibold text-center px-1.5 py-0.5 rounded ${
          invalid
            ? 'text-red-700 bg-red-50 ring-1 ring-red-200'
            : 'text-[#1B1E2C]/80 bg-[#FFDA45]/30'
        }`}
        title="Duração"
      >
        {invalid ? '⚠︎' : formatDuration(dur)}
      </span>

      {/* Remover */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 justify-self-end text-[#1B1E2C]/40 hover:text-red-600 hover:bg-red-50 opacity-60 group-hover:opacity-100 transition-opacity"
        aria-label="Remover tempo"
        title="Remover tempo"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function SchoolHoursEditor({ timeSlotsByTurno, onChange, defaultOpenAll = false }: SchoolHoursEditorProps) {
  const [openTurnos, setOpenTurnos] = useState<Record<Turno, boolean>>({
    manha: true,
    tarde: defaultOpenAll,
    noite: defaultOpenAll,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function toggle(t: Turno) {
    setOpenTurnos((s) => ({ ...s, [t]: !s[t] }));
  }

  function add(t: Turno) {
    const list = timeSlotsByTurno[t];
    onChange(t, [...list, emptyTimeSlot(`${list.length + 1}º tempo`)]);
  }

  function update(t: Turno, idx: number, patch: Partial<TimeSlot>) {
    const list = timeSlotsByTurno[t].map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(t, list);
  }

  function remove(t: Turno, idx: number) {
    const list = timeSlotsByTurno[t].filter((_, i) => i !== idx);
    onChange(t, list);
  }

  function handleDragEnd(t: Turno, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = timeSlotsByTurno[t];
    const oldIndex = list.findIndex((s) => s.id === active.id);
    const newIndex = list.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(t, arrayMove(list, oldIndex, newIndex));
  }

  /** Encadeia: cada tempo (a partir do 2º) começa quando o anterior termina, mantendo a duração original. */
  function chainFromPrevious(t: Turno) {
    const list = timeSlotsByTurno[t];
    if (list.length < 2) return;
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const next: TimeSlot[] = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (i === 0) { next.push(s); continue; }
      const prev = next[i - 1];
      const dur = Math.max(durationMinutes(s.inicio, s.fim), 1) || 50;
      const [hh, mm] = prev.fim.split(':').map(Number);
      const startMin = hh * 60 + mm;
      const endMin = startMin + dur;
      next.push({ ...s, inicio: fmt(startMin), fim: fmt(endMin) });
    }
    onChange(t, next);
  }

  const turnosOrdem: Turno[] = ['manha', 'tarde', 'noite'];

  return (
    <div className="space-y-3">
      {/* Faixa-título global (contexto único, fina) */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#1B1E2C] text-white">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#FFDA45] text-[#1B1E2C]">
            <Clock className="h-3 w-3" />
          </span>
          Horários da escola
          <span className="text-[11px] font-normal text-white/55 hidden sm:inline">· tempos por turno · arraste para reordenar</span>
        </div>
        <div className="text-[10px] text-white/55 hidden md:block uppercase tracking-wider">
          Padrão 6 tempos
        </div>
      </div>

      {/* Grid de 3 cards (Matutino / Vespertino / Noturno) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {turnosOrdem.map((t) => {
          const meta = TURNO_INFO[t];
          const Icon = meta.icon;
          const slots = timeSlotsByTurno[t];
          const open = openTurnos[t];
          const totalMin = slots.reduce((sum, x) => sum + Math.max(0, durationMinutes(x.inicio, x.fim)), 0);

          return (
            <div
              key={t}
              className={`rounded-xl border border-[#1B1E2C]/10 border-l-4 ${meta.leftBorder} bg-white shadow-sm overflow-hidden flex flex-col`}
            >
              {/* Header escuro do turno */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1B1E2C] text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${meta.iconRing}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-bold text-sm truncate">{meta.label}</span>
                  <Badge
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white/85 font-mono text-[10px] px-1.5 py-0 h-4"
                  >
                    {slots.length} tempo{slots.length === 1 ? '' : 's'}
                  </Badge>
                  {totalMin > 0 && (
                    <span className="text-[10px] font-mono text-white/55 hidden sm:inline">
                      · {formatDuration(totalMin)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  aria-expanded={open}
                  aria-label={open ? `Recolher ${meta.label}` : `Expandir ${meta.label}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 transition"
                >
                  <ChevronDown
                    className={`h-4 w-4 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Faixa do período (chip colorido) */}
              <div className={`px-3 py-1.5 ${meta.softBg} border-b border-[#1B1E2C]/5 flex items-center justify-between gap-2`}>
                <Badge
                  variant="outline"
                  className={`${meta.chip} text-[10px] font-mono font-bold border`}
                >
                  {meta.period}
                </Badge>
                <span className="text-[10px] uppercase tracking-wider text-[#1B1E2C]/45 font-semibold hidden sm:block">
                  Tempos do turno
                </span>
              </div>

              {open && (
                <div className="px-2 sm:px-3 pb-3 pt-2 bg-[#FAFBFD] flex-1">
                  {/* Cabeçalho de colunas */}
                  {slots.length > 0 && (
                    <div className="hidden md:grid grid-cols-[20px_28px_1fr_84px_84px_60px_28px] gap-2 px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1B1E2C]/45">
                      <div></div>
                      <div></div>
                      <div>Nome</div>
                      <div className="text-center">Início</div>
                      <div className="text-center">Término</div>
                      <div className="text-right pr-1">Duração</div>
                      <div></div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {slots.length === 0 && (
                      <div className="rounded-md border border-dashed border-[#1B1E2C]/15 bg-white p-3 text-center text-xs text-[#1B1E2C]/55 italic">
                        Nenhum tempo cadastrado neste turno.
                      </div>
                    )}

                    {slots.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(t, e)}
                      >
                        <SortableContext
                          items={slots.map((s) => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {slots.map((s, idx) => (
                            <SortableTimeSlotRow
                              key={s.id}
                              slot={s}
                              idx={idx}
                              onUpdate={(patch) => update(t, idx, patch)}
                              onRemove={() => remove(t, idx)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  {/* Ações do turno */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => add(t)}
                      className="h-7 px-2.5 border-[#FFDA45] bg-[#FFDA45]/20 text-[#1B1E2C] hover:bg-[#FFDA45] hover:text-[#1B1E2C] font-semibold text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar tempo
                    </Button>
                    {slots.length >= 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => chainFromPrevious(t)}
                        className="h-7 px-2.5 text-[#1B1E2C]/65 hover:text-[#1B1E2C] hover:bg-[#1B1E2C]/5 text-xs"
                        title="Cada tempo passa a iniciar no fim do anterior, mantendo a duração."
                      >
                        <Link2 className="h-3 w-3 mr-1" /> Encadear horários
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
