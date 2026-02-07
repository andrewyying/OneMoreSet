import React, { useCallback, useMemo } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
    const exerciseDisplayMeta = useMemo(() => {
      const displayByPhaseIndex: Record<number, { title: string; repeatProgress: string | null }> = {};
      const repeatLabelPattern = /^(.*)\s\(x(\d+)\)$/;

      for (let i = 0; i < exercisePhases.length; i += 1) {
        const phase = exercisePhases[i];
        const match = phase.label.match(repeatLabelPattern);
        if (!match) {
          displayByPhaseIndex[phase.phaseIndex] = {
            title: phase.label,
            repeatProgress: null,
          };
          continue;
        }

        const baseTitle = match[1];
        const firstRep = Number.parseInt(match[2], 10);
        if (firstRep <= 0) {
          displayByPhaseIndex[phase.phaseIndex] = {
            title: phase.label,
            repeatProgress: null,
          };
          continue;
        }

        let groupEnd = i;
        let expectedRep = firstRep + 1;
        while (groupEnd + 1 < exercisePhases.length) {
          const next = exercisePhases[groupEnd + 1];
          const nextMatch = next.label.match(repeatLabelPattern);
          if (!nextMatch) {
            break;
          }
          const nextBaseTitle = nextMatch[1];
          const nextRep = Number.parseInt(nextMatch[2], 10);
          if (nextBaseTitle !== baseTitle || nextRep !== expectedRep) {
            break;
          }
          groupEnd += 1;
          expectedRep += 1;
        }

        const totalReps = expectedRep - 1;
        for (let groupIndex = i; groupIndex <= groupEnd; groupIndex += 1) {
          const groupPhase = exercisePhases[groupIndex];
          const groupMatch = groupPhase.label.match(repeatLabelPattern);
          const currentRep = groupMatch ? Number.parseInt(groupMatch[2], 10) : 1;
          displayByPhaseIndex[groupPhase.phaseIndex] = {
            title: baseTitle,
            repeatProgress: `${currentRep}/${totalReps}`,
          };
        }

        i = groupEnd;
      }

      return displayByPhaseIndex;
    }, [exercisePhases]);

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
        const display = exerciseDisplayMeta[item.phaseIndex] ?? { title: item.label, repeatProgress: null };
        return (
          <TouchableOpacity
            style={styles.exerciseRow}
            activeOpacity={0.7}
            onPress={() => handleSelectPhase(item.phaseIndex)}
          >
            <View style={styles.exerciseText}>
              <Text style={styles.exerciseLabel} numberOfLines={1}>
                {display.title}
                {' '}
                {display.repeatProgress ? <Text style={styles.exerciseRepeatInline}> {display.repeatProgress}</Text> : null}
              </Text>
              <Text style={styles.exerciseMeta}>{formatSeconds(item.durationSec)}</Text>
            </View>
            <View style={styles.statusIconContainer}>
              {isDone ? (
                <MaterialIcons name="check-circle" size={22} color="green" />
              ) : isCurrent ? (
                <MaterialIcons name="radio-button-checked" size={22} color="#64748b" opacity={0.7} />
              ) : null}
            </View>
          </TouchableOpacity>
        );
      },
      [exerciseDisplayMeta, handleSelectPhase, timerState.currentStepIndex, timerState.status],
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
  exerciseRepeatInline: {
    color: '#64748b',
    opacity: 0.7,
    fontWeight: '400',
  },
  statusIconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
