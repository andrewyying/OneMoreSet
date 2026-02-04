import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTimeLabel } from '../lib/date';
import { formatSeconds, getExerciseCount, getTotalDuration } from '../lib/time';
import { WorkoutCompletion } from '../types/models';

type CompletionCardProps = {
  completion: WorkoutCompletion;
  onDelete: (id: string) => void;
};

const CompletionCard: React.FC<CompletionCardProps> = React.memo(({ completion, onDelete }) => {
  const confirmDelete = useCallback(() => {
    Alert.alert('Delete workout?', 'Remove this workout from your history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(completion.id),
      },
    ]);
  }, [completion.id, onDelete]);

  const totalDuration = useMemo(
    () =>
      getTotalDuration({
        steps: completion.steps,
        restBetweenSec: completion.restBetweenSec,
      }),
    [completion.restBetweenSec, completion.steps],
  );
  const exerciseCount = useMemo(() => getExerciseCount(completion.steps), [completion.steps]);

  return (
    <Pressable
      onLongPress={confirmDelete}
      delayLongPress={450}
      style={({ pressed }) => [styles.completionCard, pressed ? styles.completionCardPressed : undefined]}
    >
      <View style={styles.completionHeader}>
        <Text style={styles.completionTitle} numberOfLines={1}>
          {completion.scheduleName}
        </Text>
        <View style={styles.completionActions}>
          <Text style={styles.completionTime}>{formatTimeLabel(completion.completedAt)}</Text>
        </View>
      </View>
      <Text style={styles.completionMeta}>
        {exerciseCount} exercises · {formatSeconds(totalDuration)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  completionCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 15,
  },
  completionCardPressed: {
    backgroundColor: '#eef2f7',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  completionActions: {
    alignItems: 'flex-end',
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
});

export default CompletionCard;
