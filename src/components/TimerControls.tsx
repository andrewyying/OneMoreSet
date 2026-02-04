import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import PrimaryButton from './PrimaryButton';

type TimerControlsProps = {
  isNarrow: boolean;
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

    return (
      <>
        <View style={[styles.controlsRow, isNarrow && styles.controlsRowNarrow]}>
          <PrimaryButton
            label="Prev"
            variant="secondary"
            onPress={onPrev}
            disabled={disablePrev}
            style={[styles.controlButton, controlSpacingStyle]}
          />
          <PrimaryButton
            label={primaryLabel}
            onPress={onPrimary}
            disabled={disablePrimary}
            style={[styles.primaryControl, controlSpacingStyle]}
          />
          <PrimaryButton
            label="Next"
            variant="secondary"
            onPress={onNext}
            disabled={disableNext}
            style={styles.controlButton}
          />
        </View>

        <View style={styles.secondaryRow}>
          <PrimaryButton label="Restart" variant="ghost" onPress={onRestart} style={styles.secondaryButton} />
          <PrimaryButton label="End" variant="ghost" onPress={onEnd} style={styles.secondaryButton} />
        </View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 8,
    marginVertical: 20,
  },
  controlsRowNarrow: {
    flexDirection: 'column',
  },
  controlButton: {
    flex: 1,
    minHeight: 52,
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
    paddingHorizontal: 24,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    marginHorizontal: 6,
  },
});

export default TimerControls;
