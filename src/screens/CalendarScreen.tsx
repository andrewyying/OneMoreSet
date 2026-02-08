import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import CompletionCard from '../components/CompletionCard';
import { CALENDAR_ROWS, CalendarCell } from '../lib/calendar';
import { formatLongDate, formatMonthLabel, startOfMonth, toDateKey } from '../lib/date';
import { useCalendar } from '../hooks/useCalendar';
import { useCompletions } from '../store/completions';
import { WorkoutCompletion } from '../types/models';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_HORIZONTAL_PADDING = 16;
const DAY_CELL_PADDING = 3;
const DAY_CELL_MARGIN_BOTTOM = 6;
const DAY_BUBBLE_PADDING_VERTICAL = 8;
const DAY_TEXT_FONT_SIZE = 18;
const DAY_TEXT_LINE_HEIGHT = 20;
const DAY_BUBBLE_HEIGHT = DAY_BUBBLE_PADDING_VERTICAL * 2 + DAY_TEXT_LINE_HEIGHT;
const DAY_CELL_HEIGHT = DAY_BUBBLE_HEIGHT + DAY_CELL_PADDING * 2;
const ROW_HEIGHT = DAY_CELL_HEIGHT + DAY_CELL_MARGIN_BOTTOM;

const getCompletionCount = (list: WorkoutCompletion[]) => list.length;

const CalendarScreen: React.FC = () => {
  const { completions, status, error, deleteCompletion } = useCompletions();
  const { width } = useWindowDimensions();
  const {
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
  } = useCalendar(completions);
  const gridScrollRef = useRef<ScrollView | null>(null);
  const gridWidth = useMemo(
    () => Math.max(1, width - CALENDAR_HORIZONTAL_PADDING * 2),
    [width],
  );

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

  const gridHeight = useMemo(() => CALENDAR_ROWS * ROW_HEIGHT, []);

  const handleToday = useCallback(() => {
    const next = startOfMonth(today);
    setCurrentMonth(next);
    setSelectedDate(today);
    scrollToCenter(false);
  }, [scrollToCenter, setCurrentMonth, setSelectedDate, today]);

  const handleDeleteCompletion = useCallback(
    (id: string) => {
      deleteCompletion(id);
    },
    [deleteCompletion],
  );

  const gridPageStyle = useMemo(() => [styles.gridPage, { width: gridWidth }], [gridWidth]);
  const gridWrapperStyle = useMemo(() => [styles.gridWrapper, { height: gridHeight }], [gridHeight]);
  const renderCompletionItem = useCallback<ListRenderItem<WorkoutCompletion>>(
    ({ item }) => <CompletionCard completion={item} onDelete={handleDeleteCompletion} />,
    [handleDeleteCompletion],
  );

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
      
      <View style={styles.detailSection}>
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{formatLongDate(selectedDate)}</Text>
          {selectedCompletions.length === 0 ? (
            <Text style={styles.detailEmpty}>No workouts logged for this day.</Text>
          ) : (
            <>
              <Text style={styles.detailSubtitle}>
                {getCompletionCount(selectedCompletions)} workout
                {selectedCompletions.length === 1 ? '' : 's'}
              </Text>
              <FlatList
                data={selectedCompletions}
                keyExtractor={(item) => item.id}
                renderItem={renderCompletionItem}
                style={styles.completionList}
                contentContainerStyle={styles.completionListContent}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      </View>
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
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
  },
  detailText: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
    textAlign: 'center',
  },
  detailSection: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
    minHeight: 0,
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
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  todayButtonPressed: {
    opacity: 0.8,
  },
  todayButtonText: {
    fontSize: 17,
    fontFamily: 'BebasNeue_400Regular',
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
    fontSize: 23,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  monthMeta: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: 'BebasNeue_400Regular',
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
    fontSize: 15,
    fontFamily: 'BebasNeue_400Regular',
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
    backgroundColor: '#e2e8f0',
  },
  dayBubbleSelected: {
    backgroundColor: 'rgba(15, 23, 42, 0.93)',
  },
  dayBubbleToday: {
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.93)',
  },
  dayText: {
    fontSize: DAY_TEXT_FONT_SIZE,
    fontFamily: 'BebasNeue_400Regular',
    lineHeight: DAY_TEXT_LINE_HEIGHT,
    color: '#0f172a',
  },
  dayTextHighlighted: {
    color: '#0f172a',
  },
  dayTextSelected: {
    color: '#fff',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flex: 1,
    minHeight: 0,
  },
  detailTitle: {
    fontSize: 23,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  detailSubtitle: {
    marginTop: 6,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
  },
  detailEmpty: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
  completionList: {
    marginTop: 12,
    flex: 1,
    minHeight: 0,
  },
  completionListContent: {
    paddingBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});

export default CalendarScreen;




