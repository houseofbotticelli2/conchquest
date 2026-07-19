import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export interface ConfirmDialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ConfirmDialogButton[];
  onClose: () => void;
}

// Cross-platform replacement for Alert.alert — react-native-web's Alert
// module is a no-op stub, so anything relying on Alert.alert for a
// confirmation silently does nothing when the app runs as web.
export function ConfirmDialog({ visible, title, message, buttons, onClose }: ConfirmDialogProps) {
  const { theme: t } = useTheme();

  function handlePress(button: ConfirmDialogButton) {
    onClose();
    button.onPress?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {message && <Text style={[styles.message, { color: t.body }]}>{message}</Text>}
          <View style={[styles.buttonsRow, { borderTopColor: t.borderSoft }]}>
            {buttons.map((b, i) => (
              <TouchableOpacity
                key={b.text}
                onPress={() => handlePress(b)}
                style={[styles.button, i > 0 && { borderLeftWidth: 1, borderLeftColor: t.borderSoft }]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: b.style === 'destructive' ? t.accentDeep : b.style === 'cancel' ? t.muted : t.accent },
                  ]}
                >
                  {b.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 320, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  title: { fontFamily: fonts.display, fontSize: 17, fontWeight: '600', textAlign: 'center', paddingTop: 20, paddingHorizontal: 20 },
  message: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', paddingTop: 8, paddingHorizontal: 20, paddingBottom: 18, lineHeight: 19 },
  buttonsRow: { flexDirection: 'row', borderTopWidth: 1, marginTop: 4 },
  button: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
});
