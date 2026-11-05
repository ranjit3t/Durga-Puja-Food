import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { UserRole } from "../types";
import { createFirebaseRepository } from "../repository";

const repository = createFirebaseRepository();

interface AuthContextType {
  userRole: UserRole | null;
  userName: string | null;
  userAccountName: string | null;
  tenantId: string | null;
  handleLogin: (role: UserRole, name: string, username?: string, tenantId?: string) => void;
  handleLogout: (silent?: boolean) => void;
  isAuthenticated: boolean;
  versionAlertShown: boolean;
  markVersionAlertShown: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAccountName, setUserAccountName] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [versionAlertShown, setVersionAlertShown] = useState(false);

  const handleLogin = useCallback((role: UserRole, name: string, username?: string, tenant?: string) => {
    setUserRole(role);
    setUserName(name);
    setUserAccountName(username || name);
    setTenantId(tenant || null);
  }, []);

  const handleLogout = useCallback(() => {
    setUserRole(null);
    setUserName(null);
    setUserAccountName(null);
    setTenantId(null);
    setVersionAlertShown(false);
  }, []);

  const markVersionAlertShown = useCallback(() => {
    setVersionAlertShown(true);
  }, []);

  const value = useMemo(() => ({
    userRole,
    userName,
    userAccountName,
    tenantId,
    handleLogin,
    handleLogout,
    isAuthenticated: !!userRole,
    versionAlertShown,
    markVersionAlertShown,
  }), [userRole, userName, userAccountName, tenantId, handleLogin, handleLogout, versionAlertShown, markVersionAlertShown]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      userRole: null,
      userName: null,
      userAccountName: null,
      tenantId: null,
      handleLogin: () => {},
      handleLogout: () => {},
      isAuthenticated: false,
      versionAlertShown: false,
      markVersionAlertShown: () => {},
    };
  }
  return context;
}
