import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Btn } from '../../components/Btn';
import { useAuth } from '../../auth/AuthProvider';

const MIN_PASSWORD_LENGTH = 8;

// Rendered at the root level (see RootNavigator) whenever isPasswordRecovery
// is true -- reached only via the Universal Links recovery deep link
// (#94), never through normal in-app navigation.
export function ResetPasswordScreen() {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, completePasswordRecovery, exitPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const result = await completePasswordRecovery(password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 40 }]}>
        {done ? (
          <>
            <Text style={[styles.title, { color: t.text }]}>Password updated</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>
              Your password has been changed. Log back in with your new password.
            </Text>
            <Btn label="Continue" onPress={exitPasswordRecovery} style={{ marginTop: 6 }} />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: t.text }]}>Set a new password</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>
              Choose a new password{user?.email ? ` for ${user.email}` : ''}.
            </Text>

            {error && (
              <Text style={[styles.notice, { color: t.accentDeep, borderColor: t.accentDeep, backgroundColor: t.surfaceAlt }]}>
                {error}
              </Text>
            )}

            <View style={styles.field}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={t.muted}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                autoComplete="new-password"
                style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              />
            </View>
            <View style={styles.field}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={t.muted}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                autoComplete="new-password"
                style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              />
            </View>

            {submitting ? (
              <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
            ) : (
              <Btn label="Update password" onPress={handleSubmit} style={{ marginTop: 6 }} />
            )}
            <Text
              style={[styles.cancelText, { color: t.muted }]}
              onPress={exitPasswordRecovery}
            >
              Cancel
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, marginBottom: 24, lineHeight: 18 },
  notice: { fontFamily: fonts.body, fontSize: 12, padding: 10, borderRadius: 6, borderWidth: 1, marginBottom: 14 },
  field: { marginBottom: 12 },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
  },
  cancelText: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: 18 },
});
