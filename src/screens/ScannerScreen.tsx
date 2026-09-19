import React, { useState } from "react";
import { View, Text, Pressable, StatusBar, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useStyles } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import { BackButton } from "../components/common/BackButton";

import { useAppNavigation } from "../context/NavigationContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { AppScreen, AppThemeMode, ActivityModule, ActivityAction } from "../types";

export function ScannerScreen() {
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const { openScannedValue, goBack, navigate } = useAppNavigation();
  const { subscriptions, addActivityLog } = useDatabase();
  const { showAlert } = useUI();

  const scanSize = Math.min(width * 0.7, 260);
  const [error, setError] = useState("");
  const isScanning = React.useRef(false);

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
        <View style={styles.header}>
          <BackButton onPress={goBack} />
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
    <View style={{ flex: 1, backgroundColor: theme.colors.shadow }}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />

      {/* 1. Camera fills the screen */}
      <CameraView
        key="camera-view"
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={async ({ data }) => {
          if (isScanning.current) return;
          isScanning.current = true;

          const found = openScannedValue(data, subscriptions);
          if (found) {
            addActivityLog({
              module: ActivityModule.SCANNER,
              action: ActivityAction.SCAN,
              targetId: data.split('/').pop(), // Extract ID from URL if possible
              description: UI_TEXT.logScanSuccess.replace("{id}", data.split('/').pop() || "")
            });
          } else {
            addActivityLog({
              module: ActivityModule.SCANNER,
              action: ActivityAction.SCAN,
              description: UI_TEXT.logScanFail.replace("{data}", data)
            });
            setError(UI_TEXT.scanError);
            showAlert(UI_TEXT.error, UI_TEXT.scanError, [
              {
                text: UI_TEXT.ok,
                onPress: () => {
                  navigate(AppScreen.SUBSCRIPTION_LIST);
                  // We don't reset isScanning here because we're navigating away
                },
              },
            ]);
            // If we were staying on screen, we'd reset isScanning.current = false here
            // but we're showing an alert that navigates away.
          }
        }}
      />

      {/* 2. UI Overlay on top of camera */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-none" }]}>

        {/* Back Button Area */}
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 999,
            pointerEvents: "box-none",
          }}
        >
          <BackButton onPress={goBack} />
        </View>

        {/* Center Target Box */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <View
            style={{
              width: scanSize,
              height: scanSize,
              borderWidth: 2,
              borderColor: theme.colors.secondary,
              borderRadius: 30
            }}
          />
        </View>

        {/* Bottom Hint Text */}
        <View
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <Text
            style={{
              color: theme.colors.white,
              fontSize: 16,
              fontWeight: "700",
              ...Platform.select({
                ios: {
                  textShadowColor: theme.colors.shadow + "CC",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4
                },
                android: {
                  textShadowColor: theme.colors.shadow + "CC",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4
                },
                web: {
                  textShadow: `0 1px 4px ${theme.colors.shadow}CC`,
                }
              })
            }}
          >
            {UI_TEXT.scanFrameHint}
          </Text>
          {error ? (
            <Text style={{ color: theme.colors.error, fontWeight: "700", marginTop: 10 }}>
              {error}
            </Text>
          ) : null}
        </View>

      </View>
    </View>
  );
}
