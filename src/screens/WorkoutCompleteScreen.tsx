import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, InteractionManager, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutComplete'>;

const DONE_BUTTON_DELAY_MS = 700;

const WorkoutCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { streakDays, celebrationMessage } = route.params;
  const [showDoneButton, setShowDoneButton] = useState(false);
  const finishContentOpacity = useRef(new Animated.Value(0)).current;
  const finishContentTranslateY = useRef(new Animated.Value(16)).current;
  const doneButtonOpacity = useRef(new Animated.Value(0)).current;
  const doneButtonTranslateY = useRef(new Animated.Value(12)).current;
  const finishBadgeScale = useRef(new Animated.Value(0.88)).current;
  const finishHaloScale = useRef(new Animated.Value(0.8)).current;
  const finishHaloOpacity = useRef(new Animated.Value(0)).current;
  const doneButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDone = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Calendar' } }],
    });
  }, [navigation]);

  useEffect(() => {
    const clearDoneButtonTimeout = () => {
      if (doneButtonTimeoutRef.current) {
        clearTimeout(doneButtonTimeoutRef.current);
        doneButtonTimeoutRef.current = null;
      }
    };

    setShowDoneButton(false);
    finishContentOpacity.setValue(0);
    finishContentTranslateY.setValue(16);
    doneButtonOpacity.setValue(0);
    doneButtonTranslateY.setValue(12);
    finishBadgeScale.setValue(0.88);
    finishHaloScale.setValue(0.8);
    finishHaloOpacity.setValue(0);

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(finishContentOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(finishContentTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(finishBadgeScale, {
          toValue: 1,
          speed: 16,
          bounciness: 8,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(finishHaloOpacity, {
            toValue: 0.35,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(finishHaloScale, {
              toValue: 1.75,
              duration: 700,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(finishHaloOpacity, {
              toValue: 0,
              duration: 700,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ], { stopTogether: false }).start();

      doneButtonTimeoutRef.current = setTimeout(() => {
        setShowDoneButton(true);
        Animated.parallel([
          Animated.timing(doneButtonOpacity, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(doneButtonTranslateY, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, DONE_BUTTON_DELAY_MS);
    });

    return () => {
      clearDoneButtonTimeout();
      interactionTask.cancel();
    };
  }, [
    doneButtonOpacity,
    doneButtonTranslateY,
    finishBadgeScale,
    finishContentOpacity,
    finishContentTranslateY,
    finishHaloOpacity,
    finishHaloScale,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: finishHaloOpacity,
              transform: [{ scale: finishHaloScale }],
            },
          ]}
        />
        <Animated.View style={[styles.badge, { transform: [{ scale: finishBadgeScale }] }]}>
          <MaterialIcons name="check" size={46} color="#0f172a" />
        </Animated.View>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: finishContentOpacity,
              transform: [{ translateY: finishContentTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>{celebrationMessage}</Text>
          <Text style={styles.streakLabel}>Current streak</Text>
          <Text style={styles.streakValue}>
            {streakDays} day{streakDays === 1 ? '' : 's'}
          </Text>
        </Animated.View>
      </View>

      {showDoneButton ? (
        <Animated.View
          style={{
            opacity: doneButtonOpacity,
            transform: [{ translateY: doneButtonTranslateY }],
          }}
        >
          <PrimaryButton label="Done" variant="secondary" onPress={handleDone} style={styles.doneButton} />
        </Animated.View>
      ) : (
        <View style={styles.doneButtonPlaceholder} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.93)',
    padding: 24,
    paddingBottom: 32,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#67e8f9',
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    marginTop: 24,
  },
  title: {
    fontSize: 43,
    fontFamily: 'BebasNeue_400Regular',
    color: '#fff',
    textAlign: 'center',
  },
  streakLabel: {
    marginTop: 18,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#94a3b8',
  },
  streakValue: {
    marginTop: 6,
    fontSize: 40,
    fontFamily: 'BebasNeue_400Regular',
    color: '#f8fafc',
  },
  doneButton: {
    minHeight: 56,
  },
  doneButtonPlaceholder: {
    minHeight: 56,
  },
});

export default WorkoutCompleteScreen;



