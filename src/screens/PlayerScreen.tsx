import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ExerciseModal from '../components/ExerciseModal';
import PrimaryButton from '../components/PrimaryButton';
import TimerCircle from '../components/TimerCircle';
import TimerControls from '../components/TimerControls';
import { startOfDay, toDateKey } from '../lib/date';
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
const TIMER_TICK_INTERVAL_MS = 33;
const CONTINUE_BUTTON_DELAY_MS = 1800;
const STREAK_COUNT_DURATION_MS = 900;
const CELEBRATION_MESSAGES = [
  'Congratulations!',
  "You've done it!",
  'Hooray!',
  'Great work!',
  'Workout complete!',
  'Nice finish!',
  'You crushed it!',
  'Strong finish!',
];

const PlayerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId, startWithCountdown = false } = route.params;
  const { schedules } = useSchedules();
  const { completions, recordCompletion } = useCompletions();
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
  const [celebrationMessage, setCelebrationMessage] = useState(CELEBRATION_MESSAGES[0]);
  const [displayStreakDays, setDisplayStreakDays] = useState(0);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const completionRecordedRef = useRef(false);
  const finishContentOpacity = useRef(new Animated.Value(0)).current;
  const finishContentTranslateY = useRef(new Animated.Value(16)).current;
  const continueButtonOpacity = useRef(new Animated.Value(0)).current;
  const continueButtonTranslateY = useRef(new Animated.Value(12)).current;
  const finishBadgeScale = useRef(new Animated.Value(0.88)).current;
  const finishHaloScale = useRef(new Animated.Value(0.8)).current;
  const finishHaloOpacity = useRef(new Animated.Value(0)).current;
  const streakCountValue = useRef(new Animated.Value(0)).current;
  const streakCountListenerRef = useRef<string | null>(null);
  const continueButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAnimationStartedRef = useRef(false);

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
    }, TIMER_TICK_INTERVAL_MS);

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

  const isRunning = timerState.status === 'running';
  const isPaused = timerState.status === 'paused';
  const isFinished = timerState.status === 'finished';
  const currentStreakDays = useMemo(() => {
    const completedDayKeys = new Set(completions.map((item) => toDateKey(new Date(item.completedAt))));

    // Keep streak accurate immediately after finish, even before persistence settles.
    if (isFinished) {
      completedDayKeys.add(toDateKey(new Date()));
    }

    let streakDays = 0;
    const cursor = startOfDay(new Date());

    while (completedDayKeys.has(toDateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streakDays;
  }, [completions, isFinished]);
  const handleContinue = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Calendar' });
  }, [navigation]);
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

  useEffect(() => {
    const clearContinueButtonTimeout = () => {
      if (continueButtonTimeoutRef.current) {
        clearTimeout(continueButtonTimeoutRef.current);
        continueButtonTimeoutRef.current = null;
      }
    };
    const clearStreakCountListener = () => {
      if (streakCountListenerRef.current) {
        streakCountValue.removeListener(streakCountListenerRef.current);
        streakCountListenerRef.current = null;
      }
    };

    if (!isFinished) {
      finishAnimationStartedRef.current = false;
      clearContinueButtonTimeout();
      clearStreakCountListener();
      setShowContinueButton(false);
      setDisplayStreakDays(0);
      finishContentOpacity.setValue(0);
      finishContentTranslateY.setValue(16);
      continueButtonOpacity.setValue(0);
      continueButtonTranslateY.setValue(12);
      finishBadgeScale.setValue(0.88);
      finishHaloScale.setValue(0.8);
      finishHaloOpacity.setValue(0);
      streakCountValue.setValue(0);
      return;
    }

    if (finishAnimationStartedRef.current) {
      return;
    }

    finishAnimationStartedRef.current = true;
    clearContinueButtonTimeout();
    clearStreakCountListener();
    setCelebrationMessage(CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]);
    setShowContinueButton(false);
    setDisplayStreakDays(0);
    finishContentOpacity.setValue(0);
    finishContentTranslateY.setValue(16);
    continueButtonOpacity.setValue(0);
    continueButtonTranslateY.setValue(12);
    finishBadgeScale.setValue(0.88);
    finishHaloScale.setValue(0.8);
    finishHaloOpacity.setValue(0);
    streakCountValue.setValue(0);

    Animated.parallel([
      Animated.timing(finishContentOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(finishContentTranslateY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(finishBadgeScale, {
        toValue: 1,
        speed: 16,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(finishHaloOpacity, {
          toValue: 0.35,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(finishHaloScale, {
            toValue: 1.75,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(finishHaloOpacity, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ], { stopTogether: false }).start();

    streakCountListenerRef.current = streakCountValue.addListener(({ value }) => {
      setDisplayStreakDays(Math.max(0, Math.round(value)));
    });
    Animated.timing(streakCountValue, {
      toValue: currentStreakDays,
      duration: STREAK_COUNT_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setDisplayStreakDays(currentStreakDays);
      clearStreakCountListener();
    });

    continueButtonTimeoutRef.current = setTimeout(() => {
      setShowContinueButton(true);
      Animated.parallel([
        Animated.timing(continueButtonOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(continueButtonTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, CONTINUE_BUTTON_DELAY_MS);

    return () => {
      clearContinueButtonTimeout();
      clearStreakCountListener();
    };
  }, [
    continueButtonOpacity,
    continueButtonTranslateY,
    finishBadgeScale,
    finishContentOpacity,
    finishContentTranslateY,
    finishAnimationStartedRef,
    finishHaloOpacity,
    finishHaloScale,
    currentStreakDays,
    isFinished,
    streakCountValue,
  ]);

  if (!schedule) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Schedule not found</Text>
        <PrimaryButton label="Back to list" onPress={() => navigation.goBack()} style={styles.backButton} />
      </SafeAreaView>
    );
  }

  if (preStartCountdown !== null) {
    return (
      <SafeAreaView style={styles.countdownContainer}>
        <Text style={styles.countdownNumber}>{preStartCountdown}</Text>
      </SafeAreaView>
    );
  }
  if (isFinished) {
    return (
      <SafeAreaView style={styles.finishedContainer}>
        <View style={styles.finishedHero}>
          <Animated.View
            style={[
              styles.finishedHalo,
              {
                opacity: finishHaloOpacity,
                transform: [{ scale: finishHaloScale }],
              },
            ]}
          />
          <Animated.View style={[styles.finishedBadge, { transform: [{ scale: finishBadgeScale }] }]}>
            <MaterialIcons name="check" size={46} color="#0f172a" />
          </Animated.View>
          <Animated.View
            style={[
              styles.finishedContent,
              {
                opacity: finishContentOpacity,
                transform: [{ translateY: finishContentTranslateY }],
              },
            ]}
          >
            <Text style={styles.finishedTitle}>{celebrationMessage}</Text>
            <Text style={styles.finishedStreakLabel}>Current streak</Text>
            <Text style={styles.finishedStreakValue}>
              {displayStreakDays} day{displayStreakDays === 1 ? '' : 's'}
            </Text>
          </Animated.View>
        </View>
        {showContinueButton ? (
          <Animated.View
            style={{
              opacity: continueButtonOpacity,
              transform: [{ translateY: continueButtonTranslateY }],
            }}
          >
            <PrimaryButton label="Continue" variant="secondary" onPress={handleContinue} style={styles.finishedButton} />
          </Animated.View>
        ) : (
          <View style={styles.finishedButtonPlaceholder} />
        )}
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
          {upcomingStep ? (
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
  finishedContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    paddingBottom: 32,
  },
  finishedHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishedHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#67e8f9',
  },
  finishedBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  finishedContent: {
    alignItems: 'center',
    marginTop: 24,
  },
  finishedTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  finishedStreakLabel: {
    marginTop: 18,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  finishedStreakValue: {
    marginTop: 6,
    fontSize: 36,
    fontWeight: '800',
    color: '#f8fafc',
  },
  finishedButton: {
    minHeight: 56,
  },
  finishedButtonPlaceholder: {
    minHeight: 56,
  },
});

export default PlayerScreen;

