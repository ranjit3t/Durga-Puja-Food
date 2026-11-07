import React, { createContext, useContext, useState, useMemo, useCallback, useRef } from "react";
import { UserRole } from "../types";
import { createFirebaseRepository } from "../repository";

const repository = createFirebaseRepository();

interface AuthContextType {
  userRole: UserRole | null;
  userName: string | null;
  userAccountName: string | null;
  tenantId: string | null;
  authSessionId: number;
  isSessionReady: boolean;
  handleLogin: (role: UserRole, name: string, username?: string, tenantId?: string) => void;
  handleLogout: (silent?: boolean) => void;
  markSessionReady: (sessionId: number) => void;
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
  const [authSessionId, setAuthSessionId] = useState(0);
  const [isSessionReady, setIsSessionReady] = useState(true);
  const authSessionIdRef = useRef(0);

  const handleLogin = useCallback((role: UserRole, name: string, username?: string, tenant?: string) => {
    const sessionId = authSessionIdRef.current + 1;
    authSessionIdRef.current = sessionId;
    setAuthSessionId(sessionId);
    setIsSessionReady(false);
    setUserRole(role);
    setUserName(name);
    setUserAccountName(username || name);
    setTenantId(tenant || null);
  }, []);

  const handleLogout = useCallback((_silent?: boolean) => {
    const sessionId = authSessionIdRef.current + 1;
    authSessionIdRef.current = sessionId;
    setAuthSessionId(sessionId);
    setIsSessionReady(true);
    setUserRole(null);
    setUserName(null);
    setUserAccountName(null);
    setTenantId(null);
    setVersionAlertShown(false);
  }, []);

  const markSessionReady = useCallback((sessionId: number) => {
    if (authSessionIdRef.current === sessionId) {
      setIsSessionReady(true);
    }
  }, []);

  const markVersionAlertShown = useCallback(() => {
    setVersionAlertShown(true);
  }, []);

  const value = useMemo(() => ({
    userRole,
    userName,
    userAccountName,
    tenantId,
    authSessionId,
    isSessionReady,
    handleLogin,
    handleLogout,
    markSessionReady,
    isAuthenticated: !!userRole,
    versionAlertShown,
    markVersionAlertShown,
  }), [userRole, userName, userAccountName, tenantId, authSessionId, isSessionReady, handleLogin, handleLogout, markSessionReady, versionAlertShown, markVersionAlertShown]);

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
      authSessionId: 0,
      isSessionReady: true,
      handleLogin: () => {},
      handleLogout: () => {},
      markSessionReady: () => {},
      isAuthenticated: false,
      versionAlertShown: false,
      markVersionAlertShown: () => {},
    };
  }
  return context;
}
