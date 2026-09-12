# Technical Documentation - Eternia Food Desk

A comprehensive technical breakdown of the implementation, data flow, and architectural patterns within the Eternia Food Desk application.

## 1. Core Architecture
The application follows a **Serverless Modular Architecture** built on the **Expo React Native** framework, utilizing **Firebase Realtime Database** for synchronized persistence.

### High-Level Flow
1.  **Bootstrapping**: `App.tsx` initializes global state and checks for Firebase configuration.
2.  **Authentication**: `LoginScreen` fetches credentials from the `auth_config` DB node.
3.  **Data Hydration**: On successful login or screen transition, the app performs a full sync from Firebase.
4.  **Presentation**: Screens consume a centralized `ConfigDay[]` to determine which UI elements (meals, dietary options, parcels) are visible and active.

---

## 2. Technical Stack
| Category | Technology |
| :--- | :--- |
| **Framework** | React Native (Expo SDK 57) |
| **Language** | TypeScript (Strict Mode) |
| **Backend** | Firebase Realtime Database |
| **Authentication** | Anonymous (Firebase) + Database-Driven RBAC |
| **Image Export** | `react-native-view-shot` |
| **QR Generation** | `react-native-qrcode-svg` |
| **Storage** | `AsyncStorage` (Auth Persistence) |

---

## 3. Key Technical Implementations

### A. Dynamic Configuration Engine
The entire application is **Config-Driven**. The `ConfigDay[]` array fetched from the database controls the behavior of:
- **Visibility**: Disabled days or meal slots (Breakfast/Lunch/Dinner) are completely removed from the UI.
- **Rules**: "Veg Only" mode automatically masks Non-Veg options and enforces vegetarian selections in the Form, Dashboard, and Reports.
- **Features**: Parcel support and dietary options (Veg/Non-Veg) are toggled per individual meal slot.

### B. Real-Time Synchronization Strategy
The app employs a two-tier sync mechanism:
1.  **Transition-Based Sync**: A silent fetch is triggered in `App.tsx` whenever the `screen` state changes. This ensures that users always land on a screen with the latest data without seeing a global loader (unless it's the initial hydration).
2.  **Periodic Background Refresh**: A `setInterval` loop runs every 10 seconds while the app is active. This is critical for the **Kitchen Dashboard**, where multiple volunteers are marking guests or resident food as taken simultaneously.

### C. Data Normalization Layer
Implemented in `src/repository.ts`, the `normalizeRecord` function acts as a safety barrier between raw database data and the TypeScript UI.
- **Migration Logic**: It automatically handles legacy field names and converts boolean flags into the current `MealChoice` enum.
- **Matrix Integrity**: It ensures that the `mealSlots` (Person x Day x Meal) and `takenByPerson` matrices are correctly sized based on the latest headcount, preventing index-out-of-bounds errors.

### D. Digital Pass Generation
The **"Digital Pass"** isn't just a QR code; it's a dynamic visual card.
- **Implementation**: The `QrScreen` renders a themed `View` containing branding, headcount, and the QR code.
- **Image Capture**: Using `captureRef`, this view is converted into a high-quality PNG.
- **Logic**: It intentionally excludes volatile data (like specific meal choices for each day) to ensure the physical pass remains valid even if a user's subscription details are edited later.

### E. Advanced Reporting Engine
The reporting system uses **Memoized Selectors** (`useMemo`) to calculate complex kitchen demand metrics in real-time.
- **Segregation**: It calculates demand splits between Residents vs. Guests for both Veg and Non-Veg.
- **Drill-down**: Supports 6 distinct report types (Day, Meal, Split, Pending, Flat, Cash) using a unified data source.
- **Theming**: Text colors are dynamically bound to the dietary choice (Green for Veg, Red for Non-Veg) for instant visual scanning.

---

## 4. Security & Access Control

### Role-Based Access Control (RBAC)
- **Database Node**: `auth_config` contains the list of valid staff users.
- **Admin Role**: Unrestricted access to `Settings`, `Delete` actions, and full `SubscriptionForm` editing.
- **Vendor Role**: Operational access. Can mark food as "Taken", update guest counts, and view reports. Sensitive configuration fields are disabled or hidden based on the `userRole` state.

### Firebase Security Rules
```json
{
  "rules": {
    "subscriptions": { ".read": "auth != null", ".write": "auth != null" },
    "menu": { ".read": "auth != null", ".write": "auth != null" },
    "config": { ".read": "auth != null", ".write": "auth != null" },
    "auth_config": { ".read": "auth != null", ".write": false }
  }
}
```
*Note: Write access to `auth_config` is restricted to the Firebase Console only.*

---

## 5. UI/UX Architecture

### Component Pattern: ActionLabels
Major interaction points use the `ActionLabel` atomic component, which pairs a specific **Ionicons** glyph with a text label. This ensures visual consistency and high legibility across diverse screens like Login, Reports, and Pass Details.

### Layout Optimization
- **FAB Placement**: The Add Pass button is elevated (`bottom: 90`) to provide clearance for Android's system navigation bar and back button.
- **Touch-Friendly Dropdowns**: Block selection uses a modal with large padding (`18px`) and full scrollability, specifically optimized for high-volume entry environments.
- **Scroll Bar Selection**: The report type selector uses a horizontal `ScrollView` to minimize vertical space usage, maximizing the area for data grids.

---

## 6. Component-Based Model
The project utilizes a highly modular component architecture, separating atomic UI elements from complex business logic. Components are organized into functional sub-directories.

### A. Common & Foundation Components (`src/components/common`)
| Component | Responsibility |
| :--- | :--- |
| `ActionLabel` | A standard interaction unit combining an **Ionicons** glyph and a text label. Used for all primary action buttons (Share, Logout, Scan) to ensure visual consistency. |
| `BackButton` | A specialized navigation component with optimized font sizes and sentence-case labels to ensure fitment across various mobile device widths. |
| `LogoutButton` | A pre-configured version of `ActionLabel` that handles global session termination, present in every operational header. |
| `Dropdown` | A touch-optimized selection component using a **Modal** overlay. Features generous vertical spacing (18px) and full scrollability, designed for high-volume entry environments. |
| `CustomAlert` | A themed, modal-based replacement for system default dialogs. Supports multiple button styles (Primary, Cancel, Destructive) and provides a unified professional look. |

### B. Data Visualization & Metrics (`src/components/common`)
| Component | Responsibility |
| :--- | :--- |
| `Metric` | A basic read-only tile displaying an icon, a numeric value, and a label. Used extensively in the Dashboard for rapid data consumption. |
| `EditableMetric` | An interactive version of the Metric tile. It toggles into an input field on tap, allowing for real-time manual updates (e.g., Guest Counts) with built-in validation logic. |
| `CollectionMetric` | A specialized tile optimized for financial data, featuring currency symbols (Rs) and fixed-decimal formatting. |

### C. Menu Management Components (`src/components/menu`)
| Component | Responsibility |
| :--- | :--- |
| `MealDisplay` | Renders the items for a specific meal slot (Breakfast/Lunch/Dinner). It automatically separates Veg and Non-veg items and respects the active festival configuration. |
| `MealMenuEditor` | An administrative interface for building the daily feast. Supports one-by-one item addition, dietary tagging, and instant removal with real-time state updates. |
| `MealSummaryInline` | A ultra-compact version of the menu used in list views (like the Subscription list) to show what's cooking without cluttering the screen. |

---

## 7. Performance Optimizations
- **Windowed Rendering**: `FlatList` in the Home screen uses `initialNumToRender` and `windowSize` to maintain 60FPS even with hundreds of flat records.
- **Deduplication**: Subscription lists are keyed by stable IDs to prevent duplicate rendering during real-time sync.
- **Lazy Hydration**: Components only compute derived states (like meal summaries) when the underlying data changes, leveraging React's memoization hooks.

---
© 2026 Eternia Food Desk Technical Team
