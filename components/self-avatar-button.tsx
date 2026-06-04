import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';

export function SelfAvatarButton() {
  const router = useRouter();
  const { profile } = useAuth();
  const parsed = parseAvatarValue(profile?.avatarUrl ?? '');
  const label = profile?.dogName || profile?.name || '自分';

  return (
    <Pressable
      style={styles.button}
      onPress={() => router.push('/me' as never)}
      accessibilityRole="button"
      accessibilityLabel="自分のプロフィールを開く">
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
});
