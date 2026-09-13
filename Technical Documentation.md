# Technical Documentation - Eternia Food Desk

A comprehensive technical breakdown of the implementation, data flow, and architectural patterns within the Eternia Food Desk application.

## 1. Core Architecture
The application follows a **Serverless Modular Architecture** built on the **Expo React Native** framework, utilizing **Firebase Realtime Database** for synchronized persistence.

### High-Level Flow
1.  **Bootstrapping**: `App.tsx` initializes global state and checks for session validity.
2.  **Authentication**: `LoginScreen` verifies credentials against the `auth_config` DB node in real-time.
3.  **Hydration**: Upon login or screen transition, the app performs a full fetch of subscriptions, menu, and configuration.
4.  **Presentation**: UI elements are rendered conditionally based on the global `AppConfig` (Branding, Payment, Day Rules).

---

## 2. Key Technical Implementations

### A. Dynamic Configuration Engine
The entire application is strictly **Config-Driven**. The `AppConfig` object controls:
- **Branding**: `seasonName` updates all shared Digital Pass headers and Report captions.
- **Financial Visibility**: The `payment` node toggles the display of all "Amount" and "Payment Mode" fields across the app.
- **Functional Rules**: `days[]` controls enabled meals, dietary options, and parcel support per slot.

### B. Centralized UI String Management
The application employs a **Zero-Hardcoding Policy** for UI text. All strings are defined in `src/strings.ts`. 
- **Consistency**: Prevents terminology drift (e.g., mixing "Veg" and "Vegetarian").
- **Scalability**: Allows for instant global updates to labels or placeholders.
- **Localization Ready**: The infrastructure is in place to support multiple languages by swapping the `UI_TEXT` object.

### C. Real-Time Synchronization Strategy
- **Transition-Based Sync**: Triggers a silent fetch whenever the `screen` state changes.
- **Periodic Background Refresh**: Runs every 10 seconds. This is critical for synchronizing "Food Taken" counts and "Guest Demand" in a multi-user environment.

### C. Data Normalization Layer
Implemented in `src/repository.ts`, `normalizeRecord` ensures that the local matrices (Person x Day x Meal) are always correctly sized and shaped, regardless of changes in headcount or festival day count.

### D. Digital Pass & Reporting
- **Image Generation**: Uses `captureRef` from `react-native-view-shot` to convert themed views into PNGs.
- **Analytics Engine**: Uses `useMemo` hooks to calculate demand splits between Residents vs. Guests for multiple payment modes and dietary choices.

---

## 3. Security & Session Management

### Role-Based Access Control (RBAC)
- **Database Node**: `auth_config` stores staff credentials and roles.
- **Admin**: Full write/delete access.
- **Vendor**: Read-only access to subscriptions and restricted "Taken" status updates.

### Session Lifecycle
- **Ephemeral Persistence**: Login state is stored in React state only. Users are prompted for credentials every time the app is launched.
- **Auto-Logout**: A `sessionStartTime` state is tracked. If the app remains open for more than 24 hours, the background refresh cycle triggers an automatic `handleLogout`.

---

## 4. Component-Based Model

### A. Common & Layout Components
| Component | Responsibility |
| :--- | :--- |
| `ActionLabel` | Combines Ionicons and labels. Supports horizontal rows and vertical tiles. |
| `Dropdown` | Modal-based selector optimized with 18px padding for touch accuracy. |
| `CustomAlert` | Themed, high-contrast replacement for system dialogs. |

### B. Specialized Metric Tiles
- **Dashboard Metrics**: Sleek, earthy-toned cards with high-precision typography.
- **Collection Metric**: Formats currency (Rs) and breakdown for enabled payment modes.

---

## 5. UI/UX Architecture

### Layout Optimization
- **Quick-Action Tiles**: Home page grid replaces basic list views for a "sleek" entry experience.
- **Dedicated Subscription Screen**: Offloads pass management to a standalone screen with high-performance search.
- **Compact Selectors**: Uses "P1", "P2" for members and 3-char abbreviations for days to maximize screen real-estate.
- **Password Toggle**: Integrated visibility switch in the Login screen.
- **Adaptive Buttons**: "Add Item" button changes color based on the selected dietary type (Green/Red).

---
© 2026 Eternia Food Desk Technical Team
