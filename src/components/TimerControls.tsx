import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type TimerControlsProps = {
  isNarrow: boolean;
  primaryLabel: string;
  disablePrev: boolean;
  disablePrimary: boolean;
  disableNext: boolean;
  onPrev: () => void;
  onPrimary: () => void;
  onNext: () => void;
};

const TimerControls: React.FC<TimerControlsProps> = React.memo(
  ({
    isNarrow,
    primaryLabel,
    disablePrev,
    disablePrimary,
    disableNext,
    onPrev,
    onPrimary,
    onNext,
  }) => {
    const controlSpacingStyle = useMemo(
      () => (isNarrow ? styles.controlSpacingVertical : styles.controlSpacing),
      [isNarrow],
    );
    const primaryIconName = useMemo<React.ComponentProps<typeof MaterialIcons>['name']>(
      () => (primaryLabel === 'Pause' ? 'pause' : 'play-arrow'),
      [primaryLabel],
    );

    return (
      <View style={[styles.controlsRow, isNarrow && styles.controlsRowNarrow]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          activeOpacity={0.8}
          onPress={onPrev}
          disabled={disablePrev}
          style={[
            styles.iconButtonBase,
            styles.secondaryControl,
            styles.controlButton,
            controlSpacingStyle,
            disablePrev && styles.disabledControl,
          ]}
        >
          <MaterialIcons name="skip-previous" size={26} color={disablePrev ? '#9ca3af' : '#0f172a'} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          activeOpacity={0.8}
          onPress={onPrimary}
          disabled={disablePrimary}
          style={[
            styles.iconButtonBase,
            styles.primaryControlButton,
            styles.primaryControl,
            controlSpacingStyle,
            disablePrimary && styles.disabledControl,
          ]}
        >
          <MaterialIcons name={primaryIconName} size={30} color={disablePrimary ? '#9ca3af' : '#ffffff'} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Next step"
          activeOpacity={0.8}
          onPress={onNext}
          disabled={disableNext}
          style={[
            styles.iconButtonBase,
            styles.secondaryControl,
            styles.controlButton,
            disableNext && styles.disabledControl,
          ]}
        >
          <MaterialIcons name="skip-next" size={26} color={disableNext ? '#9ca3af' : '#0f172a'} />
        </TouchableOpacity>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 8,
    marginTop: 50,
  },
  controlsRowNarrow: {
    flexDirection: 'column',
  },
  controlButton: {
    flex: 1,
    minHeight: 52,
  },
  iconButtonBase: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryControl: {
    backgroundColor: '#e5e7eb',
    borderColor: '#e5e7eb',
  },
  primaryControlButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.93)',
    borderColor: 'rgba(15, 23, 42, 0.93)',
  },
  disabledControl: {
    opacity: 0.6,
  },
  controlSpacing: {
    marginRight: 12,
  },
  controlSpacingVertical: {
    marginBottom: 12,
    marginRight: 0,
  },
  primaryControl: {
    flex: 1.4,
    minHeight: 60,
  },
});

export default TimerControls;
