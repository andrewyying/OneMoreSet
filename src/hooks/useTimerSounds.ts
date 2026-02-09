import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

const playSound = async (sound: Audio.Sound | null, label: string) => {
  if (!sound) {
    return;
  }

  try {
    await sound.replayAsync();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
};

const unloadSound = async (soundRef: MutableRefObject<Audio.Sound | null>) => {
  if (!soundRef.current) {
    return;
  }

  try {
    await soundRef.current.unloadAsync();
  } catch (error) {
    console.warn('Failed to unload sound', error);
  } finally {
    soundRef.current = null;
  }
};

export const useTimerSounds = () => {
  const restSoundRef = useRef<Audio.Sound | null>(null);
  const startSoundRef = useRef<Audio.Sound | null>(null);
  const halfSoundRef = useRef<Audio.Sound | null>(null);
  const lockSoundRef = useRef<Audio.Sound | null>(null);
  const [soundsReady, setSoundsReady] = useState(false);

  const configureAudioMode = useCallback(async (staysActiveInBackground: boolean) => {
    try {
      const iosMode = InterruptionModeIOS?.DuckOthers ?? 2;
      const androidMode = InterruptionModeAndroid?.DuckOthers ?? 2;
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground,
        interruptionModeIOS: iosMode,
        interruptionModeAndroid: androidMode,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.warn('Audio mode failed', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      await configureAudioMode(false);
      try {
        const [restResult, startResult, halfResult, lockResult] = await Promise.all([
          Audio.Sound.createAsync(require('../../assets/sounds/beep.wav')),
          Audio.Sound.createAsync(require('../../assets/sounds/beep-high.wav')),
          Audio.Sound.createAsync(require('../../assets/sounds/double-beep.wav')),
          Audio.Sound.createAsync(require('../../assets/sounds/pop.wav')),
        ]);
        if (isMounted) {
          restSoundRef.current = restResult.sound;
          startSoundRef.current = startResult.sound;
          halfSoundRef.current = halfResult.sound;
          lockSoundRef.current = lockResult.sound;
          setSoundsReady(true);
        } else {
          await restResult.sound.unloadAsync();
          await startResult.sound.unloadAsync();
          await halfResult.sound.unloadAsync();
          await lockResult.sound.unloadAsync();
        }
      } catch (error) {
        console.warn('Failed to load cue sound', error);
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      void unloadSound(restSoundRef);
      void unloadSound(startSoundRef);
      void unloadSound(halfSoundRef);
      void unloadSound(lockSoundRef);
    };
  }, [configureAudioMode]);

  const playBeepSound = useCallback(() => playSound(restSoundRef.current, 'Cue sound'), []);
  const playStartSound = useCallback(() => playSound(startSoundRef.current, 'Start sound'), []);
  const playHalfSound = useCallback(() => playSound(halfSoundRef.current, 'Half sound'), []);
  const playLockSound = useCallback(() => playSound(lockSoundRef.current, 'Rest start sound'), []);

  return {
    soundsReady,
    playBeepSound,
    playStartSound,
    playHalfSound,
    playLockSound,
    configureAudioMode,
  };
};
