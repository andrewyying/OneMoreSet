import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  ScheduleList: undefined;
  Calendar: undefined;
  Settings: undefined;
};

export type LegalDocumentType = 'privacy' | 'terms';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ScheduleEditor: { scheduleId: string; isNew?: boolean };
  Player: { scheduleId: string; startWithCountdown?: boolean };
  WorkoutComplete: { streakDays: number; celebrationMessage: string };
  LegalDocument: { document: LegalDocumentType };
};
