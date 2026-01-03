import React, { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

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

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  const adjust = (delta: number) => {
    const next = clampDuration(value + delta, min, max);
    setTextValue(String(next));
    onChange(next);
  };

  const handleChange = (text: string) => {
    setTextValue(text);
    if (text.trim() === '') {
      return;
    }
    const parsed = parseInt(text, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    onChange(clampDuration(parsed, min, max));
  };

  const handleBlur = () => {
    if (textValue.trim() === '') {
      const fallback = clampDuration(min, min, max);
      setTextValue(String(fallback));
      onChange(fallback);
      return;
    }
    const parsed = parseInt(textValue, 10);
    const next = clampDuration(Number.isNaN(parsed) ? min : parsed, min, max);
    setTextValue(String(next));
    onChange(next);
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
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={textValue}
          onChangeText={handleChange}
          onBlur={handleBlur}
        />
        <Pressable style={styles.stepper} onPress={() => adjust(1)}>
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>
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
});

export default DurationInput;

