import { FontAwesome6 } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { SettingsMenuContent } from '@/components/settings-menu-content';
import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { useState } from 'react';

export function SettingsMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const parsed = parseAvatarValue(profile?.avatarUrl ?? '');
  const label = profile?.dogName || profile?.name || '自分';
  const drawerWidth = Math.min(width * 0.88, 390);

  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="設定メニューを開く">
        {parsed.type === 'image' ? (
          <Image source={{ uri: parsed.uri }} style={styles.image} />
        ) : parsed.type === 'icon' ? (
          <View style={styles.fallback}>
            <Text style={styles.iconGlyph}>{getAvatarIconGlyph(parsed.iconId)}</Text>
          </View>
        ) : (
          <View style={styles.fallback}>
            {label ? (
              <Text style={styles.initial}>{label.trim().charAt(0).toUpperCase()}</Text>
            ) : (
              <FontAwesome6 name="paw" size={16} color="#6b4f2f" />
            )}
          </View>
        )}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: `${colors.text}55` }]}
            onPress={() => setIsOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="設定メニューを閉じる"
          />
          <View style={[styles.drawer, { width: drawerWidth, backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <View style={[styles.drawerHandle, { backgroundColor: colors.border }]} />
            <SettingsMenuContent compact onNavigate={() => setIsOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 4,
    marginRight: 4,
    overflow: 'hidden',
  },
  image: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  fallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eadfce',
  },
  iconGlyph: {
    fontSize: 20,
  },
  initial: {
    color: '#6b4f2f',
    fontSize: 16,
    fontWeight: '900',
  },
  modalRoot: {
    flex: 1,
    alignItems: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    flex: 1,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 8, height: 0 },
    elevation: 16,
  },
  drawerHandle: {
    position: 'absolute',
    top: 16,
    right: 10,
    zIndex: 2,
    width: 4,
    height: 36,
    borderRadius: 999,
  },
});
