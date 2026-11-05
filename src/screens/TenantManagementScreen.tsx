/**
 * Tenant Management Screen for Super Administrators.
 * Allows superadmins to create tenants, edit tenant names, toggle active/inactive status,
 * and manage all user accounts across tenants with expandable accordion cards.
 */
import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { AppScreen, UserRole, AppThemeMode, ActivityModule, ActivityAction } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { Dropdown } from "../components/common/Dropdown";
import { useAuth } from "../context/AuthContext";
import { useActivityLogs } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";
import { createFirebaseRepository } from "../repository";
import { encryptPassword } from "../utils/authUtils";

const repository = createFirebaseRepository();

export interface UserRecord {
  username: string;
  name?: string;
  role: UserRole;
  tenantId: string;
  disabled?: boolean;
  deleted?: boolean;
  locked?: boolean;
  password?: string;
  encrypted?: boolean;
}

export interface TenantRecord {
  name?: string;
  tenantName?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

interface UserListItemProps {
  user: UserRecord;
  theme: any;
  onEditUser: (user: UserRecord) => void;
  onChangePassword: (user: UserRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  onRestoreUser: (user: UserRecord) => void;
}

const UserListItem = React.memo(({ user, theme, onEditUser, onChangePassword, onDeleteUser, onRestoreUser }: UserListItemProps) => {
  const isDeleted = Boolean(user.deleted);
  const isDisabled = Boolean(user.disabled);
  const isLocked = Boolean(user.locked);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1.5,
        borderColor: isDeleted || isLocked ? theme.colors.error + "60" : isDisabled ? theme.colors.warning + "60" : theme.colors.border,
        marginBottom: 10,
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <View style={{ flex: 1, minWidth: 140, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary }}>
            {user.name || user.username}
          </Text>
          {isDeleted ? (
            <View style={{ backgroundColor: theme.colors.errorLight || "#fee2e2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.error || "#ef4444" }}>{"Deleted"}</Text>
            </View>
          ) : isLocked ? (
            <View style={{ backgroundColor: theme.colors.errorLight || "#fee2e2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.error || "#ef4444" }}>{UI_TEXT.locked || "Locked"}</Text>
            </View>
          ) : isDisabled ? (
            <View style={{ backgroundColor: theme.colors.warningLight || "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.warning || "#d97706" }}>{"Disabled"}</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: theme.colors.successLight || "#d1fae5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.success || "#059669" }}>{UI_TEXT.activeLabel}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary }}>
          @{user.username} • Role: <Text style={{ textTransform: "uppercase", fontWeight: "900", color: theme.colors.primary }}>{user.role}</Text>
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => onEditUser(user)}
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Edit user ${user.username}`}
        >
          <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary }}>
            {UI_TEXT.edit || "Edit"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChangePassword(user)}
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Change password for user ${user.username}`}
        >
          <Ionicons name="key-outline" size={14} color={theme.colors.secondary || theme.colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.secondary || theme.colors.primary }}>
            {UI_TEXT.changePasswordButton || "Change Password"}
          </Text>
        </Pressable>

        {isDeleted ? (
          <Pressable
            onPress={() => onRestoreUser(user)}
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
            onPress={() => onDeleteUser(user)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Delete user ${user.username}`}
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
              {UI_TEXT.deleteUser}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});
UserListItem.displayName = "UserListItem";

interface TenantListItemProps {
  tId: string;
  tData: TenantRecord;
  isExpanded: boolean;
  theme: any;
  tenantUsers: UserRecord[];
  onToggleExpand: (tId: string) => void;
  onEditTenant: (id: string, name: string) => void;
  onToggleStatus: (id: string, enabled: boolean) => void;
  onCreateUser: (tId: string) => void;
  onEditUser: (user: UserRecord) => void;
  onChangePassword: (user: UserRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  onRestoreUser: (user: UserRecord) => void;
}

const TenantListItem = React.memo(({
  tId,
  tData,
  isExpanded,
  theme,
  tenantUsers,
  onToggleExpand,
  onEditTenant,
  onToggleStatus,
  onCreateUser,
  onEditUser,
  onChangePassword,
  onDeleteUser,
  onRestoreUser,
}: TenantListItemProps) => {
  const tName = tData.name || tData.tenantName || tId;
  const isEnabled = tData.enabled !== false;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1.5,
        borderColor: isExpanded ? theme.colors.primary : theme.colors.border,
        marginBottom: 12,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Pressable
          onPress={() => onToggleExpand(tId)}
          style={{ flex: 1, marginRight: 8, gap: 4 }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} tenant ${tName}`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Ionicons name={isExpanded ? "chevron-up-circle-outline" : "chevron-down-circle-outline"} size={20} color={theme.colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary }}>
              {tName}
            </Text>

            {isEnabled ? (
              <View style={{ backgroundColor: theme.colors.successLight || "#d1fae5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.success || "#059669" }}>{UI_TEXT.activeLabel}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: theme.colors.warningLight || "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.warning || "#d97706" }}>{UI_TEXT.inactiveLabel}</Text>
              </View>
            )}

            <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.textSecondary }}>{tenantUsers.length} {UI_TEXT.usersLabel}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>
            {UI_TEXT.tenantIdLabel}: <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '800', color: theme.colors.primary }}>{tId}</Text>
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Switch
            value={isEnabled}
            onValueChange={(val) => onToggleStatus(tId, val)}
            trackColor={{ true: theme.colors.primary }}
            accessible={true}
            accessibilityRole="switch"
            accessibilityLabel={`Toggle active status for ${tName}`}
          />
          <Pressable
            onPress={() => onEditTenant(tId, tName)}
            style={({ pressed }) => [
              {
                backgroundColor: theme.colors.surfaceDark,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.border
              },
              pressed && { opacity: 0.7 }
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${tName} name`}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textPrimary }}>
              {UI_TEXT.editNameButton}
            </Text>
          </Pressable>
        </View>
      </View>

      {isExpanded && (
        <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.primary }}>
              {UI_TEXT.tenantUsersLabel} ({tenantUsers.length})
            </Text>

            <Pressable
              onPress={() => onCreateUser(tId)}
              style={({ pressed }) => [
                {
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                },
                pressed && { opacity: 0.8 }
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Create User for ${tName}`}
            >
              <Ionicons name="person-add-outline" size={14} color={theme.colors.white} />
              <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 11 }}>
                {UI_TEXT.addUserButton}
              </Text>
            </Pressable>
          </View>

          {tenantUsers.length > 0 ? (
            tenantUsers.map((user) => (
              <UserListItem
                key={user.username}
                user={user}
                theme={theme}
                onEditUser={onEditUser}
                onChangePassword={onChangePassword}
                onDeleteUser={onDeleteUser}
                onRestoreUser={onRestoreUser}
              />
            ))
          ) : (
            <Text style={{ fontStyle: "italic", color: theme.colors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 8 }}>
              {UI_TEXT.noUsersFoundTenant}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});
TenantListItem.displayName = "TenantListItem";

export function TenantManagementScreen() {
  const { handleLogout } = useAuth();
  const { addActivityLog } = useActivityLogs();
  const { goBack, navigate } = useAppNavigation();
  const { showAlert } = useUI();
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const [tenants, setTenants] = useState<Record<string, TenantRecord>>({});
  const [tenantAdmins, setTenantAdmins] = useState<UserRecord[]>([]);
  const [expandedTenantIds, setExpandedTenantIds] = useState<Set<string>>(new Set());

  // Create Tenant Modal
  const [createTenantModal, setCreateTenantModal] = useState(false);
  const [newTenantId, setNewTenantId] = useState("");
  const [newTenantName, setNewTenantName] = useState("");

  // Edit Tenant Modal
  const [editTenantModal, setEditTenantModal] = useState(false);
  const [targetTenantId, setTargetTenantId] = useState("");
  const [editTenantName, setEditTenantName] = useState("");

  // User Modal
  const [userModal, setUserModal] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<UserRole>(UserRole.CATERER);
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formDisabled, setFormDisabled] = useState(false);
  const [formLocked, setFormLocked] = useState(false);

  // Password Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [targetPasswordUser, setTargetPasswordUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [tList, authCfg] = await Promise.all([
        repository.listTenants(),
        repository.getAuthConfig(),
      ]);
      setTenants((tList as Record<string, TenantRecord>) || {});
      if (authCfg && Array.isArray(authCfg.users)) {
        setTenantAdmins(authCfg.users as UserRecord[]);
      }
    } catch (err: unknown) {
      console.error("TenantManagement fetch error:", err);
    }
  }, []);

  useLayoutEffect(() => {
    fetchData();
    const unsubTenants = repository.onTenantsChange((tList) => {
      setTenants((tList as Record<string, TenantRecord>) || {});
    });
    const unsubAuth = repository.onAuthConfigChange((cfg) => {
      if (cfg && Array.isArray(cfg.users)) {
        setTenantAdmins(cfg.users as UserRecord[]);
      }
    });
    return () => {
      unsubTenants();
      unsubAuth();
    };
  }, [fetchData]);

  const handleToggleExpandTenant = useCallback((tId: string) => {
    setExpandedTenantIds((prev) => {
      const next = new Set(prev);
      if (next.has(tId)) {
        next.delete(tId);
      } else {
        next.add(tId);
      }
      return next;
    });
  }, []);

  const handleToggleTenantStatus = useCallback(async (tId: string, enabled: boolean) => {
    try {
      await repository.setTenantStatus(tId, enabled);
      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.UPDATE,
        targetId: tId,
        description: `Set tenant ${tId} status to ${enabled ? "Active" : "Inactive"}`,
      });
      await fetchData();
      showAlert(UI_TEXT.success, UI_TEXT.settingsUpdated);
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  }, [fetchData, addActivityLog, showAlert]);

  const handleCreateTenant = async () => {
    const tId = newTenantId.trim().toLowerCase();
    const tName = newTenantName.trim();
    if (!tId) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantIdRequired || "Tenant ID is required.");
      return;
    }
    if (tId.length > 20) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantIdLengthError);
      return;
    }
    if (!/^[a-z0-9]+$/.test(tId)) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantIdAlphanumericError);
      return;
    }
    if (!tName) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantNameRequired || "Tenant Name is required.");
      return;
    }
    if (tName.length > 100) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantNameLengthError);
      return;
    }
    if (tenants[tId]) {
      showAlert(UI_TEXT.error, UI_TEXT.seasonCodeDuplicateError || "Tenant ID already exists.");
      return;
    }

    try {
      await repository.createTenant(tId, tName);
      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.CREATE,
        targetId: tId,
        description: `Created tenant: ${tName} (${tId})`,
      });
      setNewTenantId("");
      setNewTenantName("");
      setCreateTenantModal(false);
      fetchData();
      showAlert(UI_TEXT.success, UI_TEXT.tenantCreatedSuccess);
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  };

  const handleUpdateTenantName = async () => {
    const tName = editTenantName.trim();
    if (!tName || !targetTenantId) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantNameRequired);
      return;
    }
    if (tName.length > 100) {
      showAlert(UI_TEXT.error, UI_TEXT.tenantNameLengthError);
      return;
    }
    try {
      await repository.updateTenantName(targetTenantId, tName);
      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.UPDATE,
        targetId: targetTenantId,
        description: `Updated tenant name: ${tName} (${targetTenantId})`,
      });
      setEditTenantModal(false);
      fetchData();
      showAlert(UI_TEXT.success, UI_TEXT.tenantUpdatedSuccess);
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  };

  const handleSaveAdminUser = async () => {
    const username = formUsername.trim();
    const name = formName.trim();
    const password = formPassword.trim();
    const confirmPassword = formConfirmPassword.trim();

    const activeTenantId = selectedTenantId || (isEditingUser ? tenantAdmins.find((u) => u.username === username)?.tenantId : null);

    if (!activeTenantId) {
      showAlert(UI_TEXT.error, UI_TEXT.selectTenantPrompt);
      return;
    }
    if (!name || !username) {
      showAlert(UI_TEXT.error, UI_TEXT.nameRequiredError);
      return;
    }

    if (!isEditingUser) {
      if (username.length > 10) {
        showAlert(UI_TEXT.error, UI_TEXT.usernameLengthError);
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        showAlert(UI_TEXT.error, UI_TEXT.usernameAlphanumericError);
        return;
      }
      if (!password || password !== confirmPassword) {
        showAlert(UI_TEXT.error, UI_TEXT.passwordsMismatchError);
        return;
      }
    }

    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];

      if (!isEditingUser) {
        const exists = currentUsers.some((u: UserRecord) => u.username === username);
        if (exists) {
          showAlert(UI_TEXT.error, UI_TEXT.usernameUniqueError);
          return;
        }
        currentUsers.push({
          username,
          name,
          password: encryptPassword(password),
          role: formRole,
          tenantId: activeTenantId,
          disabled: false,
          deleted: false,
          locked: false,
          encrypted: true,
        });
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.CREATE,
          targetId: username,
          description: `Created user ${username} (${formRole}) for tenant ${activeTenantId}`,
        });
      } else {
        const idx = currentUsers.findIndex((u: UserRecord) => u.username === username);
        if (idx === -1) {
          showAlert(UI_TEXT.error, UI_TEXT.noRecords);
          return;
        }
        currentUsers[idx] = {
          ...currentUsers[idx],
          name,
          role: formRole,
          tenantId: activeTenantId,
          disabled: formDisabled,
          deleted: false,
          locked: formLocked,
        };
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.UPDATE,
          targetId: username,
          description: `Updated user ${username} for tenant ${activeTenantId}`,
        });
      }

      await repository.updateAuthConfig({ ...authConfig, users: currentUsers });
      setUserModal(false);
      fetchData();
      showAlert(UI_TEXT.success, UI_TEXT.userCreatedSuccess);
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  };

  const handleSavePassword = async () => {
    if (!targetPasswordUser || !newPassword.trim()) {
      showAlert(UI_TEXT.error, UI_TEXT.enterNewPasswordPrompt);
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(UI_TEXT.error, UI_TEXT.passwordsMismatchError);
      return;
    }
    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];
      const idx = currentUsers.findIndex((u: UserRecord) => u.username === targetPasswordUser.username);
      if (idx !== -1) {
        currentUsers[idx] = {
          ...currentUsers[idx],
          password: encryptPassword(newPassword.trim()),
          encrypted: true,
          locked: false,
          disabled: false,
        };
        await repository.updateAuthConfig({ ...authConfig, users: currentUsers });
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.UPDATE,
          targetId: targetPasswordUser.username,
          description: `Changed password for user ${targetPasswordUser.username}`,
        });
        setPasswordModalVisible(false);
        setNewPassword("");
        setConfirmPassword("");
        fetchData();
        showAlert(UI_TEXT.success, UI_TEXT.userUpdatedSuccess);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  };

  const handleDeleteAdmin = useCallback(async (user: UserRecord) => {
    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];
      const idx = currentUsers.findIndex((u: UserRecord) => u.username === user.username);
      if (idx !== -1) {
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
          description: `Soft-deleted user ${user.username}`,
        });
        fetchData();
        showAlert(UI_TEXT.success, UI_TEXT.userDeletedSuccess);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  }, [fetchData, addActivityLog, showAlert]);

  const handleRestoreAdmin = useCallback(async (user: UserRecord) => {
    try {
      const authConfig = (await repository.getAuthConfig()) || { users: [] };
      const currentUsers = Array.isArray(authConfig.users) ? [...authConfig.users] : [];
      const idx = currentUsers.findIndex((u: UserRecord) => u.username === user.username);
      if (idx !== -1) {
        currentUsers[idx] = {
          ...currentUsers[idx],
          deleted: false,
          disabled: false,
          locked: false,
        };
        await repository.updateAuthConfig({ ...authConfig, users: currentUsers });
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.UPDATE,
          targetId: user.username,
          description: `Restored user ${user.username}`,
        });
        fetchData();
        showAlert(UI_TEXT.success, UI_TEXT.userUpdatedSuccess);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    }
  }, [fetchData, addActivityLog, showAlert]);

  const handleOpenEditTenant = useCallback((id: string, name: string) => {
    setTargetTenantId(id);
    setEditTenantName(name);
    setEditTenantModal(true);
  }, []);

  const handleOpenEditUser = useCallback((user: UserRecord) => {
    setIsEditingUser(true);
    setSelectedTenantId(user.tenantId || null);
    setFormUsername(user.username);
    setFormName(user.name || "");
    setFormRole(user.role || UserRole.CATERER);
    setFormPassword("");
    setFormConfirmPassword("");
    setFormDisabled(Boolean(user.disabled));
    setFormLocked(Boolean(user.locked));
    setUserModal(true);
  }, []);

  const handleOpenChangePassword = useCallback((user: UserRecord) => {
    setTargetPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  }, []);

  const tenantsList = useMemo(() => {
    return Object.keys(tenants).map((tId) => ({
      tId,
      tData: tenants[tId] || {},
    }));
  }, [tenants]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
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
            <Text style={styles.title}>{UI_TEXT.tenantManagementTitle}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.tenantManagementSubtitle}</Text>
          </View>

          <Pressable
            onPress={() => {
              setNewTenantId("");
              setNewTenantName("");
              setCreateTenantModal(true);
            }}
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
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.createTenantButton}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: 13 }}>
              {UI_TEXT.createTenantButton}
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
          {tenantsList.map((item) => {
            const tUsers = tenantAdmins.filter((u: UserRecord) => u.tenantId === item.tId);
            const isExpanded = expandedTenantIds.has(item.tId);

            return (
              <TenantListItem
                key={item.tId}
                tId={item.tId}
                tData={item.tData}
                isExpanded={isExpanded}
                theme={theme}
                tenantUsers={tUsers}
                onToggleExpand={handleToggleExpandTenant}
                onEditTenant={handleOpenEditTenant}
                onToggleStatus={handleToggleTenantStatus}
                onCreateUser={(tId) => {
                  setSelectedTenantId(tId);
                  setIsEditingUser(false);
                  setFormUsername("");
                  setFormName("");
                  setFormRole(UserRole.CATERER);
                  setFormPassword("");
                  setFormConfirmPassword("");
                  setFormDisabled(false);
                  setFormLocked(false);
                  setUserModal(true);
                }}
                onEditUser={handleOpenEditUser}
                onChangePassword={handleOpenChangePassword}
                onDeleteUser={handleDeleteAdmin}
                onRestoreUser={handleRestoreAdmin}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Create Tenant Modal */}
      <Modal visible={createTenantModal} transparent={true} animationType="fade" onRequestClose={() => setCreateTenantModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, gap: 16, borderWidth: 1.5, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>{UI_TEXT.createNewTenantTitle}</Text>
            <View style={{ gap: 12 }}>
              <View>
                <TextInput
                  style={styles.input}
                  value={newTenantId}
                  onChangeText={(text) => {
                    const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (cleaned.length <= 20) setNewTenantId(cleaned);
                  }}
                  maxLength={20}
                  placeholder={UI_TEXT.tenantIdPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  selectTextOnFocus
                />
                <Text style={{ fontSize: 10, color: newTenantId.length >= 20 ? theme.colors.error : theme.colors.textMuted, fontWeight: '700', textAlign: 'right', marginTop: 2 }}>
                  {newTenantId.length}/20 (Alphanumeric only)
                </Text>
              </View>

              <View>
                <TextInput
                  style={styles.input}
                  value={newTenantName}
                  onChangeText={(text) => {
                    if (text.length <= 100) setNewTenantName(text);
                  }}
                  maxLength={100}
                  placeholder={UI_TEXT.tenantNamePlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  selectTextOnFocus
                />
                <Text style={{ fontSize: 10, color: newTenantName.length >= 100 ? theme.colors.error : theme.colors.textMuted, fontWeight: '700', textAlign: 'right', marginTop: 2 }}>
                  {newTenantName.length}/100
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setCreateTenantModal(false)} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceDark, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 14 }}>{UI_TEXT.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleCreateTenant} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>{UI_TEXT.create}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal visible={editTenantModal} transparent={true} animationType="fade" onRequestClose={() => setEditTenantModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, gap: 16, borderWidth: 1.5, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>{UI_TEXT.editTenantNameTitle}</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textSecondary }}>
              {UI_TEXT.tenantIdLabel}: <Text style={{ color: theme.colors.primary, fontWeight: "900" }}>{targetTenantId}</Text> {UI_TEXT.tenantIdImmutable}
            </Text>
            <View>
              <TextInput
                style={styles.input}
                value={editTenantName}
                onChangeText={(text) => {
                  if (text.length <= 100) setEditTenantName(text);
                }}
                maxLength={100}
                placeholder={UI_TEXT.tenantNamePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                selectTextOnFocus
              />
              <Text style={{ fontSize: 10, color: editTenantName.length >= 100 ? theme.colors.error : theme.colors.textMuted, fontWeight: '700', textAlign: 'right', marginTop: 2 }}>
                {editTenantName.length}/100
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setEditTenantModal(false)} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceDark, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 14 }}>{UI_TEXT.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleUpdateTenantName} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>{UI_TEXT.saveChanges}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Modal */}
      <Modal visible={userModal} transparent={true} animationType="fade" onRequestClose={() => setUserModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, gap: 14, borderWidth: 1.5, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>{isEditingUser ? UI_TEXT.editUserTitle : UI_TEXT.createUserTitle}</Text>
            <View style={{ gap: 10 }}>
              <TextInput style={[styles.input, isEditingUser && { backgroundColor: theme.colors.surfaceDark, opacity: 0.7 }]} value={formUsername} onChangeText={setFormUsername} placeholder={UI_TEXT.usernamePlaceholder || "Username"} placeholderTextColor={theme.colors.textMuted} editable={!isEditingUser} autoCapitalize="none" selectTextOnFocus />
              <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder={UI_TEXT.portalNamePlaceholder} placeholderTextColor={theme.colors.textMuted} selectTextOnFocus />
              <View>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 4 }}>{UI_TEXT.roleLabel}</Text>
                <Dropdown
                  value={formRole}
                  options={[UserRole.ADMIN, UserRole.CATERER, UserRole.VENDOR]}
                  onChange={(r: string) => setFormRole(r as UserRole)}
                />
              </View>
              {!isEditingUser && (
                <>
                  <TextInput style={styles.input} value={formPassword} onChangeText={setFormPassword} placeholder={UI_TEXT.password || "Password"} placeholderTextColor={theme.colors.textMuted} secureTextEntry selectTextOnFocus />
                  <TextInput style={styles.input} value={formConfirmPassword} onChangeText={setFormConfirmPassword} placeholder={UI_TEXT.confirmPasswordLabel || "Confirm Password"} placeholderTextColor={theme.colors.textMuted} secureTextEntry selectTextOnFocus />
                </>
              )}
              {isEditingUser && (
                <View style={{ gap: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.colors.surfaceDark, padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 13 }}>{UI_TEXT.disabledStatusLabel}</Text>
                    <Switch value={formDisabled} onValueChange={setFormDisabled} trackColor={{ true: theme.colors.primary }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.colors.surfaceDark, padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 13 }}>{UI_TEXT.accountLockedLabel}</Text>
                    <Switch value={formLocked} onValueChange={setFormLocked} trackColor={{ true: theme.colors.primary }} />
                  </View>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setUserModal(false)} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceDark, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 14 }}>{UI_TEXT.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSaveAdminUser} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>{UI_TEXT.saveChanges}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={passwordModalVisible} transparent={true} animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, gap: 14, borderWidth: 1.5, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>{UI_TEXT.changePasswordTitle || "Change Password"}</Text>
            <View style={{ gap: 10 }}>
              <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder={UI_TEXT.newPasswordPlaceholder} placeholderTextColor={theme.colors.textMuted} secureTextEntry selectTextOnFocus />
              <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={UI_TEXT.confirmPasswordPlaceholder} placeholderTextColor={theme.colors.textMuted} secureTextEntry selectTextOnFocus />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setPasswordModalVisible(false)} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceDark, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 14 }}>{UI_TEXT.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSavePassword} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>{UI_TEXT.saveChanges}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
