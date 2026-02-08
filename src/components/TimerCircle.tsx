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
};

const TimerCircle: React.FC<TimerCircleProps> = React.memo(
  ({ radius, strokeWidth, circumference, strokeDashoffset, remainingSec, timerFontSize }) => {
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
            stroke="#0f172a"
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
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginBottom: 48,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 72,
    fontFamily: 'BebasNeue_400Regular',
    fontWeight: '700',
    color: '#0f172a',
  },
});

export default TimerCircle;



