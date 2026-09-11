import React, { useRef } from "react";
import { View, Text, Pressable, StatusBar, ScrollView } from "react-native";
import { captureRef } from "react-native-view-shot";
import QRCode from "react-native-qrcode-svg";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { qrValueFor } from "../constants";
import { Subscription } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";

export function QrScreen({
  subscription,
  onBack,
  onShare,
  onPrint,
  onLogout,
}: {
  subscription: Subscription;
  onBack: () => void;
  onShare: (uri: string) => void;
  onPrint: () => void;
  onLogout: () => void;
}) {
  const qrRef = useRef<View>(null);
  const shareImage = async () => {
    if (qrRef.current) {
      const uri = await captureRef(qrRef, { format: "png", quality: 1 });
      onShare(uri);
    }
  };
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <BackButton onPress={onBack} />
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.eyebrow}>{UI_TEXT.flatIdPrefix}{subscription.id}</Text>
        <Text style={styles.title}>{UI_TEXT.foodPass}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.qrIdentityStay}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.qrContent}>
          <View ref={qrRef} collapsable={false} style={styles.qrBox}>
            <QRCode
              value={qrValueFor(subscription.id)}
              size={210}
              color="#1c1a17"
              backgroundColor="#fff"
            />
          </View>
          <Text style={styles.qrCaption}>
            {UI_TEXT.scanToView}
          </Text>
          <Text style={styles.qrLink}>{qrValueFor(subscription.id)}</Text>
          <View style={styles.actions}>
            <Pressable onPress={shareImage} style={styles.primarySmall}>
              <ActionLabel icon="share-social-outline" label={UI_TEXT.shareWhatsApp} color="#fff" />
            </Pressable>
            <Pressable onPress={onPrint} style={styles.secondary}>
              <ActionLabel icon="print-outline" label={UI_TEXT.printPass} />
            </Pressable>
          </View>
        </View>
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}
