import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import { generateId } from '../lib/ids';
import { formatSeconds, getExerciseCount, getTotalDuration } from '../lib/time';
import { useSchedules } from '../store/schedules';
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import { Schedule } from '../types/models';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ScheduleList'>,
  NativeStackScreenProps<RootStackParamList>
>;

type ScheduleListItemProps = {
  schedule: Schedule;
  onPress: (id: string) => void;
  onStart: (id: string) => void;
  onDelete: (id: string, name: string) => void;
};

const ScheduleListItem: React.FC<ScheduleListItemProps> = React.memo(({ schedule, onPress, onStart, onDelete }) => {
  const totalDuration = useMemo(
    () => getTotalDuration({ steps: schedule.steps, restBetweenSec: schedule.restBetweenSec }),
    [schedule.restBetweenSec, schedule.steps],
  );
  const exerciseCount = useMemo(() => getExerciseCount(schedule.steps), [schedule.steps]);
  const handlePress = useCallback(() => onPress(schedule.id), [onPress, schedule.id]);
  const handleStart = useCallback(() => onStart(schedule.id), [onStart, schedule.id]);
  const handleDelete = useCallback(
    () => onDelete(schedule.id, schedule.name),
    [onDelete, schedule.id, schedule.name],
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {schedule.name}
        </Text>
        <Text style={styles.cardMeta}>
          {exerciseCount} exercises - {formatSeconds(totalDuration)}
        </Text>
        <Pressable
          onPress={handleDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.trashTopRight, pressed && styles.cardPressed]}
        >
          <MaterialIcons name="delete-outline" size={22} color="#9ca3af" />
        </Pressable>
      </View>
      <View style={styles.cardActions}>
        <PrimaryButton
          label="Start"
          variant="ghost"
          onPress={handleStart}
          style={styles.actionButton}
        />
      </View>
    </Pressable>
  );
});

const ItemSeparator = () => <View style={styles.separator} />;

const ScheduleListScreen: React.FC<Props> = ({ navigation }) => {
  const { schedules, createSchedule, deleteSchedule } = useSchedules();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const handleCreateSchedule = useCallback(() => {
    const newId = createSchedule({
      name: 'New Schedule',
      restBetweenSec: 0,
      steps: [
        {
          id: generateId('step'),
          label: 'Step 1',
          durationSec: 30,
          repeatCount: 1,
        },
      ],
    });

    if (newId) {
      navigation.navigate('ScheduleEditor', { scheduleId: newId });
    }
  }, [createSchedule, navigation]);

  const confirmDelete = useCallback((id: string, name: string) => {
    Alert.alert('Delete schedule', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSchedule(id),
      },
    ]);
  }, [deleteSchedule]);

  const handleOpenSchedule = useCallback(
    (id: string) => {
      navigation.navigate('ScheduleEditor', { scheduleId: id });
    },
    [navigation],
  );

  const handleStartSchedule = useCallback(
    (id: string) => {
      navigation.navigate('Player', { scheduleId: id, startWithCountdown: true });
    },
    [navigation],
  );

  const renderItem = useCallback<ListRenderItem<Schedule>>(
    ({ item }) => (
      <ScheduleListItem
        schedule={item}
        onPress={handleOpenSchedule}
        onStart={handleStartSchedule}
        onDelete={confirmDelete}
      />
    ),
    [confirmDelete, handleOpenSchedule, handleStartSchedule],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, isNarrow && styles.headerNarrow]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>My Workouts</Text>
        </View>
        <Pressable
          onPress={handleCreateSchedule}
          style={({ pressed }) => [
            styles.fab,
            isNarrow && styles.fabNarrow,
            pressed && styles.fabPressed,
          ]}
          hitSlop={12}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={[
          styles.listContent,
          schedules.length === 0 ? styles.emptyContent : undefined,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No schedules yet</Text>
            <Text style={styles.emptySubtitle}>Create your first workout to get started.</Text>
            <PrimaryButton label="Create schedule" onPress={handleCreateSchedule} style={styles.emptyButton} />
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical:30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerNarrow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerButtonNarrow: {
    marginTop: 8,
    width: '100%',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  fab: {
    width: 33,
    height: 33,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  fabNarrow: {
    marginTop: 8,
  },
  fabPressed: {
    opacity: 0.85,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 23,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
  },
  trashTopRight: {
    position: 'absolute',
    right: 4,
    top: 4,
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 23,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 12,
    width: '100%',
  },
});

export default ScheduleListScreen;
