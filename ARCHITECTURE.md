# Eternia Food Desk - Architecture Documentation

This document describes the high-level architecture, data structures, and design patterns used in the **Eternia Food Desk** application.

## 1. System Overview
Eternia Food Desk is a mobile application built with **React Native (Expo)** designed to manage high-volume food distribution. It uses a **Serverless Architecture** with **Firebase** as the backend for real-time data synchronization and dynamic configuration.

## 2. Technical Stack
- **Framework**: React Native with Expo (Latest SDK)
- **Language**: TypeScript (Strict mode)
- **Backend**: Firebase Realtime Database
- **Auth**: Hybrid model using Internal Role-based Login and Firebase Anonymous Authentication. Sessions are ephemeral and do not persist across app restarts.
- **Persistence**: Temporary session tracking via ephemeral state (24-hour auto-logout).
- **Scanning**: `expo-camera` for QR code processing.

## 3. High-Level Architecture
The project follows a **Modular Layered Architecture**:

### 📂 Presentation Layer (`src/screens`, `src/components`)
- **Screens**: Discrete full-page views.
    - `LoginScreen`: Gateway for role-based session initialization. Dynamically fetches credentials from `auth_config`.
    - `HomeScreen`: Quick-action dashboard utilizing a grid of sleek interaction tiles.
    - `SubscriptionListScreen`: Dedicated interface for pass management with high-performance search.
    - `DashboardScreen`: Aggregated analytics with a sleek, earthy-toned financial summary (conditional) and real-time operational metrics.
    - `SubscriptionForm`: CRUD interface with role-based field locking and touch-optimized block dropdowns.
    - `SettingsScreen`: Administrative interface for managing festival config, payment rules, and Season Branding.
    - `ReportScreen`: High-precision analytics engine with PNG export and compact multi-mode selectors.
- **Components**: Atomic and reusable UI units.
    - `ActionLabel`: Standardized Icon+Text component supporting both horizontal and vertical layouts.
    - `CustomAlert`: A centralized, themed replacement for system dialogs.
    - `Metric Tiles`: Read-only and interactive tiles for rapid data consumption.

### 📂 Logic & Constants Layer (`src/constants.ts`, `src/strings.ts`)
- **Centralized String Resource System (`strings.ts`)**: Every single UI string, label, placeholder, and message is centralized in a constant object. This ensures architectural purity, prevents hardcoded "magic strings," and makes the entire app localization-ready.
- **AppConfig Schema**: The application consumes a central configuration object:
    - `seasonName`: Global branding string.
    - `payment`: Global switch and method whitelist (UPI, Cash, Bank).
    - `days`: Array of festival day rules (meals, dietary, parcels).
- **Visibility Logic**: Helpers in `constants.ts` strictly enforce the active configuration, hiding disabled features (like payments or specific meals) globally across all screens.

### 📂 Data Layer (`src/repository.ts`, `src/firebase.ts`)
- **Real-time Persistence**: Uses Firebase Realtime Database for all subscriptions, menus, and configurations.
- **Data Normalization**: Handles schema variations and ensures data matrix integrity (Person x Day x Meal).

## 4. Security & Permissions Model
The application implements **Role-Based Access Control (RBAC)**:
- **Admin**: Full read/write/delete privileges on all modules, including global configuration.
- **Vendor**: Operational access. Can mark food as taken, update Guest counts, and view Reports. Destructive actions and pass registration are restricted.

## 5. Performance & Synchronization Patterns
- **Transition-Based Data Sync**: Performs a comprehensive backend fetch on every screen transition to eliminate reliance on stale data.
- **Periodic Background Refresh**: Triggers a silent sync every 10 seconds to maintain live metrics during long sessions.
- **Windowed Rendering**: `FlatList` optimization for high-volume pass records.
- **CaptureRef**: Asynchronous PNG generation for the "Digital Pass" and analytical reports.
