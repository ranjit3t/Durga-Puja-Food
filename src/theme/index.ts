import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { primaryTheme } from "./primary";
import { darkTheme } from "./dark";
import { AppTheme } from "./types";

type ThemeType = "primary" | "dark";

interface ThemeContextType {
  theme: AppTheme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@app_theme_preference";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeState] = useState<ThemeType>("primary");

  useEffect(() => {
    // Load theme preference from local storage
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === "dark" || savedTheme === "primary") {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (e) {
        console.error("Failed to load theme preference", e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (type: ThemeType) => {
    setThemeState(type);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, type);
    } catch (e) {
      console.error("Failed to save theme preference", e);
    }
  };

  const toggleTheme = () => {
    setTheme(themeType === "primary" ? "dark" : "primary");
  };

  const currentTheme = useMemo(() => (themeType === "dark" ? darkTheme : primaryTheme), [themeType]);

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
