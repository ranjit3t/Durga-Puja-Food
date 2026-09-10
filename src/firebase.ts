/**
 * Firebase Initialization and Authentication Services
 * Configures the database and handles anonymous authentication for data access.
 */
import { getApps, initializeApp } from "firebase/app";
// Firebase exposes this React Native export through conditional package resolution.
// @ts-expect-error Firebase's default declaration omits the React Native conditional export.
import { getAuth, getReactNativePersistence, initializeAuth, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseMissingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let persistedAuth: ReturnType<typeof getAuth> | undefined;

export function getFirebaseServices() {
  if (!firebaseConfigured) return undefined;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  if (!persistedAuth) {
    try {
      persistedAuth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      persistedAuth = getAuth(app);
    }
  }
  return { auth: persistedAuth, db: getDatabase(app) };
}

export async function ensureFirebaseAuth() {
  const services = getFirebaseServices();
  if (!services) return undefined;
  if (!services.auth.currentUser) await signInAnonymously(services.auth);
  return services;
}
