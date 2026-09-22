import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { UserRole } from "../types";

interface AuthContextType {
  userRole: UserRole | null;
  userName: string | null;
  handleLogin: (role: UserRole, name: string) => void;
  handleLogout: (silent?: boolean) => void;
  isAuthenticated: boolean;
  versionAlertShown: boolean;
  markVersionAlertShown: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [versionAlertShown, setVersionAlertShown] = useState(false);

  const handleLogin = useCallback((role: UserRole, name: string) => {
    setUserRole(role);
    setUserName(name);
    setSessionStartTime(Date.now());
    setVersionAlertShown(false);
  }, []);

  const handleLogout = useCallback(() => {
    setUserRole(null);
    setUserName(null);
    setSessionStartTime(null);
    setVersionAlertShown(false);
  }, []);

  const markVersionAlertShown = useCallback(() => {
    setVersionAlertShown(true);
  }, []);

  const value = useMemo(() => ({
    userRole,
    userName,
    handleLogin,
    handleLogout,
    isAuthenticated: !!userRole,
    versionAlertShown,
    markVersionAlertShown,
  }), [userRole, userName, handleLogin, handleLogout, versionAlertShown, markVersionAlertShown]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
