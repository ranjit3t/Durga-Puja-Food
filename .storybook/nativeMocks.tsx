import React from "react";
import { Text, View } from "react-native";

export const Contact = class Contact {};

export function CameraView() {
  return (
    <View style={{ minHeight: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#111827" }}>
      <Text style={{ color: "#FFFFFF" }}>Camera preview disabled in Storybook</Text>
    </View>
  );
}

export function useCameraPermissions() {
  return [{ granted: false, canAskAgain: false }, async () => ({ granted: false, canAskAgain: false })] as const;
}

export async function requestMediaLibraryPermissionsAsync() {
  return { granted: false, canAskAgain: false };
}

export async function launchImageLibraryAsync() {
  return { canceled: true, assets: [] };
}

export async function launchCameraAsync() {
  return { canceled: true, assets: [] };
}

export async function getContactsAsync() {
  return { data: [] };
}

export async function presentContactPickerAsync() {
  return undefined;
}

export async function requestPermissionsAsync() {
  return { granted: false, canAskAgain: false };
}

export async function isAvailableAsync() {
  return false;
}

export async function shareAsync() {
  return undefined;
}

export async function printAsync() {
  return undefined;
}

export function captureRef() {
  return Promise.resolve("storybook-image.png");
}

export function createAudioPlayer() {
  return { play: () => undefined, pause: () => undefined, remove: () => undefined };
}

export const TextRecognition = { recognize: async () => [] };
export default TextRecognition;