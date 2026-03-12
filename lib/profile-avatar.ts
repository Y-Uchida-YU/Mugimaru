export const AVATAR_ICON_PREFIX = 'icon:';

export const AVATAR_ICON_OPTIONS: readonly { id: string; glyph: string; label: string }[] = [
  { id: 'dog-smile', glyph: '🐶', label: 'Dog Smile' },
  { id: 'dog-cool', glyph: '🐕', label: 'Dog' },
  { id: 'fox', glyph: '🦊', label: 'Fox' },
  { id: 'panda', glyph: '🐼', label: 'Panda' },
  { id: 'koala', glyph: '🐨', label: 'Koala' },
  { id: 'bear', glyph: '🐻', label: 'Bear' },
  { id: 'cat', glyph: '🐱', label: 'Cat' },
  { id: 'rabbit', glyph: '🐰', label: 'Rabbit' },
];

export function buildAvatarIconValue(iconId: string) {
  return `${AVATAR_ICON_PREFIX}${iconId}`;
}

export function isImageValue(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
}

export function parseAvatarValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      type: 'empty' as const,
      uri: '',
      iconId: '',
    };
  }
  if (trimmed.startsWith(AVATAR_ICON_PREFIX)) {
    const iconId = trimmed.slice(AVATAR_ICON_PREFIX.length);
    return {
      type: 'icon' as const,
      uri: '',
      iconId,
    };
  }
  if (isImageValue(trimmed)) {
    return {
      type: 'image' as const,
      uri: trimmed,
      iconId: '',
    };
  }
  return {
    type: 'empty' as const,
    uri: '',
    iconId: '',
  };
}

export function getAvatarIconGlyph(iconId: string) {
  return AVATAR_ICON_OPTIONS.find((item) => item.id === iconId)?.glyph ?? '🐶';
}
