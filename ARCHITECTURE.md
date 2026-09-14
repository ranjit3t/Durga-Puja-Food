# Eternia Food Desk - Architecture Documentation

This document describes the high-level architecture, data structures, and design patterns used in the **Eternia Food Desk** application.

## 1. System Overview
Eternia Food Desk is a mobile application built with **React Native (Expo)** designed to manage high-volume food distribution. It uses a **Serverless Architecture** with **Firebase** as the backend for real-time data synchronization and dynamic configuration.

## 2. Technical Stack
- **Framework**: React Native with Expo (Latest SDK)
- **Language**: TypeScript (Strict mode)
- **Backend**: Firebase Realtime Database
- **Auth**: Hybrid model using Internal Role-based Login and Firebase Anonymous Authentication. Sessions are ephemeral and do not persist across app restarts.
- **Persistence**: Hybrid model using Firebase for global data and **`AsyncStorage`** for local user preferences (e.g., Theme selection). 
- **Scanning**: `expo-camera` for QR code processing.

## 3. High-Level Architecture
The project follows a **Modular Layered Architecture**:

### 📂 Presentation Layer (`src/screens`, `src/components`)
- **Screens**: Discrete full-page views.
    - `LoginScreen`: Gateway for role-based session initialization. Dynamically fetches credentials from `auth_config`.
    - `HomeScreen`: Quick-action dashboard utilizing a grid of sleek interaction tiles.
    - `SubscriptionListScreen`: Dedicated interface for pass management with high-performance search.
    - `DashboardScreen`: Aggregated analytics with a sleek, earthy-toned financial summary (conditional) and real-time operational metrics. Guest plate counts are read-only and derived from the `GuestManagementScreen`.
    - `SubscriptionForm`: CRUD interface with role-based field locking and touch-optimized block dropdowns.
    - `SettingsScreen`: Administrative interface for managing festival config, payment rules, and Season Branding.
    - `GuestManagementScreen`: Operational module for tracking extra guest plates with automated total/taken calculations.
    - `ReportScreen`: High-precision analytics engine with PNG export and multi-mode selectors (Day, Meal, Guest, Flat, Payment).
- **Components**: Atomic and reusable UI units.
    - `ActionLabel`: Standardized Icon+Text component supporting both horizontal and vertical layouts.
    - `CounterInput`: Specialized numeric input with `+/-` controls and automated min/max clamping.
    - `CustomAlert`: A centralized, themed replacement for system dialogs.
    - `Header Controls`: Unified set of components (`BackButton`, `HomeButton`, `LogoutButton`) designed with a consistent **36px circular aesthetic**.
    - `Metric Tiles`: Read-only and interactive tiles for rapid data consumption.

### 📂 Logic & Theme Layer (`src/theme/`, `src/constants.ts`, `src/strings.ts`)
- **Dynamic Theme & Responsive Provider (`src/theme/`)**: Implements a React Context-based theme and responsiveness system.
    - `ThemeProvider`: Wraps the app and manages `themeType` (Primary/Dark).
    - `useAppTheme` & `useStyles`: Custom hooks used by all components for dynamic, theme-aware and size-aware styling.
    - **Responsive Engine**: The `useStyles` hook integrates `useWindowDimensions` to provide real-time screen metrics, enabling centered 600px layouts on large screens (Tablets/Browser).
    - Persistence: Uses `AsyncStorage` to remember user's theme choice locally.
- **Centralized String Resource System (`strings.ts`)**: Every single UI string, label, placeholder, and message is centralized in a constant object. This ensures architectural purity, prevents hardcoded "magic strings," and makes the entire app localization-ready.
- **AppConfig Schema**: The application consumes a central configuration object:
    - `seasonName`: Global branding string.
    - `seasonEnabled`: Global master switch for Read-Only mode.
    - `payment`: Global switch and method whitelist (UPI, Cash, Bank).
    - `days`: Array of event day rules (meals, dietary, parcels).
- **Navigation & History Stack**: Uses a custom-built history array in the root `App` component. The `navigate()` and `goBack()` helpers manage the transition state, ensuring that the Android hardware back button behaves predictably. History is automatically purged upon returning to the **Home** screen to prevent stack bloat.
- **Persistent View State Hoisting**: Selected tabs and filter states for the `ReportScreen` and search queries for the `SubscriptionListScreen` are hoisted to the root level. This ensures UI continuity during sub-navigation (e.g., returning from a pass detail to the exact same report tab).
- **Visibility Logic**: Helpers in `constants.ts` strictly enforce the active configuration, hiding disabled features (like payments or specific meals) globally across all screens.

### 📂 Data Layer (`src/repository.ts`, `src/firebase.ts`)
- **Real-time Persistence**: Uses Firebase Realtime Database for all subscriptions, menus, and configurations.
- **Data Normalization**: Handles schema variations and ensures data matrix integrity (Person x Day x Meal). Renamed `PujaDay` to `EventDay` for generic event support.

## 4. Security & Permissions Model
The application implements **Role-Based Access Control (RBAC)**:
- **Admin**: Full read/write/delete privileges on all modules, including global configuration.
- **Vendor**: Operational access. Can mark food as taken, manage **Guest counts** (if enabled), and view Reports. Destructive actions, festival rule changes, and pass registration are restricted.
- **Global Read-Only Enforcement**: When the `seasonEnabled` config flag is false, the application automatically locks all data-modifying components (text inputs, checkboxes, save buttons) across all roles, effectively archiving the season's data.

## 5. Performance & Synchronization Patterns
- **Transition-Based Data Sync**: Performs a comprehensive backend fetch on every screen transition to eliminate reliance on stale data.
- **Periodic Background Refresh**: Triggers a silent sync every 10 seconds to maintain live metrics during long sessions.
- **Windowed Rendering**: `FlatList` optimization for high-volume pass records.
- **CaptureRef**: Asynchronous PNG generation for the "Digital Pass" and analytical reports.
