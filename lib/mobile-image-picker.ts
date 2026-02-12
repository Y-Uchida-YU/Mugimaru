type PickedImage = {
  uri: string;
  mimeType: string;
  dataUrl: string;
};

type ExpoImagePickerAsset = {
  uri: string;
  mimeType?: string | null;
  base64?: string | null;
};

type ExpoImagePickerResult = {
  canceled: boolean;
  assets?: ExpoImagePickerAsset[];
};

type ExpoImagePickerModule = {
  MediaTypeOptions: {
    Images: string;
  };
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchImageLibraryAsync: (options: {
    mediaTypes: string;
    allowsEditing: boolean;
    quality: number;
    base64: boolean;
  }) => Promise<ExpoImagePickerResult>;
};

async function loadImagePickerModule(): Promise<ExpoImagePickerModule> {
  const moduleName = 'expo-image-picker';
  try {
    return (await import(moduleName)) as unknown as ExpoImagePickerModule;
  } catch {
    throw new Error(
      'Image picker module is missing. Run: npx expo install expo-image-picker'
    );
  }
}

export async function pickImageFromLibrary() {
  const ImagePicker = await loadImagePickerModule();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission was denied.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const mimeType = asset.mimeType || 'image/jpeg';
  const dataUrl = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;

  return {
    uri: asset.uri,
    mimeType,
    dataUrl,
  } satisfies PickedImage;
}
