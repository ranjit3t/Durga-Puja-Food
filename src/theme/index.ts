import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { primaryTheme } from "./primary";
import { darkTheme } from "./dark";
import { AppTheme } from "./types";
import { AppThemeMode } from "../types";

interface ThemeContextType {
  theme: AppTheme;
  themeType: AppThemeMode;
  setTheme: (type: AppThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@app_theme_preference";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeState] = useState<AppThemeMode>(AppThemeMode.LIGHT);

  useEffect(() => {
    // Load theme preference from local storage
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === AppThemeMode.DARK || savedTheme === AppThemeMode.LIGHT) {
          setThemeState(savedTheme as AppThemeMode);
        }
      } catch (e) {
        console.error("Failed to load theme preference", e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (type: AppThemeMode) => {
    setThemeState(type);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, type);
    } catch (e) {
      console.error("Failed to save theme preference", e);
    }
  };

  const toggleTheme = () => {
    setTheme(themeType === AppThemeMode.LIGHT ? AppThemeMode.DARK : AppThemeMode.LIGHT);
  };

  const currentTheme = useMemo(() => (themeType === AppThemeMode.DARK ? darkTheme : primaryTheme), [themeType]);

  const value = useMemo(() => ({
    theme: currentTheme,
    themeType,
    setTheme,
    toggleTheme,
  }), [currentTheme, themeType]);

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};

export * from "./types";
export { primaryTheme, darkTheme };
