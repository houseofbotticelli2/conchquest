import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

interface SlideUpSheetProps {
  visible: boolean;
  onClose: () => void;
  // iOS only (a no-op on Android/web) -- fires once the native dismiss
  // animation actually finishes, for callers that need to present another
  // Modal right after this one closes without the two racing/stacking.
  onDismiss?: () => void;
  title: string;
  children: React.ReactNode;
}

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.5;

export function SlideUpSheet({ visible, onClose, onDismiss, title, children }: SlideUpSheetProps) {
  const { theme: t } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, { toValue: 800, duration: 200, useNativeDriver: true }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      {/* One step lighter than the dimmed page beneath, so the sheet visibly
          sits *above* it rather than being the same cream. */}
      <Animated.View style={[styles.sheet, { backgroundColor: t.surfaceCardHi, transform: [{ translateY }] }, t.shadowOverlay]}>
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  dragArea: { paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.display, fontSize: 17, marginBottom: 14 },
});
