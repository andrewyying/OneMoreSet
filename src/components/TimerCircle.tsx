import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatSeconds } from '../lib/time';

type TimerCircleProps = {
  radius: number;
  strokeWidth: number;
  circumference: number;
  strokeDashoffset: number;
  remainingSec: number;
  timerFontSize: number;
  stepType?: 'exercise' | 'rest';
};

const TimerCircle: React.FC<TimerCircleProps> = React.memo(
  ({ radius, strokeWidth, circumference, strokeDashoffset, remainingSec, timerFontSize, stepType }) => {
    return (
      <View style={styles.circleWrapper}>
        <Svg width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2}>
          <Circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#0ea5e9"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            originX={radius + strokeWidth}
            originY={radius + strokeWidth}
          />
        </Svg>
        <View style={styles.circleCenter}>
          <Text style={[styles.timerText, { fontSize: timerFontSize }]}>{formatSeconds(remainingSec)}</Text>
          {stepType ? <Text style={styles.typeBadge}>{stepType.toUpperCase()}</Text> : null}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '800',
    color: '#0f172a',
  },
  typeBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default TimerCircle;
