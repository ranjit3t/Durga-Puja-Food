import React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { cleanup, render, screen } from "@testing-library/react-native";
import { STORY_FIXTURES } from "../../.storybook/storyMocks";
import { ThemeProvider } from "../theme";
import { AppScreen, ReportType, UserRole } from "../domain";

const noop = () => undefined;
const emptyAsync = async () => undefined;
const coreDatabase = {
  loading: false,
  firebaseError: "",
  refreshAllData: emptyAsync,
  subscriptions: STORY_FIXTURES.subscriptions,
  foodMenu: STORY_FIXTURES.foodMenu,
  dayConfig: STORY_FIXTURES.dayConfig,
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
  collections: { total: 160, upi: 0, cash: 160, bankTransfer: 0 },
  totalPeople: 2,
  upsertSubscription: emptyAsync,
  deleteSubscription: emptyAsync,
  updateConfig: emptyAsync,
  updateMenu: emptyAsync,
  updateFreeMealCount: emptyAsync,
  updateMealMenu: emptyAsync,
  updateSubscriptionStatus: emptyAsync,
  checkInPassAtomic: emptyAsync,
  getByPasscode: async () => undefined,
  getAuthConfig: async () => ({ users: [] }),
  updateFreeMealCountDebounced: noop,
};
const activityLogs = STORY_FIXTURES.activityLogs;
const notes = STORY_FIXTURES.notes;

jest.doMock("../context/AuthContext", () => ({
  useAuth: () => ({
    userRole: UserRole.ADMIN,
    userName: "Preview Administrator",
    userAccountName: "admin",
    handleLogout: noop,
    isAuthenticated: true,
    versionAlertShown: true,
    markVersionAlertShown: noop,
  }),
}));

jest.doMock("../context/DatabaseContext", () => ({
  useCoreDatabase: () => coreDatabase,
  useDatabase: () => ({
    ...coreDatabase,
    activityLogs,
    addActivityLog: noop,
    getActivityLogs: async () => activityLogs,
    fetchMoreLogs: emptyAsync,
    notes,
    upsertNote: emptyAsync,
    deleteNote: emptyAsync,
    foodPackages: [],
    upsertFoodPackage: emptyAsync,
    deleteFoodPackage: emptyAsync,
  }),
  useActivityLogs: () => ({ activityLogs, addActivityLog: noop, getActivityLogs: async () => activityLogs, fetchMoreLogs: emptyAsync }),
  useNotes: () => ({ notes, upsertNote: emptyAsync, deleteNote: emptyAsync }),
  useFoodPackages: () => ({ foodPackages: [], upsertFoodPackage: emptyAsync, deleteFoodPackage: emptyAsync }),
}));

jest.doMock("../context/NavigationContext", () => ({
  useAppNavigation: () => ({
    screen: AppScreen.HOME,
    navigate: noop,
    goBack: () => true,
    startNew: noop,
    setSelectedId: noop,
    setSelectedRecord: noop,
    selectedId: "",
    selectedRecord: null,
    editing: null,
    reportType: ReportType.DAY,
    reportDayId: "Shashthi",
    reportMealType: "lunch",
    subscriptionSearch: "",
    isQuickCheckout: false,
    isQuickFreeMealMode: false,
    targetDay: "Shashthi",
    targetMeal: "lunch",
    setSubscriptionSearch: noop,
  }),
}));

jest.doMock("../context/UIContext", () => ({
  useUI: () => ({
    alertConfig: { visible: false, title: "", message: "" },
    showAlert: noop,
    showGlobalError: noop,
    hideAlert: noop,
    shareQr: emptyAsync,
    printPass: emptyAsync,
  }),
}));

jest.doMock("../context/ChatContext", () => ({
  useChat: () => ({
    isModalOpen: false,
    isExpanded: false,
    registerModalOpen: noop,
    unregisterModalOpen: noop,
    toggleChatWindow: noop,
    minimizeChatWindow: noop,
  }),
}));

jest.doMock("../components/common/QuickCheckoutModal", () => ({ QuickCheckoutModal: () => null }));

const { ActivityLogScreen } = require("./ActivityLogScreen") as typeof import("./ActivityLogScreen");
const { ContactsScreen } = require("./ContactsScreen") as typeof import("./ContactsScreen");
const { NotesScreen } = require("./NotesScreen") as typeof import("./NotesScreen");
const { SubscriptionListScreen } = require("./SubscriptionListScreen") as typeof import("./SubscriptionListScreen");

afterEach(cleanup);

describe("populated list screens", () => {
  it("renders several recent activity rows", () => {
    render(<ThemeProvider><ActivityLogScreen /></ThemeProvider>);

    expect(screen.getByText("Checked in pass A-101 via QR Code Scan")).toBeTruthy();
    expect(screen.getByText("Updated the Shashthi lunch menu")).toBeTruthy();
    expect(screen.getByText("Menu synchronization failed")).toBeTruthy();
  });

  it("renders multiple contacts with their phone numbers", () => {
    render(<ThemeProvider><ContactsScreen /></ThemeProvider>);

    expect(screen.getByText("Flat 101")).toBeTruthy();
    expect(screen.getByText("9876543210")).toBeTruthy();
    expect(screen.getByText("Flat 205")).toBeTruthy();
    expect(screen.getByText("9876543211")).toBeTruthy();
  });

  it("renders multiple team notes with subjects and content", () => {
    render(<ThemeProvider><NotesScreen /></ThemeProvider>);

    expect(screen.getByText("Lunch counter")).toBeTruthy();
    expect(screen.getByText("Menu update")).toBeTruthy();
    expect(screen.getByText("Stock check")).toBeTruthy();
    expect(screen.getByText("The Shashthi lunch menu is ready for service.")).toBeTruthy();
  });

  it("renders multiple pass cards in the subscription directory", () => {
    render(<ThemeProvider><SubscriptionListScreen /></ThemeProvider>);

    expect(screen.getByText("Flat 101")).toBeTruthy();
    expect(screen.getByText("Flat 205")).toBeTruthy();
    expect(screen.getByText("Pass Subscriptions")).toBeTruthy();
  });
});