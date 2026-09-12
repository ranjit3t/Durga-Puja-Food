# Eternia Food Desk (Durga Puja Food Management)

A robust Expo React Native application designed for food admins and volunteers to manage feast subscriptions, daily menus, and meal distribution during Durga Puja.

## ✨ Key Features

### 🔐 Security & Access Control
- **Database-Driven Authentication**: All user credentials, passwords, and roles are managed centrally in the Firebase Realtime Database (`auth_config` node). This allows for instant staff updates without code changes.
- **Session Persistence**: Securely stores the user session on the device for 24 hours. After this period, the app automatically logs out the user to ensure security.
- **Role-Based Permissions**:
    - **Admin**: Full access to register flats, update festival settings, edit menu items, and delete records.
    - **Vendor**: Operational access to distribute food, manage guest collections, toggle parcels, and view reports.
- **Global Logout**: Quick-access logout button available in the header of every screen for secure session management.

### 📋 Subscription Management
- **Digital Registration**: Register flats with block number, flat number, and headcount. **Flat Number is a mandatory field**. Supports zero-payment entries.
- **Granular Meal Planning**: Configure food choices (Veg/Non-Veg/None) individually for each meal slot (Breakfast, Lunch, Dinner) for each person.
- **Dynamic Color Coding**: UI elements automatically change color (Green/Red/Green-Dark) based on the selected dietary choice (Veg/Non-Veg/Taken) for intuitive tracking.
- **Payment Tracking**: Log UPI and Cash subscriptions with a live collection summary.
- **Stable QR Identity**: Each flat gets a unique, permanent QR code based on its `block-flat` ID.
- **Professional Digital Pass**: Generates a branded "Digital Pass" image for sharing. It includes the Event Title, Flat ID, Headcount, and Verification Instructions. Specifically designed to exclude volatile food legends to ensure the pass remains valid even after subscription edits.

### 🍛 Daily Menu & Operations
- **Live Menu Management**: Admins can update the daily menu for each meal. Items are added one-by-one with specific Veg/Non-Veg indicators.
- **Dedicated Menu View**: A clean, non-editable view for volunteers to see the feast plan.
- **Kitchen Dashboard**: Real-time operational data showing exactly how many plates and parcels are needed, strictly filtered by current festival configuration.
- **Adaptive Dashboard UI**: Automatically simplifies the view for single-dietary meals (e.g., Veg-only days), hiding redundant splits for faster reading.
- **Integrated Guest Tracking**: Mark **Guest Taken** counts directly from the dashboard. Both Admins and Vendors can update guest collections and demand splits on the fly.
- **Demand Validation**: Intelligent safeguards prevent guest collection counts from exceeding total guest demand.

### 📊 Advanced Reporting
- **Multi-View Engine**: Generate reports by Day, Meal, Flat, Payment, or Single Meal Specific.
- **Space-Saving UI**: Features a horizontal scrollable selection bar for report types, maximizing screen space for actual data visualization.
- **Color-Coded Data**: All dietary text is intuitively color-coded (Green for Veg, Red for Non-Veg) across all reports for rapid scanning.
- **Single Meal Not Taken**: Dedicated report listing flats that haven't collected a specific meal yet, with detailed dietary splits.
- **Precision Metrics**: Detailed segregation of Resident vs. Guest demand for both Veg and Non-Veg across all meal slots.
- **Parcel Breakdowns**: Comprehensive tracking of Veg vs. Non-Veg parcels across all report types (Day, Meal, Flat).
- **Distribution Tracking**: Real-time "Meal Taken" vs. "Meal Not Taken" metrics with granular Resident/Guest splits, respecting enabled/disabled settings.
- **Config-Aware Visibility**: Reports automatically hide disabled dietary options (e.g., hiding Non-Veg columns on Veg-only days) to keep data clear and concise.
- **PNG Export**: Convert any report into a high-quality image and share it instantly via WhatsApp or Email.

### ⚙️ Dynamic Configuration (Zero-Code Customization)
- **Settings Screen**: Admins can manage the entire festival structure directly from the app.
- **Global Season Name**: A persistent setting in the database that dynamically updates the header of all shared Digital Passes and Reports.
- **Smart Save Logic**: The "Update All Settings" button intelligently detects changes. It remains disabled (opacity: 0.5) until a modification is made (including season name or festival days), preventing redundant database writes.
- **Automatic Menu Cleanup**: Deleting a festival day from settings automatically scrubs all associated menu data (Veg/Non-Veg lists, guest counts) from the database to prevent stale records.
- **Enhanced Input UX**: Redesigned abbreviation and day name input with large, touch-friendly fields and automatic capitalization for error-free legend management.
- **Strict Settings Priority**: Disabled days, meal slots, or dietary options are completely hidden and ignored in all calculations, ensuring distribution only follows the active plan.
- **Veg Only Toggle**: Easily convert a day to "Veg only" mode, which simplifies the entire app UI (Form, Dashboard, Reports) for that day by removing Non-Veg options and assuming vegetarian choices.
- **Day/Meal Management**: Add or remove days, and toggle specific meal slots (B/L/D), dietary options (Veg/NV) per slot, or Parcel support. Feature visibility (like Parcel counts) is intelligently managed per-meal.
- **Database Driven**: All configurations are stored in Firebase, allowing real-time updates across all devices without app updates.
- **Smart Defaults**: New days are added with all meal slots (B/L/D) and Parcels disabled by default to minimize accidental entries.
- **Labels & Abbreviations**: Custom display names and legends are centrally managed.

### ⚡ Efficient Distribution
- **QR Scanner**: Fast check-in at the food desk using the built-in camera scanner with centered target alignment.
- **Per-Meal Tracking**: Mark food as "Taken" for each meal individually (Breakfast, Lunch, Dinner) per person.
- **Parcel Visibility**: Individual meal choices now display a gold "P" badge for easy parcel identification in the flat details view.
- **Native Navigation**: Full synchronization with Android hardware back-button logic for a seamless experience.

### 🎨 Polished UI/UX
- **Custom Alerts**: Replaced system default dialogs with a sleek, themed `CustomAlert` component for a unified professional look.
- **Full Meal Names**: Replaced confusing abbreviations (B/L/D) with full meal names ("Breakfast", "Lunch", "Dinner") in all selection and collection buttons for better clarity.
- **Dynamic Action Control**: The "Add Pass" and "Edit Pass" buttons are intelligently disabled when no active festival days are configured, preventing data entry errors during non-festival periods.
- **Touch-Optimized Dropdowns**: Redesigned block selection with generous vertical spacing (18px padding) and full scrollability for effortless navigation on small screens.
- **Optimized FAB Placement**: The "Add Pass" Floating Action Button is positioned higher (bottom: 90) to avoid interference with Android system navigation bars.
- **Flat UI Design**: Actions like "Save & generate QR" and "Delete" use solid, high-contrast colors (Red/Green) without distracting shadows for a modern aesthetic.
- **Legible Navigation**: Simplified "Back" button styling with sentence-case labels and optimized font sizes for better fit on various device widths.
- **Responsive Layouts**: Optimized for various screen sizes with `KeyboardAvoidingView` and `ScrollView` integrations.

### 🏗️ Technical Highlights
- **Real-time Synchronization**: Implements a transition-based data synchronization strategy, fetching fresh data from Firebase on every screen navigation.
- **Periodic Background Refresh**: Automatically reloads data every 10 seconds when the app remains on the same screen, ensuring live metrics (like guest counts and distribution status) stay current without manual intervention.
- **High Performance**: Optimized with `FlatList` and `useMemo` to handle 1000+ flat records without UI lag.
- **Modular Architecture**: Clean code structure with separated screens, components, and data repository.
- **Customizable UI**: All app text is externalized in `src/strings.ts` for easy branding.
- **Firebase Backend**: Real-time synchronization using Firebase Realtime Database.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI for builds (`npm install -g eas-cli`)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npx expo start
   ```

### Building for Android
To generate an installable APK:
```sh
eas build --platform android --profile preview
```

## ⚙️ Firebase Configuration

The app requires a Firebase project for data persistence.

1. Create a Firebase project and a Web app.
2. Enable **Anonymous Authentication**.
3. Initialize **Realtime Database**.
4. Configure your `.env` file with your Firebase credentials (`EXPO_PUBLIC_FIREBASE_API_KEY`, etc.).
5. Deploy the security rules:
   ```sh
   firebase deploy --only database
   ```
6. **Initialize Users**: Add an `auth_config` node to your database root containing a `users` array with `username`, `password`, and `role` fields.

*Note: Ensure the `menu`, `subscriptions`, `config`, and `auth_config` paths are correctly configured in `database.rules.json`.*

## 📂 Project Structure
- `App.tsx`: App entry point, session management, and global state coordination.
- `src/screens/`: Individual app screens:
    - `LoginScreen.tsx`: Secure role-based gateway.
    - `DashboardScreen.tsx`: Real-time kitchen demand and guest taken metrics.
    - `SubscriptionForm.tsx`: Flat registration and granular meal planning.
    - `SettingsScreen.tsx`: Dynamic configuration for days, meals, and dietary rules.
    - `ReportScreen.tsx`: High-precision analytics engine with PNG sharing.
    - `MenuEditorScreen.tsx`: Admin interface for food items.
    - `ScannerScreen.tsx`: Precision QR scanner.
    - `DetailsScreen.tsx`: Detailed flat records and collection status.
- `src/components/`: Reusable UI components.
- `src/config.ts`: Internal auth and default config structure.
- `src/constants.ts`: Shared logic and config-aware visibility helpers.
- `src/repository.ts`: Firebase data layer and schema normalization.
