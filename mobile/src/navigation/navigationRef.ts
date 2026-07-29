import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToBeachAlert(beachId: string) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Main', {
    screen: 'ForecastTab',
    params: { screen: 'Score', params: { beachId } },
  } as never);
}
