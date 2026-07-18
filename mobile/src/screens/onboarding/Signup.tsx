import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Btn } from '../../components/Btn';
import { Eyebrow } from '../../components/Eyebrow';
import { Dots } from '../../components/Dots';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Signup'>;

const FIELDS: { key: 'displayName' | 'email' | 'password'; label: string; placeholder: string; secure?: boolean }[] = [
  { key: 'displayName', label: 'Display name', placeholder: 'Sandy C.' },
  { key: 'email', label: 'Email', placeholder: 'you@email.com' },
  { key: 'password', label: 'Password', placeholder: '••••••••', secure: true },
];

export function Signup({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [values, setValues] = useState({ displayName: '', email: '', password: '' });

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.statusRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: t.accent }]}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.text }]}>Create your account</Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>Free to start. No credit card needed.</Text>

        {FIELDS.map((f) => (
          <View key={f.key} style={styles.field}>
            <Eyebrow>{f.label}</Eyebrow>
            <TextInput
              value={values[f.key]}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              placeholder={f.placeholder}
              placeholderTextColor={t.muted}
              secureTextEntry={f.secure}
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            />
          </View>
        ))}

        <Btn label="Create account" onPress={() => navigation.navigate('Perms')} style={styles.createBtn} />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          <Text style={[styles.dividerText, { color: t.muted }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
        </View>

        <View style={styles.socialActions}>
          <Btn label="G  Continue with Google" variant="secondary" onPress={() => navigation.navigate('Perms')} />
          <Btn label="🍎  Continue with Apple" variant="secondary" onPress={() => navigation.navigate('Perms')} />
        </View>
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
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, marginBottom: 20 },
  field: { marginBottom: 12 },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
  },
  createBtn: { marginTop: 6, marginBottom: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontFamily: fonts.body, fontSize: 12 },
  socialActions: { gap: 8 },
});
