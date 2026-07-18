import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { NavBar } from '../../components/NavBar';
import { LogStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<LogStackParamList, 'Log'>;

const CONDITIONS = ['Excellent', 'Good', 'Fair'];

export function Log({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [condition, setCondition] = useState('Excellent');

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar
        title="Log a find"
        left="Cancel"
        onLeft={() => navigation.getParent()?.goBack()}
        right="Save"
        onRight={() => navigation.navigate('LogConfirm')}
      />
      <ScrollView>
        <TouchableOpacity style={[styles.photoBox, { backgroundColor: t.surfaceAlt, borderBottomColor: t.border }]}>
          <Text style={{ fontSize: 28 }}>📷</Text>
          <Text style={[styles.photoText, { color: t.muted }]}>Tap to add photo</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View>
            <Eyebrow>Shell species</Eyebrow>
            <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <Text style={{ color: t.muted }}>🔍</Text>
              <Text style={[styles.inputText, { color: t.muted }]}>Search library...</Text>
            </View>
          </View>

          <View>
            <Eyebrow>Condition</Eyebrow>
            <View style={styles.chipsRow}>
              {CONDITIONS.map((label) => {
                const active = condition === label;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setCondition(label)}
                    style={[
                      styles.conditionChip,
                      { backgroundColor: active ? t.text : t.surface, borderColor: active ? t.text : t.border },
                    ]}
                  >
                    <Text style={{ fontFamily: active ? fonts.bodySemiBold : fonts.body, fontSize: 12, color: active ? t.bg : t.muted }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Eyebrow>Location sharing</Eyebrow>
            <View style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <Text style={[styles.inputText, { color: t.text }]}>🔒 Approximate only</Text>
              <Text style={[styles.changeText, { color: t.muted }]}>CHANGE</Text>
            </View>
          </View>

          <View>
            <Eyebrow>Notes</Eyebrow>
            <View style={[styles.notesBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <Text style={[styles.inputText, { color: t.muted }]}>Add a note...</Text>
            </View>
          </View>

          <Btn label="Log this find" onPress={() => navigation.navigate('LogConfirm')} style={styles.submitBtn} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  photoBox: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 1 },
  photoText: { fontFamily: fonts.body, fontSize: 12 },
  content: { padding: 16, gap: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 12 },
  spaceBetween: { justifyContent: 'space-between' },
  inputText: { fontFamily: fonts.body, fontSize: 13 },
  changeText: { fontFamily: fonts.data, fontSize: 11 },
  chipsRow: { flexDirection: 'row', gap: 7 },
  conditionChip: { borderRadius: 6, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1 },
  notesBox: { borderWidth: 1, borderRadius: 6, padding: 11, height: 44 },
  submitBtn: { marginBottom: 20 },
});
