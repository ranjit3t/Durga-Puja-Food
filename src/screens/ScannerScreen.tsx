import React, { useState } from "react";
import { View, Text, Pressable, StatusBar, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";

export function ScannerScreen({
  onBack,
  onScanned,
}: {
  onBack: () => void;
  onScanned: (value: string) => Promise<boolean>;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <BackButton onPress={onBack} />
          <Text style={styles.title}>{UI_TEXT.cameraAccess}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.cameraAccessSubtitle}</Text>
        </View>
        <View style={styles.content}>
          <Pressable onPress={requestPermission} style={styles.primary}>
            <Text style={styles.primaryText}>{UI_TEXT.allowCamera}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />

      {/* 1. Camera fills the screen */}
      <CameraView
        key="camera-view"
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={
          locked
            ? undefined
            : async ({ data }) => {
                setLocked(true);
                const found = await onScanned(data);
                if (!found) {
                  setError(UI_TEXT.scanError);
                  setLocked(false);
                }
              }
        }
      />

      {/* 2. UI Overlay on top of camera */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>

        {/* Back Button Area */}
        <View
          pointerEvents="box-none"
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 999,
          }}
        >
          <BackButton onPress={onBack} />
        </View>

        {/* Center Target Box */}
        <View
          pointerEvents="none"
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <View
            style={{
              width: 260,
              height: 260,
              borderWidth: 2,
              borderColor: "#f0c977",
              borderRadius: 30
            }}
          />
        </View>

        {/* Bottom Hint Text */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            alignItems: "center"
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "700",
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4
            }}
          >
            {UI_TEXT.scanFrameHint}
          </Text>
          {error ? (
            <Text style={{ color: "#ffb09c", fontWeight: "700", marginTop: 10 }}>
              {error}
            </Text>
          ) : null}
        </View>

      </View>
    </View>
  );
}
