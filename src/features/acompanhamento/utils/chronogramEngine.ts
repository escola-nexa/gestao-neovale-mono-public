/**
 * Chronogram Engine for Smart Route Planning
 * Groups schools by city, distributes across days/shifts, generates timeline
 */

import type { WeeklySchedule, TimeShift } from '../components/WeeklyScheduleEditor';

export interface SchoolEntry {
  id: string;
  schoolId: string;
  schoolName: string;
  city: string;
  address: string;
}

export interface ChronogramParams {
  startDate: string;
  endDate: string;
  visitDurationMinutes: number;
  /** Legacy fields for backward compat */
  dailyStartTime?: string;
  dailyEndTime?: string;
  intervalMinutes?: number;
  travelTimeMinutes?: number;
  /** New: weekly schedule with shifts per weekday */
  weeklySchedule?: WeeklySchedule | null;
}

export interface ScheduledVisit {
  id: string;
  schoolId: string;
  schoolName: string;
  city: string;
  address: string;
  plannedDate: string;
  plannedArrival: string;
  plannedDeparture: string;
  dayOrder: number;
  travelFromPrevious: number;
  isFirstOfDay: boolean;
  isFirstOfCity: boolean;
}

export interface DaySchedule {
  date: string;
  dayLabel: string;
  cities: {
    city: string;
    schools: ScheduledVisit[];
    totalTimeMinutes: number;
    schoolCount: number;
  }[];
  totalSchools: number;
  dayStartTime: string;
  dayEndTime: string;
  totalMinutes: number;
}

// Constants
const DEFAULT_INTERVAL = 10;
const DEFAULT_TRAVEL = 15;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${weekdays[date.getDay()]}, ${day}/${month}/${date.getFullYear()}`;
}

const DAY_KEY_MAP: Record<number, string> = {
  1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex',
};

function getShiftsForDate(dateStr: string, ws: WeeklySchedule | null | undefined, fallbackStart: string, fallbackEnd: string): TimeShift[] {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return []; // weekends

  if (ws) {
    const key = DAY_KEY_MAP[dow] as keyof WeeklySchedule;
    if (key && ws[key] && ws[key].length > 0) return ws[key];
    return []; // no shifts configured = no visits
  }

  // Legacy fallback
  return [{ start: fallbackStart, end: fallbackEnd }];
}

/**
 * Groups schools by city, then distributes across available days/shifts
 * generating a complete chronogram with estimated times.
 */
export function generateChronogram(
  schools: SchoolEntry[],
  params: ChronogramParams
): { schedule: DaySchedule[]; flatVisits: ScheduledVisit[] } {
  if (schools.length === 0) return { schedule: [], flatVisits: [] };

  const days = getDaysBetween(params.startDate, params.endDate);
  if (days.length === 0) return { schedule: [], flatVisits: [] };

  const interval = params.intervalMinutes ?? DEFAULT_INTERVAL;
  const travel = params.travelTimeMinutes ?? DEFAULT_TRAVEL;

  // Group by city
  const cityMap = new Map<string, SchoolEntry[]>();
  schools.forEach(s => {
    const city = s.city || 'Sem Cidade';
    if (!cityMap.has(city)) cityMap.set(city, []);
    cityMap.get(city)!.push(s);
  });

  // Create ordered city blocks
  const allSchoolsOrdered: SchoolEntry[] = [];
  Array.from(cityMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, citySchools]) => {
      citySchools.forEach(s => allSchoolsOrdered.push(s));
    });

  const flatVisits: ScheduledVisit[] = [];
  const daySchedules: DaySchedule[] = [];

  let schoolIndex = 0;

  for (const dayDate of days) {
    if (schoolIndex >= allSchoolsOrdered.length) break;

    const shifts = getShiftsForDate(
      dayDate,
      params.weeklySchedule,
      params.dailyStartTime || '08:00',
      params.dailyEndTime || '18:00'
    );

    if (shifts.length === 0) continue; // skip this day

    const dayCities = new Map<string, ScheduledVisit[]>();
    let schoolsThisDay = 0;
    let dayStart = '23:59';
    let dayEnd = '00:00';
    let prevCity = '';

    // Process each shift
    for (const shift of shifts) {
      let currentTime = shift.start;
      const shiftEndMin = timeToMinutes(shift.end);

      while (schoolIndex < allSchoolsOrdered.length) {
        const school = allSchoolsOrdered[schoolIndex];
        const isFirstOfDay = schoolsThisDay === 0;
        const cityChanged = school.city !== prevCity && prevCity !== '';

        // Calculate travel
        const travelTime = isFirstOfDay ? travel : (cityChanged ? travel * 2 : travel);

        if (!isFirstOfDay) {
          currentTime = addMinutes(currentTime, interval);
        }

        const arrivalTime = addMinutes(currentTime, travelTime);

        // Check if fits in shift
        if (timeToMinutes(arrivalTime) + params.visitDurationMinutes > shiftEndMin && !isFirstOfDay) {
          break;
        }

        // Even first of day, if it doesn't fit at all, break
        if (timeToMinutes(arrivalTime) + params.visitDurationMinutes > shiftEndMin && isFirstOfDay) {
          break;
        }

        const departureTime = addMinutes(arrivalTime, params.visitDurationMinutes);
        const cityKey = school.city || 'Sem Cidade';
        const isFirstOfCity = !dayCities.has(cityKey);

        const visit: ScheduledVisit = {
          id: school.id,
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          city: cityKey,
          address: school.address,
          plannedDate: dayDate,
          plannedArrival: arrivalTime,
          plannedDeparture: departureTime,
          dayOrder: schoolsThisDay + 1,
          travelFromPrevious: travelTime,
          isFirstOfDay,
          isFirstOfCity,
        };

        flatVisits.push(visit);

        if (!dayCities.has(cityKey)) dayCities.set(cityKey, []);
        dayCities.get(cityKey)!.push(visit);

        if (arrivalTime < dayStart) dayStart = arrivalTime;
        if (departureTime > dayEnd) dayEnd = departureTime;

        currentTime = departureTime;
        prevCity = school.city;
        schoolsThisDay++;
        schoolIndex++;
      }
    }

    if (schoolsThisDay > 0) {
      const cities = Array.from(dayCities.entries()).map(([city, cityVisits]) => ({
        city,
        schools: cityVisits,
        totalTimeMinutes: cityVisits.reduce((acc, v) =>
          acc + params.visitDurationMinutes + v.travelFromPrevious, 0),
        schoolCount: cityVisits.length,
      }));

      daySchedules.push({
        date: dayDate,
        dayLabel: formatDayLabel(dayDate),
        cities,
        totalSchools: schoolsThisDay,
        dayStartTime: dayStart,
        dayEndTime: dayEnd,
        totalMinutes: timeToMinutes(dayEnd) - timeToMinutes(dayStart),
      });
    }
  }

  return { schedule: daySchedules, flatVisits };
}

export function buildGoogleMapsRouteUrl(
  departurePoint: string,
  schools: { address: string; city: string }[]
): string {
  if (schools.length === 0) return '';

  const addresses = schools.map(s => `${s.address}, ${s.city}`);

  if (addresses.length === 1) {
    const origin = departurePoint ? encodeURIComponent(departurePoint) : '';
    const dest = encodeURIComponent(addresses[0]);
    return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${dest}&travelmode=driving`;
  }

  const origin = encodeURIComponent(departurePoint || addresses[0]);
  const destination = encodeURIComponent(addresses[addresses.length - 1]);
  const waypoints = (departurePoint ? addresses.slice(0, -1) : addresses.slice(1, -1))
    .map(a => encodeURIComponent(a)).join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  url += '&travelmode=driving';
  return url;
}
