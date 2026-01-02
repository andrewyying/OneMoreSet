import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Step, StepType } from '../types/models';
import DurationInput from './DurationInput';

type Props = {
  step: Step;
  index: number;
  total: number;
  onChange: (index: number, updated: Step) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
};

const typeOptions: { value: StepType; label: string }[] = [
  { value: 'exercise', label: 'Exercise' },
  { value: 'rest', label: 'Rest' },
  { value: 'other', label: 'Other' },
];

const StepRow: React.FC<Props> = ({
  step,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  const setField = <K extends keyof Step>(field: K, value: Step[K]) => {
    onChange(index, { ...step, [field]: value });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Step {index + 1}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => onMoveUp(index)}
            disabled={index === 0}
            style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
          >
            <Text style={styles.iconText}>↑</Text>
          </Pressable>
          <Pressable
            onPress={() => onMoveDown(index)}
            disabled={index === total - 1}
            style={[styles.iconButton, index === total - 1 && styles.iconButtonDisabled]}
          >
            <Text style={styles.iconText}>↓</Text>
          </Pressable>
          <Pressable onPress={() => onDuplicate(index)} style={styles.linkButton}>
            <Text style={styles.linkText}>Duplicate</Text>
          </Pressable>
          <Pressable onPress={() => onDelete(index)} style={styles.linkButton}>
            <Text style={[styles.linkText, styles.dangerText]}>Delete</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Label"
        value={step.label}
        onChangeText={(text) => setField('label', text)}
      />

      <View style={styles.typeRow}>
        {typeOptions.map((option) => {
          const isActive = option.value === step.type;
          return (
            <Pressable
              key={option.value}
              onPress={() => setField('type', option.value)}
              style={[styles.typePill, isActive && styles.typePillActive]}
            >
              <Text style={[styles.typeText, isActive && styles.typeTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <DurationInput
        label="Duration"
        value={step.durationSec}
        onChange={(value) => setField('durationSec', value)}
        style={styles.duration}
      />

      <TextInput
        style={styles.input}
        placeholder="Color (optional, e.g. #FF6B6B)"
        autoCapitalize="none"
        value={step.color ?? ''}
        onChangeText={(text) => setField('color', text)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  linkButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  linkText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  dangerText: {
    color: '#b91c1c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  typePillActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  typeText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#ffffff',
  },
  duration: {
    marginBottom: 10,
  },
});

export default StepRow;

