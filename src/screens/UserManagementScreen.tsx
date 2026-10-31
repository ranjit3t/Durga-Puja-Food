/**
 * User Management Screen for Administrators.
 * Allows admins to create, edit, change password, enable/disable, and soft-delete non-admin system users.
 * Fully accessible, mobile-friendly, and localized.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Pressable,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "./../styles";
import { useAppTheme } from "./../theme";
import { UI_TEXT } from "./../strings";
import { AppScreen, UserRole, AppThemeMode, ActivityModule, ActivityAction } from "./../types";
import { BackButton } from "./../components/common/BackButton";
import { HomeButton } from "./../components/common/HomeButton";
import { LogoutButton } from "./../components/common/LogoutButton";
import { ThemeToggleButton } from "./../components/common/ThemeToggleButton";
import { useAuth } from "./../context/AuthContext";
import { useDatabase, useActivityLogs } from "./../context/DatabaseContext";
import { useAppNavigation } from "./../context/NavigationContext";
import { useUI } from "./../context/UIContext";
import { createFirebaseRepository } from "./../repository";

const repository = createFirebaseRepository();

export function UserManagementScreen() {
  const { userRole, handleLogout } = useAuth();
  const { addActivityLog } = useActivityLogs();
  const { goBack, navigate } = useAppNavigation();
  const { showAlert } = useUI();
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;

  const isAdmin = userRole === UserRole.ADMIN;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit User
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formRole, setFormRole] = useState<string>(UserRole.CATERER);
  const [formDisabled, setFormDisabled] = useState(false);
  const [formDeleted, setFormDeleted] = useState(false);

  // Change Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [targetPasswordUser, setTargetPasswordUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const authConfig = await repository.getAuthConfig();
      if (authConfig && Array.isArray(authConfig.users)) {
        setUsers(authConfig.users);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch auth config users:", err);
      showAlert(UI_TEXT.error, UI_TEXT.authServerError);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    if (!isAdmin) {
      navigate(AppScreen.HOME);
      return;
    }
    fetchUsers();

    const unsub = repository.onAuthConfigChange((cfg) => {
      if (cfg && Array.isArray(cfg.users)) {
        setUsers(cfg.users);
      }
    });

    return () => {
      unsub();
    };
  }, [isAdmin, navigate, fetchUsers]);

  const openAddModal = () => {
    setIsEditing(false);
    setEditUsername("");
    setFormName("");
    setFormUsername("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormRole(UserRole.CATERER);
    setFormDisabled(false);
    setFormDeleted(false);
    setModalVisible(true);
  };

  const openEditModal = (user: any) => {
    if (user.role?.toLowerCase() === UserRole.ADMIN) {
      showAlert(UI_TEXT.error, UI_TEXT.adminModificationForbidden);
      return;
    }
    setIsEditing(true);
    setEditUsername(user.username);
    setFormName(user.name || "");
    setFormUsername(user.username);
    setFormPassword("");
    setFormConfirmPassword("");
    const userRoleLower = user.role ? user.role.toLowerCase() : "";
    setFormRole(userRoleLower === UserRole.VENDOR ? UserRole.VENDOR : UserRole.CATERER);
    setFormDisabled(Boolean(user.disabled));
    setFormDeleted(Boolean(user.deleted));
    setModalVisible(true);
  };

  const openPasswordModal = (user: any) => {
    if (user.role?.toLowerCase() === UserRole.ADMIN) {
      showAlert(UI_TEXT.error, UI_TEXT.adminModificationForbidden);
      return;
    }
    setTargetPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  };

  const handleSaveUser = async () => {
    const trimmedUsername = formUsername.trim();
    const trimmedName = formName.trim();
    const trimmedPassword = formPassword.trim();
    const trimmedConfirmPassword = formConfirmPassword.trim();

    if (!trimmedUsername) {
      showAlert(UI_TEXT.error, UI_TEXT.invalidCredentials || "Please enter a valid username.");
      return;
    }

    if (!isEditing) {
      if (!trimmedPassword || !trimmedConfirmPassword) {
        showAlert(UI_TEXT.error, "Please enter and confirm the password.");
        return;
      }
      if (trimmedPassword !== trimmedConfirmPassword) {
        showAlert(UI_TEXT.error, UI_TEXT.passwordsMismatchError);
        return;
      }
    }

    if (formRole.toLowerCase() === UserRole.ADMIN) {
      showAlert(UI_TEXT.error, UI_TEXT.adminModificationForbidden);
      return;
    }

    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];

      if (!isEditing) {
        // Check unique username constraint (Case-sensitive exact match)
        const exists = currentUsers.some((u: any) => u.username && u.username === trimmedUsername);
        if (exists) {
          showAlert(UI_TEXT.error, UI_TEXT.usernameUniqueError);
          return;
        }

        const newUser = {
          username: trimmedUsername,
          name: trimmedName || trimmedUsername,
          password: trimmedPassword,
          role: formRole,
          disabled: false,
          deleted: false,
        };

        currentUsers.push(newUser);
        await repository.updateAuthConfig({ ...authConfig, users: currentUsers });

        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.CREATE,
          targetId: trimmedUsername,
          description: `Created system user: ${trimmedUsername} (Role: ${formRole})`,
        });

        showAlert(UI_TEXT.success || "Success", UI_TEXT.userCreatedSuccess);
      } else {
        const idx = currentUsers.findIndex((u: any) => u.username && u.username === editUsername);
        if (idx === -1) {
          showAlert(UI_TEXT.error, UI_TEXT.noRecords);
          return;
        }

        const targetUser = currentUsers[idx];
        if (targetUser.role?.toLowerCase() === UserRole.ADMIN) {
          showAlert(UI_TEXT.error, UI_TEXT.adminModificationForbidden);
          return;
        }

        currentUsers[idx] = {
          ...targetUser,
          name: trimmedName || trimmedUsername,
          role: formRole,
          disabled: formDisabled,
          deleted: formDeleted,
        };

        await repository.updateAuthConfig({ ...authConfig, users: currentUsers });

        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.UPDATE,
          targetId: editUsername,
          description: `Updated system user: ${editUsername} (Role: ${formRole}, Disabled: ${formDisabled}, Deleted: ${formDeleted})`,
        });

        showAlert(UI_TEXT.success || "Success", UI_TEXT.userUpdatedSuccess);
      }

      setModalVisible(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Failed to save user:", err);
      showAlert(UI_TEXT.error, err.message || UI_TEXT.authServerError);
    }
  };

  const handleSavePasswordChange = async () => {
    if (!targetPasswordUser) return;
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || !trimmedConfirm) {
      showAlert(UI_TEXT.error, "Please enter and confirm the new password.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      showAlert(UI_TEXT.error, UI_TEXT.passwordsMismatchError);
      return;
    }

    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];
      const idx = currentUsers.findIndex((u: any) => u.username && u.username === targetPasswordUser.username);

      if (idx === -1) {
        showAlert(UI_TEXT.error, UI_TEXT.noRecords);
        return;
      }

      currentUsers[idx] = {
        ...currentUsers[idx],
        password: trimmedNew,
      };

      await repository.updateAuthConfig({ ...authConfig, users: currentUsers });

      addActivityLog({
        module: ActivityModule.AUTH,
        action: ActivityAction.UPDATE,
        targetId: targetPasswordUser.username,
        description: `Changed password for system user: ${targetPasswordUser.username}`,
      });

      showAlert(UI_TEXT.success || "Success", UI_TEXT.passwordChangedSuccess);
      setPasswordModalVisible(false);
      fetchUsers();
    } catch (err: any) {
      console.error("Failed to change password:", err);
      showAlert(UI_TEXT.error, err.message || UI_TEXT.authServerError);
    }
  };

  const handleSoftDelete = async (user: any) => {
    if (user.role?.toLowerCase() === UserRole.ADMIN) {
      showAlert(UI_TEXT.error, UI_TEXT.adminModificationForbidden);
      return;
    }

    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];
      const idx = currentUsers.findIndex((u: any) => u.username && u.username === user.username);
      if (idx === -1) return;

      currentUsers[idx] = {
        ...currentUsers[idx],
        deleted: true,
        disabled: true,
      };

      await repository.updateAuthConfig({ ...authConfig, users: currentUsers });

      addActivityLog({
        module: ActivityModule.AUTH,
        action: ActivityAction.DELETE,
        targetId: user.username,
        description: `Soft-deleted system user: ${user.username}`,
      });

      showAlert(UI_TEXT.success || "Success", UI_TEXT.userDeletedSuccess);
      fetchUsers();
    } catch (err: any) {
      console.error("Failed to soft-delete user:", err);
      showAlert(UI_TEXT.error, err.message || UI_TEXT.authServerError);
    }
  };

  const nonAdminUsers = users.filter((u: any) => u.role?.toLowerCase() !== UserRole.ADMIN);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={() => goBack()} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={() => handleLogout()} />
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.title}>{UI_TEXT.userManagementTitle}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.userManagementSubtitle}</Text>
          </View>

          <Pressable
            onPress={openAddModal}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.addUserButton}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                elevation: 2,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="person-add-outline" size={18} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: 13 }}>
              {UI_TEXT.addUserButton}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 12 }}>
          {nonAdminUsers.map((user: any) => {
            const isDeleted = Boolean(user.deleted);
            const isDisabled = Boolean(user.disabled);

            return (
              <View
                key={user.username}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: isDeleted ? theme.colors.error + "60" : isDisabled ? theme.colors.warning + "60" : theme.colors.border,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <View style={{ flex: 1, minWidth: 160, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.textPrimary }}>
                        {user.name || user.username}
                      </Text>
                      {isDeleted ? (
                        <View style={{ backgroundColor: theme.colors.errorLight || "#fee2e2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.error || "#ef4444" }}>
                            {UI_TEXT.deletedStatus}
                          </Text>
                        </View>
                      ) : isDisabled ? (
                        <View style={{ backgroundColor: theme.colors.warningLight || "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.warning || "#d97706" }}>
                            {UI_TEXT.disabledStatus}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: theme.colors.successLight || "#d1fae5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.success || "#059669" }}>
                            {UI_TEXT.activeStatus}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary }}>
                      @{user.username} • Role: <Text style={{ textTransform: "uppercase", fontWeight: "900", color: theme.colors.primary }}>{user.role}</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                    <Pressable
                      onPress={() => openEditModal(user)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit user ${user.username}`}
                      style={({ pressed }) => [
                        {
                          backgroundColor: theme.colors.surfaceDark,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary }}>
                        {UI_TEXT.edit}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => openPasswordModal(user)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Change password for user ${user.username}`}
                      style={({ pressed }) => [
                        {
                          backgroundColor: theme.colors.surfaceDark,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="key-outline" size={14} color={theme.colors.secondary || theme.colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.secondary || theme.colors.primary }}>
                        {UI_TEXT.changePasswordButton}
                      </Text>
                    </Pressable>

                    {isDeleted ? (
                      <Pressable
                        onPress={async () => {
                          const authConfig = (await repository.getAuthConfig()) || { users: [] };
                          const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];
                          const idx = currentUsers.findIndex((u: any) => u.username && u.username === user.username);
                          if (idx !== -1) {
                            currentUsers[idx] = { ...currentUsers[idx], deleted: false, disabled: false };
                            await repository.updateAuthConfig({ ...authConfig, users: currentUsers });
                            addActivityLog({
                              module: ActivityModule.AUTH,
                              action: ActivityAction.UPDATE,
                              targetId: user.username,
                              description: `Restored/Undeleted system user: ${user.username}`,
                            });
                            showAlert(UI_TEXT.success || "Success", UI_TEXT.userUpdatedSuccess);
                            fetchUsers();
                          }
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Restore user ${user.username}`}
                        style={({ pressed }) => [
                          {
                            backgroundColor: theme.colors.successLight || "#d1fae5",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.colors.success || "#059669",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Ionicons name="refresh-outline" size={14} color={theme.colors.success || "#059669"} />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.success || "#059669" }}>
                          Restore
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleSoftDelete(user)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Soft-delete user ${user.username}`}
                        style={({ pressed }) => [
                          {
                            backgroundColor: theme.colors.errorLight || "#fee2e2",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.colors.error || "#ef4444",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Ionicons name="trash-outline" size={14} color={theme.colors.error || "#ef4444"} />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.error || "#ef4444" }}>
                          {UI_TEXT.delete}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {nonAdminUsers.length === 0 && !loading && (
            <View style={[styles.card, { alignItems: "center", padding: 32 }]}>
              <Ionicons name="people-outline" size={40} color={theme.colors.textMuted} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 8 }}>
                {UI_TEXT.noRecords}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add / Edit User Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <View style={[styles.card, { width: "100%", maxWidth: 460, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, gap: 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
                {isEditing ? UI_TEXT.editUserButton : UI_TEXT.addUserButton}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
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
                  value={formName}
                  onChangeText={setFormName}
                  accessible={true}
                  accessibilityLabel={UI_TEXT.nameLabel}
                />
              </View>

              {/* Username (Immutable once created) */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                  {UI_TEXT.usernameLabel} {isEditing && "(Immutable)"}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border },
                    isEditing && { opacity: 0.6 }
                  ]}
                  placeholder={UI_TEXT.usernamePlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  value={formUsername}
                  onChangeText={setFormUsername}
                  editable={!isEditing}
                  autoCapitalize="none"
                  accessible={true}
                  accessibilityLabel={UI_TEXT.usernameLabel}
                />
              </View>

              {/* Password & Confirm Password (Create Mode Only) */}
              {!isEditing && (
                <>
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                      {UI_TEXT.passwordLabel}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      placeholder={UI_TEXT.passwordPlaceholder}
                      placeholderTextColor={theme.colors.textMuted}
                      value={formPassword}
                      onChangeText={setFormPassword}
                      secureTextEntry={true}
                      accessible={true}
                      accessibilityLabel={UI_TEXT.passwordLabel}
                    />
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                      {UI_TEXT.confirmPasswordLabel}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.surfaceDark, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      placeholder={UI_TEXT.confirmPasswordPlaceholder}
                      placeholderTextColor={theme.colors.textMuted}
                      value={formConfirmPassword}
                      onChangeText={setFormConfirmPassword}
                      secureTextEntry={true}
                      accessible={true}
                      accessibilityLabel={UI_TEXT.confirmPasswordLabel}
                    />
                  </View>
                </>
              )}

              {/* Role Selection (Non-Admin only) */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                  {UI_TEXT.roleLabel}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {[UserRole.CATERER, UserRole.VENDOR].map((r) => {
                    const isSelected = formRole === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setFormRole(r)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Role ${r}`}
                        style={{
                          flex: 1,
                          minWidth: 90,
                          paddingVertical: 10,
                          borderRadius: 8,
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceDark,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "900", color: isSelected ? theme.colors.white : theme.colors.textPrimary, textTransform: "uppercase" }}>
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Enable / Disable Toggle (Edit mode only) */}
              {isEditing && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, backgroundColor: theme.colors.surfaceDark, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: theme.colors.textPrimary }}>
                      {UI_TEXT.disabledStatus}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                      Prevent this user from logging in and chatting.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setFormDisabled(!formDisabled)}
                    accessible={true}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: formDisabled }}
                    accessibilityLabel="Disable user account"
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: formDisabled ? theme.colors.error || "#ef4444" : theme.colors.border,
                      padding: 2,
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: theme.colors.white,
                        transform: [{ translateX: formDisabled ? 20 : 0 }],
                      }}
                    />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.surfaceDark, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                  {UI_TEXT.cancel}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveUser}
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

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <View style={[styles.card, { width: "100%", maxWidth: 420, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, gap: 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
                {UI_TEXT.changePasswordButton}
              </Text>
              <Pressable onPress={() => setPasswordModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {targetPasswordUser && (
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary }}>
                Target User: <Text style={{ fontWeight: "900", color: theme.colors.primary }}>@{targetPasswordUser.username}</Text>
              </Text>
            )}

            <View style={{ gap: 12 }}>
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
                onPress={() => setPasswordModalVisible(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.surfaceDark, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                  {UI_TEXT.cancel}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSavePasswordChange}
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
    </View>
  );
}
