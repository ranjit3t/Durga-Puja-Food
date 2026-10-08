const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable inline requires to defer module loading, speeding up app TTI and reducing baseline JS heap memory
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Exclude test files, test directories, and storybook assets from production bundle builds
const customBlockList = [
  /.*\/__tests__\/.*/,
  /.*\.test\.[jt]sx?$/,
  /.*\.stories\.[jt]sx?$/,
  /.*\/storybook-static\/.*/,
];

const existingBlockList = config.resolver?.blockList || [];
config.resolver = {
  ...config.resolver,
  blockList: Array.isArray(existingBlockList)
    ? [...existingBlockList, ...customBlockList]
    : [existingBlockList, ...customBlockList],
};

module.exports = config;
