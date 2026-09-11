import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

export async function captureReceiptImage(
  viewRef: RefObject<View | null>
): Promise<string> {
  if (!viewRef.current) {
    throw new Error("Receipt preview is not ready yet. Please try again.");
  }

  const uri = await captureRef(viewRef, {
    format: "png",
    quality: 1,
    result: "tmpfile",
  });

  if (!uri) {
    throw new Error("Could not generate receipt image.");
  }

  return uri;
}

export async function saveReceiptImageToGallery(sourceUri: string): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error("Photo library permission is required to save your receipt.");
  }

  await MediaLibrary.createAssetAsync(sourceUri);
}

export async function shareReceiptImage(
  sourceUri: string,
  dialogTitle: string
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(sourceUri, {
    mimeType: "image/png",
    dialogTitle,
    UTI: "public.png",
  });
}
