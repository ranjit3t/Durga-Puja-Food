import { jest } from "@jest/globals";

jest.mock("expo", () => ({ registerRootComponent: jest.fn() }));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

jest.mock("expo-image-picker", () => ({}));
jest.mock("expo-camera", () => ({}));
jest.mock("expo-contacts", () => ({}));
jest.mock("expo-audio", () => ({}));
jest.mock("expo-print", () => ({}));
jest.mock("expo-sharing", () => ({}));
jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn() }));
jest.mock("@react-native-ml-kit/text-recognition", () => ({}));

jest.mock("firebase/app", () => ({
  getApps: () => [],
  initializeApp: () => ({ name: "jest-app" }),
}));

jest.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: null }),
  getReactNativePersistence: () => ({}),
  initializeAuth: () => ({ currentUser: null }),
  signInAnonymously: async () => undefined,
}));

jest.mock("firebase/database", () => {
  const noOpListener = () => () => undefined;
  const noOpAsync = async () => undefined;

  return {
    equalTo: () => ({}),
    get: async () => ({ exists: () => false, val: () => null }),
    increment: (value: number) => ({ increment: value }),
    limitToLast: () => ({}),
    onChildAdded: noOpListener,
    onChildChanged: noOpListener,
    onChildRemoved: noOpListener,
    onDisconnect: () => ({ cancel: noOpAsync, remove: noOpAsync, set: noOpAsync }),
    onValue: noOpListener,
    orderByChild: () => ({}),
    push: () => ({ key: "jest-key" }),
    query: () => ({}),
    ref: () => ({}),
    remove: noOpAsync,
    serverTimestamp: () => 0,
    set: noOpAsync,
    update: noOpAsync,
  };
});