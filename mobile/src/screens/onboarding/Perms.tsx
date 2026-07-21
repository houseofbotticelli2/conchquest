import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Btn } from '../../components/Btn';
import { Dots } from '../../components/Dots';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OnboardingStackParamList } from '../../navigation/types';
import { enableBeachAlerts } from '../../lib/notifications';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Perms'>;

export function Perms({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifStatus, setNotifStatus] = useState<'idle' | 'enabled'>('idle');
  const [notifErrorMsg, setNotifErrorMsg] = useState<string | null>(null);

  async function handleEnableNotifications() {
    const result = await enableBeachAlerts();
    if (result === 'enabled') {
      setNotifStatus('enabled');
    } else if (result === 'denied') {
      setNotifErrorMsg('Notifications permission was denied. You can turn this on later from Profile settings.');
    } else {
      setNotifErrorMsg('Push notifications aren\'t supported on this device/simulator.');
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: t.text }]}>A couple of things</Text>
        <Text style={[styles.subtitle, { color: t.body }]}>Conchquest works best with your location.</Text>

        <Card style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
              <Text style={styles.iconText}>📍</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Location</Text>
              <Text style={[styles.cardDesc, { color: t.body }]}>
                Used to fetch tide and weather for your beach. Never stored without permission.
              </Text>
            </View>
          </View>
          <Btn label="Allow location" variant="dark" />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
              <Text style={styles.iconText}>🔔</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: t.text }]}>Notifications</Text>
              <Text style={[styles.cardDesc, { color: t.body }]}>
                Get alerted when saved beaches hit a high score. Optional.
              </Text>
            </View>
          </View>
          <Btn
            label={notifStatus === 'enabled' ? 'Notifications enabled' : 'Enable notifications'}
            variant="ghost"
            disabled={notifStatus === 'enabled'}
            onPress={handleEnableNotifications}
          />
        </Card>

        <Btn label="Continue" onPress={() => navigation.navigate('Beach')} />
      </ScrollView>
      <Dots step={2} />

      <ConfirmDialog
        visible={!!notifErrorMsg}
        title="Couldn't enable notifications"
        message={notifErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setNotifErrorMsg(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, marginBottom: 20 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontFamily: fonts.display, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
