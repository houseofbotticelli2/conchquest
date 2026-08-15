import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ShellingScoreResult, MultiDayScoreEntry, Find } from '../lib/api';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Signup: { mode?: 'signup' | 'login' } | undefined;
  Perms: undefined;
  Beach: undefined;
};

export type ForecastStackParamList = {
  Score: { beachId?: string } | undefined;
  Detail: { result: ShellingScoreResult; beachLabel: string };
  ConditionsDetail: { result: ShellingScoreResult; dayOffset: number; dayLabel: string; beachLabel: string };
  StrategyDetail: { result: MultiDayScoreEntry; dayOffset: number; dayLabel: string; isToday: boolean; beachLabel: string };
};

export type MapStackParamList = {
  Map: undefined;
  FindDetail: { findId?: string } | undefined;
  Species: { speciesId?: string } | undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type BeachesStackParamList = {
  Beaches: undefined;
};

export type LogStackParamList = {
  Log: { find?: Find } | undefined;
  LogConfirm: undefined;
};

export type CollectionStackParamList = {
  MyShells: undefined;
  Library: undefined;
  Species: { speciesId?: string } | undefined;
};

export type MainTabParamList = {
  ForecastTab: undefined;
  MapTab: undefined;
  CollectionTab: undefined;
  BeachesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  LogModal: NavigatorScreenParams<LogStackParamList> | undefined;
  ResetPassword: undefined;
};
