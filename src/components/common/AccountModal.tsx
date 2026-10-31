/**
 * Global Account & Password Settings Modal.
 * Accessible to all authenticated users (Admin, Caterer, Vendor) via UserGreeting badge.
 * Allows updating display name and changing password with current password verification and confirmation matching.
 */
import React, { useState, useEffect } from "react";
import { View, Text, Modal, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { useAuth } from "../../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../../context/DatabaseContext";
import { useUI } from "../../context/UIContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { verifyPassword, encryptPassword } from "../../utils/authUtils";
import { createFirebaseRepository } from "../../repository";
import { ActivityModule, ActivityAction } from "../../types";

const repository = createFirebaseRepository();

export function AccountModal() {
  const { userName, userAccountName, handleLogout } = useAuth();
  const { getAuthConfig } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { showAlert } = useUI();
  const { isAccountModalVisible, closeAccountModal } = useAppNavigation();
  const styles = useStyles();
  const { theme } = useAppTheme();

  const [formAccountName, setFormAccountName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (isAccountModalVisible) {
      setFormAccountName(userName || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isAccountModalVisible, userName]);

  const handleSaveAccountSettings = async () => {
    const trimmedName = formAccountName.trim();
    const cur = currentPassword.trim();
    const next = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!trimmedName) {
      showAlert(UI_TEXT.error, UI_TEXT.namePlaceholder);
      return;
    }

    const isChangingPassword = Boolean(cur || next || conf);

    if (isChangingPassword) {
      if (!cur || !next || !conf) {
        showAlert(UI_TEXT.error, "Please fill all password fields to change password.");
        return;
      }
      if (cur === next) {
        showAlert(UI_TEXT.error, UI_TEXT.newPasswordSameAsCurrent);
        return;
      }
      if (next !== conf) {
        showAlert(UI_TEXT.error, UI_TEXT.passwordsMismatchError);
        return;
      }
    }

    try {
      const authConfig = await getAuthConfig();
      if (!authConfig || !Array.isArray(authConfig.users) || !userAccountName) {
        showAlert(UI_TEXT.error, UI_TEXT.authConfigError);
        return;
      }

      const currentClean = userAccountName.toLowerCase();
      const userIdx = authConfig.users.findIndex((u: any) => u.username && u.username.toLowerCase() === currentClean);

      if (userIdx === -1) {
        showAlert(UI_TEXT.error, UI_TEXT.noRecords);
        return;
      }

      const targetUser = authConfig.users[userIdx];
      let updatedPassword = targetUser.password;
      let updatedEncrypted = targetUser.encrypted;

      if (isChangingPassword) {
        const isCurrentValid = verifyPassword(cur, targetUser);
        if (!isCurrentValid) {
          showAlert(UI_TEXT.error, UI_TEXT.incorrectCurrentPassword);
          return;
        }
        updatedPassword = encryptPassword(next);
        updatedEncrypted = true;
      }

      const updatedUsers = [...authConfig.users];
      updatedUsers[userIdx] = {
        ...targetUser,
        name: trimmedName,
        password: updatedPassword,
        encrypted: updatedEncrypted,
      };

      await repository.updateAuthConfig({ ...authConfig, users: updatedUsers });

      addActivityLog({
        module: ActivityModule.AUTH,
        action: ActivityAction.UPDATE,
        targetId: targetUser.username,
        description: `User updated account settings ${isChangingPassword ? "(Name & Password)" : "(Name only)"}`,
      });

      closeAccountModal();

      if (isChangingPassword) {
        showAlert(
          UI_TEXT.success || "Success",
          UI_TEXT.passwordChangedReloginMsg,
          [
            {
              text: UI_TEXT.ok,
              onPress: () => {
                handleLogout();
              },
            },
          ]
        );
      } else {
        showAlert(UI_TEXT.success || "Success", UI_TEXT.profileUpdatedSuccess || "Profile updated successfully.");
      }
    } catch (err: any) {
      console.error("Account settings update error:", err);
      showAlert(UI_TEXT.error, err.message || UI_TEXT.authServerError);
    }
  };

  if (!isAccountModalVisible) return null;

  return (
    <Modal
      visible={isAccountModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeAccountModal}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
        <View style={[styles.card, { width: "100%", maxWidth: 460, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, gap: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
              {UI_TEXT.accountSettingsTitle || "Update Profile & Password"}
            </Text>
            <Pressable onPress={closeAccountModal} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            {/* Full Name */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.nameLabel}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder={UI_TEXT.namePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={formAccountName}
                onChangeText={setFormAccountName}
                accessible={true}
                accessibilityLabel={UI_TEXT.nameLabel}
              />
            </View>

            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary, marginTop: 4 }}>
              Change Password (Optional)
            </Text>

            {/* Current Password */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.currentPasswordLabel}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder={UI_TEXT.currentPasswordPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={true}
                accessible={true}
                accessibilityLabel={UI_TEXT.currentPasswordLabel}
              />
            </View>

            {/* New Password */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.newPasswordLabel}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder={UI_TEXT.newPasswordPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={true}
                accessible={true}
                accessibilityLabel={UI_TEXT.newPasswordLabel}
              />
            </View>

            {/* Confirm New Password */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.confirmPasswordLabel}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder={UI_TEXT.confirmPasswordPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
                accessible={true}
                accessibilityLabel={UI_TEXT.confirmPasswordLabel}
              />
            </View>
          </View>

          {/* Modal Actions */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Pressable
              onPress={closeAccountModal}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.surfaceDark, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                {UI_TEXT.cancel}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveAccountSettings}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: theme.colors.white }}>
                {UI_TEXT.save}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
