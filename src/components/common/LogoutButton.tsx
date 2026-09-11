import React from "react";
import { Pressable } from "react-native";
import { ActionLabel } from "./ActionLabel";
import { UI_TEXT } from "../../strings";

/**
 * Standard logout button for screen headers.
 */
export function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <Pressable onPress={onLogout} style={{ padding: 4 }}>
      <ActionLabel
        icon="log-out-outline"
        label={UI_TEXT.logoutButton}
        color="#f0c977"
      />
    </Pressable>
  );
}
