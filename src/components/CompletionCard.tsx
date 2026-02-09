import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTimeLabel } from '../lib/date';
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

  const completionCardStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.completionCard,
      pressed ? styles.completionCardPressed : undefined,
    ],
    [],
  );

  return (
    <Pressable onLongPress={confirmDelete} delayLongPress={450} style={completionCardStyle}>
      <View style={styles.completionAccent} />
      <View style={styles.completionContent}>
        <View style={styles.completionHeader}>
          <Text style={styles.completionTitle} numberOfLines={1}>
            {completion.scheduleName}
          </Text>
          <View style={styles.completionActions}>
            <Text style={styles.completionTime}>{formatTimeLabel(completion.completedAt)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  completionCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 14,
  },
  completionAccent: {
    width: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.93)',
    marginRight: 12,
    marginVertical: 2,
  },
  completionContent: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
  },
  completionCardPressed: {
    opacity: 0.72,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  completionTitle: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  completionActions: {
    alignItems: 'flex-end',
  },
  completionTime: {
    fontSize: 15,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
});

export default CompletionCard;
