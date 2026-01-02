import React from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import { generateId } from '../lib/ids';
import { formatSeconds, getTotalDuration } from '../lib/time';
import { useSchedules } from '../store/schedules';
import { RootStackParamList } from '../types/navigation';
import { Schedule } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleList'>;

const ScheduleListScreen: React.FC<Props> = ({ navigation }) => {
  const { schedules, createSchedule, deleteSchedule } = useSchedules();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const handleCreateSchedule = () => {
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
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete schedule', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSchedule(id),
      },
    ]);
  };

  const renderItem: ListRenderItem<Schedule> = ({ item }) => {
    const totalDuration = getTotalDuration({ steps: item.steps, restBetweenSec: item.restBetweenSec });
    const exerciseCount = item.steps.reduce((sum, step) => sum + Math.max(1, step.repeatCount), 0);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate('ScheduleEditor', { scheduleId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardMeta}>
            {exerciseCount} exercises · {formatSeconds(totalDuration)}
          </Text>
          <Pressable
            onPress={() => confirmDelete(item.id, item.name)}
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
            onPress={() => navigation.navigate('Player', { scheduleId: item.id, startWithCountdown: true })}
            style={styles.actionButton}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, isNarrow && styles.headerNarrow]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Schedules</Text>
          <Text style={styles.subtitle}>Build and run your workouts.</Text>
        </View>
        <PrimaryButton
          label="New Schedule"
          onPress={handleCreateSchedule}
          style={isNarrow ? styles.headerButtonNarrow : undefined}
        />
      </View>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingVertical: 12,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#475569',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardMeta: {
    marginTop: 4,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#475569',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 12,
    width: '100%',
  },
});

export default ScheduleListScreen;

