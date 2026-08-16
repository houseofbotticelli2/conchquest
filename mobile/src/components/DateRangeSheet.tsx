import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { SlideUpSheet } from './SlideUpSheet';

interface DateRangeSheetProps {
  visible: boolean;
  onClose: () => void;
  from: Date | null;
  to: Date | null;
  onApply: (from: Date, to: Date) => void;
  onClear: () => void;
}

type ActiveField = 'from' | 'to' | null;

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Android's DateTimePicker is an imperative dialog (mounting it opens the
// dialog, unmounting closes it) -- iOS renders "inline" as a real view, so
// only one platform actually needs the picker kept in the tree between
// taps. Both paths funnel through the same onChange handler either way.
export function DateRangeSheet({ visible, onClose, from, to, onApply, onClear }: DateRangeSheetProps) {
  const { theme: t } = useTheme();
  const [localFrom, setLocalFrom] = useState<Date | null>(from);
  const [localTo, setLocalTo] = useState<Date | null>(to);
  const [activeField, setActiveField] = useState<ActiveField>(null);

  useEffect(() => {
    if (visible) {
      setLocalFrom(from);
      setLocalTo(to);
      setActiveField(null);
    }
  }, [visible, from, to]);

  function handleChange(field: ActiveField, event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setActiveField(null);
    if (event.type === 'dismissed' || !date) return;

    if (field === 'from') {
      setLocalFrom(date);
      if (localTo && date > localTo) setLocalTo(date);
    } else if (field === 'to') {
      setLocalTo(date);
      if (localFrom && date < localFrom) setLocalFrom(date);
    }
  }

  const canApply = localFrom !== null && localTo !== null;

  return (
    <SlideUpSheet visible={visible} onClose={onClose} title="Filter by date">
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: t.muted }]}>From</Text>
        <TouchableOpacity
          style={[styles.dateButton, { borderColor: t.borderSoftAlpha, backgroundColor: t.surfaceInset }]}
          onPress={() => setActiveField(activeField === 'from' ? null : 'from')}
        >
          <Text style={[styles.dateButtonText, { color: t.text }]}>{localFrom ? formatDate(localFrom) : 'Select date'}</Text>
        </TouchableOpacity>
      </View>
      {Platform.OS === 'ios' && activeField === 'from' && (
        <DateTimePicker
          value={localFrom ?? new Date()}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          onChange={(e, d) => handleChange('from', e, d)}
        />
      )}

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: t.muted }]}>To</Text>
        <TouchableOpacity
          style={[styles.dateButton, { borderColor: t.borderSoftAlpha, backgroundColor: t.surfaceInset }]}
          onPress={() => setActiveField(activeField === 'to' ? null : 'to')}
        >
          <Text style={[styles.dateButtonText, { color: t.text }]}>{localTo ? formatDate(localTo) : 'Select date'}</Text>
        </TouchableOpacity>
      </View>
      {Platform.OS === 'ios' && activeField === 'to' && (
        <DateTimePicker
          value={localTo ?? new Date()}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          onChange={(e, d) => handleChange('to', e, d)}
        />
      )}

      {Platform.OS === 'android' && activeField === 'from' && (
        <DateTimePicker value={localFrom ?? new Date()} mode="date" maximumDate={new Date()} onChange={(e, d) => handleChange('from', e, d)} />
      )}
      {Platform.OS === 'android' && activeField === 'to' && (
        <DateTimePicker value={localTo ?? new Date()} mode="date" maximumDate={new Date()} onChange={(e, d) => handleChange('to', e, d)} />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, { borderColor: t.borderSoftAlpha }]}
          onPress={() => {
            onClear();
            onClose();
          }}
        >
          <Text style={[styles.footerButtonText, { color: t.muted }]}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.applyButton, { backgroundColor: canApply ? t.navBg : t.border }]}
          disabled={!canApply}
          onPress={() => {
            if (localFrom && localTo) onApply(localFrom, localTo);
          }}
        >
          <Text style={[styles.footerButtonText, { color: canApply ? t.navText : t.muted }]}>Apply</Text>
        </TouchableOpacity>
      </View>
    </SlideUpSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: { fontFamily: fonts.data, fontSize: 13 },
  dateButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  dateButtonText: { fontFamily: fonts.data, fontSize: 13 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  footerButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  applyButton: { borderWidth: 0 },
  footerButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
