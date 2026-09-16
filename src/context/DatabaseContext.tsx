import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  createFirebaseRepository,
  firebaseRepositoryConfigured
} from "../repository";
import { firebaseMissingConfig } from "../firebase";
import { UI_TEXT } from "../strings";
import {
  Subscription,
  FoodMenu,
  ConfigDay,
  PaymentConfig,
  AppConfig,
  DayMenu,
  MealMenu,
  MealType,
  DietType,
  DietaryOption,
  PaymentMode
} from "../types";
import { useAuth } from "./AuthContext";

const repository = createFirebaseRepository();

import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled
} from "../constants";

interface DatabaseContextType {
  // Sync Status
  loading: boolean;
  firebaseError: string;
  refreshAllData: (silent?: boolean) => Promise<void>;

  // Synced Data
  subscriptions: Subscription[];
  foodMenu: FoodMenu;
  dayConfig: ConfigDay[];
  seasonName: string;
  seasonEnabled: boolean;
  paymentConfig: PaymentConfig;
  guestEnabled: boolean;
  mobileEnabled: boolean;
  foodPriceEnabled: boolean;
  whatsappCountryCode: string;

  // Derived Metrics
  dashboardData: any[];
  collections: { total: number; upi: number; cash: number; bankTransfer: number };
  totalPeople: number;

  // Data Operations
  upsertSubscription: (sub: Subscription) => Promise<boolean>;
  deleteSubscription: (id: string) => Promise<void>;
  updateConfig: (config: AppConfig) => Promise<void>;
  updateMenu: (menu: FoodMenu) => Promise<void>;
  updateGuestCount: (dayId: string, mealKey: MealType, field: string, value: number) => Promise<void>;
  updateMealMenu: (dayId: string, mealKey: MealType, menu: MealMenu) => Promise<void>;
  updateSubscriptionStatus: (flatId: string, dayId: string, personIndex: number, slot: MealType, taken: boolean) => Promise<void>;
  getAuthConfig: () => Promise<any>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth();

  const [loading, setLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState("");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [foodMenu, setFoodMenu] = useState<FoodMenu>({});
  const [dayConfig, setDayConfig] = useState<ConfigDay[]>([]);
  const [seasonName, setSeasonName] = useState("");
  const [seasonEnabled, setSeasonEnabled] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    enabled: true,
    options: { upi: true, cash: true, bankTransfer: true }
  });
  const [guestEnabled, setGuestEnabled] = useState(true);
  const [mobileEnabled, setMobileEnabled] = useState(true);
  const [foodPriceEnabled, setFoodPriceEnabled] = useState(false);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("91");

  const refreshAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!firebaseRepositoryConfigured) {
        setFirebaseError(firebaseMissingConfig.join(", "));
        return;
      }
      const [subs, config, menu] = await Promise.all([
        repository.list(),
        repository.getConfig(),
        repository.getMenu(),
      ]);
      setSubscriptions(subs);
      setDayConfig(config.days);
      setSeasonName(config.seasonName);
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      setGuestEnabled(config.guestEnabled !== false);
      setMobileEnabled(config.mobileEnabled !== false);
      setFoodPriceEnabled(config.foodPriceEnabled || false);
      setWhatsappCountryCode(config.whatsappCountryCode || "91");
      setFoodMenu(menu);
      setFirebaseError("");
    } catch (err: any) {
      console.error("Sync error:", err);
      const defaultError = "Could not sync with database.";
      setFirebaseError(err.message || defaultError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole) {
      refreshAllData();
    }
  }, [userRole, refreshAllData]);

  // Periodic Background Sync (10s)
  useEffect(() => {
    if (!userRole) return;
    const interval = setInterval(() => refreshAllData(true), 10000);
    return () => clearInterval(interval);
  }, [userRole, refreshAllData]);

  const upsertSubscription = useCallback(async (sub: Subscription) => {
    try {
      await repository.upsert(sub);
      await refreshAllData(true);
      return true;
    } catch (err: any) {
      throw err;
    }
  }, [refreshAllData]);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      await repository.remove(id);
      await refreshAllData(true);
    } catch (err: any) {
      throw err;
    }
  }, [refreshAllData]);

  const updateConfig = useCallback(async (config: AppConfig) => {
    try {
      await repository.updateConfig(config);
      await refreshAllData(true);
    } catch (err: any) {
      throw err;
    }
  }, [refreshAllData]);

  const updateMenu = useCallback(async (menu: FoodMenu) => {
    try {
      await repository.updateMenu(menu);
      setFoodMenu(menu);
      await refreshAllData(true);
    } catch (err: any) {
      throw err;
    }
  }, [refreshAllData]);

  const updateGuestCount = useCallback(async (dayId: string, mealKey: MealType, field: string, value: number) => {
    try {
      await repository.updateGuestCount(dayId, mealKey, field, value);
      // Optimistic update
      setFoodMenu(prev => ({
        ...prev,
        [dayId]: {
          ...prev[dayId],
          [mealKey]: { ...prev[dayId][mealKey as keyof DayMenu], [field]: value }
        }
      }));
    } catch (err: any) {
      throw err;
    }
  }, []);

  const updateMealMenu = useCallback(async (dayId: string, mealKey: MealType, menu: MealMenu) => {
    try {
      await repository.updateMealMenu(dayId, mealKey, menu);
      setFoodMenu(prev => ({
        ...prev,
        [dayId]: { ...prev[dayId], [mealKey]: menu }
      }));
    } catch (err: any) {
      throw err;
    }
  }, []);

  const updateSubscriptionStatus = useCallback(async (flatId: string, dayId: string, personIndex: number, slot: MealType, taken: boolean) => {
     try {
       await repository.updateSubscriptionStatus(flatId, dayId, personIndex, slot, taken);
       // Optimistic update
       setSubscriptions(prev => prev.map(s => {
         if (s.id === flatId) {
            const updated = { ...s };
            updated.takenByPerson[dayId][personIndex] = {
              ...updated.takenByPerson[dayId][personIndex],
              [slot]: taken
            };
            return updated;
         }
         return s;
       }));
     } catch (err: any) {
       throw err;
     }
  }, []);

  const getAuthConfig = useCallback(() => repository.getAuthConfig(), []);

  const dashboardData = useMemo(() => {
    const uniqueSubscriptions = Array.from(new Map(subscriptions.map((s) => [s.id, s])).values());
    const activeDays = getActiveDays(dayConfig);
    if (activeDays.length === 0) return [];

    return activeDays.map((day) => {
      const dayMenu = foodMenu[day];
      const initialTotals = {
        dayId: day,
        people: 0,
        breakfast: guestEnabled ? ((dayMenu?.breakfast?.guestVeg || 0) + (dayMenu?.breakfast?.guestNonVeg || 0)) : 0,
        breakfastVeg: guestEnabled ? (dayMenu?.breakfast?.guestVeg || 0) : 0,
        breakfastNonVeg: guestEnabled ? (dayMenu?.breakfast?.guestNonVeg || 0) : 0,
        breakfastParcel: 0,
        breakfastParcelTaken: 0,
        breakfastTaken: guestEnabled ? ((dayMenu?.breakfast?.guestVegTaken || 0) + (dayMenu?.breakfast?.guestNonVegTaken || 0)) : 0,
        breakfastGuestVeg: guestEnabled ? (dayMenu?.breakfast?.guestVeg || 0) : 0,
        breakfastGuestNonVeg: guestEnabled ? (dayMenu?.breakfast?.guestNonVeg || 0) : 0,
        breakfastGuestTaken: guestEnabled ? ((dayMenu?.breakfast?.guestVegTaken || 0) + (dayMenu?.breakfast?.guestNonVegTaken || 0)) : 0,
        breakfastGuestVegTaken: guestEnabled ? (dayMenu?.breakfast?.guestVegTaken || 0) : 0,
        breakfastGuestNonVegTaken: guestEnabled ? (dayMenu?.breakfast?.guestNonVegTaken || 0) : 0,
        breakfastFlatVegTaken: 0,
        breakfastFlatNonVegTaken: 0,

        lunch: guestEnabled ? ((dayMenu?.lunch?.guestVeg || 0) + (dayMenu?.lunch?.guestNonVeg || 0)) : 0,
        lunchVeg: guestEnabled ? (dayMenu?.lunch?.guestVeg || 0) : 0,
        lunchNonVeg: guestEnabled ? (dayMenu?.lunch?.guestNonVeg || 0) : 0,
        lunchParcel: 0,
        lunchParcelTaken: 0,
        lunchTaken: guestEnabled ? ((dayMenu?.lunch?.guestVegTaken || 0) + (dayMenu?.lunch?.guestNonVegTaken || 0)) : 0,
        lunchGuestVeg: guestEnabled ? (dayMenu?.lunch?.guestVeg || 0) : 0,
        lunchGuestNonVeg: guestEnabled ? (dayMenu?.lunch?.guestNonVeg || 0) : 0,
        lunchGuestTaken: guestEnabled ? ((dayMenu?.lunch?.guestVegTaken || 0) + (dayMenu?.lunch?.guestNonVegTaken || 0)) : 0,
        lunchGuestVegTaken: guestEnabled ? (dayMenu?.lunch?.guestVegTaken || 0) : 0,
        lunchGuestNonVegTaken: guestEnabled ? (dayMenu?.lunch?.guestNonVegTaken || 0) : 0,
        lunchFlatVegTaken: 0,
        lunchFlatNonVegTaken: 0,

        dinner: guestEnabled ? ((dayMenu?.dinner?.guestVeg || 0) + (dayMenu?.dinner?.guestNonVeg || 0)) : 0,
        dinnerVeg: guestEnabled ? (dayMenu?.dinner?.guestVeg || 0) : 0,
        dinnerNonVeg: guestEnabled ? (dayMenu?.dinner?.guestNonVeg || 0) : 0,
        dinnerParcel: 0,
        dinnerParcelTaken: 0,
        dinnerTaken: guestEnabled ? ((dayMenu?.dinner?.guestVegTaken || 0) + (dayMenu?.dinner?.guestNonVegTaken || 0)) : 0,
        dinnerGuestVeg: guestEnabled ? (dayMenu?.dinner?.guestVeg || 0) : 0,
        dinnerGuestNonVeg: guestEnabled ? (dayMenu?.dinner?.guestNonVeg || 0) : 0,
        dinnerGuestTaken: guestEnabled ? ((dayMenu?.dinner?.guestVegTaken || 0) + (dayMenu?.dinner?.guestNonVegTaken || 0)) : 0,
        dinnerGuestVegTaken: guestEnabled ? (dayMenu?.dinner?.guestVegTaken || 0) : 0,
        dinnerGuestNonVegTaken: guestEnabled ? (dayMenu?.dinner?.guestNonVegTaken || 0) : 0,
        dinnerFlatVegTaken: 0,
        dinnerFlatNonVegTaken: 0,
      };

      return uniqueSubscriptions.reduce((totals, item) => {
        const mealSlots = item.mealSlots?.[day] || [];
        const takenByPerson = item.takenByPerson?.[day] || [];

        mealSlots.forEach((slots, index) => {
          const taken = takenByPerson?.[index];

          // Breakfast
          if (isMealEnabled(day, MealType.BREAKFAST, dayConfig) && slots?.[MealType.BREAKFAST] && slots[MealType.BREAKFAST] !== DietaryOption.NONE) {
             const diet = slots[MealType.BREAKFAST] === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
             if (isDietaryEnabled(day, MealType.BREAKFAST, diet, dayConfig)) {
                totals.breakfast += 1;
                if (slots[MealType.BREAKFAST] === DietaryOption.VEG) totals.breakfastVeg += 1;
                else totals.breakfastNonVeg += 1;
                if (isParcelEnabled(day, MealType.BREAKFAST, dayConfig) && slots.breakfastParcel) {
                  totals.breakfastParcel += 1;
                  if (taken?.breakfast) totals.breakfastParcelTaken += 1;
                }
                if (taken?.breakfast) {
                  totals.breakfastTaken += 1;
                  if (slots[MealType.BREAKFAST] === DietaryOption.VEG) totals.breakfastFlatVegTaken += 1;
                  else totals.breakfastFlatNonVegTaken += 1;
                }
             }
          }

          // Lunch
          if (isMealEnabled(day, MealType.LUNCH, dayConfig) && slots?.[MealType.LUNCH] && slots[MealType.LUNCH] !== DietaryOption.NONE) {
            const diet = slots[MealType.LUNCH] === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (isDietaryEnabled(day, MealType.LUNCH, diet, dayConfig)) {
              totals.lunch += 1;
              if (slots[MealType.LUNCH] === DietaryOption.VEG) totals.lunchVeg += 1;
              else totals.lunchNonVeg += 1;
              if (isParcelEnabled(day, MealType.LUNCH, dayConfig) && slots.lunchParcel) {
                totals.lunchParcel += 1;
                if (taken?.lunch) totals.lunchParcelTaken += 1;
              }
              if (taken?.lunch) {
                totals.lunchTaken += 1;
                if (slots[MealType.LUNCH] === DietaryOption.VEG) totals.lunchFlatVegTaken += 1;
                else totals.lunchFlatNonVegTaken += 1;
              }
            }
          }

          // Dinner
          if (isMealEnabled(day, MealType.DINNER, dayConfig) && slots?.[MealType.DINNER] && slots[MealType.DINNER] !== DietaryOption.NONE) {
            const diet = slots[MealType.DINNER] === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (isDietaryEnabled(day, MealType.DINNER, diet, dayConfig)) {
              totals.dinner += 1;
              if (slots[MealType.DINNER] === DietaryOption.VEG) totals.dinnerVeg += 1;
              else totals.dinnerNonVeg += 1;
              if (isParcelEnabled(day, MealType.DINNER, dayConfig) && slots.dinnerParcel) {
                totals.dinnerParcel += 1;
                if (taken?.dinner) totals.dinnerParcelTaken += 1;
              }
              if (taken?.dinner) {
                totals.dinnerTaken += 1;
                if (slots[MealType.DINNER] === DietaryOption.VEG) totals.dinnerFlatVegTaken += 1;
                else totals.dinnerFlatNonVegTaken += 1;
              }
            }
          }
        });
        return totals;
      }, initialTotals);
    });
  }, [subscriptions, foodMenu, dayConfig, guestEnabled]);

  const collections = useMemo(() => {
    let total = 0, upi = 0, cash = 0, bankTransfer = 0;
    subscriptions.forEach((item) => {
      if (item.payments && item.payments.length > 0) {
        item.payments.forEach((p) => {
          const amt = parseFloat(p.amount) || 0;
          total += amt;
          if (p.mode === PaymentMode.UPI) upi += amt;
          else if (p.mode === PaymentMode.CASH) cash += amt;
          else if (p.mode === PaymentMode.BANK_TRANSFER) bankTransfer += amt;
        });
      } else {
        const amt = parseFloat(item.amount) || 0;
        total += amt;
        if (item.paymentMode === PaymentMode.UPI) upi += amt;
        else if (item.paymentMode === PaymentMode.CASH) cash += amt;
        else if (item.paymentMode === PaymentMode.BANK_TRANSFER) bankTransfer += amt;
      }
    });
    return { total, upi, cash, bankTransfer };
  }, [subscriptions]);

  const totalPeople = useMemo(() => {
    return subscriptions.reduce((sum, sub) => sum + (sub.peopleCount || 0), 0);
  }, [subscriptions]);

  const value = useMemo(() => ({
    loading, firebaseError, refreshAllData,
    subscriptions, foodMenu, dayConfig, seasonName, seasonEnabled, paymentConfig, guestEnabled, mobileEnabled, foodPriceEnabled,
    whatsappCountryCode,
    dashboardData, collections, totalPeople,
    upsertSubscription, deleteSubscription, updateConfig, updateMenu, updateGuestCount, updateMealMenu, updateSubscriptionStatus,
    getAuthConfig
  }), [
    loading, firebaseError, refreshAllData,
    subscriptions, foodMenu, dayConfig, seasonName, seasonEnabled, paymentConfig, guestEnabled, mobileEnabled, foodPriceEnabled,
    whatsappCountryCode,
    dashboardData, collections, totalPeople,
    upsertSubscription, deleteSubscription, updateConfig, updateMenu, updateGuestCount, updateMealMenu, updateSubscriptionStatus,
    getAuthConfig
  ]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error("useDatabase must be used within DatabaseProvider");
  return context;
}
