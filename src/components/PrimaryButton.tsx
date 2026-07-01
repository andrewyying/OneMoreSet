import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<ButtonVariant, { backgroundColor: string; textColor: string }> = {
  primary: { backgroundColor: 'rgba(15, 23, 42, 0.93)', textColor: '#ffffff' },
  secondary: { backgroundColor: '#e5e7eb', textColor: '#111827' },
  ghost: { backgroundColor: 'transparent', textColor: '#111827' },
  danger: { backgroundColor: '#b91c1c', textColor: '#ffffff' },
};

const PrimaryButton: React.FC<Props> = ({ label, onPress, variant = 'primary', disabled, style }) => {
  const colors = variantStyles[variant];
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: isGhost ? '#d1d5db' : colors.backgroundColor,
        },
        isGhost && styles.ghostBorder,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
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
    </Pressable>
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
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
  },
  ghostBorder: {
    borderColor: '#d1d5db',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#9ca3af',
  },
});

export default PrimaryButton;




