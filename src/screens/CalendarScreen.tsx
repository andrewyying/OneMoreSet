import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { formatSeconds, getTotalDuration } from '../lib/time';
import { useCompletions } from '../store/completions';
import { WorkoutCompletion } from '../types/models';

type CalendarCell = {
  date: Date | null;
  key: string;
};

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value: number) => value.toString().padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const formatMonthLabel = (date: Date) => `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;

const formatLongDate = (date: Date) =>
  `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

const formatTimeLabel = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const buildCalendarCells = (monthDate: Date): CalendarCell[] => {
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

  return cells;
};

const getCompletionCount = (list: WorkoutCompletion[]) => list.length;

const getExerciseCount = (completion: WorkoutCompletion) =>
  completion.steps.reduce((sum, step) => sum + Math.max(1, step.repeatCount), 0);

const CalendarScreen: React.FC = () => {
  const { completions, status, error } = useCompletions();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => today);

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
  const selectedKey = toDateKey(selectedDate);
  const selectedCompletions = completionsByDay.get(selectedKey) ?? [];
  const completedDaysThisMonth = useMemo(() => {
    const monthPrefix = `${currentMonth.getFullYear()}-${pad2(currentMonth.getMonth() + 1)}-`;
    return Array.from(completionsByDay.keys()).filter((key) => key.startsWith(monthPrefix)).length;
  }, [completionsByDay, currentMonth]);

  const handleShiftMonth = (delta: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    setCurrentMonth(nextMonth);
    setSelectedDate(startOfDay(nextMonth));
  };

  const handleToday = () => {
    const next = startOfMonth(today);
    setCurrentMonth(next);
    setSelectedDate(today);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(startOfDay(date));
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>Loading your workouts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>Unable to load your workouts.</Text>
          {error ? <Text style={styles.detailText}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>Track your workout streak.</Text>
        </View>
        <Pressable
          onPress={handleToday}
          style={({ pressed }) => [styles.todayButton, pressed ? styles.todayButtonPressed : undefined]}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.calendar}>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => handleShiftMonth(-1)}
            style={({ pressed }) => [styles.navButton, pressed ? styles.navButtonPressed : undefined]}
          >
            <MaterialIcons name="chevron-left" size={24} color="#0f172a" />
          </Pressable>
          <View style={styles.monthLabelGroup}>
            <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth)}</Text>
            <Text style={styles.monthMeta}>{completedDaysThisMonth} workout days this month</Text>
          </View>
          <Pressable
            onPress={() => handleShiftMonth(1)}
            style={({ pressed }) => [styles.navButton, pressed ? styles.navButtonPressed : undefined]}
          >
            <MaterialIcons name="chevron-right" size={24} color="#0f172a" />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {calendarCells.map((cell) => {
            if (!cell.date) {
              return <View key={cell.key} style={[styles.dayCell, styles.dayCellEmpty]} />;
            }

            const dayKey = toDateKey(cell.date);
            const isSelected = dayKey === selectedKey;
            const isToday = dayKey === toDateKey(today);
            const completionsForDay = completionsByDay.get(dayKey) ?? [];
            const hasCompletion = completionsForDay.length > 0;

            return (
              <Pressable
                key={cell.key}
                onPress={() => handleSelectDate(cell.date as Date)}
                style={({ pressed }) => [
                  styles.dayCell,
                  hasCompletion ? styles.dayCellHighlighted : undefined,
                  isSelected ? styles.dayCellSelected : undefined,
                  isToday ? styles.dayCellToday : undefined,
                  pressed ? styles.dayCellPressed : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected ? styles.dayTextSelected : undefined,
                    hasCompletion ? styles.dayTextHighlighted : undefined,
                  ]}
                >
                  {cell.date.getDate()}
                </Text>
                {hasCompletion ? (
                  <View style={[styles.dayDot, isSelected ? styles.dayDotSelected : undefined]} />
                ) : (
                  <View style={styles.dayDotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{formatLongDate(selectedDate)}</Text>
          {selectedCompletions.length === 0 ? (
            <Text style={styles.detailEmpty}>No workouts logged for this day.</Text>
          ) : (
            <Text style={styles.detailSubtitle}>
              {getCompletionCount(selectedCompletions)} workout
              {selectedCompletions.length === 1 ? '' : 's'}
            </Text>
          )}

          {selectedCompletions.map((completion) => {
            const totalDuration = getTotalDuration({
              steps: completion.steps,
              restBetweenSec: completion.restBetweenSec,
            });
            const exerciseCount = getExerciseCount(completion);

            return (
              <View key={completion.id} style={styles.completionCard}>
                <View style={styles.completionHeader}>
                  <Text style={styles.completionTitle}>{completion.scheduleName}</Text>
                  <Text style={styles.completionTime}>{formatTimeLabel(completion.completedAt)}</Text>
                </View>
                <Text style={styles.completionMeta}>
                  {exerciseCount} exercises · {formatSeconds(totalDuration)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  calendar: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#475569',
  },
  detailText: {
    marginTop: 8,
    color: '#64748b',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop:30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  todayButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  todayButtonPressed: {
    opacity: 0.8,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
  },
  monthLabelGroup: {
    alignItems: 'center',
    flex: 1,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  monthMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  navButtonPressed: {
    opacity: 0.7,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285714%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 6,
  },
  dayCellEmpty: {
    opacity: 0,
  },
  dayCellPressed: {
    opacity: 0.7,
  },
  dayCellHighlighted: {
    backgroundColor: '#e0f2fe',
  },
  dayCellSelected: {
    backgroundColor: '#0ea5e9',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  dayTextHighlighted: {
    color: '#0f172a',
  },
  dayTextSelected: {
    color: '#fff',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0ea5e9',
    marginTop: 6,
  },
  dayDotSelected: {
    backgroundColor: '#fff',
  },
  dayDotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 6,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 18,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailSubtitle: {
    marginTop: 6,
    color: '#475569',
  },
  detailEmpty: {
    marginTop: 8,
    color: '#64748b',
  },
  completionCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  completionTime: {
    fontSize: 12,
    color: '#64748b',
  },
  completionMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#475569',
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stepLabel: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    marginRight: 8,
  },
  stepMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});

export default CalendarScreen;

