import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_PREFERENCES,
  Preferences,
  loadPreferences,
  savePreferences,
} from '../lib/preferences';

type PreferencesStatus = 'loading' | 'ready' | 'error';

type ContextValue = {
  preferences: Preferences;
  status: PreferencesStatus;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
};

const PreferencesContext = createContext<ContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [status, setStatus] = useState<PreferencesStatus>('loading');
  const preferencesRef = useRef<Preferences>(DEFAULT_PREFERENCES);

  const sync = useCallback((next: Preferences) => {
    preferencesRef.current = next;
    setPreferences(next);
  }, []);

  useEffect(() => {
    let active = true;

    loadPreferences()
      .then((stored) => {
        if (active) {
          sync(stored);
          setStatus('ready');
        }
      })
      .catch((error) => {
        console.warn('Failed to load preferences', error);
        if (active) {
          // Fall back to defaults so the app remains usable.
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [sync]);

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const previous = preferencesRef.current;
      const next: Preferences = { ...previous, ...patch };
      sync(next);

      try {
        await savePreferences(next);
      } catch (error) {
        sync(previous);
        throw error;
      }
    },
    [sync],
  );

  const value = useMemo(
    () => ({ preferences, status, updatePreferences }),
    [preferences, status, updatePreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = (): ContextValue => {
  const ctx = useContext(PreferencesContext);

  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }

  return ctx;
};
