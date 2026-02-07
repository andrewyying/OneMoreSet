import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type TimerControlsProps = {
  isNarrow: boolean;
  showPausedActions: boolean;
  primaryLabel: string;
  disablePrev: boolean;
  disablePrimary: boolean;
  disableNext: boolean;
  onPrev: () => void;
  onPrimary: () => void;
  onNext: () => void;
  onRestart: () => void;
  onEnd: () => void;
};

const TimerControls: React.FC<TimerControlsProps> = React.memo(
  ({
    isNarrow,
    showPausedActions,
    primaryLabel,
    disablePrev,
    disablePrimary,
    disableNext,
    onPrev,
    onPrimary,
    onNext,
    onRestart,
    onEnd,
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
      <>
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
            <MaterialIcons name="skip-previous" size={26} color={disablePrev ? '#9ca3af' : '#111827'} />
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
            <MaterialIcons name="skip-next" size={26} color={disableNext ? '#9ca3af' : '#111827'} />
          </TouchableOpacity>
        </View>

        {showPausedActions ? (
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Restart workout"
              activeOpacity={0.8}
              onPress={onRestart}
              style={[
                styles.iconButtonBase, 
                styles.secondaryControl,
                styles.controlButton, 
                styles.secondaryIconButton
              ]}
            >
              <MaterialIcons name="replay" size={24} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="End workout"
              activeOpacity={0.8}
              onPress={onEnd}
              style={[
                styles.iconButtonBase, 
                styles.secondaryControl,
                styles.controlButton,
                styles.endIconButton
              ]}
            >
              <MaterialIcons name="stop" size={24} color="#b91c1c" />
            </TouchableOpacity>
          </View>
        ) : null}
      </>
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
    backgroundColor: '#111827',
    borderColor: '#111827',
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
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    width: '70%',
    alignSelf: 'center',
    gap: 12,
  },
  secondaryIconButton: {
    minHeight: 48,
    minWidth: 64,
    backgroundColor: 'transparent',
    borderColor: '#d1d5db',
  },
  endIconButton: {
    minHeight: 48,
    minWidth: 64,
    backgroundColor: 'transparent',
    borderColor: '#fecaca',
  },
});

export default TimerControls;
