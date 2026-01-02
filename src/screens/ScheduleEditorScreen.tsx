import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import StepRow from '../components/StepRow';
import DurationInput from '../components/DurationInput';
import { generateId } from '../lib/ids';
import { clampDuration, formatSeconds, getTotalDuration } from '../lib/time';
import { useSchedules } from '../store/schedules';
import { RootStackParamList } from '../types/navigation';
import { Step } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleEditor'>;

const ScheduleEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId } = route.params;
  const { schedules, updateSchedule } = useSchedules();
  const schedule = schedules.find((item) => item.id === scheduleId);

  const [name, setName] = useState(schedule?.name ?? '');
  const [steps, setSteps] = useState<Step[]>(schedule?.steps ?? []);
  const [restEnabled, setRestEnabled] = useState(Boolean(schedule?.restBetweenSec));
  const [restBetweenSec, setRestBetweenSec] = useState<number>(schedule?.restBetweenSec ?? 0);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (schedule && !initializedRef.current) {
      setName(schedule.name);
      setSteps(schedule.steps);
      setRestBetweenSec(schedule.restBetweenSec ?? 0);
      setRestEnabled(Boolean(schedule.restBetweenSec));
      initializedRef.current = true;
    }
  }, [schedule]);

  const totalDuration = useMemo(
    () => getTotalDuration({ steps, restBetweenSec: restEnabled ? restBetweenSec : 0 }),
    [restBetweenSec, restEnabled, steps],
  );

  const handleSave = useCallback(() => {
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
      setError('Add at least one step with a duration.');
      return;
    }

    setError(null);

    const nextName = name.trim() || 'Untitled';
    updateSchedule(scheduleId, {
      name: nextName,
      steps: sanitizedSteps,
      restBetweenSec: restEnabled ? clampDuration(restBetweenSec, 0) : 0,
    });
    navigation.goBack();
  }, [name, navigation, restBetweenSec, restEnabled, scheduleId, steps, updateSchedule]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      ),
      title: 'Edit Schedule',
    });
  }, [handleSave, navigation]);

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

  if (!schedule) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Schedule not found</Text>
        <PrimaryButton label="Back to list" onPress={() => navigation.goBack()} style={styles.backButton} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Schedule name</Text>
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
              {restEnabled ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel} numberOfLines={1} ellipsizeMode="tail">
              Add breaks in between
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
        <View style={styles.footerSpace} />
      </ScrollView>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
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
    fontWeight: '600',
    color: '#0f172a',
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 12,
    fontWeight: '600',
  },
  addButton: {
    marginTop: 4,
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
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  checkboxMark: {
    color: '#fff',
    fontWeight: '800',
  },
  checkboxLabel: {
    fontWeight: '600',
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
  saveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  backButton: {
    marginTop: 12,
  },
});

export default ScheduleEditorScreen;

