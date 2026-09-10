# Eternia Food Desk - Architecture Documentation

This document describes the high-level architecture, data structures, and design patterns used in the **Eternia Food Desk** application.

## 1. System Overview
Eternia Food Desk is a mobile application built with **React Native (Expo)** designed to manage high-volume food distribution. It uses a **Serverless Architecture** with **Firebase** as the backend for real-time data synchronization and dynamic configuration.

## 2. Technical Stack
- **Framework**: React Native with Expo (Latest SDK)
- **Language**: TypeScript (Strict mode)
- **Backend**: Firebase Realtime Database
- **Auth**: Hybrid model using Internal Role-based Login and Firebase Anonymous Authentication (initialized post-login).
- **Scanning**: `expo-camera` for QR code processing.
- **Reporting**: `react-native-view-shot` for PNG export.

## 3. High-Level Architecture
The project follows a **Modular Layered Architecture**:

### 📂 Presentation Layer (`src/screens`, `src/components`)
- **Screens**: Discrete full-page views.
    - `LoginScreen`: Gateway for role-based session initialization.
    - `DashboardScreen`: Aggregated kitchen analytics and real-time guest taken tracking.
    - `SubscriptionForm`: CRUD interface with mandatory Flat No validation, live preview, and granular meal planning (None/Veg/Non-Veg per slot).
    - `SettingsScreen`: Administrative interface for managing the database-driven festival configuration with strict enforcement of visibility rules.
    - `ReportScreen`: High-precision analytics engine with multiple reporting modes (Day, Meal, Flat, Payment, Single Meal) and PNG export, respecting active configurations.
    - `MenuEditorScreen`: Administrative tool for global menu configuration.
    - `ViewMenuScreen`: Read-only feast visibility for operational staff.
    - `ScannerScreen`: Optimized QR scanning interface with centered target alignment.
- **Components**: Atomic and reusable UI units.
    - `CustomAlert`: A centralized, themed replacement for system dialogs.
    - `Metrics`: Specialized data visualization tiles for dashboard and financial tracking.
    - `ActionLabels`: Icon+Text combinations used consistently for interactive elements.
- **Navigation**: Custom state-based navigation in `App.tsx`, synchronized with Android hardware back-button logic.

### 📂 Logic & Constants Layer (`src/constants.ts`, `src/strings.ts`)
- **Dynamic Config**: The app consumes a `ConfigDay[]` structure from Firebase that controls:
    - Enabled/Disabled days.
    - Labels and Abbreviations.
    - Meal slot availability (Breakfast/Lunch/Dinner).
    - Dietary options (Veg/Non-Veg) enabled per specific meal slot.
    - Parcel support enabled per specific meal slot.
- **Strict Settings Priority**: Helpers in `src/constants.ts` and UI components strictly check the active configuration. If a day or meal is disabled, its historical data is masked and it is removed from all summaries and demands.
- **Strings**: Centralized UI text dictionary for easy customization.

### 📂 Data Layer (`src/repository.ts`, `src/firebase.ts`)
- **Real-time Persistence**: Uses Firebase Realtime Database for all subscriptions, menus, and configurations.
- **Data Normalization**: The `normalizeRecord` function handles schema variations, legacy data formats, and enforces matrix integrity (Person x Day x Meal).
- **Atomic Upserts**: Subscriptions are updated by ID to ensure consistent record state.

## 4. Security & Permissions Model

### Internal RBAC (Role-Based Access Control)
The application implements two access levels:
- **Admin**: Full read/write/delete privileges on all modules, including **Settings**.
- **Vendor**: Operational access. Can mark food as taken for residents, update Guest Taken counts, and view **Reporting**. Sensitive CRUD actions and global configurations are hidden.

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
- `meals`: `{ breakfast: boolean, lunch: boolean, dinner: boolean }`
- `dietary`: `{ veg: boolean, nonVeg: boolean }`
- `parcels`: `{ breakfast: boolean, lunch: boolean, dinner: boolean }`

## 6. Performance Design Patterns
- **Windowed Rendering**: `FlatList` optimization to handle high volumes of flat records (1000+).
- **Memoized Selectors**: Reports and Dashboard metrics use `useMemo` with deduplication logic to ensure high accuracy and zero UI lag during real-time data sync.
- **CaptureRef**: Asynchronous PNG generation for reports, allowing admins to share complex data views as static images.
