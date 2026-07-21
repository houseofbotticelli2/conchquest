import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export async function sendPushNotification(pushToken: string, title: string, body: string): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Skipping push, not a valid Expo push token: ${pushToken}`);
    return;
  }

  const message: ExpoPushMessage = { to: pushToken, sound: 'default', title, body };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    if (ticket.status === 'error') {
      console.error(`Push notification error (${ticket.details?.error ?? 'unknown'}): ${ticket.message}`);
    }
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}
