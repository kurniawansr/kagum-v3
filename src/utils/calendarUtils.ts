import { CalendarEvent } from '../types';

export interface MonthEfficiency {
  year: number;
  monthIndex: number; // 0-based (0 = Jan, 6 = Jul)
  monthName: string;
  totalDays: number;
  sundaysCount: number;
  holidaysCount: number;
  agendasCount: number;
  effectiveDays: number;
  eventsInMonth: CalendarEvent[];
}

export const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isDateInEventRange(dateStr: string, evt: CalendarEvent): boolean {
  if (!evt || !evt.date) return false;
  const start = evt.date;
  const end = evt.endDate && evt.endDate >= start ? evt.endDate : start;
  return dateStr >= start && dateStr <= end;
}

export function calculateMonthEfficiency(
  year: number,
  monthIndex: number,
  events: CalendarEvent[] = []
): MonthEfficiency {
  const totalDays = getDaysInMonth(year, monthIndex);
  let sundaysCount = 0;
  const monthStr = String(monthIndex + 1).padStart(2, '0');
  const monthFirstDate = `${year}-${monthStr}-01`;
  const monthLastDate = `${year}-${monthStr}-${String(totalDays).padStart(2, '0')}`;

  const safeEvents = Array.isArray(events) ? events : [];

  // Filter events that fall in or overlap this month
  const eventsInMonth = safeEvents.filter((e) => {
    if (!e || !e.date) return false;
    const start = e.date;
    const end = e.endDate && e.endDate >= start ? e.endDate : start;
    return start <= monthLastDate && end >= monthFirstDate;
  });

  // Sort events chronologically (tanggal muda first)
  eventsInMonth.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aEnd = a.endDate || a.date;
    const bEnd = b.endDate || b.date;
    return aEnd.localeCompare(bEnd);
  });

  const offDaysSet = new Set<number>();
  const agendaDaysSet = new Set<number>();

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, monthIndex, day);
    if (dateObj.getDay() === 0) {
      sundaysCount++;
      offDaysSet.add(day);
    }
  }

  let holidaysCount = 0;
  let agendasCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const holidayEvt = eventsInMonth.find((evt) => evt.type === 'libur' && isDateInEventRange(dateStr, evt));
    if (holidayEvt) {
      if (!offDaysSet.has(day)) {
        offDaysSet.add(day);
        holidaysCount++;
      }
    } else {
      const agendaEvt = eventsInMonth.find(
        (evt) => evt.type === 'agenda' && isDateInEventRange(dateStr, evt)
      );
      if (agendaEvt) {
        if (!offDaysSet.has(day) && !agendaDaysSet.has(day)) {
          agendaDaysSet.add(day);
          agendasCount++;
        }
      }
    }
  }

  const effectiveDays = Math.max(0, totalDays - sundaysCount - holidaysCount - agendasCount);

  return {
    year,
    monthIndex,
    monthName: INDONESIAN_MONTH_NAMES[monthIndex],
    totalDays,
    sundaysCount,
    holidaysCount,
    agendasCount,
    effectiveDays,
    eventsInMonth,
  };
}

export function getFridaysInMonth(year: number, monthIndex: number): string[] {
  const fridays: string[] = [];
  const totalDays = getDaysInMonth(year, monthIndex);
  const monthStr = String(monthIndex + 1).padStart(2, '0');

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getDay() === 5) {
      // 5 = Friday
      const dayStr = String(day).padStart(2, '0');
      fridays.push(`${year}-${monthStr}-${dayStr}`);
    }
  }
  return fridays;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${INDONESIAN_MONTH_NAMES[monthIdx] || ''} ${year}`;
}

export function formatIndonesianDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, monthIdx, day);
  const dayName = INDONESIAN_DAY_NAMES[d.getDay()] || '';

  return `${dayName}, ${day} ${INDONESIAN_MONTH_NAMES[monthIdx] || ''} ${year}`;
}

export function formatIndonesianDateRange(startDate: string, endDate?: string): string {
  if (!startDate) return '';
  if (!endDate || endDate === startDate) {
    return formatIndonesianDate(startDate);
  }
  const startParts = startDate.split('-');
  const endParts = endDate.split('-');
  if (startParts.length !== 3 || endParts.length !== 3) {
    return `${formatIndonesianDate(startDate)} s.d. ${formatIndonesianDate(endDate)}`;
  }

  const startYear = startParts[0];
  const startMonthIdx = parseInt(startParts[1], 10) - 1;
  const startDay = parseInt(startParts[2], 10);

  const endYear = endParts[0];
  const endMonthIdx = parseInt(endParts[1], 10) - 1;
  const endDay = parseInt(endParts[2], 10);

  if (startYear === endYear && startMonthIdx === endMonthIdx) {
    return `${startDay} s.d. ${endDay} ${INDONESIAN_MONTH_NAMES[startMonthIdx]} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${INDONESIAN_MONTH_NAMES[startMonthIdx]} s.d. ${endDay} ${INDONESIAN_MONTH_NAMES[endMonthIdx]} ${startYear}`;
  }
  return `${formatIndonesianDate(startDate)} s.d. ${formatIndonesianDate(endDate)}`;
}
