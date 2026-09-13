import React, { useRef } from "react";
import { View, Text, Pressable, StatusBar, ScrollView, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import QRCode from "react-native-qrcode-svg";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { qrValueFor, mealSummary } from "../constants";
import { Subscription, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";

export function QrScreen({
  subscription,
  config,
  seasonName,
  onBack,
  onShare,
  onPrint,
  onLogout,
}: {
  subscription: Subscription;
  config: ConfigDay[];
  seasonName: string;
  onBack: () => void;
  onShare: (uri: string, message?: string) => void;
  onPrint: () => void;
  onLogout: () => void;
}) {
  const qrRef = useRef<View>(null);
  const shareImage = async () => {
    if (qrRef.current) {
      const uri = await captureRef(qrRef, { format: "png", quality: 1 });
      onShare(uri, `${seasonName || UI_TEXT.headerTitle} - Digital Pass`);
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}>
        <View style={styles.qrContent}>
          <View ref={qrRef} collapsable={false} style={styles.qrPassCard}>
            <View style={styles.qrPassHeader}>
              <Text style={styles.qrPassEvent}>{seasonName || UI_TEXT.headerTitle}</Text>
              <Text style={styles.qrPassTitle}>{UI_TEXT.foodPass}</Text>
            </View>

            <QRCode
              value={qrValueFor(subscription.id)}
              size={180}
              color="#000"
              backgroundColor="#fff"
            />

            <View style={styles.qrPassDetails}>
              <Text style={styles.qrPassFlat}>{subscription.block}-{subscription.flat}</Text>
              <Text style={styles.qrPassPeople}>
                {subscription.peopleCount} {subscription.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
              </Text>
            </View>

            <View style={styles.qrPassFooter}>
              <Text style={styles.qrPassInstruction}>
                {UI_TEXT.passInstruction}
              </Text>
              <Text style={styles.qrPassCopyright}>
                {UI_TEXT.footerCopyright}
              </Text>
            </View>
          </View>
          
          <View style={{ width: "100%" }}>
            <Pressable onPress={shareImage} style={styles.primary}>
              <ActionLabel
                icon="logo-whatsapp"
                label={UI_TEXT.shareWhatsApp}
                color="#fff"
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
