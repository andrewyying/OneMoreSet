import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

type UsePreStartCountdownOptions = {
  enabled: boolean;
  countdownSeconds?: number;
  onPrepare?: () => void | Promise<void>;
  onTick: () => void;
  onComplete: () => void;
  getReadyDurationMs?: number;
};

const PRE_START_INTERVAL_MS = 1000;
const PRE_START_HEARTBEAT_MS = 33;
const DEFAULT_GET_READY_DURATION_MS = 1500;
const DEFAULT_PRE_START_SECONDS = 3;

export const usePreStartCountdown = ({
  enabled,
  countdownSeconds = DEFAULT_PRE_START_SECONDS,
  onPrepare,
  onTick,
  onComplete,
  getReadyDurationMs = DEFAULT_GET_READY_DURATION_MS,
}: UsePreStartCountdownOptions) => {
  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const [isPreStartActive, setIsPreStartActive] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownStartedRef = useRef(false);
  const lastCountdownValueRef = useRef<number | null>(null);
  const onPrepareRef = useRef(onPrepare);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onPrepareRef.current = onPrepare;
  }, [onPrepare]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearCountdownInterval = useCallback(() => {
    if (!countdownIntervalRef.current) {
      return;
    }

    clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) {
      countdownStartedRef.current = false;
      lastCountdownValueRef.current = null;
      setPreStartCountdown(null);
      setIsPreStartActive(false);
      clearCountdownInterval();
      return;
    }

    if (countdownStartedRef.current) {
      return;
    }

    countdownStartedRef.current = true;

    let isCancelled = false;
    lastCountdownValueRef.current = null;
    setPreStartCountdown(null);
    setIsPreStartActive(true);
    clearCountdownInterval();

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const startCountdown = async () => {
        if (isCancelled) {
          return;
        }

        try {
          await onPrepareRef.current?.();
        } catch (error) {
          console.warn('Pre-start prepare failed', error);
        }

        if (isCancelled) {
          return;
        }

        const resolvedCountdownSeconds = Math.max(1, Math.floor(countdownSeconds));
        const countdownStartAtMs = Date.now() + getReadyDurationMs;
        const countdownEndAtMs = countdownStartAtMs + resolvedCountdownSeconds * PRE_START_INTERVAL_MS;

        const tick = () => {
          if (isCancelled) {
            return;
          }

          const now = Date.now();
          if (now < countdownStartAtMs) {
            if (lastCountdownValueRef.current !== null) {
              lastCountdownValueRef.current = null;
              setPreStartCountdown(null);
            }
            return;
          }

          const remainingMs = countdownEndAtMs - now;
          if (remainingMs <= 0) {
            clearCountdownInterval();
            setPreStartCountdown(null);
            setIsPreStartActive(false);
            onCompleteRef.current();
            return;
          }

          const countdownValue = Math.max(1, Math.ceil(remainingMs / PRE_START_INTERVAL_MS));
          if (lastCountdownValueRef.current === countdownValue) {
            return;
          }

          lastCountdownValueRef.current = countdownValue;
          onTickRef.current();
          setPreStartCountdown(countdownValue);
        };

        tick();
        countdownIntervalRef.current = setInterval(tick, PRE_START_HEARTBEAT_MS);
      };

      void startCountdown();
    });

    return () => {
      isCancelled = true;
      interactionTask.cancel();
      clearCountdownInterval();
    };
  }, [clearCountdownInterval, countdownSeconds, enabled, getReadyDurationMs]);

  return { preStartCountdown, isPreStartActive };
};
