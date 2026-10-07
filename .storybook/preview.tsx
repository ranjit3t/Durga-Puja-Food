import React from "react";
import type { Preview } from "@storybook/react-native-web-vite";
import { View } from "react-native";
import { ThemeProvider } from "../src/theme";
import { StoryMockProvider } from "./storyMocks";

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <StoryMockProvider database={context.parameters.storyMocks?.database}>
        <ThemeProvider>
          <View style={{ flex: 1, minHeight: 120, padding: 16 }}>
            <Story />
          </View>
        </ThemeProvider>
      </StoryMockProvider>
    ),
  ],
  parameters: {
    layout: "padded",
  },
};

export default preview;