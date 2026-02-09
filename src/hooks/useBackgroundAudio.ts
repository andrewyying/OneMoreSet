import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { Audio } from 'expo-av';

type UseBackgroundAudioOptions = {
  configureAudioMode: (staysActiveInBackground: boolean) => Promise<void>;
};

const unloadSound = async (soundRef: MutableRefObject<Audio.Sound | null>) => {
  if (!soundRef.current) {
    return;
  }

  try {
    await soundRef.current.unloadAsync();
  } catch (error) {
    console.warn('Failed to unload background audio', error);
  } finally {
    soundRef.current = null;
  }
};

export const useBackgroundAudio = ({ configureAudioMode }: UseBackgroundAudioOptions) => {
  const silenceSoundRef = useRef<Audio.Sound | null>(null);
  const backgroundAudioActiveRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      try {
        const silenceResult = await Audio.Sound.createAsync(require('../../assets/sounds/silence.wav'));
        if (isMounted) {
          silenceSoundRef.current = silenceResult.sound;
        } else {
          await silenceResult.sound.unloadAsync();
        }
      } catch (error) {
        console.warn('Failed to load silence sound', error);
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      void unloadSound(silenceSoundRef);
      backgroundAudioActiveRef.current = false;
    };
  }, []);

  const startBackgroundAudio = useCallback(async () => {
    const sound = silenceSoundRef.current;
    if (!sound || backgroundAudioActiveRef.current) {
      return;
    }

    try {
      await configureAudioMode(true);
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.setIsLoopingAsync(true);
        await sound.setVolumeAsync(0);
        if (!status.isPlaying) {
          await sound.playAsync();
        }
        backgroundAudioActiveRef.current = true;
      }
    } catch (error) {
      console.warn('Background audio failed', error);
    }
  }, [configureAudioMode]);

  const stopBackgroundAudio = useCallback(async () => {
    const sound = silenceSoundRef.current;
    if (!sound || !backgroundAudioActiveRef.current) {
      return;
    }

    try {
      await sound.stopAsync();
    } catch (error) {
      console.warn('Stop background audio failed', error);
    } finally {
      backgroundAudioActiveRef.current = false;
      await configureAudioMode(false);
    }
  }, [configureAudioMode]);

  return { startBackgroundAudio, stopBackgroundAudio };
};
