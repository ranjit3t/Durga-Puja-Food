# Eternia Food Desk (Durga Puja Food Management)

A robust Expo React Native application designed for food admins and volunteers to manage feast subscriptions, daily menus, and meal distribution during Durga Puja.

## ✨ Key Features

### 🔐 Security & Access Control
- **Database-Driven Authentication**: All user credentials, passwords, and roles are managed centrally in the Firebase Realtime Database (`auth_config` node). This allows for instant staff updates without code changes.
- **Session Security**: For maximum security, the app does not store persistent login state across app restarts. Users are prompted for a fresh login every time the app is launched.
- **Auto-Logout**: If the app stays open (foreground or background) for more than 24 hours, the session automatically expires, and the user is logged out.
- **Role-Based Permissions**:
    - **Admin**: Full access to register flats, update festival settings, edit menu items, and delete records.
    - **Vendor**: Operational access to distribute food, manage guest collections, toggle parcels, and view reports.
- **Global Logout**: Quick-access logout button available in the header of every screen for secure session management.

### 📋 Subscription & Pass Management
- **Dedicated Pass List**: A standalone **Subscriptions** screen centralizes pass discovery with high-performance search and filtering.
- **Digital Registration**: Register flats with block number, flat number, and headcount. **Flat Number is a mandatory field**. Supports zero-payment entries.
- **Compact Member Selection**: Uses space-saving "P1", "P2", "P3" labels for selecting individual members, ensuring the interface remains usable for large groups.
- **Granular Meal Planning**: Configure food choices (Veg/Non-Veg/None) individually for each meal slot (Breakfast, Lunch, Dinner) for each person.
- **Payment tracking (Optional)**: Dynamic configuration allows enabling/disabling payment tracking globally. Supports multiple methods (UPI, Cash, Bank Transfer).
- **Stable QR Identity**: Each flat gets a unique, permanent QR code based on its `block-flat` ID.
- **Professional Digital Pass**: Generates a branded "Digital Pass" image containing the Season Name, Flat ID, Headcount, and Instructions. Specifically excludes volatile meal details to ensure pass longevity.

### 🍛 Daily Menu & Operations
- **Live Menu Management**: Admins can update the daily menu for each meal. Items are added one-by-one with specific Veg/Non-Veg indicators.
- **Adaptive Add Button**: The "Add Item" (+) button in the menu editor dynamically changes color to Green (Veg) or Red (Non-Veg) based on the selected dietary type for instant feedback.
- **Dedicated Menu View**: A clean, non-editable view for volunteers to see the feast plan.
- **Kitchen Dashboard**: Real-time operational data showing exactly how many plates and parcels are needed, strictly filtered by current festival configuration.
- **Sleek Financial Overview**: A professional, earthy-toned summary of total collections, visible only when payment integration is enabled.

### 📊 Advanced Reporting
- **Multi-View Engine**: Generate reports by Day, Meal, Flat, Payment, or Single Meal Specific.
- **Payment Summary**: Comprehensive breakdown of UPI, Cash, and Bank Transfer collections.
- **Space-Saving UI**: Features a horizontal scrollable selection bar for report types and compact selectors for Days and Meals.
- **Color-Coded Data**: All dietary text is intuitively color-coded (Green for Veg, Red for Non-Veg) for rapid scanning.
- **PNG Export**: Convert any report into a high-quality image and share it instantly via WhatsApp or Email.

### ⚙️ Dynamic Configuration (Zero-Code Customization)
- **Settings Screen**: Admins can manage the entire festival structure directly from the app.
- **Centralized String Dictionary**: Zero hardcoded strings in the UI components. All text is sourced from a central repository, ensuring 100% consistency across all screens and shared pass images.
- **Global Season Name**: A persistent setting in the database that dynamically updates the header of all shared Digital Passes and Reports.
- **Dynamic Payment Rules**: Toggle global payment status and select enabled payment methods (UPI/Cash/Bank). Hides all financial fields globally if payments are disabled.
- **Smart Save Logic**: The "Update All Settings" button intelligently detects changes and remains disabled until modifications exist.
- **Automatic Menu Cleanup**: Deleting a festival day from settings automatically scrubs all associated menu data from the database.
- **Veg Only Toggle**: Easily convert a day to "Veg only" mode, which simplifies the entire app UI for that day.
- **Labels & Abbreviations**: Custom display names and legends are centrally managed.

### 🎨 Polished UI/UX
- **Quick-Action Dashboard**: The Home page features a sleek, tile-based grid for fast access to core modules like Subscriptions, Scan QR, and Reports.
- **Password Visibility**: Added a "Show/Hide" toggle in the login field for user convenience.
- **Full Meal Names**: Replaced confusing abbreviations with full names ("Breakfast", "Lunch", "Dinner") in all primary selection buttons.
- **Optimized Layouts**: Touch-friendly dropdowns (18px spacing), elevated FAB positioning, and vertically stacked legends to prevent overflow.

---
© 2026 Eternia Festival Committee
