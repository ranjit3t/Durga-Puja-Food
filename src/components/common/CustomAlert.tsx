import React from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";

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
  buttons = [{ text: "OK" }],
  onClose,
}: CustomAlertProps) {
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
            {buttons.map((btn, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (btn.onPress) btn.onPress();
                  onClose();
                }}
                style={[
                  styles.button,
                  btn.style === "destructive" && styles.destructiveButton,
                  btn.style === "cancel" && styles.cancelButton,
                  index > 0 && { marginLeft: 10 },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === "destructive" && styles.destructiveText,
                    btn.style === "cancel" && styles.cancelText,
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fffaf0",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#253d35",
  },
  message: {
    fontSize: 15,
    color: "#58665b",
    lineHeight: 22,
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#d9e7d4",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#356044",
  },
  destructiveButton: {
    backgroundColor: "#fdecea",
  },
  destructiveText: {
    color: "#b34e45",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#c9bca9",
  },
  cancelText: {
    color: "#675f55",
  },
});
