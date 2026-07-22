import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageView from 'react-native-image-viewing';
import { fonts } from '../theme/tokens';

export interface PhotoViewerProps {
  uri: string | null;
  visible: boolean;
  onRequestClose: () => void;
  onChangePhoto?: () => void;
}

export function PhotoViewer({ uri, visible, onRequestClose, onChangePhoto }: PhotoViewerProps) {
  return (
    <ImageView
      images={uri ? [{ uri }] : []}
      imageIndex={0}
      visible={visible}
      onRequestClose={onRequestClose}
      FooterComponent={
        onChangePhoto
          ? () => (
              <View style={styles.footer}>
                <TouchableOpacity style={styles.changeBtn} onPress={onChangePhoto}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={styles.changeText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            )
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { paddingBottom: 40, paddingTop: 16, alignItems: 'center' },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  changeText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
});
