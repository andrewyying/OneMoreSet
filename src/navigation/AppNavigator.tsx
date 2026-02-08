import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';
import { MaterialIcons } from '@expo/vector-icons';

import PlayerScreen from '../screens/PlayerScreen';
import WorkoutCompleteScreen from '../screens/WorkoutCompleteScreen';
import ScheduleEditorScreen from '../screens/ScheduleEditorScreen';
import ScheduleListScreen from '../screens/ScheduleListScreen';
import CalendarScreen from '../screens/CalendarScreen';
import { MainTabParamList, RootStackParamList } from '../types/navigation';

enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const APP_FONT_FAMILY = 'BebasNeue_400Regular';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#0ea5e9',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarShowLabel: false,
      tabBarIcon: ({ color, size }) => {
        const icon: React.ComponentProps<typeof MaterialIcons>['name'] =
          route.name === 'ScheduleList' ? 'list' : 'calendar-today';
        return <MaterialIcons name={icon} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="ScheduleList" component={ScheduleListScreen} options={{ title: 'Schedules' }} />
    <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
  </Tab.Navigator>
);

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontFamily: APP_FONT_FAMILY },
          headerBackTitleStyle: { fontFamily: APP_FONT_FAMILY },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ScheduleEditor" component={ScheduleEditorScreen} options={{ title: 'Edit Schedule' }} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ title: 'Player', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="WorkoutComplete"
          component={WorkoutCompleteScreen}
          options={{
            title: 'Workout complete',
            headerShown: false,
            gestureEnabled: false,
            animation: 'slide_from_right',
            animationTypeForReplace: 'push',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

