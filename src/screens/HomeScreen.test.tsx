import React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { cleanup, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../theme";
import { UI_TEXT } from "../strings";
import { UserRole } from "../types";

const noop = () => undefined;
const coreDatabase: Record<string, any> = {
  subscriptions: [],
  dayConfig: [],
  seasonName: "",
  seasonCode: "",
  seasonEnabled: false,
  freeMealEnabled: false,
  totalPeople: 0,
  firebaseError: "",
  paymentConfig: { enabled: true, options: { upi: true, cash: true, bankTransfer: true } },
  collections: { total: 0, upi: 0, cash: 0, bankTransfer: 0 },
  kidsEnabled: false,
  guestsEnabled: false,
  foodMenu: {},
  remoteAppVersion: null,
  loading: false,
  vendorSettledCost: "",
  dashboardData: [],
  footerText: "",
  seasonCompleted: false,
};

jest.doMock("../context/AuthContext", () => ({
  useAuth: () => ({
    userRole: UserRole.ADMIN,
    handleLogout: noop,
    versionAlertShown: true,
    markVersionAlertShown: noop,
  }),
}));

jest.doMock("../context/DatabaseContext", () => ({
  useCoreDatabase: () => coreDatabase,
  useDatabase: () => ({ addActivityLog: noop }),
}));

jest.doMock("../context/UIContext", () => ({
  useUI: () => ({ showAlert: noop, showGlobalError: noop }),
}));

jest.doMock("../context/NavigationContext", () => ({
  useAppNavigation: () => ({
    navigate: noop,
    startNew: noop,
    setIsQuickCheckout: noop,
    setIsParcelCheckout: noop,
    setIsQuickFreeMealMode: noop,
  }),
}));

const { HomeScreen } = require("./HomeScreen") as typeof import("./HomeScreen");

afterEach(() => {
  cleanup();
  Object.assign(coreDatabase, {
    subscriptions: [],
    dayConfig: [],
    seasonName: "",
    seasonCode: "",
    seasonEnabled: false,
    foodMenu: {},
    seasonCompleted: false,
  });
});

describe("Home season state", () => {
  it("does not show completion totals when no season exists", () => {
    render(<ThemeProvider><HomeScreen /></ThemeProvider>);

    expect(screen.queryByText(`${UI_TEXT.totalPlatesServed.toUpperCase()}:`)).toBeNull();
  });

  it("shows completion totals for a completed season", () => {
    coreDatabase.seasonName = "Festival 2026";
    coreDatabase.seasonCode = "DP2026";
    coreDatabase.seasonCompleted = true;
    coreDatabase.dayConfig = [{
      id: "Shashthi",
      enabled: true,
      breakfast: { enabled: false, done: false },
      lunch: { enabled: false, done: false },
      dinner: { enabled: false, done: false },
    }];

    render(<ThemeProvider><HomeScreen /></ThemeProvider>);

    expect(screen.getByText(`${UI_TEXT.totalPlatesServed.toUpperCase()}:`)).toBeTruthy();
  });
});
