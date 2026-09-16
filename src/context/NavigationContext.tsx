import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { BackHandler, Platform } from "react-native";
import { Screen, Subscription, Day, ReportType, ConfigDay, PaymentConfig, MealType, AppScreen, PaymentMode } from "../types";
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

  // Subscription Search
  subscriptionSearch: string;
  setSubscriptionSearch: (text: string) => void;
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

  // View Filter states
  const [reportType, setReportType] = useState<ReportType>("day");
  const [reportDayId, setReportDayId] = useState<Day>("");
  const [reportMealType, setReportMealType] = useState<MealType>(MealType.BREAKFAST);
  const [subscriptionSearch, setSubscriptionSearch] = useState("");

  const startNew = (dayConfig: ConfigDay[], seasonName: string, paymentConfig: PaymentConfig, guestEnabled: boolean, mobileEnabled: boolean, seasonEnabled: boolean) => {
    const enabledMethods = getEnabledPaymentMethods({
      seasonName,
      days: dayConfig,
      payment: paymentConfig,
      guestEnabled,
      mobileEnabled,
      seasonEnabled
    });

    setEditing({
      id: "",
      flat: "",
      block: "1",
      peopleCount: 1,
      meals: emptyMeals(dayConfig),
      mealByPerson: mealChoicesFromMeals(emptyMeals(dayConfig), 1, dayConfig),
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
    const match = subscriptions.find((s) => qrValueFor(s.id) === val);
    if (match) {
      setSelectedId(match.id);
      setSelectedRecord(match);
      setEditing(match);
      navigate(AppScreen.FORM);
      return true;
    }
    return false;
  };

  const resetViewStates = () => {
    setReportType("day");
    setReportDayId("");
    setReportMealType(MealType.BREAKFAST);
    setSubscriptionSearch("");
  };

  const navigate = (next: Screen) => {
    if (next === AppScreen.HOME) {
      setHistory([]);
      resetViewStates();
    } else if (next !== screen) {
      if (screen === AppScreen.HOME) resetViewStates();
      setHistory((prev) => [...prev, screen]);
    }
    setScreen(next);
  };

  const goBack = () => {
    if (screen === AppScreen.FORM && editing && editing.flat) {
      navigate(AppScreen.HOME);
      return true;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((current) => current.slice(0, -1));
      if (prev === AppScreen.HOME) {
        setHistory([]);
        resetViewStates();
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
    subscriptionSearch, setSubscriptionSearch
  }), [
    screen, history, selectedId, selectedRecord, editing,
    reportType, reportDayId, reportMealType, subscriptionSearch,
    startNew, openScannedValue
  ]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useAppNavigation must be used within NavigationProvider");
  return context;
}
