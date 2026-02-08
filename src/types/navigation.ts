import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  ScheduleList: undefined;
  Calendar: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ScheduleEditor: { scheduleId: string };
  Player: { scheduleId: string; startWithCountdown?: boolean };
  WorkoutComplete: { streakDays: number; celebrationMessage: string };
};
