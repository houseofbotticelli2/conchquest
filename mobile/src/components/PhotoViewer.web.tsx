import React from 'react';
import { Modal, View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts } from '../theme/tokens';
import type { PhotoViewerProps } from './PhotoViewer';

// react-native-image-viewing ships no web implementation (only .ios/.android
// variants for its internal ImageItem) -- Metro would fail to bundle it for
// web, so this plain Modal fallback stands in (no pinch-zoom/pan on web).
export function PhotoViewer({ uri, visible, onRequestClose, onChangePhoto }: PhotoViewerProps) {
  if (!uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onRequestClose} activeOpacity={1} />
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        {onChangePhoto && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.changeBtn} onPress={onChangePhoto}>
              <Text style={styles.changeText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onRequestClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  image: { width: '90%', height: '70%' },
  footer: { position: 'absolute', bottom: 40, alignItems: 'center', width: '100%' },
  changeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  changeText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
  closeBtn: { position: 'absolute', top: 50, right: 20 },
  closeText: { fontFamily: fonts.bodySemiBold, fontSize: 22, color: '#fff' },
});
