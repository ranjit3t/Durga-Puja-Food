import React, { useMemo } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Platform } from "react-native";
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

  const styles = useMemo(() => {
    const COLORS = theme.colors;
    return StyleSheet.create({
      backdrop: {
        flex: 1,
        backgroundColor: COLORS.shadow + "A6",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      },
      card: {
        backgroundColor: theme.themeType === AppThemeMode.DARK ? COLORS.surface : COLORS.white,
        borderRadius: 28,
        width: "100%",
        maxWidth: 340,
        padding: 24,
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
        marginBottom: 10,
      },
      title: {
        fontSize: theme.typography.sectionTitleSize,
        fontWeight: "900",
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
      },
      message: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
        fontWeight: "500",
        marginBottom: 28,
      },
      footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
      },
      button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        minWidth: 80,
        alignItems: "center",
        justifyContent: "center",
      },
      buttonText: {
        fontSize: 15,
        fontWeight: "800",
        color: COLORS.white,
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
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
      },
      cancelText: {
        color: COLORS.textSecondary,
      },
    });
  }, [theme]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.footer}>
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
                  style={[
                    styles.button,
                    isDestructive && styles.destructiveButton,
                    isCancel && styles.cancelButton,
                    index > 0 && { marginLeft: 12 },
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
        </View>
      </View>
    </Modal>
  );
}
