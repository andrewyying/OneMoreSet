import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';

import AppNavigator from './src/navigation/AppNavigator';
import { CompletionProvider, useCompletions } from './src/store/completions';
import { ScheduleProvider, useSchedules } from './src/store/schedules';

const AppStateGate: React.FC = () => {
  const { status: scheduleStatus, error: scheduleError } = useSchedules();
  const { status: completionStatus, error: completionError } = useCompletions();
  const hasError = scheduleStatus === 'error' || completionStatus === 'error';
  const errorMessage = [scheduleError, completionError].filter(Boolean).join('\n');

  if (scheduleStatus === 'loading' || completionStatus === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>Loading your data...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>OneMoreSet</Text>
        <Text style={[styles.subtitle, styles.errorText]}>Unable to load app data.</Text>
        {errorMessage ? <Text style={styles.detailText}>{errorMessage}</Text> : null}
      </View>
    );
  }

  return <AppNavigator />;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.subtitle}>Loading fonts...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ScheduleProvider>
      <CompletionProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AppStateGate />
        </SafeAreaProvider>
      </CompletionProvider>
    </ScheduleProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#111',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#444',
  },
  detailText: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#555',
    textAlign: 'center',
  },
  errorText: {
    color: '#b00020',
  },
});



