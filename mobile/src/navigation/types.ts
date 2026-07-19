import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ShellingScoreResult, Find } from '../lib/api';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Signup: { mode?: 'signup' | 'login' } | undefined;
  Perms: undefined;
  Beach: undefined;
};

export type ForecastStackParamList = {
  Score: undefined;
  Detail: { result: ShellingScoreResult };
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
  Log: { find?: Find } | undefined;
  LogConfirm: undefined;
};

export type CollectionStackParamList = {
  MyShells: undefined;
};

export type MainTabParamList = {
  ForecastTab: undefined;
  MapTab: undefined;
  CollectionTab: undefined;
  LibraryTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  LogModal: NavigatorScreenParams<LogStackParamList> | undefined;
};
