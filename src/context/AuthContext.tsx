import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { UserRole } from "../types";

interface AuthContextType {
  userRole: UserRole | null;
  handleLogin: (role: UserRole) => void;
  handleLogout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const handleLogin = useCallback((role: UserRole) => {
    setUserRole(role);
    setSessionStartTime(Date.now());
  }, []);

  const handleLogout = useCallback(() => {
    setUserRole(null);
    setSessionStartTime(null);
  }, []);

  const value = useMemo(() => ({
    userRole,
    handleLogin,
    handleLogout,
    isAuthenticated: !!userRole
  }), [userRole, handleLogin, handleLogout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
