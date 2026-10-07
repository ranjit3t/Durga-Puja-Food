import { DEFAULT_APP_CONFIG } from "../src/config";
import React, { useContext } from "react";
import {
  AppScreen,
  ActivityAction,
  ActivityModule,
  AppThemeMode,
  CheckoutSource,
  DietaryOption,
  MealType,
  PaymentMode,
  ReportType,
  UserRole,
} from "../src/domain";

const noop = () => undefined;
const emptyAsync = async () => undefined;

const dayConfig = DEFAULT_APP_CONFIG.days.map((day, index) => ({
  ...day,
  enabled: index === 0,
  lunch: { ...day.lunch, enabled: index === 0, current: index === 0, parcel: true },
}));

const foodMenu = Object.fromEntries(dayConfig.map((day) => [day.id, {
  breakfast: { veg: [], nonVeg: [] },
  lunch: { veg: ["Luchi", "Cholar Dal"], nonVeg: ["Fish Curry"], vegPrice: "80", nonVegPrice: "120" },
  dinner: { veg: [], nonVeg: [] },
}]));

const sampleSubscription = {
  id: "sample-pass",
  block: "A",
  flat: "101",
  peopleCount: 1,
  kidsCount: 0,
  guestsCount: 0,
  meals: { Shashthi: { veg: 1, nonVeg: 0 } },
  mealByPerson: { Shashthi: [DietaryOption.VEG] },
  mealSlots: {
    Shashthi: [{
      [MealType.BREAKFAST]: DietaryOption.NONE,
      [MealType.LUNCH]: DietaryOption.VEG,
      [MealType.DINNER]: DietaryOption.NONE,
      breakfastParcel: false,
      lunchParcel: false,
      dinnerParcel: false,
    }],
  },
  takenByPerson: { Shashthi: [{ breakfast: false, lunch: false, dinner: false }] },
  payments: [{ amount: "80", mode: PaymentMode.CASH }],
  amount: "80",
  paymentMode: PaymentMode.CASH,
  passcode: "1010",
  mobile: 9876543210,
  timestamp: Date.now(),
};

const secondSubscription = {
  ...sampleSubscription,
  id: "sample-pass-b",
  block: "B",
  flat: "205",
  mobile: 9876543211,
  passcode: "2050",
};

const sampleActivityLogs = [
  {
    id: "preview-log-checkout",
    timestamp: Date.now() - 60_000,
    userName: "Preview Administrator",
    userRole: "admin",
    module: ActivityModule.SCANNER,
    action: ActivityAction.UPDATE,
    targetId: sampleSubscription.id,
    description: `Checked in pass {id} via ${CheckoutSource.SCANNER}`,
    os: "web",
  },
  {
    id: "preview-log-menu",
    timestamp: Date.now() - 120_000,
    userName: "Kitchen Vendor",
    userRole: "vendor",
    module: ActivityModule.MENU,
    action: ActivityAction.UPDATE,
    description: "Updated the Shashthi lunch menu",
    os: "android",
  },
  {
    id: "preview-log-error",
    timestamp: Date.now() - 180_000,
    userName: "Preview Administrator",
    userRole: "admin",
    module: ActivityModule.MENU,
    action: ActivityAction.ERROR,
    description: "Menu synchronization failed",
    stack: "Error: network unavailable\\n  at updateMenu (repository.ts:120)",
  },
];

const sampleNotes = [
  { id: "preview-note-1", timestamp: Date.now() - 60_000, userName: "Kitchen Vendor", subject: "Lunch counter", content: "Keep one parcel counter open until 1:30 PM." },
  { id: "preview-note-2", timestamp: Date.now() - 120_000, userName: "Preview Administrator", subject: "Menu update", content: "The Shashthi lunch menu is ready for service." },
  { id: "preview-note-3", timestamp: Date.now() - 180_000, userName: "Kitchen Vendor", subject: "Stock check", content: "Confirm plates and takeaway boxes before dinner." },
];

const database = {
  loading: false,
  firebaseError: "",
  refreshAllData: emptyAsync,
  subscriptions: [sampleSubscription, secondSubscription],
  foodMenu,
  dayConfig,
  seasonName: "FestiveDesk Preview",
  seasonEnabled: true,
  paymentConfig: { enabled: true, options: { upi: true, cash: true, bankTransfer: true } },
  freeMealEnabled: true,
  mobileEnabled: true,
  foodPriceEnabled: true,
  kidsEnabled: false,
  guestsEnabled: false,
  whatsappCountryCode: "+91",
  quickCheckoutAutoCloseMs: 3000,
  soundEnabled: false,
  remoteAppVersion: null,
  kitchenMetrics: null,
  dashboardData: [],
  collections: { total: 80, upi: 0, cash: 80, bankTransfer: 0 },
  totalPeople: 1,
  upsertSubscription: emptyAsync,
  deleteSubscription: emptyAsync,
  updateConfig: emptyAsync,
  updateMenu: emptyAsync,
  updateFreeMealCount: emptyAsync,
  updateMealMenu: emptyAsync,
  updateSubscriptionStatus: emptyAsync,
  checkInPassAtomic: emptyAsync,
  getByPasscode: async () => sampleSubscription,
  getAuthConfig: async () => ({ users: [] }),
  updateFreeMealCountDebounced: noop,
};

type StoryDatabaseOverrides = Partial<typeof database>;
const StoryDatabaseOverridesContext = React.createContext<StoryDatabaseOverrides>({});
type StoryChatOverrides = Record<string, any>;
const StoryChatOverridesContext = React.createContext<StoryChatOverrides>({});
type StoryListOverrides = { activityLogs?: any[]; notes?: any[] };
const StoryListOverridesContext = React.createContext<StoryListOverrides>({});

export function StoryMockProvider({
  children,
  database: overrides = {},
  chat = {},
  lists = {},
}: {
  children: React.ReactNode;
  database?: StoryDatabaseOverrides;
  chat?: StoryChatOverrides;
  lists?: StoryListOverrides;
}) {
  return React.createElement(
    StoryDatabaseOverridesContext.Provider,
    { value: overrides },
    React.createElement(
      StoryChatOverridesContext.Provider,
      { value: chat },
      React.createElement(StoryListOverridesContext.Provider, { value: lists }, children),
    ),
  );
}

export function useAuth() {
  return {
    userRole: UserRole.ADMIN,
    userName: "Preview Administrator",
    userAccountName: "admin",
    handleLogin: noop,
    handleLogout: noop,
    isAuthenticated: true,
    versionAlertShown: true,
    markVersionAlertShown: noop,
  };
}

export function useCoreDatabase() {
  return { ...database, ...useContext(StoryDatabaseOverridesContext) };
}

export function useDatabase() {
  const overrides = useContext(StoryDatabaseOverridesContext);
  const listOverrides = useContext(StoryListOverridesContext);
  return {
    ...database,
    ...overrides,
    activityLogs: listOverrides.activityLogs ?? [],
    addActivityLog: noop,
    getActivityLogs: async () => [],
    fetchMoreLogs: emptyAsync,
    notes: listOverrides.notes ?? [],
    upsertNote: emptyAsync,
    deleteNote: emptyAsync,
    foodPackages: [],
    upsertFoodPackage: emptyAsync,
    deleteFoodPackage: emptyAsync,
  };
}

export function useActivityLogs() {
  const { activityLogs = [] } = useContext(StoryListOverridesContext);
  return { activityLogs, addActivityLog: noop, getActivityLogs: async () => activityLogs, fetchMoreLogs: emptyAsync };
}

export function useNotes() {
  const { notes = [] } = useContext(StoryListOverridesContext);
  return { notes, upsertNote: emptyAsync, deleteNote: emptyAsync };
}

export function useFoodPackages() {
  return { foodPackages: [], upsertFoodPackage: emptyAsync, deleteFoodPackage: emptyAsync };
}

export function useUI() {
  return {
    alertConfig: { visible: false, title: "", message: "" },
    showAlert: noop,
    showGlobalError: noop,
    hideAlert: noop,
    shareQr: emptyAsync,
    printPass: emptyAsync,
  };
}

export function useAppNavigation() {
  return {
    screen: AppScreen.HOME,
    history: [],
    navigate: noop,
    goBack: () => true,
    selectedId: sampleSubscription.id,
    setSelectedId: noop,
    selectedRecord: sampleSubscription,
    setSelectedRecord: noop,
    editing: sampleSubscription,
    setEditing: noop,
    reportType: ReportType.DAY,
    setReportType: noop,
    reportDayId: "Shashthi",
    setReportDayId: noop,
    reportMealType: MealType.LUNCH,
    setReportMealType: noop,
    isQuickCheckout: false,
    setIsQuickCheckout: noop,
    isQuickFreeMealMode: false,
    setIsQuickFreeMealMode: noop,
    subscriptionSearch: "",
    setSubscriptionSearch: noop,
    targetDay: "Shashthi",
    setTargetDay: noop,
    targetMeal: MealType.LUNCH,
    setTargetMeal: noop,
    startNew: noop,
    openScannedValue: () => true,
  };
}

export function useChat() {
  const overrides = useContext(StoryChatOverridesContext);

  return {
    isExpanded: false,
    toggleChatWindow: noop,
    minimizeChatWindow: noop,
    expandChatWindow: noop,
    activeRecipient: null,
    setActiveRecipient: noop,
    availableUsers: [],
    presenceMap: {},
    refreshUsers: emptyAsync,
    messages: [],
    isRecipientTyping: false,
    sendMessage: emptyAsync,
    sendTypingSignal: noop,
    totalUnreadCount: 0,
    displayMessageCount: 20,
    hasMoreMessages: false,
    loadMoreMessages: noop,
    isModalOpen: false,
    registerModalOpen: noop,
    unregisterModalOpen: noop,
    ...overrides,
  };
}

export const STORY_FIXTURES = {
  dayConfig,
  foodMenu,
  subscription: sampleSubscription,
  subscriptions: [sampleSubscription, secondSubscription],
  activityLogs: sampleActivityLogs,
  notes: sampleNotes,
};

export const storyThemeDefaults = { mode: AppThemeMode.LIGHT };