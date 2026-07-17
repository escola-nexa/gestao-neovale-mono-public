import { BookOpen, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface SubjectLoadOption {
  id: string;
  nome: string;
  /** Carga horária semanal vinda do cadastro de Disciplinas (default). */
  carga_horaria_semanal?: number | null;
}

interface SubjectWeeklyLoadEditorProps {
  subjects: SubjectLoadOption[];
  /** Override editado pelo diretor: aulas/sem por subject_id. */
  values: Record<string, number>;
  onChange: (subjectId: string, value: number) => void;
  /** Total de tempos ofertados na semana (para banner informativo). */
  weeklyOfferedSlots: number;
}

export function SubjectWeeklyLoadEditor({
  subjects,
  values,
  onChange,
  weeklyOfferedSlots,
}: SubjectWeeklyLoadEditorProps) {
  function getValue(s: SubjectLoadOption): number {
    const v = values[s.id];
    if (typeof v === 'number' && !Number.isNaN(v)) return Math.max(0, Math.floor(v));
    return Math.max(0, Math.floor(s.carga_horaria_semanal ?? 0));
  }

  const totalDeclared = subjects.reduce((sum, s) => sum + getValue(s), 0);
  const overOffered = weeklyOfferedSlots > 0 && totalDeclared > weeklyOfferedSlots;

  return (
    <div className="rounded-xl border border-[#1B1E2C]/10 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#1B1E2C] text-white">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#FFDA45] text-[#1B1E2C]">
            <BookOpen className="h-3 w-3" />
          </span>
          Carga horária por disciplina
          <span className="text-[11px] font-normal text-white/55 hidden sm:inline">· aulas por semana</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/65">
          <span className="font-mono">
            Declarado: <strong className="text-[#FFDA45]">{totalDeclared}</strong>
            {weeklyOfferedSlots > 0 && (
              <> / {weeklyOfferedSlots} ofertados</>
            )}
          </span>
        </div>
      </div>

      {overOffered && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900">
          ⚠ Você declarou <strong>{totalDeclared}</strong> aulas/sem, mas a escola só oferece{' '}
          <strong>{weeklyOfferedSlots}</strong> tempos por semana. Será preciso reduzir a carga ou ampliar os horários da escola.
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#1B1E2C]/55 italic">
          Este curso não possui disciplinas cadastradas.
        </div>
      ) : (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {subjects.map((s) => {
            const value = getValue(s);
            const original = Math.max(0, Math.floor(s.carga_horaria_semanal ?? 0));
            const changed = value !== original;
            return (
              <div
                key={s.id}
                className="rounded-md border border-[#1B1E2C]/10 bg-white hover:border-[#FFDA45] hover:bg-[#FFFCEB] transition px-2.5 py-2 space-y-2"
              >
                <div className="flex items-start justify-between gap-2 min-h-[2.25rem]">
                  <div className="text-[12px] font-semibold text-[#1B1E2C] leading-tight break-words flex-1 min-w-0">
                    {s.nome}
                  </div>
                  {changed && (
                    <Badge
                      variant="outline"
                      className="border-[#FFDA45] bg-[#FFFCEB] text-[#1B1E2C] text-[9px] font-mono h-4 px-1"
                      title={`Valor original do cadastro: ${original}h/sem`}
                    >
                      editado
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-[#1B1E2C]/15 text-[#1B1E2C]"
                    onClick={() => onChange(s.id, Math.max(0, value - 1))}
                    aria-label="Diminuir"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={40}
                    value={value}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onChange(s.id, Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
                    }}
                    className="h-7 px-1 text-center font-mono font-bold text-[#1B1E2C] border-[#1B1E2C]/15 focus-visible:ring-1 focus-visible:ring-[#FFDA45] focus-visible:border-[#FFDA45] focus-visible:ring-offset-0"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-[#1B1E2C]/15 text-[#1B1E2C]"
                    onClick={() => onChange(s.id, value + 1)}
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="text-[10px] font-mono text-[#1B1E2C]/55 ml-1 whitespace-nowrap">aulas/sem</span>
                  {changed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-auto text-[#1B1E2C]/45 hover:text-[#1B1E2C]"
                      onClick={() => onChange(s.id, original)}
                      aria-label="Restaurar valor original"
                      title={`Restaurar para ${original}h/sem`}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
