import { toDateKey } from './date';

export type CalendarCell = {
  date: Date | null;
  key: string;
};

export const CALENDAR_ROWS = 6;
export const CALENDAR_CELL_COUNT = CALENDAR_ROWS * 7;

export const buildCalendarCells = (monthDate: Date): CalendarCell[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ date: null, key: `empty-${year}-${month}-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, key: toDateKey(date) });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const fillerCount = 7 - remainder;
    for (let i = 0; i < fillerCount; i += 1) {
      cells.push({ date: null, key: `empty-${year}-${month}-tail-${i}` });
    }
  }

  const extraCount = CALENDAR_CELL_COUNT - cells.length;
  if (extraCount > 0) {
    for (let i = 0; i < extraCount; i += 1) {
      cells.push({ date: null, key: `empty-${year}-${month}-extra-${i}` });
    }
  }

  return cells;
};
