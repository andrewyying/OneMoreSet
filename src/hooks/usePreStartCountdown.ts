import { useEffect, useRef, useState } from 'react';

import { Phase } from '../lib/time';

type UsePreStartCountdownOptions = {
  enabled: boolean;
  phases: Phase[];
  onTick: () => void;
  onComplete: () => void;
};

export const usePreStartCountdown = ({ enabled, phases, onTick, onComplete }: UsePreStartCountdownOptions) => {
  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartedRef = useRef(false);

  useEffect(() => {
    if (countdownStartedRef.current) {
      return;
    }
    if (!enabled || phases.length === 0) {
      return;
    }

    countdownStartedRef.current = true;
    let count = 3;
    setPreStartCountdown(count);
    onTick();

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        setPreStartCountdown(null);
        onComplete();
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      } else {
        setPreStartCountdown(count);
        onTick();
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [enabled, onComplete, onTick, phases]);

  return { preStartCountdown };
};
