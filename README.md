# Eternia Food Desk (Durga Puja Food Management)

A robust Expo React Native application designed for food admins and volunteers to manage feast subscriptions, daily menus, and meal distribution during Durga Puja.

## ✨ Key Features

### 🔐 Security & Access Control
- **Role-Based Login**: Integrated login system with two distinct roles (**Admin** and **Vendor**).
- **Permissions Management**:
    - **Admin**: Full access to register flats, update configurations, edit menu items, and delete records.
    - **Vendor**: Operational access to distribute food, view reports, and track guest collections.

### 📋 Subscription Management
- **Digital Registration**: Register flats with block number, flat number, and headcount. **Flat Number is a mandatory field**. Supports zero-payment entries.
- **Granular Meal Planning**: Configure food choices (Veg/Non-Veg/None) individually for each meal slot (Breakfast, Lunch, Dinner) for each person.
- **Dynamic Color Coding**: UI elements automatically change color (Green/Red/Green-Dark) based on the selected dietary choice (Veg/Non-Veg/Taken) for intuitive tracking.
- **Payment Tracking**: Log UPI and Cash subscriptions with a live collection summary.
- **Stable QR Identity**: Each flat gets a unique, permanent QR code based on its `block-flat` ID.

### 🍛 Daily Menu & Operations
- **Live Menu Management**: Admins can update the daily menu for each meal. Items are added one-by-one with specific Veg/Non-Veg indicators.
- **Dedicated Menu View**: A clean, non-editable view for volunteers to see the feast plan.
- **Kitchen Dashboard**: Real-time operational data showing exactly how many plates and parcels are needed, strictly filtered by current festival configuration.
- **Integrated Guest Tracking**: Mark **Guest Veg Taken** and **Guest Non-Veg Taken** counts directly from the dashboard. `Guest Taken` is automatically calculated.

### 📊 Advanced Reporting
- **Multi-View Engine**: Generate reports by Day, Meal, Flat, Payment, or Single Meal Specific.
- **Precision Metrics**: Detailed segregation of Resident vs. Guest demand for both Veg and Non-Veg across all meal slots.
- **Distribution Tracking**: Real-time "Meal Taken" vs. "Meal Not Taken" metrics with granular Resident/Guest splits, respecting enabled/disabled settings.
- **PNG Export**: Convert any report into a high-quality image and share it instantly via WhatsApp or Email.

### ⚙️ Dynamic Configuration (Zero-Code Customization)
- **Settings Screen**: Admins can manage the entire festival structure directly from the app.
- **Strict Settings Priority**: Disabled days, meal slots, or dietary options are completely hidden and ignored in all calculations, ensuring distribution only follows the active plan.
- **Day/Meal Management**: Add or remove days, and toggle specific meal slots (B/L/D), dietary options (Veg/NV) per slot, or Parcel support.
- **Database Driven**: All configurations are stored in Firebase, allowing real-time updates across all devices without app updates.
- **Labels & Abbreviations**: Custom display names and legends are centrally managed.

### ⚡ Efficient Distribution
- **QR Scanner**: Fast check-in at the food desk using the built-in camera scanner with centered target alignment.
- **Per-Meal Tracking**: Mark food as "Taken" for each meal individually (Breakfast, Lunch, Dinner) per person.
- **Native Navigation**: Full synchronization with Android hardware back-button logic for a seamless experience.

### 🎨 Polished UI/UX
- **Custom Alerts**: Replaced system default dialogs with a sleek, themed `CustomAlert` component for a unified professional look.
- **Responsive Layouts**: Optimized for various screen sizes with `KeyboardAvoidingView` and `ScrollView` integrations.

### 🏗️ Technical Highlights
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
   *Note: Ensure the `menu`, `subscriptions`, and `config` paths are correctly configured in `database.rules.json`.*

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
