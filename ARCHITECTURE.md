# Eternia Food Desk - Architecture Documentation

This document describes the high-level architecture, data structures, and design patterns used in the **Eternia Food Desk** application.

## 1. System Overview
Eternia Food Desk is a mobile application built with **React Native (Expo)** designed to manage high-volume food distribution. It uses a **Serverless Architecture** with **Firebase** as the backend for real-time data synchronization and dynamic configuration.

## 2. Technical Stack
- **Framework**: React Native with Expo (Latest SDK)
- **Language**: TypeScript (Strict mode)
- **Backend**: Firebase Realtime Database
- **Auth**: Hybrid model using Internal Role-based Login and Firebase Anonymous Authentication (initialized post-login). Sessions are persisted for 24 hours via `AsyncStorage`.
- **Scanning**: `expo-camera` for QR code processing.
- **Reporting**: `react-native-view-shot` for PNG export.

## 3. High-Level Architecture
The project follows a **Modular Layered Architecture**:

### 📂 Presentation Layer (`src/screens`, `src/components`)
- **Screens**: Discrete full-page views.
    - `LoginScreen`: Gateway for role-based session initialization. Dynamically fetches credentials from the `auth_config` database node to verify access.
    - `DashboardScreen`: Aggregated kitchen analytics with adaptive layouts for single/dual dietary options and real-time guest management.
    - `SubscriptionForm`: CRUD interface with touch-optimized block dropdowns (18px spacing), mandatory validation, and role-based control.
    - `SettingsScreen`: Administrative interface for managing festival config. Features **Deep Change Detection** to manage save-button states and improved abbreviation input ergonomics.
    - `ReportScreen`: High-precision analytics engine with multiple reporting modes (Day, Meal, Flat, Payment, Not Taken). Uses a space-saving horizontal scroll selector and standardized dietary color-coding (Veg: Green, Non-Veg: Red).
    - `MenuEditorScreen`: Administrative tool for global menu configuration.
    - `ViewMenuScreen`: Read-only feast visibility for operational staff.
    - `ScannerScreen`: Optimized QR scanning interface with centered target alignment.
- **Components**: Atomic and reusable UI units.
    - `CustomAlert`: A centralized, themed replacement for system dialogs.
    - `Metrics`: Specialized data visualization tiles for dashboard and financial tracking.
    - `LogoutButton`: A global session termination component available in every operational header.
    - `ActionLabels`: Standardized Icon+Text component used across all major action buttons (Reports, Sharing, Logout) to ensure UI consistency and high legibility.
- **Navigation**: Custom state-based navigation in `App.tsx`, synchronized with Android hardware back-button logic.

### 📂 Logic & Constants Layer (`src/constants.ts`, `src/strings.ts`)
- **Dynamic Config**: The app consumes an `AppConfig` object from Firebase containing:
    - **Season Name**: A global string used for branding passes and reports.
    - **Days**: A `ConfigDay[]` structure that controls enabled/disabled days, labels, meal slot availability, dietary options, and parcel support.
- **Logic Layer Helpers**: Includes `src/constants.ts` for visibility logic and **Automatic Schema Sanitization** which removes menu data when its corresponding day is deleted from config.
- **Strict Settings Priority**: Helpers strictly check the active configuration. If a day or meal is disabled, its historical data is masked and it is removed from all summaries and demands. Global action buttons (Add/Edit) are also dynamically disabled if no active days exist.
- **Strings**: Centralized UI text dictionary for easy customization and multi- festival support.

### 📂 Data Layer (`src/repository.ts`, `src/firebase.ts`)
- **Real-time Persistence**: Uses Firebase Realtime Database for all subscriptions, menus, configurations, and user credentials (`auth_config`).
- **Data Normalization**: The `normalizeRecord` function handles schema variations, legacy data formats, and enforces matrix integrity (Person x Day x Meal).
- **Atomic Upserts**: Subscriptions are updated by ID to ensure consistent record state.

## 4. Security & Permissions Model

### Internal RBAC (Role-Based Access Control)
The application implements two access levels:
- **Admin**: Full read/write/delete privileges on all modules, including **Settings**.
- **Vendor**: Operational access. Can mark food as taken for residents, update Guest collections (Taken/Demand splits), toggle Parcel options, and view **Reporting**. Sensitive CRUD actions for residents and global settings are hidden.

**Note**: The user registry is fetched from the database root on demand during the login handshake.

### Security Implementation
- **Field-Level Locking**: UI components evaluate the `userRole` to toggle `editable` properties or adjust opacity on sensitive interactive elements.
- **Backend Protection**: Enforced via **Firebase Security Rules** (`database.rules.json`) requiring valid authentication for all read/write operations.

## 5. Data Models (`src/types.ts`)

### `SubscriptionRecord`
Represents a flat's food registration.
- `id`: Stable ID (`block-flat`).
- `mealSlots`: Granular meal/parcel selection matrix (Person x Day). Each slot stores a `MealChoice` (None/Veg/Non-veg) and parcel status.
- `takenByPerson`: Real-time collection matrix.

### `ConfigDay`
The schema for dynamic festival configuration.
- `vegOnly`: Global flag to assume "Veg" for all meals on a specific day.
- `meals`: `{ breakfast: boolean, lunch: boolean, dinner: boolean }`
- `dietary`: `{ veg: boolean, nonVeg: boolean }`
- `parcels`: `{ breakfast: boolean, lunch: boolean, dinner: boolean }`

## 6. Performance & Synchronization Patterns
- **Transition-Based Data Sync**: To eliminate reliance on stale or cached data, the application performs a comprehensive backend fetch on every screen transition. A global loading state is triggered only during the initial home page load after login; subsequent transitions perform silent background updates to ensure a smooth, uninterrupted user experience while maintaining data integrity.
- **Periodic Background Refresh**: To handle long-running sessions on a single screen (e.g., the kitchen dashboard), a background interval triggers a silent sync every 10 seconds. This ensures that metrics like "Taken" counts and "Guest Demand" are always reflective of the latest backend state without requiring manual page reloads.
- **Windowed Rendering**: `FlatList` optimization to handle high volumes of flat records (1000+).
- **Memoized Selectors**: Reports and Dashboard metrics use `useMemo` with deduplication logic to ensure high accuracy and zero UI lag during real-time data sync.
- **CaptureRef (Digital Pass)**: Asynchronous PNG generation for reports and QR passes. The "Digital Pass" design encapsulates stable flat details and branding into a single sharable image to ensure information persistence regardless of future subscription edits.
