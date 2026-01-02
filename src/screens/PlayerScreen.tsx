import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import PrimaryButton from '../components/PrimaryButton';
import { buildPhases, formatSeconds, Phase } from '../lib/time';
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
  const phases = useMemo<Phase[]>(() => {
    if (!schedule) {
      return [];
    }
    return buildPhases({ steps: schedule.steps, restBetweenSec: schedule.restBetweenSec });
  }, [schedule]);
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const timerFontSize = Math.max(48, Math.min(88, width * 0.18));

  const [timerState, setTimerState] = useState<TimerState>(() => createInitialTimerState(phases));
  const restSoundRef = useRef<Audio.Sound | null>(null);
  const startSoundRef = useRef<Audio.Sound | null>(null);
  const halfSoundRef = useRef<Audio.Sound | null>(null);
  const lastStepIndexRef = useRef(timerState.currentStepIndex);
  const lastStatusRef = useRef<TimerStatus>(timerState.status);
  const lastCountdownBeepRef = useRef<number | null>(null);
  const halfCueIndexRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const [restResult, startResult, halfResult] = await Promise.all([
          Audio.Sound.createAsync(require('../../assets/sounds/beep.wav')),
          Audio.Sound.createAsync(require('../../assets/sounds/beep-high.wav')),
          Audio.Sound.createAsync(require('../../assets/sounds/tick.wav')),
        ]);
        if (isMounted) {
          restSoundRef.current = restResult.sound;
          startSoundRef.current = startResult.sound;
          halfSoundRef.current = halfResult.sound;
        } else {
          await restResult.sound.unloadAsync();
          await startResult.sound.unloadAsync();
          await halfResult.sound.unloadAsync();
        }
      } catch (error) {
        console.warn('Failed to load cue sound', error);
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      if (restSoundRef.current) {
        restSoundRef.current.unloadAsync();
        restSoundRef.current = null;
      }
      if (startSoundRef.current) {
        startSoundRef.current.unloadAsync();
        startSoundRef.current = null;
      }
      if (halfSoundRef.current) {
        halfSoundRef.current.unloadAsync();
        halfSoundRef.current = null;
      }
    };
  }, []);

  const triggerHaptic = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptics failed', error);
    }
  }, []);

  const playBeepSound = useCallback(async () => {
    try {
      const sound = restSoundRef.current;
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.warn('Cue sound failed', error);
    }
  }, []);

  const playStartSound = useCallback(async () => {
    try {
      const sound = startSoundRef.current;
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.warn('Start sound failed', error);
    }
  }, []);

  const playHalfSound = useCallback(async () => {
    try {
      const sound = halfSoundRef.current;
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.warn('Half sound failed', error);
    }
  }, []);

  useEffect(() => {
    setTimerState(createInitialTimerState(phases));
  }, [phases]);

  useEffect(() => {
    if (timerState.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setTimerState((prev) => tickTimer(prev, phases, Date.now()));
    }, 250);

    return () => clearInterval(interval);
  }, [phases, timerState.status]);

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
      }
      triggerHaptic();
      halfCueIndexRef.current = null;
    }
  }, [phases, playStartSound, timerState.currentStepIndex, triggerHaptic]);

  useEffect(() => {
    if (timerState.status !== lastStatusRef.current) {
      if (timerState.status === 'finished') {
        triggerHaptic();
      }
      lastStatusRef.current = timerState.status;
    }
  }, [timerState.status, triggerHaptic]);

  useEffect(() => {
    if (timerState.status !== 'running') {
      lastCountdownBeepRef.current = null;
      return;
    }

    const current = phases[timerState.currentStepIndex];
    if (!current || current.type !== 'rest') {
      lastCountdownBeepRef.current = null;
      return;
    }

    const remainingSec = Math.max(0, Math.ceil(timerState.remainingMs / 1000));

    if ([3, 2, 1].includes(remainingSec)) {
      if (lastCountdownBeepRef.current !== remainingSec) {
        playBeepSound();
        lastCountdownBeepRef.current = remainingSec;
      }
    } else if (remainingSec > 3) {
      lastCountdownBeepRef.current = null;
    }
  }, [phases, playBeepSound, timerState.currentStepIndex, timerState.remainingMs, timerState.status]);

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

    const remainingMs = timerState.remainingMs;
    if (remainingMs <= durationMs / 2) {
      if (halfCueIndexRef.current !== timerState.currentStepIndex) {
        playHalfSound();
        halfCueIndexRef.current = timerState.currentStepIndex;
      }
    }
  }, [phases, playHalfSound, timerState.currentStepIndex, timerState.remainingMs, timerState.status]);

  const currentStep = phases[timerState.currentStepIndex];
  const upcomingStep = phases[timerState.currentStepIndex + 1];
  const stepDurationMs = currentStep ? currentStep.durationSec * 1000 : 0;
  const progress = stepDurationMs > 0 ? Math.min(1, 1 - timerState.remainingMs / stepDurationMs) : 0;
  const remainingSec = Math.max(0, Math.ceil(timerState.remainingMs / 1000));
  const progressPercent = stepDurationMs > 0 ? Math.min(1, 1 - timerState.remainingMs / stepDurationMs) : 0;

  const handlePrimaryControl = () => {
    const now = Date.now();
    if (timerState.status === 'running') {
      setTimerState((prev) => pauseTimer(prev, phases, now));
    } else if (timerState.status === 'paused') {
      setTimerState((prev) => resumeTimer(prev, phases, now));
    } else {
      setTimerState(startTimer(phases, now));
      if (phases[0]?.type === 'exercise') {
        playStartSound();
      }
    }
  };

  const handleRestart = () => {
    Alert.alert('Restart workout', 'Start this workout from the beginning?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart',
        style: 'destructive',
        onPress: () => setTimerState(restartTimer(phases, Date.now())),
      },
    ]);
  };
  const handleNext = () => setTimerState((prev) => nextStep(prev, phases, Date.now()));
  const handlePrev = () => setTimerState((prev) => previousStep(prev, phases, Date.now()));
  const handleEnd = () => {
    Alert.alert('End workout', 'End this workout and return?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

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
  const radius = Math.min(width * 0.35, 140);
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPercent);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.scheduleName}>{schedule.name}</Text>
        <Text style={styles.currentLabel}>{currentStep?.label ?? 'No exercises'}</Text>

        <View style={styles.circleWrapper}>
          <Svg width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2}>
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke="#0ea5e9"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              rotation={-90}
              originX={radius + strokeWidth}
              originY={radius + strokeWidth}
            />
          </Svg>
          <View style={styles.circleCenter}>
            <Text style={[styles.timerText, { fontSize: timerFontSize }]}>{formatSeconds(remainingSec)}</Text>
            {currentStep ? <Text style={styles.typeBadge}>{currentStep.type.toUpperCase()}</Text> : null}
          </View>
        </View>

        {upcomingStep ? (
          <View style={styles.nextRow}>
            <Text style={styles.previewLabel}>Next</Text>
            <Text style={styles.previewTitle}>{upcomingStep.label}</Text>
            <Text style={styles.previewMeta}>{formatSeconds(upcomingStep.durationSec)}</Text>
          </View>
        ) : null}

        {isFinished ? <Text style={styles.finishedText}>Workout complete</Text> : null}

        <View style={[styles.controlsRow, isNarrow && styles.controlsRowNarrow]}>
          <PrimaryButton
            label="Prev"
            variant="secondary"
            onPress={handlePrev}
            disabled={phases.length === 0 || timerState.currentStepIndex === 0}
            style={[
              styles.controlButton,
              isNarrow ? styles.controlSpacingVertical : styles.controlSpacing,
            ]}
          />
          <PrimaryButton
            label={primaryLabel}
            onPress={handlePrimaryControl}
            disabled={phases.length === 0}
            style={[
              styles.primaryControl,
              isNarrow ? styles.controlSpacingVertical : styles.controlSpacing,
            ]}
          />
          <PrimaryButton
            label="Next"
            variant="secondary"
            onPress={handleNext}
            disabled={phases.length === 0 || timerState.currentStepIndex >= phases.length - 1}
            style={styles.controlButton}
          />
        </View>

        <View style={styles.secondaryRow}>
          <PrimaryButton
            label="Restart"
            variant="ghost"
            onPress={handleRestart}
            style={styles.secondaryButton}
          />
          <PrimaryButton
            label="End"
            variant="ghost"
            onPress={handleEnd}
            style={styles.secondaryButton}
          />
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  backButton: {
    marginTop: 12,
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
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
  nextRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  finishedText: {
    textAlign: 'center',
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 8,
    marginVertical: 20,
  },
  controlsRowNarrow: {
    flexDirection: 'column',
  },
  controlButton: {
    flex: 1,
    minHeight: 52,
  },
  controlSpacing: {
    marginRight: 12,
  },
  controlSpacingVertical: {
    marginBottom: 12,
    marginRight: 0,
  },
  primaryControl: {
    flex: 1.4,
    minHeight: 60,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    marginHorizontal: 6,
  },
});

export default PlayerScreen;

