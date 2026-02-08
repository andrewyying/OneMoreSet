import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LiveActivity from 'expo-live-activity';

import { Phase } from '../lib/time';
import { tickTimer, TimerState } from '../lib/timer';
import { Schedule } from '../types/models';

const LIVE_ACTIVITY_IMAGE_NAME = 'logo';
const LIVE_ACTIVITY_RESYNC_INTERVAL_MS = 1000;
const LIVE_ACTIVITY_RESYNC_ATTEMPTS = 5;

const LIVE_ACTIVITY_CONFIG: LiveActivity.LiveActivityConfig = {
  backgroundColor: 'rgba(15, 23, 42, 0.93)',
  titleColor: '#f8fafc',
  subtitleColor: '#e2e8f0',
  progressViewTint: 'rgba(15, 23, 42, 0.93)',
  progressViewLabelColor: '#f8fafc',
  timerType: 'digital',
  imagePosition: 'left',
  imageAlign: 'center',
  imageSize: { width: 32, height: 32 },
  contentFit: 'contain',
};

type UseLiveActivityOptions = {
  scheduleRef: MutableRefObject<Schedule | undefined>;
  phasesRef: MutableRefObject<Phase[]>;
  timerStateRef: MutableRefObject<TimerState>;
  timerState: TimerState;
  setTimerState: Dispatch<SetStateAction<TimerState>>;
  appStateRef: MutableRefObject<AppStateStatus>;
};

export const useLiveActivity = ({
  scheduleRef,
  phasesRef,
  timerStateRef,
  timerState,
  setTimerState,
  appStateRef,
}: UseLiveActivityOptions) => {
  const liveActivityIdRef = useRef<string | null>(null);
  const liveActivityPinnedStateRef = useRef<TimerState | null>(null);
  const liveActivityResyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveActivityResyncAttemptsRef = useRef(0);

  const buildLiveActivityState = useCallback((state: TimerState) => {
    const activeSchedule = scheduleRef.current;
    const activePhases = phasesRef.current;
    if (!activeSchedule) {
      return null;
    }

    const current = activePhases[state.currentStepIndex];
    if (!current) {
      return null;
    }

    const durationMs = current.durationSec * 1000;
    if (durationMs <= 0) {
      return null;
    }
    const stepStartedAt =
      state.stepStartedAt ??
      (state.status === 'running' ? Date.now() - Math.max(0, durationMs - state.remainingMs) : null);
    const endDateMs = stepStartedAt ? stepStartedAt + durationMs : Date.now() + Math.max(0, state.remainingMs);

    return {
      title: activeSchedule.name,
      subtitle: current.label,
      progressBar: {
        date: endDateMs,
      },
      imageName: LIVE_ACTIVITY_IMAGE_NAME,
      dynamicIslandImageName: LIVE_ACTIVITY_IMAGE_NAME,
    } satisfies LiveActivity.LiveActivityState;
  }, [phasesRef, scheduleRef]);

  const clearLiveActivityResync = useCallback(() => {
    if (liveActivityResyncIntervalRef.current) {
      clearInterval(liveActivityResyncIntervalRef.current);
      liveActivityResyncIntervalRef.current = null;
    }
    liveActivityResyncAttemptsRef.current = 0;
  }, []);

  const startLiveActivity = useCallback(
    (stateOverride?: TimerState) => {
      if (Platform.OS !== 'ios') {
        return;
      }

      const sourceState =
        appStateRef.current !== 'active' && liveActivityPinnedStateRef.current
          ? liveActivityPinnedStateRef.current
          : stateOverride ?? timerStateRef.current;
      const state = buildLiveActivityState(sourceState);
      if (!state) {
        return;
      }

      if (liveActivityIdRef.current) {
        try {
          LiveActivity.updateActivity(liveActivityIdRef.current, state);
          return;
        } catch (error) {
          console.warn('Live Activity update failed', error);
          liveActivityIdRef.current = null;
        }
      }

      const activityId = LiveActivity.startActivity(state, LIVE_ACTIVITY_CONFIG);
      if (activityId) {
        liveActivityIdRef.current = activityId;
      }
    },
    [appStateRef, buildLiveActivityState],
  );

  const scheduleLiveActivityResync = useCallback(
    (stepIndex: number) => {
      if (Platform.OS !== 'ios') {
        return;
      }

      clearLiveActivityResync();
      liveActivityResyncAttemptsRef.current = 0;

      if (appStateRef.current === 'active') {
        return;
      }

      liveActivityResyncIntervalRef.current = setInterval(() => {
        const latestState = timerStateRef.current;
        if (latestState.status !== 'running') {
          clearLiveActivityResync();
          return;
        }
        if (latestState.currentStepIndex !== stepIndex) {
          clearLiveActivityResync();
          return;
        }

        if (liveActivityResyncAttemptsRef.current >= LIVE_ACTIVITY_RESYNC_ATTEMPTS) {
          clearLiveActivityResync();
          return;
        }

        if (appStateRef.current === 'active') {
          return;
        }

        liveActivityResyncAttemptsRef.current += 1;
        startLiveActivity(latestState);
      }, LIVE_ACTIVITY_RESYNC_INTERVAL_MS);
    },
    [appStateRef, clearLiveActivityResync, startLiveActivity],
  );

  const stopLiveActivity = useCallback(
    (stateOverride?: TimerState) => {
      if (Platform.OS !== 'ios') {
        return;
      }

      const activityId = liveActivityIdRef.current;
      if (!activityId) {
        return;
      }

      const state =
        buildLiveActivityState(stateOverride ?? timerStateRef.current) ??
        ({
          title: scheduleRef.current?.name ?? 'Workout',
        } satisfies LiveActivity.LiveActivityState);
      LiveActivity.stopActivity(activityId, state);
      liveActivityIdRef.current = null;
    },
    [buildLiveActivityState, scheduleRef],
  );

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      appStateRef.current = nextState;

      if (nextState === 'active') {
        liveActivityPinnedStateRef.current = null;
        clearLiveActivityResync();
        const nextTimerState = tickTimer(timerStateRef.current, phasesRef.current, Date.now());
        setTimerState(nextTimerState);
        if (nextTimerState.status === 'running') {
          startLiveActivity(nextTimerState);
        } else if (liveActivityIdRef.current) {
          stopLiveActivity(nextTimerState);
        }
        return;
      }

      const latestState = timerStateRef.current;
      if (latestState.status === 'running') {
        liveActivityPinnedStateRef.current = latestState;
        startLiveActivity(latestState);
        scheduleLiveActivityResync(latestState.currentStepIndex);
      } else {
        liveActivityPinnedStateRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [
    appStateRef,
    clearLiveActivityResync,
    phasesRef,
    scheduleLiveActivityResync,
    setTimerState,
    startLiveActivity,
    stopLiveActivity,
    timerStateRef,
  ]);

  useEffect(() => {
    if (timerState.status === 'running') {
      if (appStateRef.current === 'active') {
        startLiveActivity(timerState);
      }
      return;
    }

    clearLiveActivityResync();
    if (appStateRef.current === 'active' && liveActivityIdRef.current) {
      stopLiveActivity(timerState);
    }
  }, [
    appStateRef,
    clearLiveActivityResync,
    startLiveActivity,
    stopLiveActivity,
    timerState.currentStepIndex,
    timerState.status,
    timerState.stepStartedAt,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return undefined;
    }

    const subscription = LiveActivity.addActivityUpdatesListener(({ activityID, activityState }) => {
      if (!liveActivityIdRef.current || activityID !== liveActivityIdRef.current) {
        return;
      }

      if (activityState === 'stale' || activityState === 'ended' || activityState === 'dismissed') {
        liveActivityIdRef.current = null;
        const latestState = timerStateRef.current;
        if (latestState.status === 'running') {
          startLiveActivity(latestState);
          scheduleLiveActivityResync(latestState.currentStepIndex);
        }
      }
    });

    return () => subscription?.remove();
  }, [scheduleLiveActivityResync, startLiveActivity, timerStateRef]);

  useEffect(() => {
    return () => {
      clearLiveActivityResync();
      stopLiveActivity();
    };
  }, [clearLiveActivityResync, stopLiveActivity]);
};
