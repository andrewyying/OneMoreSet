import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<ButtonVariant, { backgroundColor: string; textColor: string }> = {
  primary: { backgroundColor: '#111827', textColor: '#ffffff' },
  secondary: { backgroundColor: '#e5e7eb', textColor: '#111827' },
  ghost: { backgroundColor: 'transparent', textColor: '#111827' },
  danger: { backgroundColor: '#b91c1c', textColor: '#ffffff' },
};

const PrimaryButton: React.FC<Props> = ({ label, onPress, variant = 'primary', disabled, style }) => {
  const colors = variantStyles[variant];
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: isGhost ? '#d1d5db' : colors.backgroundColor,
        },
        isGhost && styles.ghostBorder,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.textColor },
          disabled && styles.disabledText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
  },
  ghostBorder: {
    borderColor: '#d1d5db',
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#9ca3af',
  },
});

export default PrimaryButton;

