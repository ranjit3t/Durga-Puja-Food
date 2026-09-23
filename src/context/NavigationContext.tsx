import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { BackHandler, Platform } from "react-native";
import { Screen, Subscription, Day, ReportType, ConfigDay, PaymentConfig, MealType, AppScreen, PaymentMode, Note } from "../types";
import { useAuth } from "./AuthContext";
import {
  getEnabledPaymentMethods,
  emptyMeals,
  mealChoicesFromMeals,
  mealSlotsFromChoices,
  emptyTaken,
  qrValueFor
} from "../constants";
import { UI_TEXT } from "../strings";

interface NavigationContextType {
  screen: Screen;
  history: Screen[];
  navigate: (next: Screen) => void;
  goBack: () => boolean;

  // Selection States (Hoisted from screens)
  selectedId: string;
  setSelectedId: (id: string) => void;
  selectedRecord: Subscription | null;
  setSelectedRecord: (sub: Subscription | null) => void;
  editing: Subscription | null;
  setEditing: (sub: Subscription | null) => void;

  // Report States
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  reportDayId: Day;
  setReportDayId: (id: Day) => void;
  reportMealType: MealType;
  setReportMealType: (meal: MealType) => void;

  // Quick Checkout State
  isQuickCheckout: boolean;
  setIsQuickCheckout: (val: boolean) => void;

  // Quick Guest Mode State
  isQuickGuestMode: boolean;
  setIsQuickGuestMode: (val: boolean) => void;

  // Subscription Search
  subscriptionSearch: string;
  setSubscriptionSearch: (text: string) => void;

  // Menu Editor Target
  targetDay: Day;
  setTargetDay: (day: Day) => void;
  targetMeal: MealType | null;
  setTargetMeal: (meal: MealType | null) => void;

  // Actions
  startNew: (dayConfig: ConfigDay[], seasonName: string, paymentConfig: PaymentConfig, guestEnabled: boolean, mobileEnabled: boolean, seasonEnabled: boolean) => void;
  openScannedValue: (val: string, subscriptions: Subscription[]) => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth();
  const [screen, setScreen] = useState<Screen>(AppScreen.LOGIN);
  const [history, setHistory] = useState<Screen[]>([]);

  // Selection & Detail state
  const [selectedId, setSelectedId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<Subscription | null>(null);
  const [editing, setEditing] = useState<Subscription | null>(null);

  // Quick Checkout & Guest States
  const [isQuickCheckout, setIsQuickCheckout] = useState(false);
  const [isQuickGuestMode, setIsQuickGuestMode] = useState(false);

  // View Filter states
  const [reportType, setReportType] = useState<ReportType>(ReportType.DAY);
  const [reportDayId, setReportDayId] = useState<Day>("");
  const [reportMealType, setReportMealType] = useState<MealType>(MealType.BREAKFAST);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");

  const [targetDay, setTargetDay] = useState<Day>("");
  const [targetMeal, setTargetMeal] = useState<MealType | null>(null);

  const startNew = (dayConfig: ConfigDay[], seasonName: string, paymentConfig: PaymentConfig, guestEnabled: boolean, mobileEnabled: boolean, seasonEnabled: boolean) => {
    const enabledMethods = getEnabledPaymentMethods({
      seasonName,
      days: dayConfig,
      payment: paymentConfig,
      guestEnabled,
      mobileEnabled,
      seasonEnabled
    });

    const initialMeals = emptyMeals(dayConfig);
    const initialSub: any = {
      id: "",
      flat: "",
      block: "1",
      peopleCount: 1,
      kidsCount: 0,
      meals: initialMeals,
    };

    setEditing({
      ...initialSub,
      mealByPerson: mealChoicesFromMeals(initialSub, dayConfig, true),
      mealSlots: mealSlotsFromChoices({}, 1, dayConfig),
      takenByPerson: emptyTaken(1, dayConfig),
      payments: [
        { amount: UI_TEXT.zero, mode: (enabledMethods[0] as any) || PaymentMode.CASH }
      ],
      paymentMode: (enabledMethods[0] as any) || PaymentMode.CASH,
      amount: UI_TEXT.zero,
    });
    navigate(AppScreen.FORM);
  };

  const openScannedValue = (val: string, subscriptions: Subscription[]) => {
    // Try full QR URL match, then ID match, then Passcode match
    const match = subscriptions.find((s) =>
      qrValueFor(s.id) === val || s.id === val || s.passcode === val
    );

    if (match) {
      setSelectedId(match.id);
      setSelectedRecord(match);
      setEditing(match);
      // Use navigate to ensure proper history management and UI update
      navigate(AppScreen.DETAILS);
      return true;
    }
    return false;
  };

  const resetViewStates = (preserveQuickCheckout = false, preserveQuickGuest = false) => {
    setReportType(ReportType.DAY);
    setReportDayId("");
    setReportMealType(MealType.BREAKFAST);
    setSubscriptionSearch("");
    setTargetDay("");
    setTargetMeal(null);
    if (!preserveQuickCheckout) {
      setIsQuickCheckout(false);
    }
    if (!preserveQuickGuest) {
      setIsQuickGuestMode(false);
    }
  };

  const navigate = (next: Screen) => {
    if (next === AppScreen.HOME) {
      setHistory([]);
      resetViewStates(false, false);
    } else if (next !== screen) {
      if (screen === AppScreen.HOME) {
        resetViewStates(next === AppScreen.SCANNER, next === AppScreen.GUEST_MANAGEMENT);
      } else {
        if (next !== AppScreen.SCANNER) setIsQuickCheckout(false);
        if (next !== AppScreen.GUEST_MANAGEMENT) setIsQuickGuestMode(false);
      }

      // Pass Workflow Optimization:
      // DETAILS, FORM, and QR are part of a single "Pass Lifecycle".
      // When moving between them, we replace rather than stack to prevent circular loops.
      const passScreens = [AppScreen.DETAILS, AppScreen.FORM, AppScreen.QR];
      const isMovingWithinPass = passScreens.includes(next) && passScreens.includes(screen);

      if (isMovingWithinPass || (next === AppScreen.DETAILS && screen === AppScreen.SCANNER)) {
        // Replace: Do not add the current screen to history
      } else {
        setHistory((prev) => [...prev, screen]);
      }
    }
    setScreen(next);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((current) => current.slice(0, -1));
      if (prev === AppScreen.HOME) {
        setHistory([]);
        resetViewStates(false, false);
      } else {
        if (prev !== AppScreen.SCANNER) setIsQuickCheckout(false);
        if (prev !== AppScreen.GUEST_MANAGEMENT) setIsQuickGuestMode(false);
      }
      setScreen(prev);
      return true;
    }
    if (screen !== AppScreen.HOME && screen !== AppScreen.LOGIN) {
      navigate(AppScreen.HOME);
      return true;
    }
    return false;
  };

  // Hardware Back Button
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  }, [screen, history, editing]);

  // Sync screen with login status
  useEffect(() => {
    if (!userRole) {
      setScreen(AppScreen.LOGIN);
      setHistory([]);
      resetViewStates();
    } else if (screen === AppScreen.LOGIN) {
      navigate(AppScreen.HOME);
    }
  }, [userRole]);

  const value = useMemo(() => ({
    screen, history, navigate, goBack, startNew, openScannedValue,
    selectedId, setSelectedId, selectedRecord, setSelectedRecord, editing, setEditing,
    reportType, setReportType, reportDayId, setReportDayId, reportMealType, setReportMealType,
    subscriptionSearch, setSubscriptionSearch,
    targetDay, setTargetDay, targetMeal, setTargetMeal,
    isQuickCheckout, setIsQuickCheckout,
    isQuickGuestMode, setIsQuickGuestMode
  }), [
    screen, history, selectedId, selectedRecord, editing,
    reportType, reportDayId, reportMealType, subscriptionSearch,
    targetDay, targetMeal, isQuickCheckout, isQuickGuestMode,
    startNew, openScannedValue
  ]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useAppNavigation must be used within NavigationProvider");
  return context;
}
