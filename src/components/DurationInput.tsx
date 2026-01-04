import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { clampDuration } from '../lib/time';

type Props = {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  style?: StyleProp<ViewStyle>;
};

const DurationInput: React.FC<Props> = ({
  label,
  value,
  min = 1,
  max = 3600,
  onChange,
  style,
}) => {
  const [textValue, setTextValue] = useState(String(value));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(value);

  useEffect(() => {
    setTextValue(String(value));
    setPickerValue(value);
  }, [value]);

  const options = useMemo(() => {
    const list: number[] = [];
    for (let v = min; v <= max; v += 1) {
      list.push(v);
    }
    return list;
  }, [max, min]);

  const adjust = (delta: number) => {
    const next = clampDuration(value + delta, min, max);
    setTextValue(String(next));
    onChange(next);
  };

  const openPicker = () => {
    setPickerValue(value);
    setPickerVisible(true);
  };

  const closePicker = () => setPickerVisible(false);

  const confirmPicker = () => {
    const next = clampDuration(pickerValue, min, max);
    setTextValue(String(next));
    onChange(next);
    setPickerVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      ) : null}
      <View style={styles.controls}>
        <Pressable style={styles.stepper} onPress={() => adjust(-1)}>
          <Text style={styles.stepperText}>-</Text>
        </Pressable>
        <Pressable style={styles.valueBox} onPress={openPicker}>
          <Text style={styles.valueText}>{textValue}</Text>
        </Pressable>
        <Pressable style={styles.stepper} onPress={() => adjust(1)}>
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>

      <Modal transparent animationType="fade" visible={pickerVisible} onRequestClose={closePicker}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePicker}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={closePicker} hitSlop={8}>
                <Text style={styles.sheetAction}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>Select</Text>
              <Pressable onPress={confirmPicker} hitSlop={8}>
                <Text style={styles.sheetAction}>Set</Text>
              </Pressable>
            </View>
            <Picker selectedValue={pickerValue} onValueChange={(val) => setPickerValue(Number(val))}>
              {options.map((opt) => (
                <Picker.Item key={opt} label={String(opt)} value={opt} />
              ))}
            </Picker>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
    marginRight: 8,
    color: '#0f172a',
    flexShrink: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 170,
    marginLeft: 'auto',
  },
  stepper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    color: '#0f172a',
    textAlign: 'center',
  },
  valueBox: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetAction: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0ea5e9',
  },
});

export default DurationInput;

