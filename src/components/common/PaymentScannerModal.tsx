/**
 * Live Camera Payment Receipt Scanner Modal.
 * Scans UPI / Bank payment receipts using live camera viewfinder or gallery photos,
 * extracting 12-digit UPI UTR / Transaction IDs via client-side OCR.
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { useUI } from "../../context/UIContext";
import {
  extractPaymentDetailsFromImage,
  pickScreenshotAndExtractDetails,
} from "../../utils/ocrScanner";

interface PaymentScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onExtracted: (txnId: string | null, amount: number | null) => void;
}

export function PaymentScannerModal({
  visible,
  onClose,
  onExtracted,
}: PaymentScannerModalProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const { showAlert } = useUI();

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!visible) return null;

  const scanWidth = Math.min(width * 0.9, 350);
  const scanHeight = Math.round(scanWidth * 0.92);

  const handleCapturePhoto = async () => {
    if (processing) return;

    if (!cameraRef.current) {
      handlePickFromGallery();
      return;
    }

    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });

      if (photo?.uri) {
        const details = await extractPaymentDetailsFromImage(photo.uri);
        setProcessing(false);

        if (details.txnId || (details.amount && details.amount > 0)) {
          onExtracted(details.txnId, details.amount);
          onClose();
        } else {
          showAlert(UI_TEXT.error, UI_TEXT.noTransactionIdFound);
        }
      } else {
        setProcessing(false);
        showAlert(UI_TEXT.error, UI_TEXT.noTransactionIdFound);
      }
    } catch (err) {
      setProcessing(false);
      console.error("Camera capture error:", err);
      showAlert(UI_TEXT.error, UI_TEXT.noTransactionIdFound);
    }
  };

  const handlePickFromGallery = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await pickScreenshotAndExtractDetails();
      setProcessing(false);

      if (res.txnId || (res.amount && res.amount > 0)) {
        onExtracted(res.txnId, res.amount);
        onClose();
      } else if (res.uri) {
        showAlert(UI_TEXT.error, UI_TEXT.noTransactionIdFound);
      }
    } catch (err) {
      setProcessing(false);
      console.error("Gallery OCR Error:", err);
      showAlert(UI_TEXT.error, UI_TEXT.noTransactionIdFound);
    }
  };

  // Permission Request View
  if (!permission || !permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.backdrop}>
          <View style={[modalStyles.permissionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="camera" size={42} color={theme.colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[modalStyles.permTitle, { color: theme.colors.textPrimary }]}>
              {UI_TEXT.scanTransactionId}
            </Text>
            <Text style={[modalStyles.permSubtitle, { color: theme.colors.textSecondary }]}>
              {UI_TEXT.cameraPermissionDenied}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 16 }}>
              <Pressable
                onPress={onClose}
                style={[modalStyles.btn, { backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.border, borderWidth: 1 }]}
              >
                <Text style={{ fontWeight: "800", color: theme.colors.textPrimary }}>{UI_TEXT.cancel}</Text>
              </Pressable>

              <Pressable
                onPress={requestPermission}
                style={[modalStyles.btn, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={{ fontWeight: "800", color: theme.colors.white }}>{UI_TEXT.ok}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handlePickFromGallery}
              style={{ marginTop: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary }}>
                {UI_TEXT.chooseFromGallery}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.shadow }}>
        {/* Live Camera Viewfinder */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          facing="back"
        />

        {/* Top Header Row */}
        <View style={modalStyles.topOverlay}>
          <Pressable onPress={onClose} style={modalStyles.iconBtn}>
            <Ionicons name="close" size={22} color={theme.colors.white} />
          </Pressable>

          <Text style={modalStyles.headerTitle}>
            {UI_TEXT.scanTransactionId}
          </Text>

          <Pressable onPress={() => setTorch(!torch)} style={modalStyles.iconBtn}>
            <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color={torch ? theme.colors.secondary : theme.colors.white} />
          </Pressable>
        </View>

        {/* Center Scanner Frame & Reticle */}
        <View style={modalStyles.centerContainer}>
          <View style={[modalStyles.scanFrame, { width: scanWidth, height: scanHeight, borderColor: theme.colors.primary }]}>
            <View style={[modalStyles.cornerTL, { borderColor: theme.colors.primary }]} />
            <View style={[modalStyles.cornerTR, { borderColor: theme.colors.primary }]} />
            <View style={[modalStyles.cornerBL, { borderColor: theme.colors.primary }]} />
            <View style={[modalStyles.cornerBR, { borderColor: theme.colors.primary }]} />

            {processing ? (
              <View style={modalStyles.processingBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={modalStyles.processingText}>
                  {UI_TEXT.extractingText}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={modalStyles.instructionText}>
            {UI_TEXT.scanPaymentOptionMessage}
          </Text>
        </View>

        {/* Bottom Control Bar */}
        <View style={modalStyles.bottomOverlay}>
          <Pressable onPress={handlePickFromGallery} style={modalStyles.galleryBtn} disabled={processing}>
            <Ionicons name="images-outline" size={22} color={theme.colors.white} />
            <Text style={modalStyles.galleryBtnText}>{UI_TEXT.chooseFromGallery}</Text>
          </Pressable>

          <Pressable
            onPress={handleCapturePhoto}
            disabled={processing}
            style={({ pressed }) => [
              modalStyles.shutterOuter,
              { borderColor: theme.colors.white },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
            ]}
          >
            <View style={[modalStyles.shutterInner, { backgroundColor: theme.colors.primary }]} />
          </Pressable>

          <View style={{ width: 60 }} />
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  permSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topOverlay: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scanFrame: {
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  instructionText: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 10,
  },
  processingBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    gap: 8,
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  galleryBtn: {
    alignItems: "center",
    gap: 4,
  },
  galleryBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  shutterOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
});
