import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';

import PlayerScreen from '../screens/PlayerScreen';
import ScheduleEditorScreen from '../screens/ScheduleEditorScreen';
import ScheduleListScreen from '../screens/ScheduleListScreen';
import { RootStackParamList } from '../types/navigation';

enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
  },
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        <Stack.Screen name="ScheduleList" component={ScheduleListScreen} options={{ title: 'Schedules' }} />
        <Stack.Screen name="ScheduleEditor" component={ScheduleEditorScreen} options={{ title: 'Edit Schedule' }} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ title: 'Player', headerShown: false, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

