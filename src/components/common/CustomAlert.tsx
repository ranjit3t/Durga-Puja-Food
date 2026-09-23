import React, { useMemo } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Platform, ScrollView } from "react-native";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { AppThemeMode } from "../../domain";

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export function CustomAlert({
  visible,
  title,
  message,
  buttons = [{ text: UI_TEXT.ok }],
  onClose,
}: CustomAlertProps) {
  const { theme } = useAppTheme();

  const isStacked = useMemo(() => {
    return buttons.length > 2 || buttons.some((b) => (b.text || "").length > 11);
  }, [buttons]);

  const styles = useMemo(() => {
    const COLORS = theme.colors;
    return StyleSheet.create({
      backdrop: {
        flex: 1,
        backgroundColor: COLORS.shadow + "A6",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      },
      card: {
        backgroundColor: theme.themeType === AppThemeMode.DARK ? COLORS.surface : COLORS.white,
        borderRadius: 24,
        width: "100%",
        maxWidth: 360,
        maxHeight: "85%",
        padding: 20,
        ...Platform.select({
          ios: {
            shadowColor: COLORS.shadow,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
          },
          android: {
            elevation: 12,
          },
          web: {
            boxShadow: `0 12px 32px ${COLORS.shadow}26`,
          }
        }),
      },
      header: {
        marginBottom: 8,
      },
      title: {
        fontSize: theme.typography.sectionTitleSize || 20,
        fontWeight: "900",
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
      },
      message: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        fontWeight: "500",
        marginBottom: 20,
      },
      footerRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 10,
      },
      footerStacked: {
        flexDirection: "column",
        gap: 8,
        width: "100%",
      },
      button: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        minWidth: 80,
        alignItems: "center",
        justifyContent: "center",
      },
      stackedButton: {
        width: "100%",
        minWidth: "100%",
      },
      buttonText: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.white,
        textAlign: "center",
      },
      destructiveButton: {
        backgroundColor: COLORS.errorLight,
        borderWidth: 1,
        borderColor: COLORS.error,
      },
      destructiveText: {
        color: COLORS.error,
      },
      cancelButton: {
        backgroundColor: COLORS.surfaceDark || COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
      },
      cancelText: {
        color: COLORS.textPrimary,
      },
    });
  }, [theme]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
            </View>
            {!!message && <Text style={styles.message}>{message}</Text>}

            <View style={isStacked ? styles.footerStacked : styles.footerRow}>
              {buttons.map((btn, index) => {
                const isDestructive = btn.style === "destructive";
                const isCancel = btn.style === "cancel";

                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      if (btn.onPress) btn.onPress();
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.button,
                      isStacked && styles.stackedButton,
                      isDestructive && styles.destructiveButton,
                      isCancel && styles.cancelButton,
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveText,
                        isCancel && styles.cancelText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
