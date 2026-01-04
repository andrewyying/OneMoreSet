export type RootStackParamList = {
  MainTabs: undefined;
  ScheduleEditor: { scheduleId: string };
  Player: { scheduleId: string; startWithCountdown?: boolean };
};

export type MainTabParamList = {
  ScheduleList: undefined;
  Calendar: undefined;
};

