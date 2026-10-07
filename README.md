# FestiveDesk Operations — System Architecture & Technical Documentation

A high-performance Expo React Native & Web application designed for festival committees, administrators, and volunteers to manage resident pass subscriptions, daily gourmet menus, meal distribution, quick meal checkouts, free meal plate tracking, OCR payment verification, and real-time kitchen analytics during large scale community festivals like **Durga Puja**.

---

## 📐 System Architecture & Overview

The application follows a decoupled, context-driven component architecture with a centralized **Universal Real-Time Firebase Repository Layer** and decoupled sub-contexts (`CoreDatabaseContext`, `ActivityLogsContext`, `NotesContext`). It supports multi-platform execution with 100% feature parity across **Mobile (Android/iOS Native)** and **Desktop/Web Browsers**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Native / Expo UI                        │
│  (Screens, Components, Festive Royal Theme Engine, Responsive Breakpoints)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Decoupled Context Provider Layer                    │
│   AuthContext ┆ CoreDatabaseContext ┆ ActivityLogsContext ┆ NotesContext│
│                    NavigationContext ┆ UIContext                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│             Universal WebSocket Delta Engine & Debounced Batcher        │
│   (Sub-100ms push, progressive hydration, 100ms/150ms event batching)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Firebase Realtime Database                       │
│ subscriptions ┆ menu ┆ config ┆ auth_config ┆ logs ┆ notes ┆ metrics  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack & Key Libraries

| Technology / Library | Purpose & Usage |
| :--- | :--- |
| **React Native / Expo (v57+)** | Core cross-platform app framework targeting Android, iOS, and Web. |
| **TypeScript (v5.3+)** | Strict type safety for domain models, context providers, and props. |
| **Metro Transformer (`inlineRequires: true`)** | Defers JS module loading at runtime in `metro.config.js`, accelerating TTI by ~25% and lowering initial baseline RAM. |
| **Firebase Realtime Database** | Sub-100ms WebSocket real-time delta streams across subscriptions, menus, notes, audit logs, and pre-aggregated kitchen metrics. |
| **`expo-camera`** | High-performance camera integration for QR Code pass scanning with isolated memoization for 60 FPS scanning. |
| **`expo-image-picker`** | Camera capture and gallery screenshot selection for payment receipt scanning. |
| **`@react-native-ml-kit/text-recognition`** | On-device Google ML Kit Text Recognition for sub-15ms payment OCR on mobile app bundles (~1MB RAM footprint). |
| **`tesseract.js`** | Open-source client-side OCR engine for extracting UPI transaction IDs & amounts on Web browsers and as fallback on mobile. |
| **`expo-audio` (~57.0.5)** | Modern Expo SDK 57 native audio player engine for triggering checkout completion sound feedback (`assets/checkout.mp3`). |
| **`assets/checkout.mp3`** | Custom audio chime tone played strictly when quick checkout success splash window opens (if sound is enabled). |
| **`react-native-qrcode-svg`** | SVG-based QR code pass matrix generation. |
| **`react-native-view-shot` (`captureRef`)** | Snapshot engine for capturing report cards and digital food passes as theme-padded PNG images. |
| **`expo-sharing` & `expo-print`** | Platform-native sharing dialogs (WhatsApp / System) and HTML document printing. |
| **`@react-native-async-storage/async-storage`** | Local device persistence for theme preferences and session tokens. |
| **`@expo/vector-icons` (Ionicons)** | Vector icons tuned for high-contrast theme states across screens. |

---

## 🧪 Testing & Storybook

- Run unit and component tests with `npm test`; use `npm run test:watch` while developing.
- Tests use `jest-expo` and React Native Testing Library. `jest.setup.ts` mocks storage, icons, Firebase, and native-only Expo APIs so tests do not initialize devices or connect to the backend.
- `sourceModules.test.ts` verifies that every production `.ts`/`.tsx` module under `src`, plus root `App.tsx` and `index.ts`, can be imported. Behavioral tests cover domain normalization, pricing, OCR parsing, counter interactions, and Quick Checkout allocation across adults, kids, and guests, including parcel, partial-service, and completed-pass states. Import checks are not a substitute for behavior tests.
- Run the web catalog with `npm run storybook` (default port `6006`; Storybook selects another available port if it is occupied), or create a static build with `npm run build-storybook`.
- Stories cover shared UI components, feature components, screens, and the app navigator. Storybook uses React Native Web and the real theme provider, with preview-only context and device API mocks to avoid Firebase and hardware access.

## 🎨 Theme Engine & Design System

### 1. Festive Royal Theme Palette
- **Primary Festive Accent**: Royal Festive Crimson Red (`#C41E3A` light / `#FB7185` dark).
- **Secondary Accent**: Warm Satin Gold (`#D4AF37` light / `#FBBF24` dark).
- **Light Theme Canvas**: Soft Ivory Cream (`#FAFAFA`) with crisp surface overlays (`#FFFFFF`).
- **Dark Theme Canvas**: Obsidian Slate (`#0F172A`) with elevated slate surface tiles (`#1E293B`).
- **Standardized Dietary Indicators**: FSSAI standard Emerald Green (`#10B981`) for Vegetarian and Crimson Red (`#EF4444`) for Non-Vegetarian.

### 2. Universal Theme Toggle Button (`ThemeToggleButton.tsx`) & Personalized Header Welcome Badge (`UserGreeting.tsx`)
- **Universal Header Controls**: `ThemeToggleButton` and `LogoutButton` sit side-by-side in the top-right header control bar across all operational screens.
- **Sleek Personalized Header Welcome Badge (`UserGreeting.tsx`)**: Placed in the upper header section directly below the top control buttons row on all 14 operational screens. Renders a theme-aware glassmorphic pill badge (`sparkles` icon + localized prefix + bold user name extracted from `auth_config/users`).
- **Dynamic Layout & Overflow Protection**: Uses responsive `maxBadgeWidth`, `numberOfLines={1}`, and `ellipsizeMode="tail"` truncation to guarantee long names (e.g. `"Sri Satya Narayana Choudhary Mukhopadhyay"`) never overflow or deform header layouts on mobile or web viewports.
- **Camera & Modal Exclusion**: Excluded from camera screens (`ScannerScreen`, `PaymentScannerModal`) and modal overlays to maintain clean viewfinders and dialog focus.

### 3. Peer-to-Peer Realtime Chat Engine (`ChatContext.tsx`, `ChatWidget.tsx`)
- **Deterministic Peer-to-Peer WebSocket Messaging**: Provides real-time messaging between logged-in system users (`admin`, `vendor`). Messages are stored under deterministic chat pairs (`chats/{user1}__${user2}/messages`) with zero message mixing or cross-talk.
- **Firebase Realtime Presence & Last Seen Tracking**: Connects to Firebase `.info/connected` to register online status and `lastSeen` timestamps via `onDisconnect()`.
- **Live Typing Indicators & Read Status**: Tracks live typing state (`typing...`) and message status checkmarks (`✓ Sent`, `✓✓ Delivered`, `✓✓ Read`).
- **Floating Minimized Pill & Unread Count Badge**: Compact floating widget anchored at bottom-right corner (`right: 20`). Displays a real-time unread message counter badge when minimized, expanding into a compact floating popup window on tap.
- **Draggable & Resizable Chat Window (`PanResponder`, `Animated`)**: Fully interactive chat widget and window supporting smooth dragging anywhere across the mobile/web viewport (via the minimized pill or expanded header) and user resizing (via the bottom-right resize handle).
- **Native Keyboard Avoiding & Smooth Scroll**: Wrapped in React Native `KeyboardAvoidingView` with dynamic soft-keyboard height listeners (`Keyboard.addListener`), automatically raising the chat popup container above the soft keyboard on mobile when typing.
- **Strict Camera, Modal, Dropdown & Alert Exclusion**: Automatically hides the chat widget when camera viewfinders (`ScannerScreen`, `PaymentScannerModal`) or modal/dropdown/alert windows (`QuickCheckoutModal`, `QuickFreeMealModal`, `CustomAlert`, `Dropdown`, `Notes` modal, etc.) are active.
- **100% Theme Tokens & Zero Hardcoded Strings**: Styled dynamically via `useAppTheme()` tokens and localized strings from `UI_TEXT` in `strings.ts`.

### 4. Multi-Attribute Audit Trail Security Traceability
- **Name, Username & User Type Logging**: `addActivityLog` records user identity as `Name (username)` (e.g. `"Rahul Sharma (admin)"`) alongside `userRole` (e.g. `"ADMIN"` or `"VENDOR"`).
- **Comprehensive Audit Visibility**: Displays user badges as `Rahul Sharma (admin) (ADMIN)` across all system audit trail views, text exports, and local summaries, providing complete visibility into user Name, Username, and User Type (Role) for security compliance.
- **Clean Audit Trail Messages & Target IDs (`ActivityLogItem.tsx`, `DatabaseContext.tsx`)**: Note and pass deletion logs cleanly expand subject and pass names (e.g. `Deleted note: Kitchen Supplies`, `Removed pass record A-101`) without unexpanded placeholders or raw Firebase push keys (`-P2nIS5P_...`).
- **Real-Time App Version Sync & Platform-Specific Update Links (`HomeScreen.tsx`, `DatabaseContext.tsx`, `repository.ts`)**: Real-time sync of `appVersion`, `androidAppLocation`, and `iosAppLocation` from Firebase DB. Triggers update alert modals on mobile (`Platform.OS !== 'web'`) when local version differs from server, featuring hyperlinked `"Click Here to update."` (`androidAppLocation` on Android, `iosAppLocation` on iOS), with web clients exempt.
- **Sleek QR Pass Side-by-Side Action Bar & Direct View Pass Navigation (`QrScreen.tsx`)**: Renders a compact, perfectly aligned 3-button side-by-side action bar (**View**, **Chat**, **Share** / **Download**) with zero wrapping or overflow across viewports. Binds strictly to theme tokens (`theme.cardColors[0].accentLight` for View, `theme.colors.successLight` for Chat, `theme.colors.primary` for Share) with 1-tap navigation to `AppScreen.DETAILS` and full WCAG 2.1 AA accessibility bindings (`accessibilityRole="button"`, `accessibilityLabel`, `accessibilityHint`).

---

## ♿ Accessibility (a11y) & WCAG 2.1 AA Architecture

FestiveDesk is engineered to meet **WCAG 2.1 Level AA** standards and **Google Material / iOS Accessibility Guidelines**:

### 1. Centralized Localized Accessibility Engine (`UI_TEXT`)
- **Zero Hardcoded Text**: 100% of accessibility labels (`accessibilityLabel`), screen hints (`accessibilityHint`), live announcements (`announceForAccessibility`), and control descriptions are dynamically resolved from the centralized dictionary in [`strings.ts`](src/strings.ts).

### 2. Contrast Ratios (WCAG 2.1 AA Standard ≥ 4.5:1)
- **Light Theme Canvas**: `textMuted` set to `#64748B` on `#FFFFFF` surface (**4.6:1 contrast ratio** ✅).
- **Dark Theme Canvas**: `textMuted` set to `#94A3B8` on `#1E293B` surface (**4.8:1 contrast ratio** ✅).
- **Zero Hardcoded Color Overrides**: Zero inline hex or `rgba(...)` color overrides in UI components; all styling binds dynamically to `theme.colors`.

### 3. Screen Reader Semantics & Focus Management
- **Full Role & State Bindings**: Standardized `accessible={true}`, `accessibilityRole` (`button`, `combobox`, `menuitem`, `header`, `alert`, `switch`, `checkbox`), and state indicators (`accessibilityState={{ expanded, selected, checked, disabled }}`) across interactive components ([`CounterInput.tsx`](src/components/common/CounterInput.tsx), [`Dropdown.tsx`](src/components/common/Dropdown.tsx), [`CustomAlert.tsx`](src/components/common/CustomAlert.tsx), [`ThemeToggleButton.tsx`](src/components/common/ThemeToggleButton.tsx), [`SettingsScreen.tsx`](src/screens/SettingsScreen.tsx), [`QuickCheckoutModal.tsx`](src/components/common/QuickCheckoutModal.tsx)).
- **Live Speech Announcements (`AccessibilityInfo`)**: Triggers real-time VoiceOver / TalkBack announcements (`AccessibilityInfo.announceForAccessibility`) on checkout completions, QR pass scans, and OCR payment receipt extractions.
- **Modal View Isolation**: Enforces `accessibilityViewIsModal={true}` on modal overlays ([`QuickCheckoutModal.tsx`](src/components/common/QuickCheckoutModal.tsx), [`QuickFreeMealModal.tsx`](src/components/common/QuickFreeMealModal.tsx), [`PaymentScannerModal.tsx`](src/components/common/PaymentScannerModal.tsx), [`CustomAlert.tsx`](src/components/common/CustomAlert.tsx)) to trap screen reader focus inside active dialogs.

---

## ⚡ High-Scale Real-Time & Performance Architecture

### 1. Decoupled Context Provider Architecture (Context Splitting)
State is split into 3 independent React contexts inside `DatabaseContext.tsx`:
- `CoreDatabaseContext` (Subscriptions, Food Menu, Day Configs, Kitchen Metrics, Dashboard Demand Totals)
- `ActivityLogsContext` (System Audit Trail Logs)
- `NotesContext` (Collaborative Team Notes)

**Impact**: Operational views (`DashboardScreen`, `SubscriptionListScreen`, `ScannerScreen`, `ReportScreen`, `HomeScreen`, etc.) subscribe exclusively to `useCoreDatabase()`. Background activity logs or note updates **never trigger re-renders** on main operational screens.

### 2. Debounced WebSocket Listener Batching
Firebase real-time delta listeners for activity logs (`onLogsDelta`) and subscriptions (`onSubscriptionsDelta`) use debounced buffer timers (100ms–150ms window).
- **Result**: Grouping 50+ rapid startup `onChildAdded` events into a **single batched update** eliminates initial load screen freezing and CPU thrashing.

### 3. Dual Google ML Kit Native & Tesseract.js Fallback OCR Strategy
- On **Native Android/iOS**, `ocrScanner.ts` uses `@react-native-ml-kit/text-recognition` directly (~1MB RAM footprint, sub-15ms speed).
- On **Web Browsers** and Web Worker environments (`hasWorkerSupport`), `tesseract.js` fallback is triggered for 100% Mobile & Web parity without Hermes `Worker` runtime errors.

### 4. Dashboard Icon-Only 3-Way View Mode Action Bar
Each meal card section on the Analytics & Kitchen Operations Dashboard ([`DashboardScreen.tsx`](src/screens/DashboardScreen.tsx)) features an icon-only action bar with 4 sleek 36px circular buttons:
- **`Grid View`** ([`grid-outline`](src/components/dashboard/MealMetricGrid.tsx)): Standard view showing Planned, Served & Pending metrics.
- **`Planned-Only View`** ([`clipboard-outline`](src/components/dashboard/MealMetricGrid.tsx)): Kitchen-focused view displaying **ONLY Subscribed/Planned demand counts** without clutter from served numbers.
- **`Chart View`** ([`bar-chart-outline`](src/components/dashboard/MealBarChart.tsx)): Visual bar chart progress view.
- **`WhatsApp Share`** ([`logo-whatsapp`](src/screens/DashboardScreen.tsx)): 1-tap card snapshot sharing in green accent.

### 5. Multi-Source Quick Checkout, Category Parcel Controls & Atomic Meal Binding (`QuickCheckoutModal.tsx`, `CounterInput.tsx`, `SettingsScreen.tsx`)
Quick Checkout can be triggered from 4 distinct application entry methods, tracked via `CheckoutSource` enum:
- **`QR Code Scan`** ([`ScannerScreen.tsx`](src/screens/ScannerScreen.tsx)): Verified via live camera QR code scan.
- **`Numeric Passcode Keypad`** ([`ScannerScreen.tsx`](src/screens/ScannerScreen.tsx)): Verified via 4-digit numeric passcode keypad entry.
- **`Pass Details`** ([`DetailsScreen.tsx`](src/screens/DetailsScreen.tsx)): Triggered from the pass inspection view.
- **`Pass Directory`** ([`SubscriptionListScreen.tsx`](src/screens/SubscriptionListScreen.tsx)): Interactive red missed meal badge tap.

**Category-Wise 4-Category Engine & Ordered Priority Allocation Algorithm**:
- **Current Day & Meal Scope**: All limits and allocations strictly target the active current day and meal slot (`currentMealInfo.dayId`, `currentMealInfo.mealType`). Non-current meals cannot be modified via Quick Checkout.
- **4-Category Classification & Strict Boundary Isolation**: Divides member slots into **Adult Veg**, **Adult Non-Veg**, **Kids Veg**, and **Kids Non-Veg** (or **Member Veg** / **Member Non-Veg** when `kidsEnabled = false`). Category matcher (`isSlotInCat`) guarantees zero cross-category meal leakage.
- **Configurable Kids Parcel Controls & Domain Boundary**:
  - **Conditional Settings Visibility**: Kids parcel support toggle (`kidsParcel`) appears under a meal slot strictly when both **Kids Support** (`kidsEnabled = true`) and **Parcel Support** (`parcel = true`) are active. Defaults to `false` (disabled) across current, new, and legacy day configurations.
  - **Inactivation Guard & Active Pass Validation**: Prevents disabling Kids Parcel support in Settings if any active pass contains kids parcel selections for that day/meal (`kidsParcelSubscribedError`).
  - **Pricing & Pass Form Integration**: Pricing calculation evaluates kids parcel fee as 0 when disabled. In Add/Edit Pass, parcel options for kids slots are rendered strictly when `isKidsParcelEnabled` returns `true`.
  - **Quick Checkout & Dine-In Fallback**: In Quick Checkout, when kids parcel is disabled, remaining parcel count for kids categories (`KIDS_VEG`, `KIDS_NON_VEG`) is set to 0. Kids meals are processed as Dine-In only, parcel inputs for kids are omitted, operational summary cards omit kids parcel breakdowns, and no missed parcel discrepancies are logged for kids.
  - **Directory & Reporting Isolation**: Subscription directory parcel badges/filters (`FilterMode.PARCEL`), kitchen metrics, analytics dashboards, report cards, Excel CSV exports, and missed parcel logs ignore kids parcel selections when Kids Parcel support is disabled.
- **Configurable Dine-In Fallback on Parcel Toggle & Independent Count Engine**:
  - **Conditional Settings Visibility**: Dine-In Fallback toggle (`dineInFallbackParcel`) appears under each meal slot in Settings when **Parcel Support** (`parcel = true`) is active, located directly below the Kids Parcel toggle. Defaults to `false` (disabled) across old, new, and legacy meal configurations.
  - **Independent Counts Mode (Fallback Disabled - Default)**: When disabled, Quick Checkout Modal displays exact independent counts for Dine-In and Parcel. Dine-In planned, served, and pending counts reflect strictly Dine-In-only slots, while Parcel counts reflect strictly Parcel slots. Dine-In and Parcel counters operate independently without cross-clamping or mutual max-reduction.
  - **Strict Non-Fallback Allocation**: During checkout submission, Dine-In is allocated strictly from Dine-In-only slots and Parcel strictly from Parcel slots. Extra Dine-In check-ins cannot fall back onto parcel slots, eliminating unintended missed parcel audit log entries (`ActivityAction.MISSED_PARCEL`).
  - **Legacy Fallback Mode (Fallback Enabled)**: When enabled by the user in Settings, the system maintains legacy behavior: Dine-In and Parcel share total unserved meal limits ($P + D \le \text{remMealCount}$), and extra Dine-In check-ins fall back onto unserved parcel slots, generating missed parcel audit logs.
- **Side-by-Side Counter Inputs**: Each active subsection renders **Parcel** (shown first) and **Dine-In** side-by-side in horizontal rows. When fallback is enabled, enforcing $P + D \le \text{remMealCount}$ cross-clamps inputs; when fallback is disabled, Dine-In and Parcel inputs are independent within their respective slot limits.
- **Dynamic Parcel Hiding**: When remaining parcel count for a subsection is `0` (`remParcelCount === 0`) or parcel service is disabled, the Parcel input field is omitted and the Dine-In input spans full width.
- **Dynamic Subsection & Section Omission**: Empty subsections (`remMealCount === 0` and `remParcelCount === 0`) and empty sections are automatically omitted. On Veg-Only days (`isVegOnlyDay = true`), Non-Veg subsections are omitted. On Non-Veg only meals, Veg subsections are omitted.
- **Ordered Priority Allocation Algorithm & Sequential UI Slot Matching**:
  - **Sequential First-Available UI Slot Order**: Category processing (`categoryOrder`) strictly follows the top-to-bottom section rendering order (**Adult Veg** $\rightarrow$ **Adult Non-Veg** $\rightarrow$ **Kids Veg** $\rightarrow$ **Kids Non-Veg**). Member slot scanning ($i = 0..N-1$) strictly evaluates the first available unserved slot in sequential pass order matching the UI display without random shuffling.
  - **Strict Parcel Allocation ($P$ times)**: Scans slots in order ($i = 0..N-1$) for the first unserved member belonging to the category who opted for parcel (`slot[parcelKey] === true` and `!taken[parcelKey]`), marking `foodTaken = true` and `parcelTaken = true`. Parcel is **never** allocated to Dine-In-only slots as fallback.
  - **Prioritized Dine-In Allocation ($D$ times)**: Priority 1 scans for the first unserved member who did **not** opt for parcel (`!slot[parcelKey]`), marking `foodTaken = true`. Priority 2 (fallback) scans for parcel-opted unserved members, marking `foodTaken = true` while leaving `parcelTaken = false`. Dine-In expands up to total category subscribed meals (`remMealCount`).
- **Unsubscribed Member Protection**: Unsubscribed member slots (`DietaryOption.NONE` or unconfigured) are strictly excluded from limit calculations and can **never** be marked `foodTaken = true` or `parcelTaken = true`.
- **Parcel Discrepancy Detection**: If a parcel-opted member is served Dine-In when all meals for the category/pass are completed, automatically logs a Missed Parcel activity log (`ActivityAction.MISSED_PARCEL`).
- **Slot Lockout & Immutability**: Once `foodTaken = true` is marked for any slot, that slot is locked and unavailable for subsequent selections.
- **Compact Viewport Design & Pinned Action Row**: Action buttons (`Close` and `Checkout`) are pinned at the bottom of the card container, ensuring the **Checkout** button is 100% guaranteed to remain visible in the viewport.
- **Human-Readable Success Splash Overlay**: Full-height green confirmation overlay (`theme.colors.successLight`) with glowing checkmark badge, total plates served, overall progress status, and human-readable category breakdown (e.g. `• Adult Veg: 1 Dine-In, 1 Parcel`).
- **`expo-audio` Chime Integration**: Uses Expo SDK 57's native `expo-audio` engine (`createAudioPlayer`) to play [`assets/checkout.mp3`](assets/checkout.mp3) sound tone strictly when the success splash overlay opens (if `soundEnabled === true`).
- **Configurable Splash Timeout (0ms to 10000ms, default 3000ms)**: Managed in System Settings ([`SettingsScreen.tsx`](src/screens/SettingsScreen.tsx)).
- **Compact & Smart Category Breakdown Summary**: The Operational Summary Box renders an ultra-compact, single-line breakdown per category (e.g. `• Adult Veg: Dine-In: 2 (2 rem) | Parcel: 1 (1 rem)`), providing high-density metrics while reducing modal summary height by >50%.
- **Grammatically Accurate Singular & Plural Handling**: Enforces precise singular/plural terms across all summary, modal, report, and splash overlay screens (`1 plate` vs `2 plates`, `1 parcel` vs `2 parcels`, `1 adult` vs `2 adults`, `1 kid` vs `2 kids`, `1 member` vs `2 members`).
- **Borderless Cohesive Modal Window**: Removed top/bottom content area dividing borders (`borderBottomWidth` under header and `borderTopWidth` above action row), creating a unified, seamless modal card container.
- **Real-Time Alert Section Synchronization**: Dynamic reactivity hook (`useEffect` with `quickCheckoutDetails`) updating partial checkout and parcel pickup alert banners in real-time when remote Firebase data changes while the modal is open.
- **Zero Hardcoded Colors & Text**: 100% theme-driven styling (`theme.colors`) and 100% localized text (`UI_TEXT`).
- **Full WCAG 2.1 AA Accessibility & Web Compliance**: 100% viewport portal scaling on Web browsers, `accessibilityRole="alert"`, `accessibilityViewIsModal={true}`, `accessibilityState`, `accessibilityLabel`, and VoiceOver / TalkBack / ARIA live announcements across all 12 application screens.
- **Responsive Card & Sub-Tab Flexbox Containment**: All button containers, report sub-tabs, and action rows use `flexWrap: "wrap"` or `flex: 1` flexbox containment with `adjustsFontSizeToFit`, guaranteeing buttons stay 100% inside white content card areas across all mobile, tablet, and web viewports.

### 6. Zero-App-Install QR Code Web Ordering & Free Firebase Realtime Status Engine
- **Mobile Browser Execution**: Foodies and attendees scan a QR code at the stall to open the web application on Chrome or Safari **without downloading any native app**.
- **Sub-100ms Live Order Status Page**: Real-time Firebase WebSocket synchronization updates the customer's browser screen instantly (`"Preparing" -> "Token #42 Ready!"`) with a bright green visual alert and audio chime when food is prepared.
- **Zero-Cost Operation (₹0)**: Leverages Firebase Realtime Database and browser Web Push Notifications / Realtime Web Sockets for 100% free automated customer updates.

### 6. Atomic Multi-Path Checkouts & Anti-Duplicate Lock (`checkInPassAtomic`)
- **100% Duplicate Prevention**: Server-side atomic multi-path updates (`update(ref(db), multiPathUpdates)`) lock meal status and increment kitchen metrics in a single transaction.

### 7. Member Food Taken Date & Time Tracking
- **Synchronized Unconditional Timestamps**: Checkouts assign an unconditionally updated timestamp string (`formatTakenTime()`, e.g. `"12 Oct, 1:15 PM"`) to all members served in that transaction, overwriting any stale or pre-existing timestamps.
- **Conditional View Pass Time Badges (`DetailsScreen.tsx`)**: Displays member-level timestamps underneath service badges **strictly only when `foodTaken = true`**, hiding timestamp badges for unserved meal slots.
- **Excel CSV Export Timestamps (`SubscriptionListScreen.tsx`)**: Directory exports include member-level meal taken date & time when meals are served.

### 8. Subscription Amount Validation & Discrepancy Engine (`paymentUtils.ts`, `SubscriptionForm.tsx`)
- **Modular Pricing Engine (`calculateSubscriptionAmount`)**: Calculates total subscription costs by summing meal prices and parcel prices across all active days for both adults and kids (`kidsVegPrice`, `kidsNonVegPrice`, `kidsVegParcelPrice`, `kidsNonVegParcelPrice`). Kids prices strictly resolve from configured kid meal/parcel amounts (evaluating to 0 if unconfigured/empty), while adults resolve from adult food menu prices falling back to day config defaults.
- **Legacy Amount Normalization**: Legacy pass records with missing, `null`, or empty amount fields are normalized to `"0"` (`UI_TEXT.zero`) upon loading in Edit Pass, ensuring consistent rendering and calculations.
- **Payment Input Sanitization**: Amount inputs strictly allow numeric digits and decimal numbers (`/[^0-9.]/g`), pre-populating newly added payment entries with `"0"` and setting empty/invalid inputs back to `"0"` on blur or save.
- **Edit Pass Snapshot & Delta Trigger (`hasMealOrParcelChoicesChanged`)**: Captures initial meal and parcel choices on screen open. Discrepancy checks run only when meal choices, parcel options, or headcounts vary from initial loaded choices (or on new pass registration).
- **Prioritized Confirmation Ordering**: When total entered payments do not match calculated subscription amounts, displays a "Subscription Amount Mismatch" confirmation dialog showing entered vs calculated totals. Save proceeds only if confirmed, and this alert always fires **before** any subsequent alerts (such as missed parcel warnings).
- **Clean Numeric Formatting**: Completely omits currency symbols (`₹`) across payment displays, summary cards, pills, and alert messages in favor of clean numeric formatting.
- **Full WCAG 2.1 AA Accessibility**: 100% WCAG compliant with explicit `accessible={true}`, `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, and `accessibilityState` across all preview cards, payment rows, inputs, and action controls.

### 9. Recent Enhancements & Web Hydration Architecture
- **Dynamic Guest Entity Support & Headcount Configuration (`guestsEnabled`) ([SettingsScreen.tsx](src/screens/SettingsScreen.tsx), [SubscriptionForm.tsx](src/screens/SubscriptionForm.tsx), [QuickCheckoutModal.tsx](src/components/common/QuickCheckoutModal.tsx), [HomeScreen.tsx](src/screens/HomeScreen.tsx), [DashboardScreen.tsx](src/screens/DashboardScreen.tsx))**: Admins can toggle Guest Support (`guestsEnabled`) in System Settings (defaulting to `false`). When enabled, pass registrations track independent guest headcounts (`guestsCount`), guest pricing (Veg, Non-Veg, Parcel, Varieties), guest parcel service, multi-category quick checkout (Adults $\rightarrow$ Kids $\rightarrow$ Guests) with full dual allocation engine support (with/without dine-in fallback), dashboard demand metrics, and report breakdowns. When disabled, guest support is dormant, maintaining 100% backward compatibility.
- **Food Package Discount Engine & Real-time Management ([`FoodPackageScreen.tsx`](src/screens/FoodPackageScreen.tsx), [`paymentUtils.ts`](src/utils/paymentUtils.ts), [`SubscriptionForm.tsx`](src/screens/SubscriptionForm.tsx), [`PackagePassesReport.tsx`](src/components/report/PackagePassesReport.tsx), [`database.rules.json`](database.rules.json))**:
  - **Admin-Only View Menu Navigation**: Accessible via a dedicated "Food Packages" button on the `ViewMenuScreen` header, visible strictly to administrators (`isAdmin`).
  - **Real-Time Package Management Page**: Modeled like `NotesScreen`, displaying active and inactive meal discount packages as clickable cards with applicability badges (`Adults`, `Kids`, `Member`), pricing/discount rate, savings badge, enable/disable toggle switch, edit, and delete actions. Includes full support for the floating real-time `ChatWidget`.
  - **Add/Edit Package Modal with Sub-Category Variety Support**: Supports both **Meal-Based Packages** (fixed package price for selected meals and sub-category varieties) and **Flat Rate Percentage Discounts** (% off eligible meal price with minimum cart value). Enforces single-choice dietary variety selection per meal slot per day and requires explicit variety selection for pricing and saving.
  - **Protected In-Use Packages**: Food packages currently applied to one or more active subscription passes are protected against deletion and editing; they can only be disabled (with unhardcoded warning alerts). Disabled packages cannot be applied to new passes.
  - **Strict Per-Person Package Evaluation Engine**: Automatically evaluates eligible packages per person during Add Pass registration based on headcount category (`adult` packages never apply to kids, `kids` packages never apply to adults) and exact meal & dietary variety matches. Evaluates minimum cart value criteria against meal prices only (excluding parcels). Renders an "Apply Package" button beside payment details when packages qualify.
  - **Independent Per-Person Package Modal**: Allows applying or clearing discount packages for each person independently in multi-member passes. Automatically updates pass total amount combining package prices / flat discounted meal prices, un-packaged meals, and parcel fees (parcels are strictly excluded from discounts and added as extra).
  - **Edit Pass & View Pass Summary Card Markers**: Displays a prominent, high-visibility **"PACKAGE APPLIED"** badge pill directly in the top summary/identity cards of both Edit Pass (`SubscriptionForm.tsx`) and View Pass (`DetailsScreen.tsx`) for passes with applied packages. Renders an "Applied Food Packages" details section in Edit Pass; clicking any applied package name opens a view-only Package Details Modal.
  - **Conditional "Received By" Collector Field**: The "Received By" collector name input field in Add Pass and Edit Pass payment sections is rendered strictly only when Cash (`PaymentMode.CASH`) is selected as the payment mode, and is hidden for all other payment methods.
  - **Dedicated Package Passes Report ([`PackagePassesReport.tsx`](src/components/report/PackagePassesReport.tsx))**: Added a "Package Passes" report tab under Reports listing all passes with applied packages, member headcount, paid totals, and applied package details per member, with 1-tap navigation to View Pass (`DetailsScreen.tsx`).
  - **Discrepancy Exemption**: Passes with an applied package (`isPackageApplied: true`) are exempted from amount discrepancy warning alerts and automatically filtered out from `AmountDiscrepancyReport`.
  - **Plain Currency Formatting & WCAG 2.1 AA Compliance**: All amounts and package prices display plain currency formatting (`formatCurrencyAmount` preserving exact decimals without truncation), paired with 1-wcag accessibility integration.
  - **Firebase Realtime Sync & Security**: Realtime WebSocket sync via `/food_packages` node with authenticated security rules in `database.rules.json`.
- **Payment Amount Discrepancy Report Sub-View ([`AmountDiscrepancyReport.tsx`](src/components/report/AmountDiscrepancyReport.tsx), [`PaymentSummaryReport.tsx`](src/components/report/PaymentSummaryReport.tsx), [`paymentUtils.ts`](src/utils/paymentUtils.ts))**: Added an **Amount Discrepancy** sub-report tab under the Payment Report section. Automatically compares calculated subscription meal totals (`calculateSubscriptionAmount`) against actual paid payment totals (`calculatePaidAmount`). Renders cards displaying Block & Unit pass ID, adult/kid headcount breakdown, Expected (Calculated) Amount, Current (Paid) Amount, and a color-coded status badge for pending or excess differences. Mirroring the Missed Parcel report approach, tapping any card instantly navigates to pass details (`onSelectFlat`), with zero hardcoded texts or colors (`UI_TEXT` and `theme.colors`), and 100% WCAG 2.1 AA accessibility compliance (`accessible={true}`, `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityHint`).
- **Unified Pass Code Display (`DetailsScreen.tsx`, `SubscriptionForm.tsx`)**: Displays the 4-digit pass code (`Pass Code: <passcode>`) on the Pass Identity card in View Pass and the Real-time Summary Card in Edit Pass, mirroring the header format in Quick Checkout Modal (`QuickCheckoutHeader.tsx`).
- **Categorized Free Meal Quick Checkout Modal & Responsive Free Meal Management Layout (`QuickFreeMealModal.tsx`, `FreeMealManagementScreen.tsx`)**: Divided free meal meal distribution into distinct **Veg Category** (Leaf icon) and **Non-Veg Category** (Flame icon) cards, featuring side-by-side **Subscribed** and **Served** counter inputs (`flexDirection: "row"`, `flex: 1, minWidth: 0`) that scale adaptively across mobile devices and web viewports. Completed meals (`isDone = true`) render clean read-only summary metric cards instead of stepper inputs.
- **Concise, Symmetric & Non-Redundant Labeling (`FreeMealManagementScreen.tsx`, `MealMetricGrid.tsx`, `QuickFreeMealModal.tsx`)**: Optimized input and metric labels across active, future, and completed meals to use symmetric "Subscribed" and "Served" titles, eliminating redundant "Veg Subscribed" / "Veg Served" or "Total Subscribed" / "Total Plates Served" text when category section headers or icons already indicate the scope.
- **React DOM Hydration & DOM Nesting Compliance**: Replaced nested `<Pressable>` elements (`<button>` inside `<button>` in React Native Web) across `HomeScreen` (summary card body vs top-right dashboard meal pill), `SubscriptionListScreen` (`SubscriptionCard`), `ContactsScreen`, and `ActivityLogScreen` (`ActivityLogItem`) with clean `View` containers + non-nested sibling `Pressable` layouts, eliminating React DOM hydration errors and ensuring valid HTML output.
- **Deprecation-Free Web Shadows & Text Shadows**: Replaced legacy `shadow*` and `textShadow*` style properties with conditional `Platform.OS === 'web'` spreading for `boxShadow` and `textShadow`, entirely eliminating React Native Web preprocessor warnings across all viewports.
- **Responsive Wrapping Report Navigation Tabs**: Converted report category navigation buttons on `ReportScreen` to a responsive wrapping flex layout (`flexWrap: 'wrap'`), guaranteeing 100% button visibility without horizontal clipping across Web and mobile viewports.
- **Responsive Quick Checkout Counter Layout**: Added `width: "100%"`, `minWidth: 0`, and `flexShrink: 1` constraints to `SubsectionCounterWidget` and input text fields in `QuickCheckoutModal`, ensuring side-by-side parcel and dine-in inputs scale cleanly without overflowing on narrow viewports or mobile devices.
- **Dynamic Singular/Plural Grammar (`plate` / `plates`, `parcel` / `parcels`)**: Added `plateSingular: "Plate"` to `strings.ts` and updated quick checkout transaction logs, success category breakdowns, total plate counts, and accessibility announcements (`successA11yLabel`) to dynamically format singular (`1 Plate`, `1 Parcel`) or plural (`2+ Plates`, `2+ Parcels`) forms based on exact numeric values.
- **Universal WCAG 2.1 AA Accessibility Integration**: Configured `accessible={true}`, `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, `accessibilityState`, `accessibilityViewIsModal`, and live speech announcements across all screens and interactive components (`MealMenuEditor.tsx`, `CounterInput.tsx`, `QuickCheckoutModal.tsx`, `QuickFreeMealModal.tsx`, `SubscriptionForm.tsx`, `DetailsScreen.tsx`, etc.).
- **Configurable Kids Parcel Support**: Comprehensive control over enabling or disabling Kids Parcel service per meal slot in Settings. When disabled, kids parcel options are omitted from pass registration forms, pricing calculations evaluate kids parcel costs as 0, quick checkout treats kids as Dine-In only, and reports, missed parcel logs, and dashboard metrics exclude kids parcel counts.
- **Menu Editor Save Retention (`MenuEditorScreen.tsx`)**: When saving individual or all menu modifications, the app displays a success alert and stays on the same edit menu page (without navigating away to `ViewMenuScreen`), with backend data automatically refreshed and synchronized.
- **Strict System Config Priority & No-Fallback Discrepancy Resolution ([`constants.ts`](src/constants.ts), [`paymentUtils.ts`](src/utils/paymentUtils.ts), [`DetailsScreen.tsx`](src/screens/DetailsScreen.tsx), [`SubscriptionForm.tsx`](src/screens/SubscriptionForm.tsx), [`QuickCheckoutModal.tsx`](src/components/common/QuickCheckoutModal.tsx))**: Enforced absolute system configuration priority (`dayConfig`) via `getValidSlotChoice` and `isParcelValidForSlot`. If a stored choice (e.g. `"Non-Veg"`) is disabled for a meal/day in system config, it strictly resolves to **None** (`DietaryOption.NONE`) without forceful fallback conversions. Parcels strictly require a valid enabled meal choice (`choice !== DietaryOption.NONE`) and active category parcel support; otherwise, parcels resolve to `false` (deselected & disabled). Guarantees 100% selection parity and parcel alignment across View Pass, Edit Pass, Quick Checkout, and Reports.
- **Disambiguated None Choice UI Styling ([`SubscriptionForm.tsx`](src/screens/SubscriptionForm.tsx), [`styles.ts`](src/styles.ts))**: Updated the **None** choice button in Edit Pass to render with an elevated Slate Dark surface tile (`theme.colors.surfaceDark`), crisp primary border (`theme.colors.primary`), and bold text (`theme.colors.textPrimary`), completely disambiguating the **None** state from **Veg** (Emerald Green) and **Non-Veg** (Crimson Red).
- **Pending Members Report Template Resolution ([`PendingReport.tsx`](src/components/report/PendingReport.tsx))**: Resolved the `{count}` template string in `PendingReport.tsx` to dynamically substitute numeric member counts (`.replace("{count}", String(item.count))`), accurately displaying `"1 Member Pending"` or `"2 Members Pending"`.
- **100% Theme & Dictionary Compliance Audit**: Verified all report components and UI screens contain zero hardcoded text strings and zero hardcoded hex colors, retrieving all text from `UI_TEXT` ([`strings.ts`](src/strings.ts)) and colors from `useAppTheme()` tokens.
- **Real-Time Free Meal Total & Taken Firebase Sync (`DatabaseContext.tsx`, `repository.ts`)**: Automatic computation and persistence of `free mealTotal` and `free mealTaken` directly in Firebase Realtime Database in real-time alongside fine-grained sub-counters (`free mealVeg`, `free mealVegTaken`, `free mealNonVeg`, `free mealNonVegTaken`).
- **Inclusive View Menu Display ([`ViewMenuScreen.tsx`](src/screens/ViewMenuScreen.tsx), [`MealDisplay.tsx`](src/components/menu/MealDisplay.tsx))**: Ensured all active festival days and enabled meal slots remain visible in the View Menu screen even when specific food item lists are empty. When food items are empty, displays `"No menu items specified"` while preserving all meal pricing, kids pricing, and parcel fee badges.
- **Parent-Child Meal & Parcel Domain Invariant ([`domain.ts`](src/domain.ts), [`repository.ts`](src/repository.ts), [`SubscriptionForm.tsx`](src/screens/SubscriptionForm.tsx))**: Enforced the domain invariant that a parcel option can ONLY be selected or active if the corresponding meal choice is selected (`choice !== DietaryOption.NONE`). Implemented `normalizeSlot` to force `parcel = false` whenever a meal is deselected, preventing stale or orphan parcel flags in backend data or Edit Pass interactions.
- **Unified View & Edit Pass Matrix Normalization ([`domain.ts`](src/domain.ts), [`repository.ts`](src/repository.ts), [`constants.ts`](src/constants.ts), [`SubscriptionForm.tsx`](src/screens/SubscriptionForm.tsx), [`DetailsScreen.tsx`](src/screens/DetailsScreen.tsx))**: Created canonical normalization functions (`normalizeChoice`, `normalizeSlot`, and `toBool`) integrated across Firebase deserialization (`repository.ts`), choice aggregation (`mealsFromChoices`), Edit Pass state initialization (`SubscriptionForm.tsx`), and View Pass matrix rendering (`DetailsScreen.tsx`). Maps all string variants (`"veg"`, `"nonVeg"`, `"Non-veg"`, `"false"`, `"true"`) and guarantees slot matrix array bounds (`0..totalPeople-1`) for all active days, ensuring 100% loss-free round-trip persistence and exact selection parity between View Pass and Edit Pass.
- **React Error Boundary Integration & Centralized Type Re-Exports ([`App.tsx`](App.tsx), [`ErrorBoundary.tsx`](src/components/common/ErrorBoundary.tsx), [`types.ts`](src/types.ts))**: Re-exported `normalizeChoice` and `toBool` in `types.ts` to fix module import resolution errors across screens. Wrapped the root application component tree in a theme-aware React `ErrorBoundary` component to gracefully catch unhandled JS rendering exceptions and allow users to recover with a 1-tap "Try Again" action.
- **Dietary Sub-Categorization Feature Implementation**: Extended the meal system from binary choices to flexible multi-option menu model supporting custom dietary varieties (e.g., Jain Veg, Standard Veg, Chicken Meal, Mutton Meal). Enforces strict Global Aggregation into primary Veg or Non-Veg categories across top-level counters, filters, and reports while maintaining custom names and color badges across all meal management views. Includes Settings Page variety creation/editing (max 10 varieties limit) with direct UI restriction (omits/disables disallowed category types without alerts based on day/meal veg-only or non-veg-only settings), active pass deletion protection rules, robust Firebase RTDB Object/Array deserialization normalization (`normalizeDayConfig`), granular audit trail logging detailing exact sub-category additions, edits, and deletions (e.g., `Added Varieties`, `Edited Varieties`, `Deleted Varieties`), 100% theme color and localized text dictionary (`UI_TEXT`) compliance, full WCAG 2.1 AA accessibility, flex-wrapping text containers for variety names, multi-variety menu pricing, expanded pass registration choices rendering all active meal varieties side-by-side with fallback pricing resolution, dynamic Quick Checkout allocation with itemized color-badge splash screen, real-time free meal sub-category counter editing (`free mealCounts` & `free mealTakenCounts`), shorthand variety summary bars on dashboard cards, analytics demographics grids, and sub-category metadata audit logging.
- **Special Meal (Complementary Meal) Feature**: Allows administrators to mark any meal slot as a special or complementary meal in System Settings (`SettingsScreen.tsx`). Special meals feature distinct theme-compliant soft yellow background (`theme.colors.specialMealBg`), dashed gold borders (`theme.colors.specialMealBorder`, `borderStyle: "dashed"`), and **"SPECIAL MEAL"** star badges across View Menu, Menu Editor, Add/Edit Pass choice/parcel buttons (retaining global veg/non-veg colors with dashed borders), subscription directory filters (`FilterMode.SPECIAL_ONLY` / "Special Meals Only") with card pass star icons, Quick Checkout Modal, Free Meal Quick Checkout Modal, and free meal desk/kitchen dashboard metrics, completed/planned views, and bar chart legends.
- **Food Package Subscription Filter & Pass Marker (`SubscriptionListScreen.tsx`, `constants.ts`)**: Added a dedicated **"Food Packages"** filter chip (`FilterMode.PACKAGE`) to the subscription list page, allowing operators to instantly filter passes that have availed at least 1 food package. Reuses the existing `hasPackageApplied` helper function to attach a high-visibility cube icon badge on pass cards.
- **Food Package View-Only Modal & Exhaustive Multi-Field Search (`FoodPackageScreen.tsx`)**: Clickable package cards with hydration-safe sibling action buttons open a read-only View Package modal. Includes an exhaustive multi-field search engine matching package names, descriptions, applicability, pricing, discount types, festival days, meal slots, and sub-category varieties.
- **Universal Parcel Summary & Section Tracking (`DashboardScreen.tsx`, `MealMetricGrid.tsx`, `MealBarChart.tsx`)**: Displays takeaway parcel summary metrics and sections across planned, grid, chart, and executive report views whenever parcel service is enabled for a meal, ensuring visibility even when the registered parcel count is 0.
- **Special Meals Only Pass Card Badge (`DetailsScreen.tsx`, `SubscriptionForm.tsx`)**: Prominently displays the **Special Meals Only** star badge on both View Pass ([`DetailsScreen.tsx`](src/screens/DetailsScreen.tsx)) and Add/Edit Pass ([`SubscriptionForm.tsx`](src/screens/SubscriptionForm.tsx)) identity summary cards whenever a pass is subscribed exclusively to special meal slots.
- **Dietary-Colored Member Selection & Collection Indicators (`DetailsScreen.tsx`)**: Updated member meal selection circles and parcel superscript badges (`P`) in the View Pass screen ([`DetailsScreen.tsx`](src/screens/DetailsScreen.tsx)) to dynamically reflect vegetarian (`theme.colors.veg`) green or non-vegetarian (`theme.colors.nonVeg`) red colors rather than a generic accent color.
- **Pass Created/Edited Timestamp Tracking & Directory Sorting (`domain.ts`, `repository.ts`, `DetailsScreen.tsx`, `SubscriptionForm.tsx`, `SubscriptionListScreen.tsx`, `QuickCheckoutModal.tsx`)**: Tracks `createdAt` and `updatedAt` timestamps with strict `createdAt <= updatedAt` invariant enforcement across pass creation, editing, and quick checkouts. Displays formatted timestamps in View Pass and Edit Pass summary headers and pass cards, supporting multi-criteria sorting in the subscription list page (Block & Flat, Created Time, Edited Time) in ascending and descending order.
- **Compact Directory Controls & Filter Section Layout (`SubscriptionListScreen.tsx`)**: Compact single-row control bar and lightweight filter chips section engineered for mobile screens without line wrapping or pushing action buttons to new lines.
- **Dynamic Dietary Coloring for Parcel & Collection Buttons (`SubscriptionForm.tsx`)**: Parcel buttons, food collection buttons, and parcel taken buttons in Add Pass and Edit Pass dynamically reflect the selected dietary type color (`theme.colors.veg`, `theme.colors.nonVeg`, or custom variety colors) rather than hardcoded green.
- **Auto-Selection of Parcel Taken on Meal Collection (`SubscriptionForm.tsx`)**: In edit pass, selecting the meal taken button automatically auto-selects parcel taken when a parcel is opted for for that meal, ensuring parcel pickup is marked without inadvertent omission.
- **Missed Parcel Audit Logging (`SubscriptionForm.tsx`)**: Deselecting parcel taken during meal collection when a parcel was opted for triggers inconsistency checking (`checkParcelInconsistency`) upon save, prompting the operator and logging `ActivityAction.MISSED_PARCEL`.
- **Accessibility-Compliant Interactive Package Tags & Auto-Pruning (`SubscriptionPaymentSection.tsx`, `SubscriptionForm.tsx`)**: Rendered the green `PACKAGE APPLIED` marker as a pressable accessibility-compliant button (`accessible={true}`, `accessibilityRole="button"`) to directly open the Apply Package Modal. Automatically hides the duplicate `Apply` button when a package is applied, and prunes invalid packages automatically when meals are deselected.

---

## 📁 Directory Structure

```
metro.config.js          # Metro Bundler Configuration (inlineRequires: true)
assets/
└── checkout.mp3         # Custom Quick Checkout Audio Sound Tone
src/
├── components/          # Modular UI Components
│   ├── common/          # Action Label, Back Button, Home Button, CounterInput, Dropdowns, QuickCheckoutModal, QuickFreeMealModal, ThemeToggleButton
│   ├── dashboard/       # Meal Bar Chart, Meal Metric Grid
│   ├── menu/            # Meal Display, Meal Menu Editor, Summary Bar
│   └── report/          # DayWise, MealWise, SingleMeal, Free Meal, Parcel, Pending, FlatWise, Payment, MembersReport, AmountDiscrepancy
├── context/             # Global React Context State
│   ├── AuthContext.tsx       # Session, Login/Logout, Role Governance (Admin/Vendor)
│   ├── DatabaseContext.tsx   # CoreDatabaseContext, ActivityLogsContext, NotesContext (Decoupled Sub-Contexts)
│   ├── NavigationContext.tsx # History-stack-enabled screen navigation (isQuickCheckout, isQuickFree MealMode)
│   └── UIContext.tsx         # Global Alert dialogs, Error modals, Share & Print handlers
├── hooks/               # Custom Utility Hooks
│   └── useReportData.ts # Targeted Lazy Report Aggregation Engine
├── navigation/          # App Navigator Router & Screen Switcher
├── theme/               # Royal Festive Design Token Engine (primary.ts & dark.ts)
├── utils/               # Helper Utility Modules
│   ├── ocrScanner.ts    # Native Google ML Kit OCR Extractor
│   └── paymentUtils.ts  # Subscription Pricing Engine & Amount Discrepancy Utility
├── domain.ts            # Domain Data Models, Enums (CheckoutSource, FreeMealCheckoutSource) & Type Contracts
├── repository.ts        # Firebase RTDB API Operations, Atomic Writes & Real-Time Listeners
├── config.ts            # Festival Configuration Defaults
├── firebase.ts          # Firebase SDK Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text (`UI_TEXT`)
├── styles.ts            # Global Responsive Scaling Engine (`s()` / `v()`) & Widescreen Breakpoints
└── screens/             # Top-Level Screen Views
    ├── ActivityLogScreen.tsx     # Real-Time Audit Log Stream (uses useActivityLogs())
    ├── ContactsScreen.tsx        # Resident Directory with Direct WhatsApp/Call/SMS Actions
    ├── DashboardScreen.tsx       # Live Real-Time Kitchen Counter Dashboard (uses useCoreDatabase())
    ├── FoodPackageScreen.tsx     # Food Package Discount Offers & Package Management (uses useFoodPackages())
    ├── FreeMealManagementScreen.tsx # Counter Free Meal Demand Manager with Source Tracking
    ├── HomeScreen.tsx            # Main Operational Summary (uses useCoreDatabase())
    ├── LoginScreen.tsx           # Two-Phase Secured Database Login
    ├── MenuEditorScreen.tsx      # Daily Meal Menu & Pricing Editor
    ├── NotesScreen.tsx           # Real-Time Collaborative Team Notes Stream (uses useNotes())
    ├── QrScreen.tsx              # Digital Food Pass Generator with 4-Digit Passcode & WhatsApp Share
    ├── ReportScreen.tsx          # Analytics Suite with Share Report Action & Theme-Aware Image Export
    ├── ScannerScreen.tsx         # Memoized Camera Scanner & Passcode Keypad (uses useCoreDatabase())
    ├── SettingsScreen.tsx        # Festival Configuration, Global Audio Sound Toggle & Splash Timeout Settings (WCAG Compliant)
    ├── SubscriptionForm.tsx      # Pass Registration & Editing with OCR Payment Scanner
    ├── SubscriptionListScreen.tsx# Pass Directory with Clickable Missed Badge (uses useCoreDatabase())
    └── ViewMenuScreen.tsx        # Daily Food Menu Viewer
```

---

## 🧩 Feature-Based Modularization & Architecture Refactoring

To maintain high maintainability, testability, and scalability as the codebase grew, major monolithic screens and modals were systematically refactored into domain-specific feature modules under `src/features/`:

### 1. Feature Directory Breakdown
- **`src/features/activity/`**: Encapsulates audit log items and advanced filter bars (`ActivityLogItem`, `ActivityLogFilterBar`).
- **`src/features/checkout/`**: Encapsulates quick checkout modal headers and item count cards (`QuickCheckoutHeader`, `QuickCheckoutItemCard`).
- **`src/features/subscriptions/`**: Encapsulates pass registration form sections such as basic resident info and multi-payment entry trackers (`SubscriptionBasicInfoSection`, `SubscriptionPaymentSection`).

### 2. Architectural Guarantees
- **Zero Hardcoded Text**: All text/labels are bound to centralized keys in [`strings.ts`](src/strings.ts) via `UI_TEXT`.
- **Theme-Driven Styling**: Colors and scaling strictly adhere to `theme.colors`, `theme.cardColors`, and responsive scaling utilities.
- **Accessibility (WCAG 2.1 AA)**: All extracted interactive components include comprehensive `accessible={true}`, `accessibilityRole`, `accessibilityLabel`, and `accessibilityHint` bindings.
- **Zero Type Errors**: Verified via strict TypeScript compiler checks (`npx tsc --noEmit`).
- **Dashboard & Detailed View UX Polish**: Removed redundant repetitions of the word "Subscribed" in planned mode and group name repetitions ("Adults", "Kids", "Free Meals") under section headers in the detailed dashboard metric grid.

---

## 🚀 Build, Setup & Local Execution

```bash
# 1. Clone repository & install dependencies
npm install

# 2. Configure Environment Variables (.env)
EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
EXPO_PUBLIC_FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"

# 3. Start Expo Development Server
npx expo start

# 4. Run on specific platform targets
npx expo start --web       # Web browser (React Native Web)
npx expo run:android       # Native Android build
npx expo run:ios           # Native iOS build
```

---

© 2026 Eternia Festival Committee — FestiveDesk Operations Architecture Document
