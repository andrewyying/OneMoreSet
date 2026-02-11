import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettings,
  ReminderWeekday,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../lib/notificationSettings';
import {
  cancelDailyReminderNotifications,
  ensureNotificationPermission,
  scheduleDailyReminderNotification,
} from '../lib/notifications';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationSettings'>;

const WEEKDAY_OPTIONS: { value: ReminderWeekday; label: string }[] = [
  { value: 2, label: 'Mon' },
  { value: 3, label: 'Tue' },
  { value: 4, label: 'Wed' },
  { value: 5, label: 'Thu' },
  { value: 6, label: 'Fri' },
  { value: 7, label: 'Sat' },
  { value: 1, label: 'Sun' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);

function formatReminderTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatHourOption(hour: number): string {
  const isPm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${isPm ? 'PM' : 'AM'}`;
}

const NotificationSettingsScreen: React.FC<Props> = () => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(DEFAULT_NOTIFICATION_SETTINGS.reminderHour);
  const [pickerMinute, setPickerMinute] = useState(DEFAULT_NOTIFICATION_SETTINGS.reminderMinute);
  const isMutatingRef = useRef(false);
  const settingsRef = useRef<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  const syncSettings = useCallback((nextSettings: NotificationSettings) => {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    let active = true;

    loadNotificationSettings()
      .then((storedSettings) => {
        if (active) {
          syncSettings(storedSettings);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [syncSettings]);

  const reminderTimeLabel = useMemo(
    () => formatReminderTime(settings.reminderHour, settings.reminderMinute),
    [settings.reminderHour, settings.reminderMinute],
  );
  const reminderOptionsDisabled =
    isLoading || !settings.notificationsEnabled || !settings.dailyReminderEnabled;

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {
      Alert.alert('Unable to Open Settings', 'Please open your system settings manually.');
    });
  }, []);

  const applySettingsOptimistically = useCallback(
    async (nextSettings: NotificationSettings) => {
      const previousSettings = settingsRef.current;
      isMutatingRef.current = true;
      syncSettings(nextSettings);

      if (nextSettings.notificationsEnabled && nextSettings.dailyReminderEnabled) {
        await scheduleDailyReminderNotification({
          weekdays: nextSettings.reminderWeekdays,
          hour: nextSettings.reminderHour,
          minute: nextSettings.reminderMinute,
        }).catch((error) => {
          syncSettings(previousSettings);
          throw error;
        });
      } else {
        await cancelDailyReminderNotifications().catch((error) => {
          syncSettings(previousSettings);
          throw error;
        });
      }

      await saveNotificationSettings(nextSettings).catch((error) => {
        syncSettings(previousSettings);
        throw error;
      });

      isMutatingRef.current = false;
    },
    [syncSettings],
  );

  const promptForSystemSettings = useCallback(() => {
    Alert.alert(
      'Permission Required',
      'Enable notifications in your system settings to receive daily reminders.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: openSystemSettings },
      ],
    );
  }, [openSystemSettings]);

  const handleNotificationsToggle = useCallback(
    async (enabled: boolean) => {
      if (isLoading || isMutatingRef.current) {
        return;
      }

      try {
        const currentSettings = settingsRef.current;

        if (!enabled) {
          await applySettingsOptimistically({
            ...currentSettings,
            notificationsEnabled: false,
            dailyReminderEnabled: false,
          });
          return;
        }

        const hasPermission = await ensureNotificationPermission();
        if (!hasPermission) {
          promptForSystemSettings();
          return;
        }

        const nextSettings: NotificationSettings = {
          ...currentSettings,
          notificationsEnabled: true,
        };

        await applySettingsOptimistically(nextSettings);
      } catch (error) {
        console.warn('Failed to update notification settings', error);
        Alert.alert('Unable to Update Settings', 'Please try again.');
      } finally {
        isMutatingRef.current = false;
      }
    },
    [applySettingsOptimistically, isLoading, promptForSystemSettings],
  );

  const handleDailyReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (isLoading || isMutatingRef.current) {
        return;
      }

      const currentSettings = settingsRef.current;
      if (!currentSettings.notificationsEnabled) {
        return;
      }

      try {
        if (!enabled) {
          await applySettingsOptimistically({
            ...currentSettings,
            dailyReminderEnabled: false,
          });
          return;
        }

        const hasPermission = await ensureNotificationPermission();
        if (!hasPermission) {
          promptForSystemSettings();
          return;
        }

        await applySettingsOptimistically({
          ...currentSettings,
          dailyReminderEnabled: true,
          reminderWeekdays:
            currentSettings.reminderWeekdays.length > 0
              ? currentSettings.reminderWeekdays
              : DEFAULT_NOTIFICATION_SETTINGS.reminderWeekdays,
        });
      } catch (error) {
        console.warn('Failed to update daily reminder setting', error);
        Alert.alert('Unable to Update Settings', 'Please try again.');
      } finally {
        isMutatingRef.current = false;
      }
    },
    [applySettingsOptimistically, isLoading, promptForSystemSettings],
  );

  const handleWeekdayPress = useCallback(
    async (weekday: ReminderWeekday) => {
      if (isLoading || isMutatingRef.current) {
        return;
      }

      const currentSettings = settingsRef.current;
      if (!currentSettings.notificationsEnabled || !currentSettings.dailyReminderEnabled) {
        return;
      }

      try {
        const isSelected = currentSettings.reminderWeekdays.includes(weekday);
        const nextWeekdays = isSelected
          ? currentSettings.reminderWeekdays.filter((item) => item !== weekday)
          : [...currentSettings.reminderWeekdays, weekday];

        if (!nextWeekdays.length) {
          Alert.alert('Pick At Least One Day', 'Select at least one weekday for your reminder.');
          return;
        }

        await applySettingsOptimistically({
          ...currentSettings,
          reminderWeekdays: nextWeekdays as ReminderWeekday[],
        });
      } catch (error) {
        console.warn('Failed to update reminder weekdays', error);
        Alert.alert('Unable to Update Settings', 'Please try again.');
      } finally {
        isMutatingRef.current = false;
      }
    },
    [applySettingsOptimistically, isLoading],
  );

  const openTimePicker = useCallback(() => {
    if (isLoading || isMutatingRef.current) {
      return;
    }

    const currentSettings = settingsRef.current;
    if (!currentSettings.notificationsEnabled || !currentSettings.dailyReminderEnabled) {
      return;
    }

    setPickerHour(currentSettings.reminderHour);
    setPickerMinute(currentSettings.reminderMinute);
    setTimePickerVisible(true);
  }, [isLoading]);

  const closeTimePicker = useCallback(() => {
    setTimePickerVisible(false);
  }, []);

  const handleConfirmTimePicker = useCallback(
    async () => {
      if (isLoading || isMutatingRef.current) {
        return;
      }

      const currentSettings = settingsRef.current;
      if (!currentSettings.notificationsEnabled || !currentSettings.dailyReminderEnabled) {
        return;
      }

      try {
        setTimePickerVisible(false);

        await applySettingsOptimistically({
          ...currentSettings,
          reminderHour: pickerHour,
          reminderMinute: pickerMinute,
        });
      } catch (error) {
        console.warn('Failed to update reminder time', error);
        Alert.alert('Unable to Update Settings', 'Please try again.');
      } finally {
        isMutatingRef.current = false;
      }
    },
    [applySettingsOptimistically, isLoading, pickerHour, pickerMinute],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Allow Notifications</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              disabled={isLoading}
              trackColor={{ false: '#cbd5e1', true: '#94a3b8' }}
              thumbColor={settings.notificationsEnabled ? '#0f172a' : '#f8fafc'}
            />
          </View>
          <View style={styles.separator} />
          <View style={[styles.row, !settings.notificationsEnabled ? styles.disabledRow : undefined]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Daily Reminder</Text>
            </View>
            <Switch
              value={settings.dailyReminderEnabled}
              onValueChange={handleDailyReminderToggle}
              disabled={isLoading || !settings.notificationsEnabled}
              trackColor={{ false: '#cbd5e1', true: '#94a3b8' }}
              thumbColor={settings.dailyReminderEnabled ? '#0f172a' : '#f8fafc'}
            />
          </View>
          <View style={styles.separator} />
          <View style={[styles.optionsSection, reminderOptionsDisabled ? styles.optionsSectionDisabled : undefined]}>
            <Text style={styles.optionLabel}>Weekdays</Text>
            <View style={styles.weekdayWrap}>
              {WEEKDAY_OPTIONS.map((option) => {
                const isSelected = settings.reminderWeekdays.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleWeekdayPress(option.value)}
                    disabled={reminderOptionsDisabled}
                    style={({ pressed }) => [
                      styles.weekdayChip,
                      isSelected ? styles.weekdayChipSelected : undefined,
                      pressed ? styles.weekdayChipPressed : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekdayChipLabel,
                        isSelected ? styles.weekdayChipLabelSelected : undefined,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.optionLabel}>Time</Text>
              <Pressable onPress={openTimePicker} style={styles.timeButton} disabled={reminderOptionsDisabled}>
                <Text style={styles.timeButtonLabel}>{reminderTimeLabel}</Text>
                <MaterialIcons name="expand-more" size={20} color="#64748b" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={timePickerVisible} onRequestClose={closeTimePicker}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTimePicker} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={closeTimePicker} hitSlop={8}>
                <Text style={styles.sheetAction}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>Reminder Time</Text>
              <Pressable onPress={handleConfirmTimePicker} hitSlop={8}>
                <Text style={styles.sheetAction}>Set</Text>
              </Pressable>
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <Picker selectedValue={pickerHour} onValueChange={(value) => setPickerHour(Number(value))}>
                  {HOUR_OPTIONS.map((hour) => (
                    <Picker.Item key={hour} label={formatHourOption(hour)} value={hour} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <Picker
                  selectedValue={pickerMinute}
                  onValueChange={(value) => setPickerMinute(Number(value))}
                >
                  {MINUTE_OPTIONS.map((minute) => (
                    <Picker.Item key={minute} label={String(minute).padStart(2, '0')} value={minute} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledRow: {
    opacity: 0.55,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 19,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  separator: {
    height: 1,
    marginLeft: 14,
    marginRight: 14,
    backgroundColor: '#e2e8f0',
  },
  optionsSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  optionsSectionDisabled: {
    opacity: 0.45,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#334155',
  },
  weekdayWrap: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayChip: {
    width: 36,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayChipSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  weekdayChipPressed: {
    opacity: 0.7,
  },
  weekdayChipLabel: {
    fontSize: 14,
    fontFamily: 'BebasNeue_400Regular',
    color: '#334155',
  },
  weekdayChipLabelSelected: {
    color: '#f8fafc',
  },
  timeRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeButton: {
    minWidth: 120,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeButtonLabel: {
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetAction: {
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0ea5e9',
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
    marginBottom: -4,
  },
});

export default NotificationSettingsScreen;
