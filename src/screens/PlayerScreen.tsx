import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import PrimaryButton from '../components/PrimaryButton';
import { formatSeconds } from '../lib/time';
import {
  createInitialTimerState,
  getTotalRemainingMs,
  nextStep,
  pauseTimer,
  previousStep,
  restartTimer,
  resumeTimer,
  startTimer,
  tickTimer,
  TimerState,
  TimerStatus,
} from '../lib/timer';
import { useSchedules } from '../store/schedules';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const PlayerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId } = route.params;
  const { schedules } = useSchedules();
  const schedule = schedules.find((item) => item.id === scheduleId);
  const steps = schedule?.steps ?? [];
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const timerFontSize = Math.max(48, Math.min(88, width * 0.18));

  const [timerState, setTimerState] = useState<TimerState>(() => createInitialTimerState(steps));
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastStepIndexRef = useRef(timerState.currentStepIndex);
  const lastStatusRef = useRef<TimerStatus>(timerState.status);

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/beep.wav'));
        if (isMounted) {
          soundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.warn('Failed to load cue sound', error);
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const triggerCue = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptics failed', error);
    }

    try {
      const sound = soundRef.current;
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.warn('Cue sound failed', error);
    }
  }, []);

  useEffect(() => {
    setTimerState(createInitialTimerState(steps));
  }, [steps]);

  useEffect(() => {
    if (timerState.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setTimerState((prev) => tickTimer(prev, steps, Date.now()));
    }, 250);

    return () => clearInterval(interval);
  }, [steps, timerState.status]);

  useEffect(() => {
    if (!schedule) {
      return;
    }

    navigation.setOptions({ title: schedule.name });
  }, [navigation, schedule]);

  useEffect(() => {
    if (timerState.currentStepIndex !== lastStepIndexRef.current) {
      lastStepIndexRef.current = timerState.currentStepIndex;
      triggerCue();
    }
  }, [timerState.currentStepIndex, triggerCue]);

  useEffect(() => {
    if (timerState.status !== lastStatusRef.current) {
      if (timerState.status === 'finished') {
        triggerCue();
      }
      lastStatusRef.current = timerState.status;
    }
  }, [timerState.status, triggerCue]);

  const currentStep = steps[timerState.currentStepIndex];
  const upcomingStep = steps[timerState.currentStepIndex + 1];
  const stepDurationMs = currentStep ? currentStep.durationSec * 1000 : 0;
  const progress = stepDurationMs > 0 ? Math.min(1, 1 - timerState.remainingMs / stepDurationMs) : 0;
  const remainingSec = Math.max(0, Math.ceil(timerState.remainingMs / 1000));
  const totalRemainingSec = useMemo(
    () => Math.max(0, Math.ceil(getTotalRemainingMs(steps, timerState) / 1000)),
    [steps, timerState],
  );

  const handlePrimaryControl = () => {
    const now = Date.now();
    if (timerState.status === 'running') {
      setTimerState((prev) => pauseTimer(prev, steps, now));
    } else if (timerState.status === 'paused') {
      setTimerState((prev) => resumeTimer(prev, steps, now));
    } else {
      setTimerState(startTimer(steps, now));
    }
  };

  const handleRestart = () => setTimerState(restartTimer(steps, Date.now()));
  const handleNext = () => setTimerState((prev) => nextStep(prev, steps, Date.now()));
  const handlePrev = () => setTimerState((prev) => previousStep(prev, steps, Date.now()));

  if (!schedule) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Schedule not found</Text>
        <PrimaryButton label="Back to list" onPress={() => navigation.goBack()} style={styles.backButton} />
      </SafeAreaView>
    );
  }

  const isRunning = timerState.status === 'running';
  const isPaused = timerState.status === 'paused';
  const isFinished = timerState.status === 'finished';
  const primaryLabel = isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.scheduleName}>{schedule.name}</Text>
        <Text style={styles.currentLabel}>{currentStep?.label ?? 'No steps'}</Text>
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, { fontSize: timerFontSize }]}>{formatSeconds(remainingSec)}</Text>
          {currentStep ? (
            <Text style={styles.typeBadge}>{currentStep.type.toUpperCase()}</Text>
          ) : null}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={[styles.previewRow, isNarrow && styles.previewRowNarrow]}>
          <View style={[styles.previewCard, isNarrow ? styles.previewCardNarrow : styles.previewSpacing]}>
            <Text style={styles.previewLabel}>Next</Text>
            {upcomingStep ? (
              <>
                <Text style={styles.previewTitle}>{upcomingStep.label}</Text>
                <Text style={styles.previewMeta}>{formatSeconds(upcomingStep.durationSec)}</Text>
              </>
            ) : (
              <Text style={styles.previewTitle}>Last step</Text>
            )}
          </View>
          <View style={[styles.previewCard, isNarrow && styles.previewCardNarrow]}>
            <Text style={styles.previewLabel}>Total remaining</Text>
            <Text style={styles.previewTitle}>{formatSeconds(totalRemainingSec)}</Text>
          </View>
        </View>

        {isFinished ? (
          <Text style={styles.finishedText}>Workout complete</Text>
        ) : null}

        <View style={[styles.controlsRow, isNarrow && styles.controlsRowNarrow]}>
          <PrimaryButton
            label="Prev"
            variant="secondary"
            onPress={handlePrev}
            disabled={steps.length === 0 || timerState.currentStepIndex === 0}
            style={[
              styles.controlButton,
              isNarrow ? styles.controlSpacingVertical : styles.controlSpacing,
            ]}
          />
          <PrimaryButton
            label={primaryLabel}
            onPress={handlePrimaryControl}
            disabled={steps.length === 0}
            style={[
              styles.controlButton,
              isNarrow ? styles.controlSpacingVertical : styles.controlSpacing,
            ]}
          />
          <PrimaryButton
            label="Next"
            variant="secondary"
            onPress={handleNext}
            disabled={steps.length === 0 || timerState.currentStepIndex >= steps.length - 1}
            style={styles.controlButton}
          />
        </View>

        <View style={[styles.secondaryRow, isNarrow && styles.controlsRowNarrow]}>
          <PrimaryButton
            label="Restart"
            variant="ghost"
            onPress={handleRestart}
            disabled={steps.length === 0}
            style={isNarrow ? styles.controlSpacingVertical : styles.controlSpacing}
          />
          <PrimaryButton label="Quit" variant="ghost" onPress={() => navigation.goBack()} />
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
  content: {
    flex: 1,
    padding: 16,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  currentLabel: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#0f172a',
  },
  typeBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    fontWeight: '700',
    color: '#0f172a',
  },
  progressTrack: {
    height: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  previewRowNarrow: {
    flexDirection: 'column',
  },
  previewSpacing: {
    marginRight: 12,
  },
  previewCardNarrow: {
    width: '100%',
    marginBottom: 12,
  },
  previewCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  previewMeta: {
    color: '#475569',
    marginTop: 2,
  },
  finishedText: {
    textAlign: 'center',
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  controlsRowNarrow: {
    flexDirection: 'column',
  },
  controlButton: {
    flex: 1,
  },
  controlSpacing: {
    marginRight: 10,
  },
  controlSpacingVertical: {
    marginBottom: 10,
    marginRight: 0,
  },
  secondaryRow: {
    flexDirection: 'row',
  },
  backButton: {
    marginTop: 12,
  },
});

export default PlayerScreen;

