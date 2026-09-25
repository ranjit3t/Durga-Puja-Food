import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { Pressable } from "react-native";
import React from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { ActivityModule, ActivityAction } from "../../types";
import { UI_TEXT } from "../../strings";

/**
 * Standard logout button for screen headers.
 */
export function LogoutButton({ onLogout }: { onLogout: () => void }) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { addActivityLog } = useDatabase();

  const handlePress = () => {
    addActivityLog({
      module: ActivityModule.AUTH,
      action: ActivityAction.LOGOUT,
      description: UI_TEXT.logLogout
    });
    onLogout();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={UI_TEXT.logout}
      accessibilityHint={UI_TEXT.logoutHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.backButton, { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0 }]}
    >
      <Ionicons
        name="log-out-outline"
        size={18}
        color={theme.colors.secondary}
      />
    </Pressable>
  );
}
