import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

type SettingItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage workout reminders',
    icon: 'notifications-none',
  },
  {
    id: 'units',
    title: 'Units',
    subtitle: 'Set your preferred measurement units',
    icon: 'straighten',
  },
  {
    id: 'support',
    title: 'Support',
    subtitle: 'Get help and send feedback',
    icon: 'help-outline',
  },
];

const SettingsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        {SETTINGS_ITEMS.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowIcon}>
              <MaterialIcons name={item.icon} size={20} color="#475569" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  title: {
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#475569',
  },
  card: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingVertical: 8,
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
  rowSubtitle: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
});

export default SettingsScreen;
