import type { StorybookConfig } from "@storybook/react-native-web-vite";
import { fileURLToPath } from "node:url";

const storyMocks = fileURLToPath(new URL("./storyMocks.ts", import.meta.url));
const nativeMocks = fileURLToPath(new URL("./nativeMocks.tsx", import.meta.url));
const contextNames = [
  "AuthContext",
  "ChatContext",
  "DatabaseContext",
  "NavigationContext",
  "UIContext",
];

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {},
  },
  viteFinal: async (viteConfig) => {
    const currentAliases = viteConfig.resolve?.alias;
    const aliases = Array.isArray(currentAliases)
      ? currentAliases
      : Object.entries(currentAliases ?? {}).map(([find, replacement]) => ({ find, replacement }));

    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: [
          ...aliases,
          { find: "expo-camera", replacement: nativeMocks },
          { find: /^expo-contacts(?:\/.*)?$/, replacement: nativeMocks },
          { find: "expo-image-picker", replacement: nativeMocks },
          { find: "expo-audio", replacement: nativeMocks },
          { find: "expo-sharing", replacement: nativeMocks },
          { find: "expo-print", replacement: nativeMocks },
          { find: "react-native-view-shot", replacement: nativeMocks },
          { find: "@react-native-ml-kit/text-recognition", replacement: nativeMocks },
          ...contextNames.map((name) => ({
            find: new RegExp(`^(?:\\.\\./)+context/${name}(?:\\.tsx?)?$`),
            replacement: storyMocks,
          })),
        ],
      },
    };
  },
};

export default config;