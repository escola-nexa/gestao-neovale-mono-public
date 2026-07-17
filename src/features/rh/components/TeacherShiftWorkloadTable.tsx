import { Sun, CloudSun, Moon, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Shift,
  TeacherWorkload,
  EMPTY_WORKLOAD,
  formatHours,
} from '../hooks/useTeacherShiftWorkload';

const SHIFTS: { key: Shift; label: string; Icon: typeof Sun; color: string }[] = [
  { key: 'MANHA', label: 'Matutino', Icon: Sun, color: 'text-amber-600' },
  { key: 'TARDE', label: 'Vespertino', Icon: CloudSun, color: 'text-orange-600' },
  { key: 'NOITE', label: 'Noturno', Icon: Moon, color: 'text-indigo-600' },
];

interface Props {
  workload: TeacherWorkload | undefined;
  loading?: boolean;
  className?: string;
}

export function TeacherShiftWorkloadTable({ workload, loading, className }: Props) {
  const w = workload ?? EMPTY_WORKLOAD;

  // Consolida lista única de escolas a partir dos 3 turnos
  const schoolNames = Array.from(
    new Set(SHIFTS.flatMap(({ key }) => w[key].schools.map(s => s.schoolName)))
  ).sort((a, b) => a.localeCompare(b));

  const getHours = (school: string, shift: Shift): { h: number; anp: boolean } => {
    const entry = w[shift].schools.find(s => s.schoolName === school);
    return { h: entry?.hours ?? 0, anp: entry?.hasAnp ?? false };
  };

  const totalGeral = SHIFTS.reduce((acc, { key }) => acc + w[key].total, 0);

  return (
    <div className={cn('mt-2 max-w-full rounded-md border bg-background', className)}>
      <table className="w-full text-[11px] table-fixed">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[18.66%]" />
          <col className="w-[18.67%]" />
          <col className="w-[18.67%]" />
        </colgroup>
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-2 py-1.5 text-left font-medium align-middle">
              <span className="flex min-w-0 items-center gap-1 leading-tight">
                <School className="h-3 w-3 text-muted-foreground" />
                Escola
              </span>
            </th>
            {SHIFTS.map(({ key, label, Icon, color }) => (
              <th key={key} className="px-1.5 py-1.5 text-center font-medium align-middle">
                <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-0.5 leading-tight whitespace-normal break-words">
                  <Icon className={cn('h-3 w-3 shrink-0', color)} />
                  {label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="px-2 py-2 text-muted-foreground">…</td>
            </tr>
          ) : schoolNames.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-2 text-muted-foreground text-center">
                Sem alocação ativa
              </td>
            </tr>
          ) : (
            schoolNames.map(school => (
              <tr key={school} className="border-b last:border-b-0 align-top">
                <td className="px-2 py-1.5 align-top">
                  <span className="block min-w-0 whitespace-normal break-words leading-tight" title={school}>
                    {school}
                    {SHIFTS.some(({ key }) => getHours(school, key).anp) && (
                      <span className="ml-1 text-[9px] text-muted-foreground">(ANP)</span>
                    )}
                  </span>
                </td>
                {SHIFTS.map(({ key }) => {
                  const { h } = getHours(school, key);
                  return (
                    <td key={key} className="px-1.5 py-1.5 text-center tabular-nums align-top whitespace-nowrap">
                      {h > 0 ? formatHours(h) : <span className="text-muted-foreground">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
          {!loading && schoolNames.length > 0 && (
            <tr className="bg-muted/30 border-t font-semibold">
              <td className="px-2 py-1 text-muted-foreground">
                Total {totalGeral > 0 && <span className="ml-1 text-foreground">({formatHours(totalGeral)})</span>}
              </td>
              {SHIFTS.map(({ key }) => {
                const t = w[key].total;
                return (
              <td key={key} className="px-1.5 py-1 text-center tabular-nums whitespace-nowrap">
                    <span className={t > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                      {formatHours(t)}
                    </span>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
