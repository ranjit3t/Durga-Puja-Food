import React from "react";
import type { Preview } from "@storybook/react-native-web-vite";
import { View } from "react-native";
import { ThemeProvider } from "../src/theme";
import { AppThemeMode } from "../src/types";
import { darkTheme } from "../src/theme/dark";
import { primaryTheme } from "../src/theme/primary";
import { StoryMockProvider } from "./storyMocks";

const preview: Preview = {
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Storybook theme mode",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      const themeMode = context.globals.theme === "dark" ? AppThemeMode.DARK : AppThemeMode.LIGHT;
      const theme = themeMode === AppThemeMode.DARK ? darkTheme : primaryTheme;

      return (
        <StoryMockProvider database={context.parameters.storyMocks?.database}>
          <ThemeProvider key={themeMode} initialTheme={themeMode} persist={false}>
            <View style={{ flex: 1, minHeight: 120, padding: 16, backgroundColor: theme.colors.background }}>
              <Story />
            </View>
          </ThemeProvider>
        </StoryMockProvider>
      );
    },
  ],
  parameters: {
    layout: "padded",
  },
};

export default preview;