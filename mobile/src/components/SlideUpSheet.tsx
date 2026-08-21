import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;

  // The sheet is anchored to the bottom and sized by its content, so without a
  // cap a long sheet (Help, which is seven sections plus the pin legend) simply
  // grows past the top of the screen and under the notch -- with no way to
  // scroll to what's now off-screen. Leave a strip of backdrop visible above
  // it too, so it still reads as a sheet over the page rather than a new page.
  const maxHeight = screenHeight - insets.top - 24;

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
      <Animated.View
        style={[styles.sheet, { backgroundColor: t.surfaceCardHi, maxHeight, transform: [{ translateY }] }, t.shadowOverlay]}
      >
        {/* Only the handle and title drag, so the gesture never fights the
            ScrollView below it. */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        </View>
        {/* flexGrow: 0 so a short sheet still hugs its content -- without it
            the ScrollView would stretch every sheet to the full maxHeight. */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
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
  },
  scroll: { flexGrow: 0 },
  dragArea: { paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.display, fontSize: 17, marginBottom: 14 },
});
