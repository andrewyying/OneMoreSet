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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [textValue, setTextValue] = useState(String(value));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(value);

  useEffect(() => {
    setTextValue(String(value));
    setPickerValue(value);
  }, [value]);

  // Only build the (potentially thousands of) picker options while the sheet is
  // open. Building them on every render — even when closed — is what made the
  // form scroll and the modal feel laggy.
  const options = useMemo(() => {
    if (!pickerVisible) {
      return [];
    }
    const list: number[] = [];
    for (let v = min; v <= max; v += 1) {
      list.push(v);
    }
    return list;
  }, [max, min, pickerVisible]);

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

      <Modal transparent animationType="slide" visible={pickerVisible} onRequestClose={closePicker}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePicker}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={closePicker} hitSlop={8}>
                <Text style={styles.sheetCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{label ?? 'Select'}</Text>
              <Pressable onPress={confirmPicker} hitSlop={8}>
                <Text style={styles.sheetConfirm}>Set</Text>
              </Pressable>
            </View>
            {pickerVisible ? (
              <Picker selectedValue={pickerValue} onValueChange={(val) => setPickerValue(Number(val))}>
                {options.map((opt) => (
                  <Picker.Item key={opt} label={String(opt)} value={opt} />
                ))}
              </Picker>
            ) : null}
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
    marginRight: 8,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    flexShrink: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 182,
    marginLeft: 'auto',
  },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 22,
    fontFamily: 'BebasNeue_400Regular',
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
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    textAlign: 'center',
  },
  valueBox: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  modalOverlay: {
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  sheetCancel: {
    fontSize: 19,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
  sheetConfirm: {
    fontSize: 19,
    fontFamily: 'BebasNeue_400Regular',
    color: 'rgba(15, 23, 42, 0.93)',
  },
});

export default DurationInput;
