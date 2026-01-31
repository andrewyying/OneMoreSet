import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
const CALENDAR_HORIZONTAL_PADDING = 16;
const DAY_CELL_PADDING = 3;
const DAY_CELL_MARGIN_BOTTOM = 6;
const DAY_BUBBLE_PADDING_VERTICAL = 8;
const DAY_TEXT_FONT_SIZE = 14;
const DAY_TEXT_LINE_HEIGHT = 16;
const DAY_DOT_SIZE = 6;
const DAY_DOT_MARGIN_TOP = 6;
const DAY_BUBBLE_HEIGHT =
  DAY_BUBBLE_PADDING_VERTICAL * 2 + DAY_TEXT_LINE_HEIGHT + DAY_DOT_MARGIN_TOP + DAY_DOT_SIZE;
const DAY_CELL_HEIGHT = DAY_BUBBLE_HEIGHT + DAY_CELL_PADDING * 2;
const ROW_HEIGHT = DAY_CELL_HEIGHT + DAY_CELL_MARGIN_BOTTOM;

const pad2 = (value: number) => value.toString().padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, delta: number) => new Date(date.getFullYear(), date.getMonth() + delta, 1);

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
  const { width } = useWindowDimensions();
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => today);
  const gridScrollRef = useRef<ScrollView | null>(null);
  const gridWidth = useMemo(
    () => Math.max(1, width - CALENDAR_HORIZONTAL_PADDING * 2),
    [width],
  );

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

  const scrollToCenter = useCallback(
    (animated = false) => {
      if (!gridScrollRef.current || gridWidth <= 0) {
        return;
      }
      gridScrollRef.current.scrollTo({ x: gridWidth, animated });
    },
    [gridWidth],
  );

  useEffect(() => {
    scrollToCenter(false);
  }, [scrollToCenter]);

  useLayoutEffect(() => {
    scrollToCenter(false);
  }, [currentMonth, scrollToCenter]);

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
  const currentRowCount = useMemo(() => Math.max(1, calendarCells.length / 7), [calendarCells.length]);
  const gridHeight = useMemo(() => currentRowCount * ROW_HEIGHT, [currentRowCount]);
  const prevMonth = useMemo(() => addMonths(currentMonth, -1), [currentMonth]);
  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);
  const prevCalendarCells = useMemo(() => buildCalendarCells(prevMonth), [prevMonth]);
  const nextCalendarCells = useMemo(() => buildCalendarCells(nextMonth), [nextMonth]);
  const selectedKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const calendarPages = useMemo(
    () => [
      { key: 'prev', cells: prevCalendarCells },
      { key: 'current', cells: calendarCells },
      { key: 'next', cells: nextCalendarCells },
    ],
    [calendarCells, nextCalendarCells, prevCalendarCells],
  );
  const selectedCompletions = completionsByDay.get(selectedKey) ?? [];
  const completedDaysThisMonth = useMemo(() => {
    const monthPrefix = `${currentMonth.getFullYear()}-${pad2(currentMonth.getMonth() + 1)}-`;
    return Array.from(completionsByDay.keys()).filter((key) => key.startsWith(monthPrefix)).length;
  }, [completionsByDay, currentMonth]);

  const handleShiftMonth = useCallback((delta: number) => {
    setCurrentMonth((prev) => addMonths(prev, delta));
  }, []);

  const handleToday = useCallback(() => {
    const next = startOfMonth(today);
    setCurrentMonth(next);
    setSelectedDate(today);
    scrollToCenter(false);
  }, [scrollToCenter, today]);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
  }, []);

  const gridPageStyle = useMemo(() => [styles.gridPage, { width: gridWidth }], [gridWidth]);
  const gridWrapperStyle = useMemo(() => [styles.gridWrapper, { height: gridHeight }], [gridHeight]);

  const renderCalendarPage = useCallback(
    (cells: CalendarCell[], keyPrefix: string) =>
      cells.map((cell) => {
        const key = `${keyPrefix}-${cell.key}`;
        if (!cell.date) {
          return <View key={key} style={[styles.dayCell, styles.dayCellEmpty]} />;
        }

        const cellDate = cell.date;
        const dayKey = toDateKey(cellDate);
        const isSelected = dayKey === selectedKey;
        const isToday = dayKey === todayKey;
        const completionsForDay = completionsByDay.get(dayKey) ?? [];
        const hasCompletion = completionsForDay.length > 0;

        return (
          <Pressable key={key} onPress={() => handleSelectDate(cellDate)} style={styles.dayCell}>
            {({ pressed }) => (
              <View
                style={[
                  styles.dayBubble,
                  hasCompletion ? styles.dayBubbleHighlighted : undefined,
                  isSelected ? styles.dayBubbleSelected : undefined,
                  isToday ? styles.dayBubbleToday : undefined,
                  pressed ? styles.dayBubblePressed : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    hasCompletion ? styles.dayTextHighlighted : undefined,
                    isSelected ? styles.dayTextSelected : undefined,
                  ]}
                >
                  {cellDate.getDate()}
                </Text>
                {hasCompletion ? (
                  <View style={[styles.dayDot, isSelected ? styles.dayDotSelected : undefined]} />
                ) : (
                  <View style={styles.dayDotPlaceholder} />
                )}
              </View>
            )}
          </Pressable>
        );
      }),
    [completionsByDay, handleSelectDate, selectedKey, todayKey],
  );

  const handleGridMomentumEnd = useCallback(
    (offsetX: number) => {
      if (!gridWidth) {
        return;
      }
      const page = Math.round(offsetX / gridWidth);
      if (page === 1) {
        return;
      }
      const delta = page === 2 ? 1 : -1;
      handleShiftMonth(delta);
    },
    [gridWidth, handleShiftMonth],
  );

  const handleMonthNav = useCallback(
    (delta: number) => {
      if (!gridScrollRef.current || !gridWidth) {
        handleShiftMonth(delta);
        return;
      }

      const targetPage = delta > 0 ? 2 : 0;
      gridScrollRef.current.scrollTo({ x: targetPage * gridWidth, animated: true });
    },
    [gridWidth, handleShiftMonth],
  );

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
            onPress={() => handleMonthNav(-1)}
            style={({ pressed }) => [styles.navButton, pressed ? styles.navButtonPressed : undefined]}
          >
            <MaterialIcons name="chevron-left" size={24} color="#0f172a" />
          </Pressable>
          <View style={styles.monthLabelGroup}>
            <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth)}</Text>
            <Text style={styles.monthMeta}>{completedDaysThisMonth} workout days this month</Text>
          </View>
          <Pressable
            onPress={() => handleMonthNav(1)}
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

        <View style={gridWrapperStyle}>
          <ScrollView
            ref={gridScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => handleGridMomentumEnd(event.nativeEvent.contentOffset.x)}
          >
            <View style={styles.gridTrack}>
              {calendarPages.map((page) => (
                <View key={page.key} style={gridPageStyle}>
                  {renderCalendarPage(page.cells, page.key)}
                </View>
              ))}
            </View>
          </ScrollView>
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
    paddingHorizontal: CALENDAR_HORIZONTAL_PADDING,
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
  gridWrapper: {
    overflow: 'hidden',
    width: '100%',
  },
  gridTrack: {
    flexDirection: 'row',
  },
  gridPage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285714%',
    padding: DAY_CELL_PADDING,
    marginBottom: DAY_CELL_MARGIN_BOTTOM,
    height: DAY_CELL_HEIGHT,
  },
  dayCellEmpty: {
    opacity: 0,
  },
  dayBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: DAY_BUBBLE_PADDING_VERTICAL,
    borderRadius: 12,
    width: '100%',
  },
  dayBubblePressed: {
    opacity: 0.7,
  },
  dayBubbleHighlighted: {
    backgroundColor: '#e0f2fe',
  },
  dayBubbleSelected: {
    backgroundColor: '#0ea5e9',
  },
  dayBubbleToday: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dayText: {
    fontSize: DAY_TEXT_FONT_SIZE,
    lineHeight: DAY_TEXT_LINE_HEIGHT,
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
    width: DAY_DOT_SIZE,
    height: DAY_DOT_SIZE,
    borderRadius: DAY_DOT_SIZE / 2,
    backgroundColor: '#0ea5e9',
    marginTop: DAY_DOT_MARGIN_TOP,
  },
  dayDotSelected: {
    backgroundColor: '#fff',
  },
  dayDotPlaceholder: {
    width: DAY_DOT_SIZE,
    height: DAY_DOT_SIZE,
    marginTop: DAY_DOT_MARGIN_TOP,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
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

