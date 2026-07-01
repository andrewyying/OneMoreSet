import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StartCountdownSeconds } from '../lib/preferences';
import { usePreferences } from '../store/preferences';

const COUNTDOWN_OPTIONS: { label: string; value: StartCountdownSeconds }[] = [
  { label: 'Off', value: 0 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
];

const PreferenceSettingsScreen: React.FC = () => {
  const { preferences, status, updatePreferences } = usePreferences();
  const [isSaving, setIsSaving] = useState(false);
  const isLoading = status === 'loading';
  const isBusy = isLoading || isSaving;

  const handleSelectCountdown = useCallback(
    async (value: StartCountdownSeconds) => {
      if (isBusy || preferences.startCountdownSeconds === value) {
        return;
      }

      setIsSaving(true);
      try {
        await updatePreferences({ startCountdownSeconds: value });
      } catch (error) {
        console.warn('Failed to update preferences', error);
        Alert.alert('Unable to Update Preference', 'Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [isBusy, preferences.startCountdownSeconds, updatePreferences],
  );

  const handleToggleHideCalendar = useCallback(
    async (value: boolean) => {
      if (isBusy || preferences.hideCalendarTab === value) {
        return;
      }

      setIsSaving(true);
      try {
        await updatePreferences({ hideCalendarTab: value });
      } catch (error) {
        console.warn('Failed to update preferences', error);
        Alert.alert('Unable to Update Preference', 'Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [isBusy, preferences.hideCalendarTab, updatePreferences],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Start countdown</Text>
            </View>
            <View style={styles.segmentedControl}>
              {COUNTDOWN_OPTIONS.map((option, index) => {
                const isSelected = preferences.startCountdownSeconds === option.value;
                const isLast = index === COUNTDOWN_OPTIONS.length - 1;

                return (
                  <React.Fragment key={option.value}>
                    <Pressable
                      onPress={() => handleSelectCountdown(option.value)}
                      disabled={isBusy}
                      style={({ pressed }) => [
                        styles.segment,
                        isSelected ? styles.segmentSelected : undefined,
                        pressed ? styles.segmentPressed : undefined,
                      ]}
                    >
                      <Text style={[styles.segmentLabel, isSelected ? styles.segmentLabelSelected : undefined]}>
                        {option.label}
                      </Text>
                    </Pressable>
                    {!isLast ? <View style={styles.segmentDivider} /> : null}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Hide calendar page</Text>
              <Text style={styles.rowSubtitle}>Remove the calendar tab from the bottom bar.</Text>
            </View>
            <Switch
              value={preferences.hideCalendarTab}
              onValueChange={handleToggleHideCalendar}
              disabled={isBusy}
              trackColor={{ false: '#cbd5e1', true: '#0f172a' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#cbd5e1"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingVertical: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 19,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748b',
  },
  separator: {
    height: 1,
    marginHorizontal: 14,
    backgroundColor: '#e2e8f0',
  },
  segmentedControl: {
    minWidth: 144,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: '#0f172a',
  },
  segmentPressed: {
    opacity: 0.7,
  },
  segmentDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#cbd5e1',
  },
  segmentLabel: {
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#334155',
  },
  segmentLabelSelected: {
    color: '#f8fafc',
  },
});

export default PreferenceSettingsScreen;
