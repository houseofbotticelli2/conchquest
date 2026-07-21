import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushToken, unregisterPushToken } from './api';

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId;

export type NotificationSetupResult = 'enabled' | 'denied' | 'unsupported';

// Push notifications don't work on simulators/emulators -- only ever call
// this from a real device (Perms screen, Profile settings toggle).
export async function enableBeachAlerts(): Promise<NotificationSetupResult> {
  if (!Device.isDevice) {
    return 'unsupported';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return 'denied';
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
  await registerPushToken(token);
  return 'enabled';
}

export async function disableBeachAlerts(): Promise<void> {
  await unregisterPushToken();
}
