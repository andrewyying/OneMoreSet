import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import ExerciseModal from '../components/ExerciseModal';
import PrimaryButton from '../components/PrimaryButton';
import TimerCircle from '../components/TimerCircle';
import TimerControls from '../components/TimerControls';
import { buildPhases, Phase } from '../lib/time';
import {
  createInitialTimerState,
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
import { useBackgroundAudio } from '../hooks/useBackgroundAudio';
import { useLiveActivity } from '../hooks/useLiveActivity';
import { usePreStartCountdown } from '../hooks/usePreStartCountdown';
import { useTimerSounds } from '../hooks/useTimerSounds';
import { useCompletions } from '../store/completions';
import { useSchedules } from '../store/schedules';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const COUNTDOWN_CUE_SECONDS = 3;
const HALF_CUE_WINDOW_MS = 2000;

const PlayerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId, startWithCountdown = false } = route.params;
  const { schedules } = useSchedules();
  const { recordCompletion } = useCompletions();
  const schedule = schedules.find((item) => item.id === scheduleId);
  const phases = useMemo<Phase[]>(() => {
    if (!schedule) {
      return [];
    }
    return buildPhases({ steps: schedule.steps, restBetweenSec: schedule.restBetweenSec });
  }, [schedule]);
  const exercisePhases = useMemo(
    () =>
      phases
        .map((phase, phaseIndex) => ({ ...phase, phaseIndex }))
        .filter((phase) => phase.type === 'exercise'),
    [phases],
  );
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const timerFontSize = Math.max(48, Math.min(88, width * 0.18));

  const [timerState, setTimerState] = useState<TimerState>(() => createInitialTimerState(phases));
  const lastStepIndexRef = useRef(timerState.currentStepIndex);
  const lastStatusRef = useRef<TimerStatus>(timerState.status);
  const lastCountdownBeepRef = useRef<number | null>(null);
  const countdownTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const halfCueIndexRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const timerStateRef = useRef(timerState);
  const phasesRef = useRef(phases);
  const scheduleRef = useRef(schedule);
  const [showExercises, setShowExercises] = useState(false);
  const completionRecordedRef = useRef(false);

  const {
    soundsReady,
    playBeepSound,
    playStartSound,
    playHalfSound,
    playLockSound,
    configureAudioMode,
  } = useTimerSounds();
  const { startBackgroundAudio, stopBackgroundAudio } = useBackgroundAudio({ configureAudioMode });

  useLiveActivity({
    scheduleRef,
    phasesRef,
    timerStateRef,
    timerState,
    setTimerState,
    appStateRef,
  });

  const handleCountdownComplete = useCallback(() => {
    const activePhases = phasesRef.current;
    setTimerState(startTimer(activePhases, Date.now()));
    playStartSound();
  }, [playStartSound]);

  const { preStartCountdown } = usePreStartCountdown({
    enabled: startWithCountdown,
    phases,
    onTick: playBeepSound,
    onComplete: handleCountdownComplete,
  });

  const triggerHaptic = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptics failed', error);
    }
  }, []);

  const clearCountdownTimeouts = useCallback(() => {
    countdownTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    countdownTimeoutsRef.current = [];
  }, []);

  const scheduleCountdownCue = useCallback(
    (delayMs: number, stepIndex: number, cueSecond: number) => {
      if (delayMs <= 0) {
        return;
      }

      const timeoutId = setTimeout(() => {
        const latestState = timerStateRef.current;
        if (latestState.status !== 'running' || latestState.currentStepIndex !== stepIndex) {
          return;
        }
        if (lastCountdownBeepRef.current === cueSecond) {
          return;
        }

        playBeepSound();
        lastCountdownBeepRef.current = cueSecond;
      }, delayMs);

      countdownTimeoutsRef.current.push(timeoutId);
    },
    [playBeepSound],
  );

  useEffect(() => {
    setTimerState(createInitialTimerState(phases));
  }, [phases]);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    phasesRef.current = phases;
  }, [phases]);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  useEffect(() => {
    if (timerState.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setTimerState((prev) => tickTimer(prev, phasesRef.current, Date.now()));
    }, 15);

    return () => clearInterval(interval);
  }, [timerState.status]);

  useEffect(() => {
    if (!schedule) {
      return;
    }

    navigation.setOptions({ title: schedule.name });
  }, [navigation, schedule]);

  useEffect(() => {
    if (timerState.currentStepIndex !== lastStepIndexRef.current) {
      lastStepIndexRef.current = timerState.currentStepIndex;
      const step = phases[timerState.currentStepIndex];
      if (step?.type === 'exercise') {
        playStartSound();
      } else if (step?.type === 'rest') {
        playLockSound();
      }
      if (appStateRef.current === 'active') {
        triggerHaptic();
      }
      halfCueIndexRef.current = null;
    }
  }, [phases, playLockSound, playStartSound, timerState.currentStepIndex, triggerHaptic]);

  useEffect(() => {
    if (timerState.status !== lastStatusRef.current) {
      if (timerState.status === 'finished') {
        if (appStateRef.current === 'active') {
          triggerHaptic();
        }
      }
      lastStatusRef.current = timerState.status;
    }
  }, [timerState.status, triggerHaptic]);

  useEffect(() => {
    lastCountdownBeepRef.current = null;
  }, [timerState.currentStepIndex]);

  useEffect(() => {
    if (timerState.status === 'running') {
      if (soundsReady) {
        startBackgroundAudio();
      }
      return;
    }

    stopBackgroundAudio();
  }, [soundsReady, startBackgroundAudio, stopBackgroundAudio, timerState.status]);

  useEffect(() => {
    return () => {
      stopBackgroundAudio();
    };
  }, [stopBackgroundAudio]);

  useEffect(() => {
    if (timerState.status !== 'finished') {
      completionRecordedRef.current = false;
    }
  }, [scheduleId, timerState.status]);

  useEffect(() => {
    if (!schedule || timerState.status !== 'finished') {
      return;
    }

    if (completionRecordedRef.current) {
      return;
    }

    completionRecordedRef.current = true;
    recordCompletion({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      steps: schedule.steps,
      restBetweenSec: schedule.restBetweenSec,
      completedAt: Date.now(),
    });
  }, [recordCompletion, schedule, timerState.status]);

  useEffect(() => {
    clearCountdownTimeouts();
    if (timerState.status !== 'running') {
      lastCountdownBeepRef.current = null;
      return undefined;
    }
    const current = phases[timerState.currentStepIndex];
    if (!current) {
      return undefined;
    }

    const durationMs = current.durationSec * 1000;
    if (durationMs <= 0 || !timerState.stepStartedAt) {
      return undefined;
    }

    const now = Date.now();
    const endDateMs = timerState.stepStartedAt + durationMs;
    const remainingMs = endDateMs - now;
    if (remainingMs <= 0) {
      return undefined;
    }

    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    if (remainingSec >= 1 && remainingSec <= COUNTDOWN_CUE_SECONDS) {
      if (lastCountdownBeepRef.current !== remainingSec) {
        playBeepSound();
        lastCountdownBeepRef.current = remainingSec;
      }
    }

    const startSecond = Math.min(COUNTDOWN_CUE_SECONDS, remainingSec - 1);
    for (let second = startSecond; second >= 1; second -= 1) {
      const cueTime = endDateMs - second * 1000;
      const delayMs = cueTime - now;
      scheduleCountdownCue(delayMs, timerState.currentStepIndex, second);
    }

    return () => {
      clearCountdownTimeouts();
    };
  }, [
    clearCountdownTimeouts,
    phases,
    playBeepSound,
    scheduleCountdownCue,
    timerState.currentStepIndex,
    timerState.status,
    timerState.stepStartedAt,
  ]);

  useEffect(() => {
    if (timerState.status !== 'running') {
      return;
    }

    const current = phases[timerState.currentStepIndex];
    if (!current || current.type !== 'exercise') {
      return;
    }

    const durationMs = current.durationSec * 1000;
    if (durationMs <= 0) {
      return;
    }

    if (!timerState.stepStartedAt) {
      return;
    }

    const now = Date.now();
    const halfTimeMs = timerState.stepStartedAt + durationMs / 2;
    const diff = now - halfTimeMs;
    if (diff >= 0 && diff <= HALF_CUE_WINDOW_MS) {
      if (halfCueIndexRef.current !== timerState.currentStepIndex) {
        playHalfSound();
        halfCueIndexRef.current = timerState.currentStepIndex;
      }
    }
  }, [
    phases,
    playHalfSound,
    timerState.currentStepIndex,
    timerState.remainingMs,
    timerState.status,
    timerState.stepStartedAt,
  ]);

  const { currentStep, upcomingStep, remainingSec, progressPercent } = useMemo(() => {
    const current = phases[timerState.currentStepIndex];
    const upcoming = phases[timerState.currentStepIndex + 1];
    const stepDurationMs = current ? current.durationSec * 1000 : 0;
    const remainingSec = Math.max(0, Math.ceil(timerState.remainingMs / 1000));
    const progressPercent = stepDurationMs > 0 ? Math.min(1, 1 - timerState.remainingMs / stepDurationMs) : 0;

    return {
      currentStep: current,
      upcomingStep: upcoming,
      remainingSec,
      progressPercent,
    };
  }, [phases, timerState.currentStepIndex, timerState.remainingMs]);
  const currentTitleStep = useMemo(() => {
    if (!schedule) {
      return { title: currentStep?.label ?? 'No exercises', repeatProgress: null as string | null };
    }

    const titlePhases: { title: string; repeatProgress: string | null }[] = [];
    const restBetweenSec = Math.max(0, Math.floor(schedule.restBetweenSec ?? 0));

    schedule.steps.forEach((step, stepIndex) => {
      const repeats = Math.max(1, Math.floor(step.repeatCount ?? 1));
      for (let rep = 0; rep < repeats; rep += 1) {
        titlePhases.push({
          title: step.label,
          repeatProgress: repeats > 1 ? `${rep + 1}/${repeats}` : null,
        });

        const isLastOverall = rep === repeats - 1 && stepIndex === schedule.steps.length - 1;
        if (restBetweenSec > 0 && !isLastOverall) {
          titlePhases.push({ title: 'Rest', repeatProgress: null });
        }
      }
    });

    return titlePhases[timerState.currentStepIndex] ?? {
      title: currentStep?.label ?? 'No exercises',
      repeatProgress: null,
    };
  }, [currentStep?.label, schedule, timerState.currentStepIndex]);

  const handlePrimaryControl = useCallback(() => {
    const now = Date.now();
    const activePhases = phasesRef.current;
    if (timerState.status === 'running') {
      setTimerState((prev) => pauseTimer(prev, activePhases, now));
    } else if (timerState.status === 'paused') {
      setTimerState((prev) => resumeTimer(prev, activePhases, now));
    } else {
      setTimerState(startTimer(activePhases, now));
      if (activePhases[0]?.type === 'exercise') {
        playStartSound();
      }
    }
  }, [playStartSound, timerState.status]);

  const handleRestart = useCallback(() => {
    Alert.alert('Restart workout', 'Start this workout from the beginning?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        style: 'destructive',
        onPress: () => setTimerState(restartTimer(phasesRef.current, Date.now())),
      },
    ]);
  }, []);

  const handleNext = useCallback(
    () => setTimerState((prev) => nextStep(prev, phasesRef.current, Date.now())),
    [],
  );
  const handlePrev = useCallback(
    () => setTimerState((prev) => previousStep(prev, phasesRef.current, Date.now())),
    [],
  );
  const handleEnd = useCallback(() => {
    Alert.alert('End workout', 'End this workout and return?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [navigation]);

  const handleSelectPhase = useCallback((phaseIndex: number) => {
    const activePhases = phasesRef.current;
    const durationSec = activePhases[phaseIndex]?.durationSec ?? 0;
    const durationMs = durationSec > 0 ? durationSec * 1000 : 0;
    setTimerState((prev) => ({
      ...prev,
      status: 'paused',
      currentStepIndex: phaseIndex,
      remainingMs: durationMs,
      stepStartedAt: null,
      pausedRemainingMs: durationMs,
    }));
  }, []);

  const handleOpenExercises = useCallback(() => setShowExercises(true), []);
  const handleCloseExercises = useCallback(() => setShowExercises(false), []);

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
  const primaryLabel = useMemo(() => (isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start'), [isPaused, isRunning]);
  const radius = useMemo(() => Math.min(width * 0.35, 140), [width]);
  const strokeWidth = 12;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const strokeDashoffset = useMemo(
    () => circumference * (1 - progressPercent),
    [circumference, progressPercent],
  );
  const hasPhases = phases.length > 0;
  const disablePrev = !hasPhases || timerState.currentStepIndex === 0;
  const disablePrimary = !hasPhases;
  const disableNext = !hasPhases;

  if (preStartCountdown !== null) {
    return (
      <SafeAreaView style={styles.countdownContainer}>
        <Text style={styles.countdownNumber}>{preStartCountdown}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.currentLabel}>{currentTitleStep.title}</Text>
        {currentTitleStep.repeatProgress ? (
          <Text style={styles.currentProgress}>{currentTitleStep.repeatProgress}</Text>
        ) : <Text style={styles.currentProgress}>{' '}</Text>
        }

        <TimerCircle
          radius={radius}
          strokeWidth={strokeWidth}
          circumference={circumference}
          strokeDashoffset={strokeDashoffset}
          remainingSec={remainingSec}
          timerFontSize={timerFontSize}
          stepType={currentStep?.type}
        />

        <TouchableOpacity style={styles.nextRow} onPress={handleOpenExercises} activeOpacity={0.8}>
          <Text style={styles.previewLabel}>Next</Text>
          {isFinished ? (
            <Text style={styles.previewTitle}>Congratulations! You finished the workout</Text>
          ) : upcomingStep ? (
            <>
              <Text style={styles.previewTitle}>{upcomingStep.label.replace(/\s\(x\d+\)$/, '')}</Text>
            </>
          ) : (
            <Text style={styles.previewTitle}>Finish</Text>
          )}
        </TouchableOpacity>

        <TimerControls
          isNarrow={isNarrow}
          showPausedActions={isPaused}
          primaryLabel={primaryLabel}
          disablePrev={disablePrev}
          disablePrimary={disablePrimary}
          disableNext={disableNext}
          onPrev={handlePrev}
          onPrimary={handlePrimaryControl}
          onNext={handleNext}
          onRestart={handleRestart}
          onEnd={handleEnd}
        />
      </View>

      <ExerciseModal
        visible={showExercises}
        onClose={handleCloseExercises}
        exercisePhases={exercisePhases}
        timerState={timerState}
        onSelectPhase={handleSelectPhase}
      />
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  backButton: {
    marginTop: 12,
  },
  currentLabel: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  currentProgress: {
    fontSize: 26,
    fontWeight: '400',
    color: '#64748b',
    opacity: 0.7,
    marginBottom: 8,
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
  nextRow: {
    alignItems: 'center',
    marginBottom: 36,
  },
  countdownContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: '800',
    color: '#fff',
  },
});

export default PlayerScreen;

