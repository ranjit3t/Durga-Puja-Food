import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import { Screen, Subscription, Day, ReportType, ConfigDay, PaymentConfig, MealType, AppScreen, PaymentMode, FilterMode } from "../types";
import { DirectorySortMode } from "../domain";
import { useAuth } from "./AuthContext";
import {
  getEnabledPaymentMethods,
  emptyMeals,
  mealChoicesFromMeals,
  mealSlotsFromChoices,
  emptyTaken,
  qrValueFor,
  findSubscriptionByPassCodeOrCheatCode
} from "../constants";
import { UI_TEXT } from "../strings";

interface NavigationContextType {
  screen: Screen;
  history: Screen[];
  navigate: (next: Screen) => void;
  goBack: () => boolean;
  isAccountModalVisible: boolean;
  openAccountModal: () => void;
  closeAccountModal: () => void;

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

  // Aggregate Report Filters State
  aggregateBlock: string;
  setAggregateBlock: (val: string) => void;
  aggregateFlat: string;
  setAggregateFlat: (val: string) => void;
  aggregatePersonType: string;
  setAggregatePersonType: (val: string) => void;
  aggregateDiet: string;
  setAggregateDiet: (val: string) => void;
  aggregateDay: string;
  setAggregateDay: (val: string) => void;
  aggregateMeal: string;
  setAggregateMeal: (val: string) => void;
  aggregateService: string;
  setAggregateService: (val: string) => void;
  aggregatePaymentMode: string;
  setAggregatePaymentMode: (val: string) => void;
  aggregatePaymentStatus: string;
  setAggregatePaymentStatus: (val: string) => void;
  aggregatePackage: string;
  setAggregatePackage: (val: string) => void;
  resetAggregateFilters: () => void;

  // Quick Checkout State
  isQuickCheckout: boolean;
  setIsQuickCheckout: (val: boolean) => void;
  isParcelCheckout: boolean;
  setIsParcelCheckout: (val: boolean) => void;

  // Quick Free Meal Mode State
  isQuickFreeMealMode: boolean;
  setIsQuickFreeMealMode: (val: boolean) => void;

  // Subscription Search & Filters & Sorting
  subscriptionSearch: string;
  setSubscriptionSearch: (text: string) => void;
  activeFilters: FilterMode[];
  setActiveFilters: React.Dispatch<React.SetStateAction<FilterMode[]>>;
  selectedBlock: string | null;
  setSelectedBlock: (block: string | null) => void;
  subscriptionSortBy: DirectorySortMode;
  setSubscriptionSortBy: React.Dispatch<React.SetStateAction<DirectorySortMode>>;
  subscriptionIsAscending: boolean;
  setSubscriptionIsAscending: React.Dispatch<React.SetStateAction<boolean>>;

  // Menu Editor Target
  targetDay: Day;
  setTargetDay: (day: Day) => void;
  targetMeal: MealType | null;
  setTargetMeal: (meal: MealType | null) => void;

  // Actions
  startNew: (dayConfig: ConfigDay[], seasonName: string, paymentConfig: PaymentConfig, freeMealEnabled: boolean, mobileEnabled: boolean, seasonEnabled: boolean) => void;
  openScannedValue: (val: string, subscriptions: Subscription[], cheatCodeEnabled?: boolean) => boolean;
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

  // Quick Checkout & Free Meal States
  const [isQuickCheckout, setIsQuickCheckout] = useState(false);
  const [isParcelCheckout, setIsParcelCheckout] = useState(false);
  const [isQuickFreeMealMode, setIsQuickFreeMealMode] = useState(false);
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);

  const openAccountModal = useCallback(() => setIsAccountModalVisible(true), []);
  const closeAccountModal = useCallback(() => setIsAccountModalVisible(false), []);

  // View Filter states
  const [reportType, setReportType] = useState<ReportType>(ReportType.DAY);
  const [reportDayId, setReportDayId] = useState<Day>("");
  const [reportMealType, setReportMealType] = useState<MealType>(MealType.BREAKFAST);

  // Aggregate Report Filter states
  const [aggregateBlock, setAggregateBlock] = useState<string>(UI_TEXT.allBlocks);
  const [aggregateFlat, setAggregateFlat] = useState<string>(UI_TEXT.allFlats);
  const [aggregatePersonType, setAggregatePersonType] = useState<string>(UI_TEXT.allPersons);
  const [aggregateDiet, setAggregateDiet] = useState<string>(UI_TEXT.allDiets);
  const [aggregateDay, setAggregateDay] = useState<string>(UI_TEXT.allDays);
  const [aggregateMeal, setAggregateMeal] = useState<string>(UI_TEXT.allMeals);
  const [aggregateService, setAggregateService] = useState<string>(UI_TEXT.allServices);
  const [aggregatePaymentMode, setAggregatePaymentMode] = useState<string>(UI_TEXT.allPaymentModes);
  const [aggregatePaymentStatus, setAggregatePaymentStatus] = useState<string>(UI_TEXT.allPaymentStatuses);
  const [aggregatePackage, setAggregatePackage] = useState<string>(UI_TEXT.allPackages);

  const resetAggregateFilters = useCallback(() => {
    setAggregateBlock(UI_TEXT.allBlocks);
    setAggregateFlat(UI_TEXT.allFlats);
    setAggregatePersonType(UI_TEXT.allPersons);
    setAggregateDiet(UI_TEXT.allDiets);
    setAggregateDay(UI_TEXT.allDays);
    setAggregateMeal(UI_TEXT.allMeals);
    setAggregateService(UI_TEXT.allServices);
    setAggregatePaymentMode(UI_TEXT.allPaymentModes);
    setAggregatePaymentStatus(UI_TEXT.allPaymentStatuses);
    setAggregatePackage(UI_TEXT.allPackages);
  }, []);

  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterMode[]>([FilterMode.ALL]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [subscriptionSortBy, setSubscriptionSortBy] = useState<DirectorySortMode>(DirectorySortMode.BLOCK_FLAT);
  const [subscriptionIsAscending, setSubscriptionIsAscending] = useState(true);

  const [targetDay, setTargetDay] = useState<Day>("");
  const [targetMeal, setTargetMeal] = useState<MealType | null>(null);

  const startNew = (dayConfig: ConfigDay[], seasonName: string, paymentConfig: PaymentConfig, freeMealEnabled: boolean, mobileEnabled: boolean, seasonEnabled: boolean) => {
    const enabledMethods = getEnabledPaymentMethods({
      seasonName,
      days: dayConfig,
      payment: paymentConfig,
      freeMealEnabled,
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

  const openScannedValue = (val: string, subscriptions: Subscription[], cheatCodeEnabled: boolean = false) => {
    const match = findSubscriptionByPassCodeOrCheatCode(val, subscriptions, cheatCodeEnabled);

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

  const resetViewStates = useCallback((preserveQuickCheckout = false, preserveQuickFreeMeal = false) => {
    setReportType(ReportType.DAY);
    setReportDayId("");
    setReportMealType(MealType.BREAKFAST);
    resetAggregateFilters();
    setSubscriptionSearch("");
    setActiveFilters([FilterMode.ALL]);
    setSelectedBlock(null);
    setSubscriptionSortBy(DirectorySortMode.BLOCK_FLAT);
    setSubscriptionIsAscending(true);
    setTargetDay("");
    setTargetMeal(null);
    if (!preserveQuickCheckout) {
      setIsQuickCheckout(false);
      setIsParcelCheckout(false);
    }
    if (!preserveQuickFreeMeal) {
      setIsQuickFreeMealMode(false);
    }
  }, [resetAggregateFilters]);

  const navigate = useCallback((next: Screen) => {
    if (next === AppScreen.HOME) {
      setHistory([]);
      resetViewStates(false, false);
    } else if (next !== screen) {
      if (screen === AppScreen.HOME) {
        resetViewStates(next === AppScreen.SCANNER, next === AppScreen.FREE_MEAL_MANAGEMENT);
      } else {
        if (next !== AppScreen.SCANNER) {
          setIsQuickCheckout(false);
          setIsParcelCheckout(false);
        }
        if (next !== AppScreen.FREE_MEAL_MANAGEMENT) setIsQuickFreeMealMode(false);
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
  }, [screen, resetViewStates]);

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((current) => current.slice(0, -1));
      if (prev === AppScreen.HOME) {
        setHistory([]);
        resetViewStates(false, false);
      } else {
        if (prev !== AppScreen.SCANNER) {
          setIsQuickCheckout(false);
          setIsParcelCheckout(false);
        }
        if (prev !== AppScreen.FREE_MEAL_MANAGEMENT) setIsQuickFreeMealMode(false);
      }
      setScreen(prev);
      return true;
    }
    if (screen !== AppScreen.HOME && screen !== AppScreen.LOGIN) {
      navigate(AppScreen.HOME);
      return true;
    }
    return false;
  }, [history, screen, resetViewStates, navigate]);

  // Hardware Back Button
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => sub.remove();
  }, [screen, history, editing, goBack]);

  // Sync screen with login status
  useEffect(() => {
    if (!userRole) {
      setScreen(AppScreen.LOGIN);
      setHistory([]);
      resetViewStates();
    } else if (screen === AppScreen.LOGIN) {
      navigate(AppScreen.HOME);
    }
  }, [userRole, screen, resetViewStates, navigate]);

  const value = useMemo(() => ({
    screen, history, navigate, goBack, startNew, openScannedValue,
    selectedId, setSelectedId, selectedRecord, setSelectedRecord, editing, setEditing,
    reportType, setReportType, reportDayId, setReportDayId, reportMealType, setReportMealType,
    aggregateBlock, setAggregateBlock,
    aggregateFlat, setAggregateFlat,
    aggregatePersonType, setAggregatePersonType,
    aggregateDiet, setAggregateDiet,
    aggregateDay, setAggregateDay,
    aggregateMeal, setAggregateMeal,
    aggregateService, setAggregateService,
    aggregatePaymentMode, setAggregatePaymentMode,
    aggregatePaymentStatus, setAggregatePaymentStatus,
    aggregatePackage, setAggregatePackage,
    resetAggregateFilters,
    subscriptionSearch, setSubscriptionSearch,
    activeFilters, setActiveFilters,
    selectedBlock, setSelectedBlock,
    subscriptionSortBy, setSubscriptionSortBy,
    subscriptionIsAscending, setSubscriptionIsAscending,
    targetDay, setTargetDay, targetMeal, setTargetMeal,
    isQuickCheckout, setIsQuickCheckout,
    isParcelCheckout, setIsParcelCheckout,
    isQuickFreeMealMode, setIsQuickFreeMealMode,
    isAccountModalVisible, openAccountModal, closeAccountModal
  }), [
    screen, history, selectedId, selectedRecord, editing,
    reportType, reportDayId, reportMealType,
    aggregateBlock, aggregateFlat, aggregatePersonType, aggregateDiet, aggregateDay, aggregateMeal, aggregateService, aggregatePaymentMode, aggregatePaymentStatus, aggregatePackage, resetAggregateFilters,
    subscriptionSearch, activeFilters, selectedBlock,
    subscriptionSortBy, subscriptionIsAscending,
    targetDay, targetMeal, isQuickCheckout, isParcelCheckout, isQuickFreeMealMode,
    isAccountModalVisible, openAccountModal, closeAccountModal,
    startNew, openScannedValue, navigate, goBack
  ]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useAppNavigation must be used within NavigationProvider");
  return context;
}
