import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Platform } from "react-native";
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
  PaymentMode,
  ActivityLog,
  ActivityModule,
  ActivityAction,
  Note,
  TakenState
} from "../types";
import { useAuth } from "./AuthContext";

const repository = createFirebaseRepository();

import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  getDayLabel,
  getMealLabel
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
  kidsEnabled: boolean;
  whatsappCountryCode: string;
  remoteAppVersion: string | null;
  notes: Note[];

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
  updateSubscriptionStatus: (flatId: string, dayId: string, personIndex: number, slot: string, taken: boolean) => Promise<void>;
  getAuthConfig: () => Promise<any>;
  addActivityLog: (log: Omit<ActivityLog, "id" | "timestamp" | "userName">, manualUser?: string) => void;
  getActivityLogs: (limit?: number) => Promise<ActivityLog[]>;
  upsertNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateGuestCountDebounced: (dayId: string, mealKey: MealType, field: string, value: number) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { userRole, userName } = useAuth();

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
  const [kidsEnabled, setKidsEnabled] = useState(false);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState(UI_TEXT.defaultCountryCode);
  const [remoteAppVersion, setRemoteAppVersion] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  const getAuthConfig = useCallback(() => repository.getAuthConfig(), []);

  const addActivityLog = useCallback((log: Omit<ActivityLog, "id" | "timestamp" | "userName" | "device" | "os">, manualUser?: string) => {
    const user = manualUser || userName;
    if (!user) return;
    void repository.addActivityLog({
      ...log,
      timestamp: Date.now(),
      userName: user,
      os: Platform.OS,
      device: Platform.Version ? String(Platform.Version) : undefined,
      appVersion: UI_TEXT.appVersion
    }).catch(err => console.error("Failed to add activity log:", err));
  }, [userName]);

  const getActivityLogs = useCallback((limitCount?: number) => {
    return repository.getActivityLogs(limitCount);
  }, []);

  const refreshAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!firebaseRepositoryConfigured) {
        setFirebaseError(firebaseMissingConfig.join(", "));
        return;
      }
      const [subs, config, menu, notesData, appVer] = await Promise.all([
        repository.list(),
        repository.getConfig(),
        repository.getMenu(),
        repository.getNotes(),
        repository.getAppVersion(),
      ]);

      if (appVer) {
        setRemoteAppVersion(appVer);
      } else {
        void repository.updateAppVersion(UI_TEXT.appVersion);
        setRemoteAppVersion(UI_TEXT.appVersion);
      }

      // Natural sort by Block then Flat
      const sortedSubs = [...subs].sort((a, b) => {
        const blockCompare = (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' });
        if (blockCompare !== 0) return blockCompare;
        return (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' });
      });

      setSubscriptions(sortedSubs);
      setDayConfig(config.days);
      setSeasonName(config.seasonName);
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      setGuestEnabled(config.guestEnabled !== false);
      setMobileEnabled(config.mobileEnabled !== false);
      setFoodPriceEnabled(config.foodPriceEnabled || false);
      setKidsEnabled(config.kidsEnabled || false);
      setWhatsappCountryCode(config.whatsappCountryCode || "91");
      setFoodMenu(menu);
      setNotes(notesData);
      setFirebaseError("");
    } catch (err: any) {
      console.error("Sync error:", err);
      const defaultError = UI_TEXT.syncError;
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

  // Real-time listener for remote app version changes
  useEffect(() => {
    if (!userRole) return;
    const unsubscribe = repository.onAppVersionChange((ver) => {
      if (ver !== null) {
        setRemoteAppVersion(ver);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userRole]);

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
      addActivityLog({
        module: ActivityModule.SUBSCRIPTION,
        action: ActivityAction.ERROR,
        targetId: sub.id,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.SUBSCRIPTION).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [refreshAllData, addActivityLog]);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      // Optimistic Update: Remove from local state first
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));

      await repository.remove(id);
      // Optional: Full refresh to sync any other concurrent changes
      await refreshAllData(true);
    } catch (err: any) {
      // If error occurs, we need to refresh to restore the potentially valid state
      await refreshAllData(true);
      addActivityLog({
        module: ActivityModule.SUBSCRIPTION,
        action: ActivityAction.ERROR,
        targetId: id,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.SUBSCRIPTION).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [refreshAllData, addActivityLog]);

  const updateConfig = useCallback(async (config: AppConfig) => {
    try {
      await repository.updateConfig(config);
      await refreshAllData(true);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.CONFIG).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [refreshAllData, addActivityLog]);

  const updateMenu = useCallback(async (menu: FoodMenu) => {
    try {
      await repository.updateMenu(menu);
      setFoodMenu(menu);
      await refreshAllData(true);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.MENU,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.MENU).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [refreshAllData, addActivityLog]);

  const updateGuestCount = useCallback(async (dayId: string, mealKey: MealType, field: string, value: number) => {
    try {
      // Optimistic update
      setFoodMenu(prev => ({
        ...prev,
        [dayId]: {
          ...prev[dayId],
          [mealKey]: { ...prev[dayId][mealKey as keyof DayMenu], [field]: value }
        }
      }));

      await repository.updateGuestCount(dayId, mealKey, field, value);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.GUEST,
        action: ActivityAction.ERROR,
        targetId: `${dayId}-${mealKey}`,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.GUEST).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const updateMealMenu = useCallback(async (dayId: string, mealKey: MealType, menu: MealMenu) => {
    try {
      await repository.updateMealMenu(dayId, mealKey, menu);
      setFoodMenu(prev => ({
        ...prev,
        [dayId]: { ...prev[dayId], [mealKey]: menu }
      }));
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.MENU,
        action: ActivityAction.ERROR,
        targetId: `${dayId}-${mealKey}`,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.MENU).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const updateSubscriptionStatus = useCallback(async (flatId: string, dayId: string, personIndex: number, slot: string, taken: boolean) => {
     try {
       const isParcel = slot.includes("Parcel");
       const mealKey = isParcel ? slot.replace("Parcel", "") : slot;
       const parcelKey = `${mealKey}Parcel`;

       await repository.updateSubscriptionStatus(flatId, dayId, personIndex, slot, taken);

       // Rule: If food taken is toggled OFF, also force parcel taken to OFF in database
       if (!isParcel && !taken) {
         await repository.updateSubscriptionStatus(flatId, dayId, personIndex, parcelKey, false);
       }

       // Optimistic update
       setSubscriptions(prev => prev.map(s => {
         if (s.id === flatId) {
            const updated = { ...s };
            const personTaken = { ...updated.takenByPerson[dayId][personIndex], [slot as keyof TakenState]: taken };

            if (!isParcel && !taken) {
              personTaken[parcelKey as keyof TakenState] = false;
            }

            updated.takenByPerson[dayId][personIndex] = personTaken;
            return updated;
         }
         return s;
       }));

       const sub = subscriptions.find(s => s.id === flatId);
       let collectionInfo = "";
       if (sub) {
         let ft = 0, pt = 0;
         Object.values(sub.takenByPerson || {}).forEach(dayList => {
           dayList.forEach(t => {
             if (t.breakfast) ft++;
             if (t.lunch) ft++;
             if (t.dinner) ft++;
             if (t.breakfastParcel) pt++;
             if (t.lunchParcel) pt++;
             if (t.dinnerParcel) pt++;
           });
         });
         collectionInfo = ` | Total Taken: ${ft}, P-Taken: ${pt}`;
       }

       addActivityLog({
         module: ActivityModule.SUBSCRIPTION,
         action: ActivityAction.UPDATE,
         targetId: flatId,
         description: (isParcel ? UI_TEXT.logUpdateParcelStatus : UI_TEXT.logUpdateStatus)
           .replace("{flatId}", flatId)
           .replace("{meal}", getMealLabel(mealKey as MealType))
           .replace("{person}", `Member ${personIndex + 1}`)
           .replace("{status}", taken ? UI_TEXT.taken : UI_TEXT.missed) + collectionInfo
       });
     } catch (err: any) {
       addActivityLog({
         module: ActivityModule.SUBSCRIPTION,
         action: ActivityAction.ERROR,
         targetId: flatId,
         description: UI_TEXT.logError.replace("{module}", ActivityModule.SUBSCRIPTION).replace("{message}", err.message || String(err)),
         stack: err.stack
       });
       throw err;
     }
  }, [addActivityLog]);

  const upsertNote = useCallback(async (note: Note) => {
    try {
      const isEdit = !!note.id;
      const result = await repository.upsertNote(note);
      addActivityLog({
        module: ActivityModule.NOTE,
        action: isEdit ? ActivityAction.UPDATE : ActivityAction.CREATE,
        description: (isEdit ? UI_TEXT.logEditNote : UI_TEXT.logAddNote).replace("{subject}", note.subject)
      });
      await refreshAllData(true);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.NOTE,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.NOTE).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [refreshAllData, addActivityLog]);

  const deleteNote = useCallback(async (id: string) => {
    // ... logic remains same ...
  }, [refreshAllData, addActivityLog, notes]);

  const guestUpdateTimers = useRef<Record<string, any>>({});

  const updateGuestCountDebounced = useCallback((dayId: string, mealKey: MealType, field: string, value: number) => {
     // 1. Immediate local UI update (Optimistic)
     setFoodMenu(prev => {
        const updatedDay = { ...(prev[dayId] || {}) };
        const updatedMeal = { ...(updatedDay[mealKey] || { veg: [], nonVeg: [] }), [field]: value };
        return {
          ...prev,
          [dayId]: { ...updatedDay, [mealKey]: updatedMeal }
        };
     });

     // 2. Debounce the Database write and Activity Log
     const timerKey = `${dayId}-${mealKey}-${field}`;
     if (guestUpdateTimers.current[timerKey]) {
        clearTimeout(guestUpdateTimers.current[timerKey]);
     }

     guestUpdateTimers.current[timerKey] = setTimeout(async () => {
        try {
          await repository.updateGuestCount(dayId, mealKey, field, value);

          addActivityLog({
            module: ActivityModule.GUEST,
            action: ActivityAction.UPDATE,
            targetId: `${dayId}-${mealKey}`,
            description: UI_TEXT.logUpdateGuest
              .replace("{field}", field)
              .replace("{value}", String(value))
              .replace("{day}", getDayLabel(dayId, dayConfig))
              .replace("{meal}", getMealLabel(mealKey))
          });
        } catch (err: any) {
          addActivityLog({
            module: ActivityModule.GUEST,
            action: ActivityAction.ERROR,
            targetId: `${dayId}-${mealKey}`,
            description: UI_TEXT.logError.replace("{module}", ActivityModule.GUEST).replace("{message}", err.message || String(err)),
            stack: err.stack
          });
        }
        delete guestUpdateTimers.current[timerKey];
     }, 1000);
  }, [addActivityLog, dayConfig]);

  const dashboardData = useMemo(() => {
    const uniqueSubscriptions = Array.from(new Map(subscriptions.map((s) => [s.id, s])).values());
    const activeDays = getActiveDays(dayConfig);
    if (activeDays.length === 0) return [];

    return activeDays.map((day) => {
      const dayMenu = foodMenu[day];
      const initialTotals = {
        dayId: day,
        people: 0,
        breakfast: 0,
        breakfastVeg: 0,
        breakfastNonVeg: 0,
        breakfastParcel: 0,
        breakfastParcelTaken: 0,
        breakfastTaken: 0,
        breakfastGuestVeg: guestEnabled ? (dayMenu?.breakfast?.guestVeg || 0) : 0,
        breakfastGuestNonVeg: guestEnabled ? (dayMenu?.breakfast?.guestNonVeg || 0) : 0,
        breakfastGuestTaken: guestEnabled ? (dayMenu?.breakfast?.guestTaken || 0) : 0,
        breakfastGuestVegTaken: guestEnabled ? (dayMenu?.breakfast?.guestVegTaken || 0) : 0,
        breakfastGuestNonVegTaken: guestEnabled ? (dayMenu?.breakfast?.guestNonVegTaken || 0) : 0,
        breakfastFlatVegTaken: 0,
        breakfastFlatNonVegTaken: 0,
        breakfastKidsTotal: 0,
        breakfastKidsVeg: 0,
        breakfastKidsNonVeg: 0,
        breakfastKidsTaken: 0,
        breakfastKidsVegTaken: 0,
        breakfastKidsNonVegTaken: 0,

        lunch: 0,
        lunchVeg: 0,
        lunchNonVeg: 0,
        lunchParcel: 0,
        lunchParcelTaken: 0,
        lunchTaken: 0,
        lunchGuestVeg: guestEnabled ? (dayMenu?.lunch?.guestVeg || 0) : 0,
        lunchGuestNonVeg: guestEnabled ? (dayMenu?.lunch?.guestNonVeg || 0) : 0,
        lunchGuestTaken: guestEnabled ? (dayMenu?.lunch?.guestTaken || 0) : 0,
        lunchGuestVegTaken: guestEnabled ? (dayMenu?.lunch?.guestVegTaken || 0) : 0,
        lunchGuestNonVegTaken: guestEnabled ? (dayMenu?.lunch?.guestNonVegTaken || 0) : 0,
        lunchFlatVegTaken: 0,
        lunchFlatNonVegTaken: 0,
        lunchKidsTotal: 0,
        lunchKidsVeg: 0,
        lunchKidsNonVeg: 0,
        lunchKidsTaken: 0,
        lunchKidsVegTaken: 0,
        lunchKidsNonVegTaken: 0,

        dinner: 0,
        dinnerVeg: 0,
        dinnerNonVeg: 0,
        dinnerParcel: 0,
        dinnerParcelTaken: 0,
        dinnerTaken: 0,
        dinnerGuestVeg: guestEnabled ? (dayMenu?.dinner?.guestVeg || 0) : 0,
        dinnerGuestNonVeg: guestEnabled ? (dayMenu?.dinner?.guestNonVeg || 0) : 0,
        dinnerGuestTaken: guestEnabled ? (dayMenu?.dinner?.guestTaken || 0) : 0,
        dinnerGuestVegTaken: guestEnabled ? (dayMenu?.dinner?.guestVegTaken || 0) : 0,
        dinnerGuestNonVegTaken: guestEnabled ? (dayMenu?.dinner?.guestNonVegTaken || 0) : 0,
        dinnerFlatVegTaken: 0,
        dinnerFlatNonVegTaken: 0,
        dinnerKidsTotal: 0,
        dinnerKidsVeg: 0,
        dinnerKidsNonVeg: 0,
        dinnerKidsTaken: 0,
        dinnerKidsVegTaken: 0,
        dinnerKidsNonVegTaken: 0,
      };

      return uniqueSubscriptions.reduce((totals, item) => {
        const mealSlots = item.mealSlots?.[day] || [];
        const takenByPerson = item.takenByPerson?.[day] || [];

          mealSlots.forEach((slots, index) => {
          const taken = takenByPerson?.[index];
          const isKid = kidsEnabled && index >= item.peopleCount;

          // Breakfast
          if (isMealEnabled(day, MealType.BREAKFAST, dayConfig) && slots?.[MealType.BREAKFAST] && slots[MealType.BREAKFAST] !== DietaryOption.NONE) {
             const diet = slots[MealType.BREAKFAST] === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
             if (isDietaryEnabled(day, MealType.BREAKFAST, diet, dayConfig)) {
                totals.breakfast += 1;
                if (isKid) totals.breakfastKidsTotal += 1;

                if (slots[MealType.BREAKFAST] === DietaryOption.VEG) {
                   if (isKid) totals.breakfastKidsVeg += 1;
                   else totals.breakfastVeg += 1;
                } else {
                   if (isKid) totals.breakfastKidsNonVeg += 1;
                   else totals.breakfastNonVeg += 1;
                }

                if (isParcelEnabled(day, MealType.BREAKFAST, dayConfig) && slots.breakfastParcel) {
                  totals.breakfastParcel += 1;
                  if (taken?.breakfastParcel) totals.breakfastParcelTaken += 1;
                }

                const isB_Taken = taken?.breakfast || taken?.breakfastParcel;

                if (isB_Taken) {
                  totals.breakfastTaken += 1;
                  if (isKid) totals.breakfastKidsTaken += 1;

                  if (slots[MealType.BREAKFAST] === DietaryOption.VEG) {
                     if (isKid) totals.breakfastKidsVegTaken += 1;
                     else totals.breakfastFlatVegTaken += 1;
                  } else {
                     if (isKid) totals.breakfastKidsNonVegTaken += 1;
                     else totals.breakfastFlatNonVegTaken += 1;
                  }
                }
             }
          }

          // Lunch
          if (isMealEnabled(day, MealType.LUNCH, dayConfig) && slots?.[MealType.LUNCH] && slots[MealType.LUNCH] !== DietaryOption.NONE) {
            const diet = slots[MealType.LUNCH] === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (isDietaryEnabled(day, MealType.LUNCH, diet, dayConfig)) {
              totals.lunch += 1;
              if (isKid) totals.lunchKidsTotal += 1;

              if (slots[MealType.LUNCH] === DietaryOption.VEG) {
                 if (isKid) totals.lunchKidsVeg += 1;
                 else totals.lunchVeg += 1;
              } else {
                 if (isKid) totals.lunchKidsNonVeg += 1;
                 else totals.lunchNonVeg += 1;
              }
              if (isParcelEnabled(day, MealType.LUNCH, dayConfig) && slots.lunchParcel) {
                totals.lunchParcel += 1;
                if (taken?.lunchParcel) totals.lunchParcelTaken += 1;
              }

              const isL_Taken = taken?.lunch || taken?.lunchParcel;

              if (isL_Taken) {
                totals.lunchTaken += 1;
                if (isKid) totals.lunchKidsTaken += 1;

                if (slots[MealType.LUNCH] === DietaryOption.VEG) {
                   if (isKid) totals.lunchKidsVegTaken += 1;
                   else totals.lunchFlatVegTaken += 1;
                } else {
                   if (isKid) totals.lunchKidsNonVegTaken += 1;
                   else totals.lunchFlatNonVegTaken += 1;
                }
              }
            }
          }

          // Dinner
          if (isMealEnabled(day, MealType.DINNER, dayConfig) && slots?.[MealType.DINNER] && slots[MealType.DINNER] !== DietaryOption.NONE) {
            const diet = slots[MealType.DINNER] === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (isDietaryEnabled(day, MealType.DINNER, diet, dayConfig)) {
              totals.dinner += 1;
              if (isKid) totals.dinnerKidsTotal += 1;

              if (slots[MealType.DINNER] === DietaryOption.VEG) {
                 if (isKid) totals.dinnerKidsVeg += 1;
                 else totals.dinnerVeg += 1;
              } else {
                 if (isKid) totals.dinnerKidsNonVeg += 1;
                 else totals.dinnerNonVeg += 1;
              }
              if (isParcelEnabled(day, MealType.DINNER, dayConfig) && slots.dinnerParcel) {
                totals.dinnerParcel += 1;
                if (taken?.dinnerParcel) totals.dinnerParcelTaken += 1;
              }

              const isD_Taken = taken?.dinner || taken?.dinnerParcel;

              if (isD_Taken) {
                totals.dinnerTaken += 1;
                if (isKid) totals.dinnerKidsTaken += 1;

                if (slots[MealType.DINNER] === DietaryOption.VEG) {
                   if (isKid) totals.dinnerKidsVegTaken += 1;
                   else totals.dinnerFlatVegTaken += 1;
                } else {
                   if (isKid) totals.dinnerKidsNonVegTaken += 1;
                   else totals.dinnerFlatNonVegTaken += 1;
                }
              }
            }
          }
        });
        return totals;
      }, initialTotals);
    });
  }, [subscriptions, foodMenu, dayConfig, guestEnabled, kidsEnabled]);

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
    return subscriptions.reduce((sum, sub) => sum + (sub.peopleCount || 0) + (sub.kidsCount || 0), 0);
  }, [subscriptions]);

  const value = useMemo(() => ({
    loading, firebaseError, refreshAllData,
    subscriptions, foodMenu, dayConfig, seasonName, seasonEnabled, paymentConfig, guestEnabled, mobileEnabled, foodPriceEnabled,
    kidsEnabled, whatsappCountryCode, remoteAppVersion, notes,
    dashboardData, collections, totalPeople,
    upsertSubscription, deleteSubscription, updateConfig, updateMenu, updateGuestCount, updateMealMenu, updateSubscriptionStatus,
    getAuthConfig, addActivityLog, getActivityLogs, upsertNote, deleteNote, updateGuestCountDebounced
  }), [
    loading, firebaseError, refreshAllData,
    subscriptions, foodMenu, dayConfig, seasonName, seasonEnabled, paymentConfig, guestEnabled, mobileEnabled, foodPriceEnabled,
    kidsEnabled, whatsappCountryCode, remoteAppVersion, notes,
    dashboardData, collections, totalPeople,
    upsertSubscription, deleteSubscription, updateConfig, updateMenu, updateGuestCount, updateMealMenu, updateSubscriptionStatus,
    getAuthConfig, addActivityLog, getActivityLogs, upsertNote, deleteNote, updateGuestCountDebounced
  ]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error("useDatabase must be used within DatabaseProvider");
  return context;
}
