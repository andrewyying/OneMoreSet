import React, { useCallback, useMemo } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Phase, formatSeconds } from '../lib/time';
import { TimerState } from '../lib/timer';

type ExercisePhase = Phase & { phaseIndex: number };
type ExerciseGroup = {
  id: string;
  title: string;
  workoutOrder: number;
  phases: ExercisePhase[];
};

type ExerciseModalProps = {
  visible: boolean;
  onClose: () => void;
  exercisePhases: ExercisePhase[];
  timerState: TimerState;
  onSelectPhase: (phaseIndex: number) => void;
};

const ExerciseModal: React.FC<ExerciseModalProps> = React.memo(
  ({ visible, onClose, exercisePhases, timerState, onSelectPhase }) => {
    const exerciseGroups = useMemo<ExerciseGroup[]>(() => {
      const repeatLabelPattern = /^(.*)\s\(x(\d+)\)$/;
      const groups: Array<{ id: string; title: string; phases: ExercisePhase[] }> = [];

      for (let i = 0; i < exercisePhases.length; i += 1) {
        const phase = exercisePhases[i];
        const match = phase.label.match(repeatLabelPattern);
        const title = match ? match[1] : phase.label;
        const repeatNumber = match ? Number.parseInt(match[2], 10) : null;
        const previousGroup = groups[groups.length - 1];
        const canAppendToGroup =
          previousGroup !== undefined &&
          repeatNumber !== null &&
          repeatNumber === previousGroup.phases.length + 1 &&
          previousGroup.title === title;

        if (canAppendToGroup) {
          previousGroup.phases.push(phase);
          continue;
        }

        groups.push({
          id: `${title}-${phase.phaseIndex}`,
          title,
          phases: [phase],
        });
      }

      return groups.map((group, index) => ({
        ...group,
        workoutOrder: index + 1,
      }));
    }, [exercisePhases]);

    const handleSelectPhase = useCallback(
      (phaseIndex: number) => {
        onSelectPhase(phaseIndex);
        onClose();
      },
      [onClose, onSelectPhase],
    );

    const renderExerciseGroup = useCallback(
      ({ item }: { item: ExerciseGroup }) => (
        <View style={styles.exerciseGroup}>
          <Text style={styles.exerciseGroupTitle} numberOfLines={1}>
            #{item.workoutOrder} {item.title}
          </Text>
          {item.phases.map((phase, setIndex) => {
            const isDone = phase.phaseIndex < timerState.currentStepIndex || timerState.status === 'finished';
            const isCurrent = phase.phaseIndex === timerState.currentStepIndex;
            const setLabel = `${setIndex + 1}/${item.phases.length}`;

            return (
              <TouchableOpacity
                key={phase.phaseIndex}
                style={styles.setRow}
                activeOpacity={0.7}
                onPress={() => handleSelectPhase(phase.phaseIndex)}
              >
                <View style={styles.setText}>
                  <Text style={styles.setLabel}>{setLabel}</Text>
                  <Text style={styles.exerciseMeta}>{formatSeconds(phase.durationSec)}</Text>
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
          })}
        </View>
      ),
      [handleSelectPhase, timerState.currentStepIndex, timerState.status],
    );

    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Exercises</Text>
            <FlatList
              data={exerciseGroups}
              keyExtractor={(item) => item.id}
              renderItem={renderExerciseGroup}
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
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginBottom: 12,
  },
  exerciseGroup: {
    paddingVertical: 8,
  },
  exerciseGroupTitle: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 10,
    paddingLeft: 14,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  setText: {
    flex: 1,
    marginRight: 12,
  },
  setLabel: {
    fontSize: 17,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
  },
  exerciseMeta: {
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
    marginTop: 2,
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
    fontFamily: 'BebasNeue_400Regular',
    textAlign: 'center',
    paddingVertical: 12,
    color: '#475569',
  },
});

export default ExerciseModal;



