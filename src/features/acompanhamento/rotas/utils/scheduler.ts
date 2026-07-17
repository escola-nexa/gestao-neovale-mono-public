/**
 * Distribui paradas otimizadas em dias úteis dentro do expediente.
 */
export interface SchedulerParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  shiftStart: string; // HH:MM
  shiftEnd: string;
  breakStart?: string;
  breakEnd?: string;
  visitMinutes: number;
}

export interface ScheduledStop {
  index: number;            // posição na ordem otimizada
  plannedDate: string;
  plannedArrival: string;
  plannedDeparture: string;
  travelMinutes: number;
  distanceKm: number;
  dayOrder: number;
}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function* workdays(start: string, end: string): Generator<string> {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  while (s <= e) {
    const dow = s.getDay();
    if (dow !== 0 && dow !== 6) yield s.toISOString().slice(0, 10);
    s.setDate(s.getDate() + 1);
  }
}

export function distributeAcrossDays(
  travelMinutesPerLeg: number[], // length = stops (leg 0 = depot→stop1)
  distancePerLeg: number[],
  params: SchedulerParams,
): { stops: ScheduledStop[]; daysUsed: number; overflow: number } {
  const days = Array.from(workdays(params.startDate, params.endDate));
  if (!days.length) return { stops: [], daysUsed: 0, overflow: travelMinutesPerLeg.length };

  const shiftStart = toMin(params.shiftStart);
  const shiftEnd = toMin(params.shiftEnd);
  const breakStart = params.breakStart ? toMin(params.breakStart) : null;
  const breakEnd = params.breakEnd ? toMin(params.breakEnd) : null;

  const stops: ScheduledStop[] = [];
  let dayIdx = 0;
  let cursor = shiftStart;
  let dayOrder = 1;

  const advanceDay = () => { dayIdx++; cursor = shiftStart; dayOrder = 1; };

  for (let i = 0; i < travelMinutesPerLeg.length; i++) {
    if (dayIdx >= days.length) return { stops, daysUsed: days.length, overflow: travelMinutesPerLeg.length - i };

    const travel = travelMinutesPerLeg[i];
    let arrival = cursor + travel;

    // pula intervalo
    if (breakStart != null && breakEnd != null && arrival >= breakStart && arrival < breakEnd) {
      arrival = breakEnd;
    }
    let departure = arrival + params.visitMinutes;
    if (breakStart != null && breakEnd != null && arrival < breakStart && departure > breakStart) {
      arrival = breakEnd; departure = arrival + params.visitMinutes;
    }

    if (departure > shiftEnd) {
      advanceDay();
      if (dayIdx >= days.length) return { stops, daysUsed: days.length, overflow: travelMinutesPerLeg.length - i };
      arrival = shiftStart + travel;
      if (breakStart != null && breakEnd != null && arrival >= breakStart && arrival < breakEnd) arrival = breakEnd;
      departure = arrival + params.visitMinutes;
    }

    stops.push({
      index: i,
      plannedDate: days[dayIdx],
      plannedArrival: fromMin(arrival),
      plannedDeparture: fromMin(departure),
      travelMinutes: travel,
      distanceKm: distancePerLeg[i] ?? 0,
      dayOrder: dayOrder++,
    });
    cursor = departure;
  }

  return { stops, daysUsed: Math.min(dayIdx + 1, days.length), overflow: 0 };
}
