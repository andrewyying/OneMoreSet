import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

type SubmitValues = {
  name: string;
  hours: number;
  minutes: number;
};

type Props = {
  visible: boolean;
  mode: 'add' | 'edit';
  dayLabel: string;
  initialName?: string;
  initialTimestamp?: number;
  onCancel: () => void;
  onSubmit: (values: SubmitValues) => void;
  onDelete?: () => void;
};

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1); // 1..12
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index); // 0..59
const PERIODS = ['AM', 'PM'] as const;

type Period = (typeof PERIODS)[number];

const toClockParts = (timestamp: number) => {
  const date = new Date(timestamp);
  const hours24 = date.getHours();
  const period: Period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour: hour12, minute: date.getMinutes(), period };
};

const to24Hour = (hour12: number, period: Period) => {
  if (period === 'AM') {
    return hour12 % 12;
  }
  return (hour12 % 12) + 12;
};

const ManualWorkoutSheet: React.FC<Props> = ({
  visible,
  mode,
  dayLabel,
  initialName,
  initialTimestamp,
  onCancel,
  onSubmit,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<Period>('AM');

  // Reset the form whenever the sheet is (re)opened.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(initialName ?? '');
    const base = typeof initialTimestamp === 'number' ? initialTimestamp : Date.now();
    const parts = toClockParts(base);
    setHour(parts.hour);
    setMinute(parts.minute);
    setPeriod(parts.period);
  }, [initialName, initialTimestamp, visible]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({ name: name.trim(), hours: to24Hour(hour, period), minutes: minute });
  };

  const title = useMemo(() => (mode === 'add' ? 'Log workout' : 'Edit workout'), [mode]);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.daySubtitle}>{dayLabel}</Text>
            </View>
            <Pressable onPress={handleSubmit} hitSlop={8} disabled={!canSubmit}>
              <Text style={[styles.confirm, !canSubmit && styles.confirmDisabled]}>Save</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Workout name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Morning Run"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
          />

          <Text style={styles.fieldLabel}>Finished at</Text>
          {visible ? (
            <View style={styles.timeRow}>
              <Picker
                style={styles.timePicker}
                selectedValue={hour}
                onValueChange={(val) => setHour(Number(val))}
              >
                {HOUR_OPTIONS.map((opt) => (
                  <Picker.Item key={opt} label={String(opt)} value={opt} />
                ))}
              </Picker>
              <Text style={styles.timeColon}>:</Text>
              <Picker
                style={styles.timePicker}
                selectedValue={minute}
                onValueChange={(val) => setMinute(Number(val))}
              >
                {MINUTE_OPTIONS.map((opt) => (
                  <Picker.Item key={opt} label={opt.toString().padStart(2, '0')} value={opt} />
                ))}
              </Picker>
              <Picker
                style={styles.timePicker}
                selectedValue={period}
                onValueChange={(val) => setPeriod(val as Period)}
              >
                {PERIODS.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
              </Picker>
            </View>
          ) : null}

          {mode === 'edit' && onDelete ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}
            >
              <Text style={styles.deleteText}>Delete workout</Text>
            </Pressable>
          ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerTitleGroup: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  daySubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748b',
  },
  cancel: {
    fontSize: 19,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
  confirm: {
    fontSize: 19,
    fontFamily: 'BebasNeue_400Regular',
    color: 'rgba(15, 23, 42, 0.93)',
  },
  confirmDisabled: {
    color: '#cbd5e1',
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 21,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePicker: {
    flex: 1,
  },
  timeColon: {
    fontSize: 24,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginHorizontal: 4,
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  deletePressed: {
    opacity: 0.7,
  },
  deleteText: {
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#b91c1c',
  },
});

export default ManualWorkoutSheet;
