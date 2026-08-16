import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Btn } from '../../components/Btn';
import { Field } from '../../components/Field';
import { Eyebrow } from '../../components/Eyebrow';
import { Dots } from '../../components/Dots';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthProvider';
import { WEB_APP_URL } from '../../lib/supabase';

// Google/Apple buttons are built but not wired to any provider yet (see
// docs/TODO.md #71) -- hidden rather than shipped with an "isn't wired up
// yet" caption, since testers tap them first. Flip to true once the OAuth
// flows actually work.
const SOCIAL_LOGIN_ENABLED = false;

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Signup'>;

type Mode = 'signup' | 'login';

export function Signup({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp, signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const isSignup = mode === 'signup';

  async function handleForgotPassword() {
    setError(null);
    setResetNotice(false);
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    setResettingPassword(true);
    const result = await resetPassword(email.trim());
    setResettingPassword(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setResetNotice(true);
  }

  async function handleSubmit() {
    setError(null);
    setConfirmationNotice(false);
    setResetNotice(false);
    setSubmitting(true);

    const result = isSignup ? await signUp(email, password, displayName) : await signIn(email, password);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (isSignup && result.needsEmailConfirmation) {
      setConfirmationNotice(true);
      setMode('login');
      return;
    }

    // Login needs no explicit navigation — RootNavigator swaps to the Main
    // tree automatically once the session updates. Signup only reaches here
    // if email confirmation is off for this Supabase project (it's on today,
    // so this path is currently dormant); if that ever changes, this races
    // against RootNavigator's own swap since a session also gets set here.
    if (isSignup) {
      navigation.navigate('Perms');
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.statusRow, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: t.accent }]}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.text, marginBottom: isSignup ? 4 : 20 }]}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </Text>
        {isSignup && (
          <Text style={[styles.subtitle, { color: t.muted }]}>Free to start. No credit card needed.</Text>
        )}

        {confirmationNotice && (
          <Text style={[styles.notice, { color: t.sea, borderColor: t.borderSoftAlpha, backgroundColor: t.surfaceInset }]}>
            Check your email to confirm your account, then log in below.
          </Text>
        )}
        {resetNotice && (
          <Text style={[styles.notice, { color: t.sea, borderColor: t.borderSoftAlpha, backgroundColor: t.surfaceInset }]}>
            Check your email for a link to reset your password.
          </Text>
        )}
        {error && (
          <Text style={[styles.notice, { color: t.accentDeep, borderColor: t.accentDeep, backgroundColor: t.surfaceAlt }]}>
            {error}
          </Text>
        )}

        {isSignup && (
          <View style={styles.field}>
            <Eyebrow>Display name</Eyebrow>
            <Field raised
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Sandy C."
              textContentType="name"
              autoComplete="name"
              style={styles.input}
            />
          </View>
        )}
        <View style={styles.field}>
          <Eyebrow>Email</Eyebrow>
          <Field raised
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Eyebrow>Password</Eyebrow>
          <Field raised
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            textContentType={isSignup ? 'newPassword' : 'password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            style={styles.input}
          />
        </View>

        {!isSignup && (
          <TouchableOpacity onPress={handleForgotPassword} disabled={resettingPassword} style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: t.muted }]}>
              {resettingPassword ? 'Sending...' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>
        )}

        {submitting ? (
          <View style={styles.createBtn}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <Btn label={isSignup ? 'Create account' : 'Log in'} onPress={handleSubmit} style={styles.createBtn} />
        )}

        {isSignup && (
          <Text style={[styles.legalNote, { color: t.muted }]}>
            By creating an account, you agree to our{' '}
            <Text style={{ color: t.accent }} onPress={() => Linking.openURL(`${WEB_APP_URL}/terms`)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={{ color: t.accent }} onPress={() => Linking.openURL(`${WEB_APP_URL}/privacy`)}>
              Privacy Policy
            </Text>
            .
          </Text>
        )}

        <TouchableOpacity
          onPress={() => {
            setMode(isSignup ? 'login' : 'signup');
            setError(null);
            setConfirmationNotice(false);
            setResetNotice(false);
          }}
        >
          <Text style={[styles.toggleText, { color: t.accent }]}>
            {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>

        {SOCIAL_LOGIN_ENABLED && (
          <>
            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: t.border }]} />
              <Text style={[styles.dividerText, { color: t.muted }]}>or</Text>
              <View style={[styles.divider, { backgroundColor: t.border }]} />
            </View>

            <View style={styles.socialActions}>
              <Btn label="G  Continue with Google" variant="secondary" onPress={() => {}} />
              <Btn label="🍎  Continue with Apple" variant="secondary" onPress={() => {}} />
            </View>
          </>
        )}
      </ScrollView>
      <Dots step={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  statusRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  back: { fontFamily: fonts.body, fontSize: 14 },
  content: { paddingHorizontal: 22, paddingBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 24, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, marginBottom: 20 },
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
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 14 },
  forgotPasswordText: { fontFamily: fonts.body, fontSize: 12 },
  createBtn: { marginTop: 6, marginBottom: 14 },
  legalNote: { fontFamily: fonts.body, fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: 20 },
  toggleText: { fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontFamily: fonts.body, fontSize: 12 },
  socialActions: { gap: 8 },
});
