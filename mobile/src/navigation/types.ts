export type OnboardingStackParamList = {
  Welcome: undefined;
  Signup: { mode?: 'signup' | 'login' } | undefined;
  Perms: undefined;
  Beach: undefined;
};

export type ForecastStackParamList = {
  Score: undefined;
  Detail: undefined;
};

export type MapStackParamList = {
  Map: undefined;
  FindDetail: { findId?: string } | undefined;
  Species: { speciesId?: string } | undefined;
};

export type LibraryStackParamList = {
  Library: undefined;
  Species: { speciesId?: string } | undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Saved: undefined;
};

export type LogStackParamList = {
  Log: undefined;
  LogConfirm: undefined;
};

export type MainTabParamList = {
  ForecastTab: undefined;
  MapTab: undefined;
  LogTab: undefined;
  LibraryTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  LogModal: undefined;
};
