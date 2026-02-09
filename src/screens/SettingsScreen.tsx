import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompletions } from '../store/completions';
import { MainTabParamList, RootStackParamList } from '../types/navigation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SettingItem = {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

type SettingSection = {
  id: string;
  title: string;
  items: SettingItem[];
};

const SETTINGS_SECTIONS: SettingSection[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      {
        id: 'preferences',
        title: 'Preferences',
        icon: 'tune',
      },
      {
        id: 'notifications',
        title: 'Notifications',
        icon: 'notifications-none',
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    items: [
      {
        id: 'send-feedback',
        title: 'Share Feedback',
        icon: 'chat-bubble-outline',
      },
      {
        id: 'report-issue',
        title: 'Report Issue',
        icon: 'bug-report',
      },
      {
        id: 'rate-app',
        title: 'Rate This App',
        icon: 'star-border',
      },
      {
        id: 'follow-us',
        title: 'Follow Us',
        icon: 'alternate-email',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    items: [
      {
        id: 'privacy-data',
        title: 'Privacy & Data',
        icon: 'privacy-tip',
      },
      {
        id: 'terms-of-service',
        title: 'Terms of Service',
        icon: 'description',
      },
    ],
  },
  {
    id: 'danger-zone',
    title: 'Danger Zone',
    items: [
      {
        id: 'reset-progress',
        title: 'Clear Workout History',
        icon: 'restore',
      },
    ],
  },
];

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { clearCompletions, completions } = useCompletions();

  const handleConfirmClearWorkoutHistory = useCallback(() => {
    clearCompletions();
    Alert.alert('Done', 'All completed workout history has been removed.');
  }, [clearCompletions]);

  const handleClearWorkoutHistory = useCallback(() => {
    if (completions.length === 0) {
      Alert.alert('No history to clear', 'You do not have any completed workouts yet.');
      return;
    }

    Alert.alert(
      'Clear workout history?',
      'This will permanently remove all completed workout history from this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: handleConfirmClearWorkoutHistory,
        },
      ],
    );
  }, [completions.length, handleConfirmClearWorkoutHistory]);

  const handleItemPress = useCallback(
    (itemId: string) => {
      if (itemId === 'privacy-data') {
        navigation.navigate('LegalDocument', { document: 'privacy' });
        return;
      }

      if (itemId === 'terms-of-service') {
        navigation.navigate('LegalDocument', { document: 'terms' });
        return;
      }

      if (itemId === 'reset-progress') {
        handleClearWorkoutHistory();
      }
    },
    [handleClearWorkoutHistory, navigation],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <Pressable
                    onPress={() => handleItemPress(item.id)}
                    style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : undefined]}
                  >
                    <View style={styles.rowIcon}>
                      <MaterialIcons name={item.icon} size={20} color="#475569" />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </Pressable>
                  {index < section.items.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
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
    paddingTop: 30,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  rowText: {
    marginLeft: 12,
    flex: 1,
  },
  rowTitle: {
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  separator: {
    height: 1,
    marginLeft: 60,
    backgroundColor: '#e2e8f0',
  },
});

export default SettingsScreen;
