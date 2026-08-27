import * as ImagePicker from "expo-image-picker";

export type PickedVisualSearchImage = {
  uri: string;
  mimeType?: string;
};

function getLibraryPermissionMessage(canAskAgain: boolean): string {
  if (!canAskAgain) {
    return "Photo library access is disabled. Enable it in Settings to choose a photo.";
  }
  return "Photo library access is required to choose an image.";
}

function getCameraPermissionMessage(canAskAgain: boolean): string {
  if (!canAskAgain) {
    return "Camera access is disabled. Enable it in Settings to take a photo.";
  }
  return "Camera access is required to take a photo.";
}

export async function pickVisualSearchFromLibrary(): Promise<PickedVisualSearchImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(getLibraryPermissionMessage(permission.canAskAgain));
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? undefined,
  };
}

export async function pickVisualSearchFromCamera(): Promise<PickedVisualSearchImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(getCameraPermissionMessage(permission.canAskAgain));
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? undefined,
  };
}
