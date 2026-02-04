import React, { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Phase, formatSeconds } from '../lib/time';
import { TimerState } from '../lib/timer';

type ExercisePhase = Phase & { phaseIndex: number };

type ExerciseModalProps = {
  visible: boolean;
  onClose: () => void;
  exercisePhases: ExercisePhase[];
  timerState: TimerState;
  onSelectPhase: (phaseIndex: number) => void;
};

const ExerciseModal: React.FC<ExerciseModalProps> = React.memo(
  ({ visible, onClose, exercisePhases, timerState, onSelectPhase }) => {
    const handleSelectPhase = useCallback(
      (phaseIndex: number) => {
        onSelectPhase(phaseIndex);
        onClose();
      },
      [onClose, onSelectPhase],
    );

    const renderExerciseItem = useCallback(
      ({ item }: { item: ExercisePhase }) => {
        const isDone = item.phaseIndex < timerState.currentStepIndex || timerState.status === 'finished';
        const isCurrent = item.phaseIndex === timerState.currentStepIndex;
        return (
          <TouchableOpacity
            style={styles.exerciseRow}
            activeOpacity={0.7}
            onPress={() => handleSelectPhase(item.phaseIndex)}
          >
            <View style={styles.exerciseText}>
              <Text style={styles.exerciseLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.exerciseMeta}>{formatSeconds(item.durationSec)}</Text>
            </View>
            <View style={[styles.statusPill, isDone && styles.statusDone, isCurrent && !isDone && styles.statusCurrent]}>
              <Text
                style={[
                  styles.statusText,
                  isDone && styles.statusDoneText,
                  isCurrent && !isDone && styles.statusCurrentText,
                ]}
              >
                {isDone ? 'Done' : isCurrent ? 'Current' : 'Upcoming'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      },
      [handleSelectPhase, timerState.currentStepIndex, timerState.status],
    );

    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Exercises</Text>
            <FlatList
              data={exercisePhases}
              keyExtractor={(item) => `${item.phaseIndex}`}
              renderItem={renderExerciseItem}
              ItemSeparatorComponent={ExerciseSeparator}
              ListEmptyComponent={<Text style={styles.emptyExercises}>No exercises in this workout.</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  },
);

const ExerciseSeparator = () => <View style={styles.exerciseDivider} />;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  exerciseText: {
    flex: 1,
    marginRight: 12,
  },
  exerciseLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  exerciseMeta: {
    color: '#475569',
    marginTop: 2,
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusDone: {
    backgroundColor: '#e5e7eb',
    borderColor: '#e5e7eb',
  },
  statusCurrent: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  statusText: {
    fontWeight: '700',
    color: '#475569',
  },
  statusDoneText: {
    color: '#0f172a',
  },
  statusCurrentText: {
    color: '#fff',
  },
  exerciseDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  emptyExercises: {
    textAlign: 'center',
    paddingVertical: 12,
    color: '#475569',
  },
});

export default ExerciseModal;
