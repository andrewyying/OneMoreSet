import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreventRemove } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import StepRow from '../components/StepRow';
import DurationInput from '../components/DurationInput';
import { generateId } from '../lib/ids';
import { clampDuration, formatSeconds, getTotalDuration } from '../lib/time';
import { useSchedules } from '../store/schedules';
import { RootStackParamList } from '../types/navigation';
import { ScheduleDraft, Step } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleEditor'>;
const AUTO_SAVE_DEBOUNCE_MS = 350;

const createInitialStep = (): Step => ({
  id: generateId('step'),
  label: 'Step 1',
  durationSec: 30,
  repeatCount: 1,
});

const ScheduleEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId, isNew: isNewParam } = route.params;
  const isNewSchedule = Boolean(isNewParam);
  const { schedules, createSchedule, updateSchedule, deleteSchedule } = useSchedules();
  const schedule = schedules.find((item) => item.id === scheduleId);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(schedule?.name ?? 'New Schedule');
  const [steps, setSteps] = useState<Step[]>(schedule?.steps ?? [createInitialStep()]);
  const [restEnabled, setRestEnabled] = useState(Boolean(schedule?.restBetweenSec));
  const [restBetweenSec, setRestBetweenSec] = useState<number>(schedule?.restBetweenSec ?? 0);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const allowLeaveRef = useRef(false);
  const hasCreatedRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    if (isNewSchedule) {
      initializedRef.current = true;
      return;
    }

    if (!schedule) {
      return;
    }

    setName(schedule.name);
    setSteps(schedule.steps);
    setRestBetweenSec(schedule.restBetweenSec ?? 0);
    setRestEnabled(Boolean(schedule.restBetweenSec));
    lastSavedSignatureRef.current = JSON.stringify({
      name: schedule.name,
      steps: schedule.steps,
      restBetweenSec: schedule.restBetweenSec ?? 0,
    });
    initializedRef.current = true;
  }, [isNewSchedule, schedule]);

  const totalDuration = useMemo(
    () => getTotalDuration({ steps, restBetweenSec: restEnabled ? restBetweenSec : 0 }),
    [restBetweenSec, restEnabled, steps],
  );
  const contentPaddingBottom = useMemo(() => 64 + insets.bottom + 220, [insets.bottom]);

  const buildDraftFromForm = useCallback((showValidationError: boolean): ScheduleDraft | null => {
    const sanitizedSteps = steps
      .map((step, index) => ({
        ...step,
        label: step.label.trim() || `Step ${index + 1}`,
        durationSec: clampDuration(step.durationSec),
        repeatCount: Math.max(1, step.repeatCount),
        color: step.color?.trim() || undefined,
      }))
      .filter((step) => step.durationSec >= 1);

    if (!sanitizedSteps.length) {
      if (showValidationError) {
        setError('Add at least one step with a duration.');
      }
      return null;
    }

    if (showValidationError) {
      setError(null);
    }

    return {
      name: name.trim() || 'Untitled',
      steps: sanitizedSteps,
      restBetweenSec: restEnabled ? clampDuration(restBetweenSec, 0) : 0,
    };
  }, [name, restBetweenSec, restEnabled, steps]);

  useEffect(() => {
    if (isNewSchedule || !initializedRef.current || !schedule) {
      return;
    }

    const draft = buildDraftFromForm(true);

    if (!draft) {
      return;
    }

    const draftSignature = JSON.stringify(draft);

    if (draftSignature === lastSavedSignatureRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      updateSchedule(scheduleId, draft);
      lastSavedSignatureRef.current = draftSignature;
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [buildDraftFromForm, isNewSchedule, schedule, scheduleId, updateSchedule]);

  const saveNewSchedule = useCallback((): boolean => {
    const draft = buildDraftFromForm(true);

    if (!draft) {
      return false;
    }

    const createdId = createSchedule(draft);

    if (!createdId) {
      setError('Unable to create workout. Please try again.');
      return false;
    }

    setError(null);
    hasCreatedRef.current = true;
    return true;
  }, [buildDraftFromForm, createSchedule]);

  const handleCreateWorkout = useCallback(() => {
    const saved = saveNewSchedule();

    if (!saved) {
      return;
    }

    allowLeaveRef.current = true;
    navigation.goBack();
  }, [navigation, saveNewSchedule]);

  const handleDeleteSchedule = useCallback(() => {
    Alert.alert(
      'Delete workout?',
      'This workout will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            allowLeaveRef.current = true;
            deleteSchedule(scheduleId);
            navigation.goBack();
          },
        },
      ],
    );
  }, [deleteSchedule, navigation, scheduleId]);

  const handlePreventRemove = useCallback((event: { data: { action: unknown } }) => {
    if (allowLeaveRef.current || hasCreatedRef.current) {
      navigation.dispatch(event.data.action as never);
      return;
    }

    Alert.alert(
      'Save new workout?',
      'Discard the change or save it as a new workout schedule.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowLeaveRef.current = true;
            navigation.dispatch(event.data.action as never);
          },
        },
        {
          text: 'Save',
          onPress: () => {
            const saved = saveNewSchedule();

            if (!saved) {
              return;
            }

            allowLeaveRef.current = true;
            navigation.dispatch(event.data.action as never);
          },
        },
      ],
    );
  }, [navigation, saveNewSchedule]);

  usePreventRemove(isNewSchedule, handlePreventRemove);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isNewSchedule
        ? undefined
        : () => (
          <Pressable onPress={handleDeleteSchedule} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        ),
      title: isNewSchedule ? 'Create Workout' : 'Edit Workout',
    });
  }, [handleDeleteSchedule, isNewSchedule, navigation]);

  const handleChangeStep = useCallback((index: number, updated: Step) => {
    setSteps((prev) => prev.map((step, idx) => (idx === index ? updated : step)));
  }, []);

  const moveStep = useCallback((from: number, to: number) => {
    setSteps((prev) => {
      if (to < 0 || to >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  }, []);

  const deleteStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        id: generateId('step'),
        label: `Step ${prev.length + 1}`,
        durationSec: 120,
        repeatCount: 2,
      },
    ]);
  }, []);

  if (!isNewSchedule && !schedule) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Schedule not found</Text>
        <PrimaryButton label="Back to list" onPress={() => navigation.goBack()} style={styles.backButton} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        <Text style={styles.label}>Workout name</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="My Workout"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryBadge}>{steps.length} exercises</Text>
          <Text style={styles.summaryBadge}>{formatSeconds(totalDuration)}</Text>
        </View>

        <View style={styles.restRow}>
          <Pressable onPress={() => setRestEnabled((prev) => !prev)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, restEnabled && styles.checkboxChecked]}>
              {restEnabled ? <MaterialIcons name="check" size={16} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxLabel} numberOfLines={1} ellipsizeMode="tail">
              Rest between sets (secs)
            </Text>
          </Pressable>
          {restEnabled ? (
            <DurationInput
              value={restBetweenSec}
              min={1}
              max={600}
              onChange={setRestBetweenSec}
              style={styles.restInput}
            />
          ) : null}
        </View>


        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {steps.map((step, index) => (
          <StepRow
            key={step.id}
            step={step}
            index={index}
            total={steps.length}
            onChange={handleChangeStep}
            onMoveUp={(idx) => moveStep(idx, idx - 1)}
            onMoveDown={(idx) => moveStep(idx, idx + 1)}
            onDelete={deleteStep}
          />
        ))}

        <PrimaryButton label="Add Step" onPress={addStep} style={styles.addButton} />
        {isNewSchedule ? (
          <PrimaryButton label="Create New Workout" onPress={handleCreateWorkout} style={styles.createButton} />
        ) : null}
        <View style={styles.footerSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  label: {
    fontSize: 17,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 21,
    fontFamily: 'BebasNeue_400Regular',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryBadge: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#b91c1c',
    marginBottom: 12,
  },
  addButton: {
    marginVertical: 6,
  },
  createButton: {
    marginVertical: 6,
  },
  restRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginVertical: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: 'rgba(15, 23, 42, 0.93)',
    borderColor: 'rgba(15, 23, 42, 0.93)',
  },
  checkboxLabel: {
    fontSize: 17,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginRight: 8,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
  },
  restInput: {
    marginLeft: 15,
    width: 100,
    flexShrink: 0,
  },
  footerSpace: {
    height: 32,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#fff',
  },
  backButton: {
    marginTop: 12,
  },
});

export default ScheduleEditorScreen;
