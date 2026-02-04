import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildCalendarCells, CalendarCell } from '../lib/calendar';
import { addMonths, pad2, startOfDay, startOfMonth, toDateKey } from '../lib/date';
import { WorkoutCompletion } from '../types/models';

type CalendarPage = {
  key: string;
  cells: CalendarCell[];
};

export const useCalendar = (completions: WorkoutCompletion[]) => {
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => today);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const msUntilMidnight = Math.max(0, nextMidnight.getTime() - now.getTime() + 1000);
      timeoutId = setTimeout(() => {
        setToday(startOfDay(new Date()));
        scheduleNextMidnight();
      }, msUntilMidnight);
    };

    scheduleNextMidnight();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const completionsByDay = useMemo(() => {
    const map = new Map<string, WorkoutCompletion[]>();
    completions.forEach((completion) => {
      const key = toDateKey(new Date(completion.completedAt));
      const existing = map.get(key);
      if (existing) {
        existing.push(completion);
      } else {
        map.set(key, [completion]);
      }
    });
    map.forEach((items) => {
      items.sort((a, b) => b.completedAt - a.completedAt);
    });
    return map;
  }, [completions]);

  const calendarCells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);
  const prevMonth = useMemo(() => addMonths(currentMonth, -1), [currentMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);
  const prevCalendarCells = useMemo(() => buildCalendarCells(prevMonth), [prevMonth]);
  const nextCalendarCells = useMemo(() => buildCalendarCells(nextMonth), [nextMonth]);
  const calendarPages = useMemo<CalendarPage[]>(
    () => [
      { key: 'prev', cells: prevCalendarCells },
      { key: 'current', cells: calendarCells },
      { key: 'next', cells: nextCalendarCells },
    ],
    [calendarCells, nextCalendarCells, prevCalendarCells],
  );

  const selectedKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const selectedCompletions = useMemo(
    () => completionsByDay.get(selectedKey) ?? [],
    [completionsByDay, selectedKey],
  );
  const completedDaysThisMonth = useMemo(() => {
    const monthPrefix = `${currentMonth.getFullYear()}-${pad2(currentMonth.getMonth() + 1)}-`;
    return Array.from(completionsByDay.keys()).filter((key) => key.startsWith(monthPrefix)).length;
  }, [completionsByDay, currentMonth]);

  const handleShiftMonth = useCallback((delta: number) => {
    setCurrentMonth((prev) => addMonths(prev, delta));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
  }, []);

  return {
    today,
    currentMonth,
    selectedDate,
    selectedKey,
    todayKey,
    calendarPages,
    selectedCompletions,
    completedDaysThisMonth,
    completionsByDay,
    setCurrentMonth,
    setSelectedDate,
    handleShiftMonth,
    handleSelectDate,
  };
};
