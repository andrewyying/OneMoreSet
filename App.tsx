import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { ScheduleProvider, useSchedules } from './src/store/schedules';

const AppStateGate: React.FC = () => {
  const { status, error } = useSchedules();

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>Loading schedules...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>OneMoreSet</Text>
        <Text style={[styles.subtitle, styles.errorText]}>Unable to load schedules.</Text>
        {error ? <Text style={styles.detailText}>{error}</Text> : null}
      </View>
    );
  }

  return <AppNavigator />;
};

export default function App() {
  return (
    <ScheduleProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppStateGate />
      </SafeAreaProvider>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#444',
  },
  detailText: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  errorText: {
    color: '#b00020',
  },
});
