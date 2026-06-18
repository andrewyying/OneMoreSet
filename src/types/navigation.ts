import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  ScheduleList: undefined;
  Calendar: undefined;
  Settings: undefined;
};

export type LegalDocumentType = 'privacy' | 'terms';
export type StartCountdownSeconds = 0 | 3 | 5;

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ScheduleEditor: { scheduleId: string; isNew?: boolean };
  Player: { scheduleId: string; startCountdownSeconds?: StartCountdownSeconds; autoStart?: boolean };
  WorkoutComplete: { streakDays: number; celebrationMessage: string };
  LegalDocument: { document: LegalDocumentType };
  FeedbackForm: undefined;
  ReportIssueForm: undefined;
  NotificationSettings: undefined;
  PreferenceSettings: undefined;
};
