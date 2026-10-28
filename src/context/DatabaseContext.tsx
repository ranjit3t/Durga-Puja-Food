import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
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
  TakenState,
  UserRole,
  KitchenMetrics,
  FreeMealCheckoutSource,
  FoodPackage,
  CatererTransaction,
  toBool,
} from "../types";
import { useAuth } from "./AuthContext";

const repository = createFirebaseRepository();

import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isKidsParcelEnabled,
  getDayLabel,
  getMealLabel,
  formatTakenTime,
  getDietTypeForChoice,
  getMealVarieties,
  getMealFreeMealCounts,
  isGuestsParcelEnabled,
  isMealSlotAbsent
} from "../constants";

export interface CoreDatabaseContextType {
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
  freeMealEnabled: boolean;
  mobileEnabled: boolean;
  foodPriceEnabled: boolean;
  kidsEnabled: boolean;
  guestsEnabled: boolean;
  vendorKidsMealChargingEnabled: boolean;
  whatsappCountryCode: string;
  quickCheckoutAutoCloseMs: number;
  soundEnabled: boolean;
  vendorName: string;
  vendorAddress: string;
  vendorSettledCost: string;
  nonAdminCheckoutEnabled: boolean;
  cheatCodeEnabled: boolean;
  remoteAppVersion: string | null;
  androidAppLocation?: string;
  iosAppLocation?: string;
  kitchenMetrics: KitchenMetrics | null;

  // Derived Metrics
  dashboardData: any[];
  collections: { total: number; upi: number; cash: number; bankTransfer: number };
  totalPeople: number;

  // Data Operations
  upsertSubscription: (sub: Subscription) => Promise<boolean>;
  deleteSubscription: (id: string) => Promise<void>;
  updateConfig: (config: AppConfig) => Promise<void>;
  updateMenu: (menu: FoodMenu) => Promise<void>;
  updateFreeMealCount: (dayId: string, mealKey: MealType, field: string, value: number) => Promise<void>;
  updateMealMenu: (dayId: string, mealKey: MealType, menu: MealMenu) => Promise<void>;
  updateSubscriptionStatus: (flatId: string, dayId: string, personIndex: number, slot: string, taken: boolean) => Promise<void>;
  updateMealAbsent: (flatId: string, dayId: string, personIndex: number, mealSlot: MealType | string, absent: boolean) => Promise<void>;
  checkInPassAtomic: (flatId: string, updatesMap: Record<string, boolean>, metricsIncrements?: Record<string, number>) => Promise<void>;
  getByPasscode: (passcode: string) => Promise<Subscription | undefined>;
  getAuthConfig: () => Promise<any>;
  updateFreeMealCountDebounced: (dayId: string, mealKey: MealType, field: string, value: number, source?: FreeMealCheckoutSource | string) => void;
}

export interface ActivityLogsContextType {
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, "id" | "timestamp" | "userName" | "userRole" | "device" | "os">, manualUser?: string, manualRole?: UserRole | string) => void;
  getActivityLogs: (limit?: number) => Promise<ActivityLog[]>;
  fetchMoreLogs: (limit: number) => Promise<void>;
}

export interface NotesContextType {
  notes: Note[];
  upsertNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export interface FoodPackagesContextType {
  foodPackages: FoodPackage[];
  upsertFoodPackage: (pkg: FoodPackage) => Promise<void>;
  deleteFoodPackage: (id: string) => Promise<void>;
}

export interface CatererFinanceContextType {
  catererTransactions: CatererTransaction[];
  upsertCatererTransaction: (tx: CatererTransaction) => Promise<void>;
  deleteCatererTransaction: (id: string) => Promise<void>;
}

export type DatabaseContextType = CoreDatabaseContextType & ActivityLogsContextType & NotesContextType & FoodPackagesContextType & CatererFinanceContextType;

const CoreDatabaseContext = createContext<CoreDatabaseContextType | undefined>(undefined);
const ActivityLogsContext = createContext<ActivityLogsContextType | undefined>(undefined);
const NotesContext = createContext<NotesContextType | undefined>(undefined);
const FoodPackagesContext = createContext<FoodPackagesContextType | undefined>(undefined);
const CatererFinanceContext = createContext<CatererFinanceContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { userRole, userName, userAccountName } = useAuth();

  const [loading, setLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState("");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [foodMenu, setFoodMenu] = useState<FoodMenu>({});
  const [dayConfig, setDayConfig] = useState<ConfigDay[]>([]);
  const [seasonName, setSeasonName] = useState("");
  const [seasonEnabled, setSeasonEnabled] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    enabled: true,
    maxPayments: 10,
    options: { upi: true, cash: true, bankTransfer: true }
  });
  const [freeMealEnabled, setFreeMealEnabled] = useState(true);
  const [mobileEnabled, setMobileEnabled] = useState(true);
  const [foodPriceEnabled, setFoodPriceEnabled] = useState(false);
  const [kidsEnabled, setKidsEnabled] = useState(false);
  const [guestsEnabled, setGuestsEnabled] = useState(false);
  const [vendorKidsMealChargingEnabled, setVendorKidsMealChargingEnabled] = useState(true);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState(UI_TEXT.defaultCountryCode);
  const [quickCheckoutAutoCloseMs, setQuickCheckoutAutoCloseMs] = useState<number>(3000);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [nonAdminCheckoutEnabled, setNonAdminCheckoutEnabled] = useState(true);
  const [cheatCodeEnabled, setCheatCodeEnabled] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorSettledCost, setVendorSettledCost] = useState("");
  const [remoteAppVersion, setRemoteAppVersion] = useState<string | null>(null);
  const [androidAppLocation, setAndroidAppLocation] = useState<string | undefined>(undefined);
  const [iosAppLocation, setIosAppLocation] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [foodPackages, setFoodPackages] = useState<FoodPackage[]>([]);
  const [catererTransactions, setCatererTransactions] = useState<CatererTransaction[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [kitchenMetrics, setKitchenMetrics] = useState<KitchenMetrics | null>(null);

  const getAuthConfig = useCallback(() => repository.getAuthConfig(), []);

  const addActivityLog = useCallback((log: Omit<ActivityLog, "id" | "timestamp" | "userName" | "userRole" | "device" | "os">, manualUser?: string, manualRole?: UserRole | string) => {
    let user = manualUser || userName;
    const role = manualRole || userRole;

    if (!manualUser && userName && userAccountName && userName.toLowerCase() !== userAccountName.toLowerCase()) {
      user = `${userName} (${userAccountName})`;
    }

    if (!user) return;
    void repository.addActivityLog({
      ...log,
      timestamp: Date.now(),
      userName: user,
      userRole: role || undefined,
      os: Platform.OS,
      device: Platform.Version ? String(Platform.Version) : undefined,
      appVersion: UI_TEXT.appVersion
    }).catch(err => console.error("Failed to add activity log:", err));
  }, [userName, userAccountName, userRole]);

  const upsertCatererTransaction = useCallback(async (tx: CatererTransaction) => {
    try {
      const isEdit = !!tx.id;
      await repository.upsertCatererTransaction(tx);
      addActivityLog({
        module: ActivityModule.REPORT,
        action: isEdit ? ActivityAction.UPDATE : ActivityAction.CREATE,
        description: `${isEdit ? "Updated" : "Added"} caterer transaction: ₹${tx.amount} (${tx.description})`,
      });
    } catch (err: any) {
      console.error("Upsert caterer transaction error:", err);
    }
  }, [addActivityLog]);

  const deleteCatererTransaction = useCallback(async (id: string) => {
    try {
      setCatererTransactions(prev => prev.filter(t => t.id !== id));
      await repository.removeCatererTransaction(id);
      addActivityLog({
        module: ActivityModule.REPORT,
        action: ActivityAction.DELETE,
        description: `Deleted caterer transaction ID: ${id}`,
      });
    } catch (err: any) {
      console.error("Delete caterer transaction error:", err);
    }
  }, [addActivityLog]);

  const getActivityLogs = useCallback((limitCount?: number) => {
    return repository.getActivityLogs(limitCount);
  }, []);

  const fetchMoreLogs = useCallback(async (limitCount: number) => {
    try {
      const logs = await repository.getActivityLogs(limitCount);
      setActivityLogs(logs);
    } catch (err) {
      console.error("Fetch more activity logs error:", err);
    }
  }, []);

  const getByPasscode = useCallback((passcode: string) => {
    return repository.getByPasscode(passcode);
  }, []);

  // Helper for natural block/flat sorting
  const sortSubscriptions = useCallback((list: Subscription[]) => {
    return [...list].sort((a, b) => {
      const blockCompare = (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' });
      if (blockCompare !== 0) return blockCompare;
      return (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' });
    });
  }, []);

  // Fast Full Refresh (Fallback or Manual Health-Check)
  const refreshAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!firebaseRepositoryConfigured) {
        setFirebaseError(firebaseMissingConfig.join(", "));
        return;
      }
      const [subs, config, menu, notesData, packagesData, catererData, appVer, logsData, metricsData] = await Promise.all([
        repository.list(),
        repository.getConfig(),
        repository.getMenu(),
        repository.getNotes(),
        repository.getFoodPackages(),
        repository.getCatererTransactions(),
        repository.getAppVersion(),
        repository.getActivityLogs(100),
        repository.getMetrics(),
      ]);

      if (appVer) {
        setRemoteAppVersion(appVer.version);
        setAndroidAppLocation(appVer.androidAppLocation);
        setIosAppLocation(appVer.iosAppLocation);
      } else {
        void repository.updateAppVersion(UI_TEXT.appVersion);
        setRemoteAppVersion(UI_TEXT.appVersion);
      }

      setSubscriptions(sortSubscriptions(subs));
      setDayConfig(config.days);
      setSeasonName(config.seasonName);
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      const fmActive = config.freeMealEnabled !== undefined ? config.freeMealEnabled !== false : config.freeMealEnabled !== false;
      setFreeMealEnabled(fmActive);
      setMobileEnabled(config.mobileEnabled !== false);
      setFoodPriceEnabled(config.foodPriceEnabled || false);
      setKidsEnabled(config.kidsEnabled || false);
      setGuestsEnabled(config.guestsEnabled || false);
      setVendorKidsMealChargingEnabled(config.vendorKidsMealChargingEnabled !== false);
      setWhatsappCountryCode(config.whatsappCountryCode || "91");
      setQuickCheckoutAutoCloseMs(config.quickCheckoutAutoCloseMs ?? 3000);
      setSoundEnabled(config.soundEnabled !== false);
      setNonAdminCheckoutEnabled(config.nonAdminCheckoutEnabled !== false);
      setCheatCodeEnabled(config.cheatCodeEnabled || false);
      setVendorName(config.vendorName || "");
      setVendorAddress(config.vendorAddress || "");
      setVendorSettledCost(config.vendorSettledCost || "");
      setFoodMenu(menu);
      setNotes(notesData);
      setFoodPackages(packagesData);
      setCatererTransactions(catererData || []);
      setActivityLogs(logsData);
      setKitchenMetrics(metricsData);
      setFirebaseError("");
    } catch (err: any) {
      console.error("Sync error:", err);
      const defaultError = UI_TEXT.syncError;
      setFirebaseError(err.message || defaultError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sortSubscriptions]);

  // Progressive Tiered Hydration & Real-Time Universal Listeners Engine
  useEffect(() => {
    if (!userRole) return;

    let isMounted = true;

    // Progressive Tier 1: Fast Parallel Metadata Load (<300ms)
    setLoading(true);
    Promise.all([
      repository.getConfig(),
      repository.getMenu(),
      repository.getNotes(),
      repository.getFoodPackages(),
      repository.getCatererTransactions(),
      repository.getAppVersion(),
      repository.getMetrics(),
      repository.getActivityLogs(100)
    ]).then(([config, menu, notesData, packagesData, catererData, appVer, metricsData, logsData]) => {
      if (!isMounted) return;

      setDayConfig(config.days || []);
      setSeasonName(config.seasonName || "");
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      const fmActive = config.freeMealEnabled !== undefined ? config.freeMealEnabled !== false : config.freeMealEnabled !== false;
      setFreeMealEnabled(fmActive);
      setMobileEnabled(config.mobileEnabled !== false);
      setFoodPriceEnabled(config.foodPriceEnabled || false);
      setKidsEnabled(config.kidsEnabled || false);
      setGuestsEnabled(config.guestsEnabled || false);
      setVendorKidsMealChargingEnabled(config.vendorKidsMealChargingEnabled !== false);
      setWhatsappCountryCode(config.whatsappCountryCode || "91");
      setQuickCheckoutAutoCloseMs(config.quickCheckoutAutoCloseMs ?? 3000);
      setSoundEnabled(config.soundEnabled !== false);
      setNonAdminCheckoutEnabled(config.nonAdminCheckoutEnabled !== false);
      setCheatCodeEnabled(config.cheatCodeEnabled || false);
      setVendorName(config.vendorName || "");
      setVendorAddress(config.vendorAddress || "");
      setVendorSettledCost(config.vendorSettledCost || "");
      setFoodMenu(menu);
      setNotes(notesData || []);
      setFoodPackages(packagesData || []);
      setCatererTransactions(catererData || []);
      setActivityLogs(logsData || []);
      if (appVer) {
        setRemoteAppVersion(appVer.version);
        setAndroidAppLocation(appVer.androidAppLocation);
        setIosAppLocation(appVer.iosAppLocation);
      }
      setKitchenMetrics(metricsData);

      // Fast Release UI: App is usable NOW in <300ms!
      setLoading(false);

      // Progressive Tier 2: Initial Subscriptions Fetch
      repository.list().then((subs) => {
        if (!isMounted) return;
        setSubscriptions(sortSubscriptions(subs));
      }).catch(err => console.error("Subscriptions list error:", err));

    }).catch(err => {
      console.error("Progressive load error:", err);
      if (isMounted) setLoading(false);
    });

    const activeDays = getActiveDays(dayConfig);

    // Register Universal Real-Time WebSocket Listeners with Debounced Batching
    let subBuffer: { type: "add" | "update" | "remove"; record?: Subscription; id?: string }[] = [];
    let subBatchTimer: any = null;

    const flushSubsBuffer = () => {
      if (!isMounted || subBuffer.length === 0) return;
      const currentBatch = [...subBuffer];
      subBuffer = [];
      subBatchTimer = null;

      setSubscriptions((prev) => {
        let list = [...prev];
        let changed = false;
        for (const op of currentBatch) {
          if (op.type === "add" && op.record) {
            if (!list.some((s) => s.id === op.record!.id)) {
              list.push(op.record);
              changed = true;
            }
          } else if (op.type === "update" && op.record) {
            const idx = list.findIndex((s) => s.id === op.record!.id);
            if (idx !== -1) {
              list[idx] = op.record;
              changed = true;
            }
          } else if (op.type === "remove" && op.id) {
            const filtered = list.filter((s) => s.id !== op.id);
            if (filtered.length !== list.length) {
              list = filtered;
              changed = true;
            }
          }
        }
        if (!changed) return prev;
        return sortSubscriptions(list);
      });
    };

    const unsubSubs = repository.onSubscriptionsDelta(
      (newRecord) => {
        subBuffer.push({ type: "add", record: newRecord });
        if (!subBatchTimer) subBatchTimer = setTimeout(flushSubsBuffer, 100);
      },
      (updatedRecord) => {
        subBuffer.push({ type: "update", record: updatedRecord });
        if (!subBatchTimer) subBatchTimer = setTimeout(flushSubsBuffer, 100);
      },
      (removedId) => {
        subBuffer.push({ type: "remove", id: removedId });
        if (!subBatchTimer) subBatchTimer = setTimeout(flushSubsBuffer, 100);
      },
      activeDays
    );

    const unsubNotes = repository.onNotesDelta(
      (newNote) => {
        setNotes((prev) => {
          if (prev.some((n) => n.id === newNote.id)) {
            return prev.map((n) => (n.id === newNote.id ? newNote : n)).sort((a, b) => b.timestamp - a.timestamp);
          }
          return [newNote, ...prev].sort((a, b) => b.timestamp - a.timestamp);
        });
      },
      (updatedNote) => {
        setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)).sort((a, b) => b.timestamp - a.timestamp));
      },
      (removedId) => {
        setNotes((prev) => prev.filter((n) => n.id !== removedId));
      }
    );

    const unsubFoodPackages = repository.onFoodPackagesDelta(
      (newPkg) => {
        setFoodPackages((prev) => {
          if (prev.some((p) => p.id === newPkg.id)) {
            return prev.map((p) => (p.id === newPkg.id ? newPkg : p)).sort((a, b) => b.timestamp - a.timestamp);
          }
          return [newPkg, ...prev].sort((a, b) => b.timestamp - a.timestamp);
        });
      },
      (updatedPkg) => {
        setFoodPackages((prev) => prev.map((p) => (p.id === updatedPkg.id ? updatedPkg : p)).sort((a, b) => b.timestamp - a.timestamp));
      },
      (removedId) => {
        setFoodPackages((prev) => prev.filter((p) => p.id !== removedId));
      }
    );

    const unsubCaterer = repository.onCatererTransactionsDelta(
      (newTx) => {
        setCatererTransactions((prev) => {
          if (prev.some((t) => t.id === newTx.id)) {
            return prev.map((t) => (t.id === newTx.id ? newTx : t)).sort((a, b) => b.date - a.date);
          }
          return [newTx, ...prev].sort((a, b) => b.date - a.date);
        });
      },
      (updatedTx) => {
        setCatererTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)).sort((a, b) => b.date - a.date));
      },
      (removedId) => {
        setCatererTransactions((prev) => prev.filter((t) => t.id !== removedId));
      }
    );

    let logBuffer: ActivityLog[] = [];
    let logBatchTimer: any = null;

    const unsubLogs = repository.onLogsDelta((newLog) => {
      logBuffer.push(newLog);
      if (!logBatchTimer) {
        logBatchTimer = setTimeout(() => {
          if (!isMounted) return;
          const currentBatch = [...logBuffer];
          logBuffer = [];
          logBatchTimer = null;

          setActivityLogs((prev) => {
            let updated = [...prev];
            let changed = false;
            for (const item of currentBatch) {
              const existingIdx = updated.findIndex((l) => l.id === item.id);
              if (existingIdx !== -1) {
                updated[existingIdx] = item;
                changed = true;
              } else {
                updated.push(item);
                changed = true;
              }
            }
            if (!changed) return prev;
            return updated.sort((a, b) => b.timestamp - a.timestamp);
          });
        }, 150);
      }
    });

    const unsubMenu = repository.onMenuChange((menu) => {
      setFoodMenu(menu);
    });

    const unsubConfig = repository.onConfigChange((config) => {
      setDayConfig(config.days || []);
      setSeasonName(config.seasonName || "");
      setSeasonEnabled(config.seasonEnabled !== false);
      if (config.payment) setPaymentConfig(config.payment);
      const fmActive = config.freeMealEnabled !== undefined ? config.freeMealEnabled !== false : config.freeMealEnabled !== false;
      setFreeMealEnabled(fmActive);
      setMobileEnabled(config.mobileEnabled !== false);
      setFoodPriceEnabled(config.foodPriceEnabled || false);
      setKidsEnabled(config.kidsEnabled || false);
      setGuestsEnabled(config.guestsEnabled || false);
      setWhatsappCountryCode(config.whatsappCountryCode || "91");
      setQuickCheckoutAutoCloseMs(config.quickCheckoutAutoCloseMs ?? 3000);
      setSoundEnabled(config.soundEnabled !== false);
      setNonAdminCheckoutEnabled(config.nonAdminCheckoutEnabled !== false);
      setCheatCodeEnabled(config.cheatCodeEnabled || false);
      setVendorName(config.vendorName || "");
      setVendorAddress(config.vendorAddress || "");
      setVendorSettledCost(config.vendorSettledCost || "");
    });

    const unsubMetrics = repository.onMetricsChange((metrics) => {
      setKitchenMetrics(metrics);
    });

    const unsubAppVersion = repository.onAppVersionChange((info) => {
      if (info) {
        setRemoteAppVersion(info.version);
        setAndroidAppLocation(info.androidAppLocation);
        setIosAppLocation(info.iosAppLocation);
      }
    });

    return () => {
      isMounted = false;
      if (subBatchTimer) clearTimeout(subBatchTimer);
      if (logBatchTimer) clearTimeout(logBatchTimer);
      unsubSubs();
      unsubNotes();
      unsubFoodPackages();
      unsubCaterer();
      unsubLogs();
      unsubMenu();
      unsubConfig();
      unsubMetrics();
      unsubAppVersion();
    };
  }, [userRole, sortSubscriptions]);

  // Lifecycle Reconnection Handlers (Mobile AppState & Web Visibility)
  useEffect(() => {
    if (!userRole) return;

    if (Platform.OS === "web") {
      const handleVisibilityChange = () => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          refreshAllData(true);
        }
      };
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }
      return () => {
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
      };
    } else {
      const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          refreshAllData(true);
        }
      });
      return () => subscription.remove();
    }
  }, [userRole, refreshAllData]);

  const upsertSubscription = useCallback(async (sub: Subscription) => {
    try {
      // Immediate local UI update (Optimistic)
      setSubscriptions((prev) => {
        const exists = prev.some((s) => s.id === sub.id);
        if (exists) {
          return prev.map((s) => (s.id === sub.id ? sub : s));
        }
        return sortSubscriptions([...prev, sub]);
      });

      await repository.upsert(sub);
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
  }, [addActivityLog, sortSubscriptions]);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      // Optimistic Update: Remove from local state first
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
      await repository.remove(id);
    } catch (err: any) {
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
      // Immediate local state update (Optimistic)
      if (config.days) setDayConfig(config.days);
      if (config.seasonName !== undefined) setSeasonName(config.seasonName);
      if (config.seasonEnabled !== undefined) setSeasonEnabled(config.seasonEnabled);
      if (config.payment) setPaymentConfig(config.payment);
      if (config.freeMealEnabled !== undefined) setFreeMealEnabled(config.freeMealEnabled);
      else if (config.freeMealEnabled !== undefined) setFreeMealEnabled(config.freeMealEnabled);
      if (config.mobileEnabled !== undefined) setMobileEnabled(config.mobileEnabled);
      if (config.foodPriceEnabled !== undefined) setFoodPriceEnabled(config.foodPriceEnabled);
      if (config.kidsEnabled !== undefined) setKidsEnabled(config.kidsEnabled);
      if (config.guestsEnabled !== undefined) setGuestsEnabled(config.guestsEnabled);
      if (config.vendorKidsMealChargingEnabled !== undefined) setVendorKidsMealChargingEnabled(config.vendorKidsMealChargingEnabled);
      if (config.whatsappCountryCode !== undefined) setWhatsappCountryCode(config.whatsappCountryCode);
      if (config.quickCheckoutAutoCloseMs !== undefined) setQuickCheckoutAutoCloseMs(config.quickCheckoutAutoCloseMs);
      if (config.soundEnabled !== undefined) setSoundEnabled(config.soundEnabled);
      if (config.nonAdminCheckoutEnabled !== undefined) setNonAdminCheckoutEnabled(config.nonAdminCheckoutEnabled);
      if (config.cheatCodeEnabled !== undefined) setCheatCodeEnabled(config.cheatCodeEnabled);
      if (config.vendorName !== undefined) setVendorName(config.vendorName);
      if (config.vendorAddress !== undefined) setVendorAddress(config.vendorAddress);
      if (config.vendorSettledCost !== undefined) setVendorSettledCost(config.vendorSettledCost);

      await repository.updateConfig(config);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.CONFIG).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const updateMenu = useCallback(async (menu: FoodMenu) => {
    try {
      await repository.updateMenu(menu);
      setFoodMenu(menu);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.MENU,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.MENU).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const applyFreeMealCountUpdate = (mealMenu: MealMenu, field: string, value: number): MealMenu => {
    const updatedMeal: MealMenu = { ...mealMenu };

    if (field === "freeMealVeg" || field === "freeMealNonVeg") {
      (updatedMeal as any)[field] = value;
    } else if (field === "freeMealVegTaken") {
      const maxDine = Math.max(0, (updatedMeal.freeMealVeg || 0) - (updatedMeal.freeMealVegParcelTaken || 0));
      updatedMeal.freeMealVegTaken = Math.min(value, maxDine);
    } else if (field === "freeMealNonVegTaken") {
      const maxDine = Math.max(0, (updatedMeal.freeMealNonVeg || 0) - (updatedMeal.freeMealNonVegParcelTaken || 0));
      updatedMeal.freeMealNonVegTaken = Math.min(value, maxDine);
    } else if (field === "freeMealVegParcelTaken") {
      const maxParc = Math.max(0, (updatedMeal.freeMealVeg || 0) - (updatedMeal.freeMealVegTaken || 0));
      updatedMeal.freeMealVegParcelTaken = Math.min(value, maxParc);
    } else if (field === "freeMealNonVegParcelTaken") {
      const maxParc = Math.max(0, (updatedMeal.freeMealNonVeg || 0) - (updatedMeal.freeMealNonVegTaken || 0));
      updatedMeal.freeMealNonVegParcelTaken = Math.min(value, maxParc);
    } else if (field.startsWith("fmc_") || field.startsWith("gc_")) {
      const varId = field.replace("fmc_", "").replace("gc_", "");
      if (varId === "veg_default") {
        updatedMeal.freeMealVeg = value;
      } else if (varId === "nonVeg_default") {
        updatedMeal.freeMealNonVeg = value;
      } else {
        const counts = { ...(updatedMeal.freeMealCounts || {}) };
        counts[varId] = value;
        updatedMeal.freeMealCounts = counts;
      }
    } else if (field.startsWith("fmt_") || field.startsWith("gt_")) {
      const varId = field.replace("fmt_", "").replace("gt_", "");
      if (varId === "veg_default") {
        const maxDine = Math.max(0, (updatedMeal.freeMealVeg || 0) - (updatedMeal.freeMealVegParcelTaken || 0));
        updatedMeal.freeMealVegTaken = Math.min(value, maxDine);
      } else if (varId === "nonVeg_default") {
        const maxDine = Math.max(0, (updatedMeal.freeMealNonVeg || 0) - (updatedMeal.freeMealNonVegParcelTaken || 0));
        updatedMeal.freeMealNonVegTaken = Math.min(value, maxDine);
      } else {
        const takenCounts = { ...(updatedMeal.freeMealTakenCounts || {}) };
        const parcelTakenCounts = updatedMeal.freeMealParcelTakenCounts || {};
        const counts = updatedMeal.freeMealCounts || {};
        const planned = Number(counts[varId]) || 0;
        const parcel = Number(parcelTakenCounts[varId]) || 0;
        const maxDine = Math.max(0, planned - parcel);
        takenCounts[varId] = Math.min(value, maxDine);
        updatedMeal.freeMealTakenCounts = takenCounts;
      }
    } else if (field.startsWith("fmp_") || field.startsWith("gpt_")) {
      const varId = field.replace("fmp_", "").replace("gpt_", "");
      if (varId === "veg_default") {
        const maxParc = Math.max(0, (updatedMeal.freeMealVeg || 0) - (updatedMeal.freeMealVegTaken || 0));
        updatedMeal.freeMealVegParcelTaken = Math.min(value, maxParc);
      } else if (varId === "nonVeg_default") {
        const maxParc = Math.max(0, (updatedMeal.freeMealNonVeg || 0) - (updatedMeal.freeMealNonVegTaken || 0));
        updatedMeal.freeMealNonVegParcelTaken = Math.min(value, maxParc);
      } else {
        const takenCounts = updatedMeal.freeMealTakenCounts || {};
        const parcelTakenCounts = { ...(updatedMeal.freeMealParcelTakenCounts || {}) };
        const counts = updatedMeal.freeMealCounts || {};
        const planned = Number(counts[varId]) || 0;
        const dineIn = Number(takenCounts[varId]) || 0;
        const maxParc = Math.max(0, planned - dineIn);
        parcelTakenCounts[varId] = Math.min(value, maxParc);
        updatedMeal.freeMealParcelTakenCounts = parcelTakenCounts;
      }
    } else {
      (updatedMeal as any)[field] = value;
    }

    let gTotal = (updatedMeal.freeMealVeg || 0) + (updatedMeal.freeMealNonVeg || 0);
    let gDineIn = (updatedMeal.freeMealVegTaken || 0) + (updatedMeal.freeMealNonVegTaken || 0);
    let gParcel = (updatedMeal.freeMealVegParcelTaken || 0) + (updatedMeal.freeMealNonVegParcelTaken || 0);

    const countsObj = updatedMeal.freeMealCounts;
    if (countsObj) {
      Object.entries(countsObj).forEach(([vId, cnt]) => {
        if (vId !== "veg_default" && vId !== "nonVeg_default") {
          gTotal += Number(cnt) || 0;
        }
      });
    }
    const takenCountsObj = updatedMeal.freeMealTakenCounts;
    if (takenCountsObj) {
      Object.entries(takenCountsObj).forEach(([vId, cnt]) => {
        if (vId !== "veg_default" && vId !== "nonVeg_default") {
          gDineIn += Number(cnt) || 0;
        }
      });
    }
    const parcelTakenCountsObj = updatedMeal.freeMealParcelTakenCounts;
    if (parcelTakenCountsObj) {
      Object.entries(parcelTakenCountsObj).forEach(([vId, cnt]) => {
        if (vId !== "veg_default" && vId !== "nonVeg_default") {
          gParcel += Number(cnt) || 0;
        }
      });
    }

    updatedMeal.freeMealTotal = gTotal;
    updatedMeal.freeMealDineInTaken = gDineIn;
    updatedMeal.freeMealParcelTaken = gParcel;
    updatedMeal.freeMealTaken = gDineIn + gParcel;

    return updatedMeal;
  };

  const buildFreeMealUpdatePayload = (
    field: string,
    value: number,
    updatedMeal: MealMenu
  ): Record<string, any> => {
    const payload: Record<string, any> = {
      freeMealTotal: updatedMeal.freeMealTotal,
      freeMealTaken: updatedMeal.freeMealTaken,
      freeMealParcelTaken: updatedMeal.freeMealParcelTaken,
    };

    if (field === "freeMealVeg" || field === "freeMealNonVeg") {
      payload[field] = value;
    } else if (field === "freeMealVegTaken" || field === "freeMealNonVegTaken" || field === "freeMealVegParcelTaken" || field === "freeMealNonVegParcelTaken") {
      payload["freeMealVegTaken"] = updatedMeal.freeMealVegTaken;
      payload["freeMealNonVegTaken"] = updatedMeal.freeMealNonVegTaken;
      payload["freeMealVegParcelTaken"] = updatedMeal.freeMealVegParcelTaken;
      payload["freeMealNonVegParcelTaken"] = updatedMeal.freeMealNonVegParcelTaken;
    } else if (field.startsWith("fmc_") || field.startsWith("gc_")) {
      const varId = field.replace("fmc_", "").replace("gc_", "");
      if (varId === "veg_default") {
        payload["freeMealVeg"] = value;
      } else if (varId === "nonVeg_default") {
        payload["freeMealNonVeg"] = value;
      } else {
        payload[`freeMealCounts/${varId}`] = value;
      }
    } else if (field.startsWith("fmt_") || field.startsWith("gt_") || field.startsWith("fmp_") || field.startsWith("gpt_")) {
      const varId = field.replace("fmt_", "").replace("gt_", "").replace("fmp_", "").replace("gpt_", "");
      if (varId === "veg_default") {
        payload["freeMealVegTaken"] = updatedMeal.freeMealVegTaken;
        payload["freeMealVegParcelTaken"] = updatedMeal.freeMealVegParcelTaken;
      } else if (varId === "nonVeg_default") {
        payload["freeMealNonVegTaken"] = updatedMeal.freeMealNonVegTaken;
        payload["freeMealNonVegParcelTaken"] = updatedMeal.freeMealNonVegParcelTaken;
      } else {
        payload[`freeMealTakenCounts/${varId}`] = updatedMeal.freeMealTakenCounts?.[varId];
        payload[`freeMealParcelTakenCounts/${varId}`] = updatedMeal.freeMealParcelTakenCounts?.[varId];
      }
    } else {
      payload[field] = value;
    }

    return payload;
  };

  const updateFreeMealCount = useCallback(async (dayId: string, mealKey: MealType, field: string, value: number) => {
    try {
      setFoodMenu(prev => {
        const dayMenu = prev[dayId] || {
          [MealType.BREAKFAST]: { veg: [], nonVeg: [] },
          [MealType.LUNCH]: { veg: [], nonVeg: [] },
          [MealType.DINNER]: { veg: [], nonVeg: [] },
        };
        const mealMenu = dayMenu[mealKey] || { veg: [], nonVeg: [] };
        const updatedMeal = applyFreeMealCountUpdate(mealMenu, field, value);

        return {
          ...prev,
          [dayId]: {
            ...dayMenu,
            [mealKey]: updatedMeal
          }
        };
      });

      setFoodMenu(currentMenu => {
        const currentMeal = currentMenu[dayId]?.[mealKey] || { veg: [], nonVeg: [] };
        const updatedMeal = applyFreeMealCountUpdate(currentMeal, field, value);
        const payload = buildFreeMealUpdatePayload(field, value, updatedMeal);

        repository.updateFreeMealCounts(dayId, mealKey, payload);
        return currentMenu;
      });
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.FREE_MEAL,
        action: ActivityAction.ERROR,
        targetId: `${dayId}-${mealKey}`,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.FREE_MEAL).replace("{message}", err.message || String(err)),
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
       const timeKey = `${slot}Time`;
       const userKey = `${slot}User`;
       const parcelTimeKey = `${parcelKey}Time`;
       const parcelUserKey = `${parcelKey}User`;
       const nowTime = formatTakenTime(new Date());
       const currentUser = userAccountName || userName || String(userRole || "Operator");

       const targetSub = subscriptions.find(s => s.id === flatId);
       const existingTime = targetSub?.takenByPerson?.[dayId]?.[personIndex]?.[timeKey as keyof TakenState] as string | undefined;
       const existingUser = targetSub?.takenByPerson?.[dayId]?.[personIndex]?.[userKey as keyof TakenState] as string | undefined;
       const stampTime = taken ? (existingTime || nowTime) : undefined;
       const stampUser = taken ? (existingUser || currentUser) : undefined;

       await repository.updateSubscriptionStatus(flatId, dayId, personIndex, slot, taken, stampTime, stampUser);

       if (!isParcel && !taken) {
         await repository.updateSubscriptionStatus(flatId, dayId, personIndex, parcelKey, false);
       }
       if (isParcel && taken) {
         await repository.updateSubscriptionStatus(flatId, dayId, personIndex, mealKey, true, stampTime, stampUser);
       }

       setSubscriptions(prev => prev.map(s => {
         if (s.id === flatId) {
            const updated = { ...s };
            const dayList = [...(updated.takenByPerson[dayId] || [])];
            if (dayList[personIndex]) {
              const personTaken: any = {
                ...dayList[personIndex],
                [slot]: taken,
                [timeKey]: stampTime,
                [userKey]: stampUser,
              };

              if (!isParcel && !taken) {
                personTaken[parcelKey] = false;
                personTaken[parcelTimeKey] = undefined;
                personTaken[parcelUserKey] = undefined;
              }
              if (isParcel && taken) {
                personTaken[mealKey] = true;
                personTaken[`${mealKey}Time`] = stampTime;
                personTaken[`${mealKey}User`] = stampUser;
              }

              dayList[personIndex] = personTaken;
              updated.takenByPerson = { ...updated.takenByPerson, [dayId]: dayList };
            }
            return updated;
         }
         return s;
       }));

       let collectionInfo = "";
       if (targetSub) {
         let ft = 0, pt = 0;
         Object.values(targetSub.takenByPerson || {}).forEach(dayList => {
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
  }, [addActivityLog, subscriptions]);

  const updateMealAbsent = useCallback(async (flatId: string, dayId: string, personIndex: number, mealSlot: MealType | string, absent: boolean) => {
    try {
      const mealKey = mealSlot;
      const parcelKey = `${mealKey}Parcel`;
      const absentKey = `${mealKey}Absent`;
      const absentTimeKey = `${mealKey}AbsentTime`;
      const absentUserKey = `${mealKey}AbsentUser`;
      const timeKey = `${mealKey}Time`;
      const userKey = `${mealKey}User`;
      const parcelTimeKey = `${parcelKey}Time`;
      const parcelUserKey = `${parcelKey}User`;

      const targetSub = subscriptions.find(s => s.id === flatId);
      const personTaken = targetSub?.takenByPerson?.[dayId]?.[personIndex];
      const isMealTaken = toBool(personTaken?.[mealKey as keyof TakenState]);
      const isParcelTaken = toBool(personTaken?.[parcelKey as keyof TakenState]);

      // Constraint: If meal/parcel is taken, cannot mark absent (must un-mark taken first)
      if (absent && (isMealTaken || isParcelTaken)) {
        return;
      }

      const nowTime = formatTakenTime(new Date());
      const currentUser = userAccountName || userName || String(userRole || "Operator");

      const stampTime = absent ? nowTime : undefined;
      const stampUser = absent ? currentUser : undefined;

      await repository.updateSubscriptionStatus(flatId, dayId, personIndex, absentKey, absent, stampTime, stampUser);
      if (absent) {
        await repository.updateSubscriptionStatus(flatId, dayId, personIndex, mealKey, false);
        await repository.updateSubscriptionStatus(flatId, dayId, personIndex, parcelKey, false);
      }

      setSubscriptions(prev => prev.map(s => {
        if (s.id === flatId) {
          const updated = { ...s };
          const dayList = [...(updated.takenByPerson[dayId] || [])];
          if (dayList[personIndex]) {
            const currentObj: any = { ...dayList[personIndex] };
            currentObj[absentKey] = absent;
            currentObj[absentTimeKey] = stampTime;
            currentObj[absentUserKey] = stampUser;

            if (absent) {
              currentObj[mealKey] = false;
              currentObj[parcelKey] = false;
              currentObj[timeKey] = undefined;
              currentObj[userKey] = undefined;
              currentObj[parcelTimeKey] = undefined;
              currentObj[parcelUserKey] = undefined;
            }

            dayList[personIndex] = currentObj;
            updated.takenByPerson = { ...updated.takenByPerson, [dayId]: dayList };
          }
          return updated;
        }
        return s;
      }));

      addActivityLog({
        module: ActivityModule.SUBSCRIPTION,
        action: ActivityAction.UPDATE,
        targetId: flatId,
        description: (UI_TEXT.logUpdateAbsentStatus || "{flatId}: Marked {meal} for {person} as {status}")
          .replace("{flatId}", flatId)
          .replace("{meal}", getMealLabel(mealKey as MealType))
          .replace("{person}", `Member ${personIndex + 1}`)
          .replace("{status}", absent ? UI_TEXT.absent : "Present")
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
  }, [addActivityLog, subscriptions, userAccountName, userName, userRole]);

  const checkInPassAtomic = useCallback(async (flatId: string, updatesMap: Record<string, boolean>, metricsIncrements?: Record<string, number>) => {
    try {
      await repository.checkInPassAtomic(flatId, updatesMap, metricsIncrements);
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.SCANNER,
        action: ActivityAction.ERROR,
        targetId: flatId,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.SCANNER).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const upsertNote = useCallback(async (note: Note) => {
    try {
      const isEdit = !!note.id;
      await repository.upsertNote(note);
      addActivityLog({
        module: ActivityModule.NOTE,
        action: isEdit ? ActivityAction.UPDATE : ActivityAction.CREATE,
        targetId: note.subject,
        description: (isEdit ? UI_TEXT.logEditNote : UI_TEXT.logAddNote).replace("{subject}", note.subject)
      });
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.NOTE,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.NOTE).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      const noteToDelete = notes.find(n => n.id === id);
      const noteSubject = noteToDelete?.subject || id;
      setNotes(prev => prev.filter(n => n.id !== id));
      await repository.removeNote(id);
      addActivityLog({
        module: ActivityModule.NOTE,
        action: ActivityAction.DELETE,
        targetId: noteSubject,
        description: UI_TEXT.logDeleteNote.replace("{subject}", noteSubject)
      });
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.NOTE,
        action: ActivityAction.ERROR,
        targetId: id,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.NOTE).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [notes, addActivityLog]);

  const upsertFoodPackage = useCallback(async (pkg: FoodPackage) => {
    try {
      const isEdit = !!pkg.id;
      await repository.upsertFoodPackage(pkg);
      addActivityLog({
        module: ActivityModule.PACKAGE,
        action: isEdit ? ActivityAction.UPDATE : ActivityAction.CREATE,
        targetId: pkg.name,
        description: (isEdit ? UI_TEXT.logUpdatePackage : UI_TEXT.logCreatePackage).replace("{name}", pkg.name)
      });
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.PACKAGE,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.PACKAGE).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [addActivityLog]);

  const deleteFoodPackage = useCallback(async (id: string) => {
    try {
      const pkgToDelete = foodPackages.find(p => p.id === id);
      const pkgName = pkgToDelete?.name || id;
      setFoodPackages(prev => prev.filter(p => p.id !== id));
      await repository.removeFoodPackage(id);
      addActivityLog({
        module: ActivityModule.PACKAGE,
        action: ActivityAction.DELETE,
        targetId: pkgName,
        description: UI_TEXT.logDeletePackage.replace("{name}", pkgName)
      });
    } catch (err: any) {
      addActivityLog({
        module: ActivityModule.PACKAGE,
        action: ActivityAction.ERROR,
        targetId: id,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.PACKAGE).replace("{message}", err.message || String(err)),
        stack: err.stack
      });
      throw err;
    }
  }, [foodPackages, addActivityLog]);

  const freeMealUpdateTimers = useRef<Record<string, any>>({});

  const updateFreeMealCountDebounced = useCallback((dayId: string, mealKey: MealType, field: string, value: number, source?: FreeMealCheckoutSource | string) => {
     setFoodMenu(prev => {
        const updatedDay = { ...(prev[dayId] || {}) };
        const mealMenu = updatedDay[mealKey] || { veg: [], nonVeg: [] };
        const updatedMeal = applyFreeMealCountUpdate(mealMenu, field, value);

        return {
          ...prev,
          [dayId]: { ...updatedDay, [mealKey]: updatedMeal }
        };
     });

     const timerKey = `${dayId}-${mealKey}-${field}`;
     if (freeMealUpdateTimers.current[timerKey]) {
        clearTimeout(freeMealUpdateTimers.current[timerKey]);
     }

     freeMealUpdateTimers.current[timerKey] = setTimeout(async () => {
        try {
          setFoodMenu(currentMenu => {
             const currentMeal = currentMenu[dayId]?.[mealKey] || { veg: [], nonVeg: [] };
             const updatedMeal = applyFreeMealCountUpdate(currentMeal, field, value);
             const payload = buildFreeMealUpdatePayload(field, value, updatedMeal);

             repository.updateFreeMealCounts(dayId, mealKey, payload);
             return currentMenu;
          });

          addActivityLog({
            module: ActivityModule.FREE_MEAL,
            action: ActivityAction.UPDATE,
            targetId: `${dayId}-${mealKey}`,
            description: UI_TEXT.logUpdateFreeMeal
              .replace("{field}", field)
              .replace("{value}", String(value))
              .replace("{day}", getDayLabel(dayId, dayConfig))
              .replace("{meal}", getMealLabel(mealKey))
              .replace("{source}", source || FreeMealCheckoutSource.FREE_MEAL_SCREEN)
          });
        } catch (err: any) {
          addActivityLog({
            module: ActivityModule.FREE_MEAL,
            action: ActivityAction.ERROR,
            targetId: `${dayId}-${mealKey}`,
            description: UI_TEXT.logError.replace("{module}", ActivityModule.FREE_MEAL).replace("{message}", err.message || String(err)),
            stack: err.stack
          });
        }
        delete freeMealUpdateTimers.current[timerKey];
     }, 1000);
  }, [addActivityLog, dayConfig]);

  const dashboardData = useMemo(() => {
    const uniqueSubscriptions = Array.from(new Map(subscriptions.map((s) => [s.id, s])).values());
    const activeDays = getActiveDays(dayConfig);
    if (activeDays.length === 0) return [];

    return activeDays.map((day) => {
      const dayMenu = foodMenu[day];
      const dayConf = (dayConfig || []).find((d) => d.id === day);

      const bMenu = dayMenu?.breakfast;
      const lMenu = dayMenu?.lunch;
      const dMenu = dayMenu?.dinner;

      const bVarieties = getMealVarieties(dayConf?.breakfast, dayConf?.vegOnly);
      const lVarieties = getMealVarieties(dayConf?.lunch, dayConf?.vegOnly);
      const dVarieties = getMealVarieties(dayConf?.dinner, dayConf?.vegOnly);

      const bFC = getMealFreeMealCounts(bMenu, bVarieties, day, MealType.BREAKFAST, dayConfig);
      const lFC = getMealFreeMealCounts(lMenu, lVarieties, day, MealType.LUNCH, dayConfig);
      const dFC = getMealFreeMealCounts(dMenu, dVarieties, day, MealType.DINNER, dayConfig);

      const initialTotals = {
        dayId: day,
        people: 0,
        breakfast: 0,
        breakfastVeg: 0,
        breakfastNonVeg: 0,
        breakfastParcel: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealParcelTaken : 0,
        breakfastParcelTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealParcelTaken : 0,
        breakfastParcelVeg: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealVegParcelTaken : 0,
        breakfastParcelNonVeg: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealNonVegParcelTaken : 0,
        breakfastParcelVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealVegParcelTaken : 0,
        breakfastParcelNonVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealNonVegParcelTaken : 0,
        breakfastTaken: 0,
        breakfastFreeMealVeg: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig) && isDietaryEnabled(day, MealType.BREAKFAST, DietType.VEG, dayConfig)) ? bFC.freeMealVeg : 0,
        breakfastFreeMealNonVeg: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig) && isDietaryEnabled(day, MealType.BREAKFAST, DietType.NON_VEG, dayConfig)) ? bFC.freeMealNonVeg : 0,
        breakfastFreeMealTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealTaken : 0,
        breakfastFreeMealVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig) && isDietaryEnabled(day, MealType.BREAKFAST, DietType.VEG, dayConfig)) ? (bFC.freeMealVegTaken + bFC.freeMealVegParcelTaken) : 0,
        breakfastFreeMealNonVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig) && isDietaryEnabled(day, MealType.BREAKFAST, DietType.NON_VEG, dayConfig)) ? (bFC.freeMealNonVegTaken + bFC.freeMealNonVegParcelTaken) : 0,
        breakfastFreeMealDineInTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealDineInTaken : 0,
        breakfastFreeMealParcelTaken: (freeMealEnabled && isMealEnabled(day, MealType.BREAKFAST, dayConfig)) ? bFC.freeMealParcelTaken : 0,
        breakfastFlatVegTaken: 0,
        breakfastFlatNonVegTaken: 0,
        breakfastKidsTotal: 0,
        breakfastKidsVeg: 0,
        breakfastKidsNonVeg: 0,
        breakfastKidsTaken: 0,
        breakfastKidsVegTaken: 0,
        breakfastKidsNonVegTaken: 0,
        breakfastGuestsTotal: 0,
        breakfastGuestsVeg: 0,
        breakfastGuestsNonVeg: 0,
        breakfastGuestsTaken: 0,
        breakfastGuestsVegTaken: 0,
        breakfastGuestsNonVegTaken: 0,

        lunch: 0,
        lunchVeg: 0,
        lunchNonVeg: 0,
        lunchParcel: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealParcelTaken : 0,
        lunchParcelTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealParcelTaken : 0,
        lunchParcelVeg: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealVegParcelTaken : 0,
        lunchParcelNonVeg: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealNonVegParcelTaken : 0,
        lunchParcelVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealVegParcelTaken : 0,
        lunchParcelNonVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealNonVegParcelTaken : 0,
        lunchTaken: 0,
        lunchFreeMealVeg: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig) && isDietaryEnabled(day, MealType.LUNCH, DietType.VEG, dayConfig)) ? lFC.freeMealVeg : 0,
        lunchFreeMealNonVeg: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig) && isDietaryEnabled(day, MealType.LUNCH, DietType.NON_VEG, dayConfig)) ? lFC.freeMealNonVeg : 0,
        lunchFreeMealTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealTaken : 0,
        lunchFreeMealVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig) && isDietaryEnabled(day, MealType.LUNCH, DietType.VEG, dayConfig)) ? (lFC.freeMealVegTaken + lFC.freeMealVegParcelTaken) : 0,
        lunchFreeMealNonVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig) && isDietaryEnabled(day, MealType.LUNCH, DietType.NON_VEG, dayConfig)) ? (lFC.freeMealNonVegTaken + lFC.freeMealNonVegParcelTaken) : 0,
        lunchFreeMealDineInTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealDineInTaken : 0,
        lunchFreeMealParcelTaken: (freeMealEnabled && isMealEnabled(day, MealType.LUNCH, dayConfig)) ? lFC.freeMealParcelTaken : 0,
        lunchFlatVegTaken: 0,
        lunchFlatNonVegTaken: 0,
        lunchKidsTotal: 0,
        lunchKidsVeg: 0,
        lunchKidsNonVeg: 0,
        lunchKidsTaken: 0,
        lunchKidsVegTaken: 0,
        lunchKidsNonVegTaken: 0,
        lunchGuestsTotal: 0,
        lunchGuestsVeg: 0,
        lunchGuestsNonVeg: 0,
        lunchGuestsTaken: 0,
        lunchGuestsVegTaken: 0,
        lunchGuestsNonVegTaken: 0,

        dinner: 0,
        dinnerVeg: 0,
        dinnerNonVeg: 0,
        dinnerParcel: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealParcelTaken : 0,
        dinnerParcelTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealParcelTaken : 0,
        dinnerParcelVeg: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealVegParcelTaken : 0,
        dinnerParcelNonVeg: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealNonVegParcelTaken : 0,
        dinnerParcelVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealVegParcelTaken : 0,
        dinnerParcelNonVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealNonVegParcelTaken : 0,
        dinnerTaken: 0,
        dinnerFreeMealVeg: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig) && isDietaryEnabled(day, MealType.DINNER, DietType.VEG, dayConfig)) ? dFC.freeMealVeg : 0,
        dinnerFreeMealNonVeg: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig) && isDietaryEnabled(day, MealType.DINNER, DietType.NON_VEG, dayConfig)) ? dFC.freeMealNonVeg : 0,
        dinnerFreeMealTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealTaken : 0,
        dinnerFreeMealVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig) && isDietaryEnabled(day, MealType.DINNER, DietType.VEG, dayConfig)) ? (dFC.freeMealVegTaken + dFC.freeMealVegParcelTaken) : 0,
        dinnerFreeMealNonVegTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig) && isDietaryEnabled(day, MealType.DINNER, DietType.NON_VEG, dayConfig)) ? (dFC.freeMealNonVegTaken + dFC.freeMealNonVegParcelTaken) : 0,
        dinnerFreeMealDineInTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealDineInTaken : 0,
        dinnerFreeMealParcelTaken: (freeMealEnabled && isMealEnabled(day, MealType.DINNER, dayConfig)) ? dFC.freeMealParcelTaken : 0,
        dinnerFlatVegTaken: 0,
        dinnerFlatNonVegTaken: 0,
        dinnerKidsTotal: 0,
        dinnerKidsVeg: 0,
        dinnerKidsNonVeg: 0,
        dinnerKidsTaken: 0,
        dinnerKidsVegTaken: 0,
        dinnerKidsNonVegTaken: 0,
        dinnerGuestsTotal: 0,
        dinnerGuestsVeg: 0,
        dinnerGuestsNonVeg: 0,
        dinnerGuestsTaken: 0,
        dinnerGuestsVegTaken: 0,
        dinnerGuestsNonVegTaken: 0
      };

      return uniqueSubscriptions.reduce((totals, item) => {
        const mealSlots = item.mealSlots?.[day] || [];
        const takenByPerson = item.takenByPerson?.[day] || [];

        mealSlots.forEach((slots, index) => {
          const taken = takenByPerson?.[index];
          const kCount = kidsEnabled ? (item.kidsCount || 0) : 0;
          const gCount = guestsEnabled ? (item.guestsCount || 0) : 0;
          const isKid = kidsEnabled && index >= item.peopleCount && index < item.peopleCount + kCount;
          const isGuest = guestsEnabled && index >= item.peopleCount + kCount;

          // Breakfast
          if (isMealEnabled(day, MealType.BREAKFAST, dayConfig) && slots?.[MealType.BREAKFAST] && slots[MealType.BREAKFAST] !== DietaryOption.NONE && !isMealSlotAbsent(taken, MealType.BREAKFAST)) {
            const bVarieties = dayConf ? getMealVarieties(dayConf.breakfast) : [];
            const diet = getDietTypeForChoice(slots[MealType.BREAKFAST], bVarieties);
            if (diet && isDietaryEnabled(day, MealType.BREAKFAST, diet, dayConfig)) {
              totals.breakfast += 1;
              if (isGuest) totals.breakfastGuestsTotal += 1;
              else if (isKid) totals.breakfastKidsTotal += 1;

              if (diet === DietType.VEG) {
                if (isGuest) totals.breakfastGuestsVeg += 1;
                else if (isKid) totals.breakfastKidsVeg += 1;
                else totals.breakfastVeg += 1;
              } else {
                if (isGuest) totals.breakfastGuestsNonVeg += 1;
                else if (isKid) totals.breakfastKidsNonVeg += 1;
                else totals.breakfastNonVeg += 1;
              }

              const isB_ParcelOptEnabled = isGuest
                ? isGuestsParcelEnabled(day, MealType.BREAKFAST, dayConfig, guestsEnabled)
                : isKid
                ? isKidsParcelEnabled(day, MealType.BREAKFAST, dayConfig, kidsEnabled)
                : isParcelEnabled(day, MealType.BREAKFAST, dayConfig);

              if (isB_ParcelOptEnabled && slots.breakfastParcel) {
                totals.breakfastParcel += 1;
                if (diet === DietType.VEG) {
                  totals.breakfastParcelVeg += 1;
                  if (taken?.breakfastParcel) totals.breakfastParcelVegTaken += 1;
                } else {
                  totals.breakfastParcelNonVeg += 1;
                  if (taken?.breakfastParcel) totals.breakfastParcelNonVegTaken += 1;
                }
                if (taken?.breakfastParcel) totals.breakfastParcelTaken += 1;
              }

              const isB_Taken = taken?.breakfast || taken?.breakfastParcel;

              if (isB_Taken) {
                totals.breakfastTaken += 1;
                if (isGuest) {
                  totals.breakfastGuestsTaken += 1;
                  if (diet === DietType.VEG) totals.breakfastGuestsVegTaken += 1;
                  else totals.breakfastGuestsNonVegTaken += 1;
                } else if (isKid) {
                  totals.breakfastKidsTaken += 1;
                  if (diet === DietType.VEG) totals.breakfastKidsVegTaken += 1;
                  else totals.breakfastKidsNonVegTaken += 1;
                } else {
                  if (diet === DietType.VEG) totals.breakfastFlatVegTaken += 1;
                  else totals.breakfastFlatNonVegTaken += 1;
                }
              }
            }
          }

          // Lunch
          if (isMealEnabled(day, MealType.LUNCH, dayConfig) && slots?.[MealType.LUNCH] && slots[MealType.LUNCH] !== DietaryOption.NONE && !isMealSlotAbsent(taken, MealType.LUNCH)) {
            const lVarieties = dayConf ? getMealVarieties(dayConf.lunch) : [];
            const diet = getDietTypeForChoice(slots[MealType.LUNCH], lVarieties);
            if (diet && isDietaryEnabled(day, MealType.LUNCH, diet, dayConfig)) {
              totals.lunch += 1;
              if (isGuest) totals.lunchGuestsTotal += 1;
              else if (isKid) totals.lunchKidsTotal += 1;

              if (diet === DietType.VEG) {
                if (isGuest) totals.lunchGuestsVeg += 1;
                else if (isKid) totals.lunchKidsVeg += 1;
                else totals.lunchVeg += 1;
              } else {
                if (isGuest) totals.lunchGuestsNonVeg += 1;
                else if (isKid) totals.lunchKidsNonVeg += 1;
                else totals.lunchNonVeg += 1;
              }

              const isL_ParcelOptEnabled = isGuest
                ? isGuestsParcelEnabled(day, MealType.LUNCH, dayConfig, guestsEnabled)
                : isKid
                ? isKidsParcelEnabled(day, MealType.LUNCH, dayConfig, kidsEnabled)
                : isParcelEnabled(day, MealType.LUNCH, dayConfig);

              if (isL_ParcelOptEnabled && slots.lunchParcel) {
                totals.lunchParcel += 1;
                if (diet === DietType.VEG) {
                  totals.lunchParcelVeg += 1;
                  if (taken?.lunchParcel) totals.lunchParcelVegTaken += 1;
                } else {
                  totals.lunchParcelNonVeg += 1;
                  if (taken?.lunchParcel) totals.lunchParcelNonVegTaken += 1;
                }
                if (taken?.lunchParcel) totals.lunchParcelTaken += 1;
              }

              const isL_Taken = taken?.lunch || taken?.lunchParcel;

              if (isL_Taken) {
                totals.lunchTaken += 1;
                if (isGuest) {
                  totals.lunchGuestsTaken += 1;
                  if (diet === DietType.VEG) totals.lunchGuestsVegTaken += 1;
                  else totals.lunchGuestsNonVegTaken += 1;
                } else if (isKid) {
                  totals.lunchKidsTaken += 1;
                  if (diet === DietType.VEG) totals.lunchKidsVegTaken += 1;
                  else totals.lunchKidsNonVegTaken += 1;
                } else {
                  if (diet === DietType.VEG) totals.lunchFlatVegTaken += 1;
                  else totals.lunchFlatNonVegTaken += 1;
                }
              }
            }
          }

          // Dinner
          if (isMealEnabled(day, MealType.DINNER, dayConfig) && slots?.[MealType.DINNER] && slots[MealType.DINNER] !== DietaryOption.NONE && !isMealSlotAbsent(taken, MealType.DINNER)) {
            const dVarieties = dayConf ? getMealVarieties(dayConf.dinner) : [];
            const diet = getDietTypeForChoice(slots[MealType.DINNER], dVarieties);
            if (diet && isDietaryEnabled(day, MealType.DINNER, diet, dayConfig)) {
              totals.dinner += 1;
              if (isGuest) totals.dinnerGuestsTotal += 1;
              else if (isKid) totals.dinnerKidsTotal += 1;

              if (diet === DietType.VEG) {
                if (isGuest) totals.dinnerGuestsVeg += 1;
                else if (isKid) totals.dinnerKidsVeg += 1;
                else totals.dinnerVeg += 1;
              } else {
                if (isGuest) totals.dinnerGuestsNonVeg += 1;
                else if (isKid) totals.dinnerKidsNonVeg += 1;
                else totals.dinnerNonVeg += 1;
              }

              const isD_ParcelOptEnabled = isGuest
                ? isGuestsParcelEnabled(day, MealType.DINNER, dayConfig, guestsEnabled)
                : isKid
                ? isKidsParcelEnabled(day, MealType.DINNER, dayConfig, kidsEnabled)
                : isParcelEnabled(day, MealType.DINNER, dayConfig);

              if (isD_ParcelOptEnabled && slots.dinnerParcel) {
                totals.dinnerParcel += 1;
                if (diet === DietType.VEG) {
                  totals.dinnerParcelVeg += 1;
                  if (taken?.dinnerParcel) totals.dinnerParcelVegTaken += 1;
                } else {
                  totals.dinnerParcelNonVeg += 1;
                  if (taken?.dinnerParcel) totals.dinnerParcelNonVegTaken += 1;
                }
                if (taken?.dinnerParcel) totals.dinnerParcelTaken += 1;
              }

              const isD_Taken = taken?.dinner || taken?.dinnerParcel;

              if (isD_Taken) {
                totals.dinnerTaken += 1;
                if (isGuest) {
                  totals.dinnerGuestsTaken += 1;
                  if (diet === DietType.VEG) totals.dinnerGuestsVegTaken += 1;
                  else totals.dinnerGuestsNonVegTaken += 1;
                } else if (isKid) {
                  totals.dinnerKidsTaken += 1;
                  if (diet === DietType.VEG) totals.dinnerKidsVegTaken += 1;
                  else totals.dinnerKidsNonVegTaken += 1;
                } else {
                  if (diet === DietType.VEG) totals.dinnerFlatVegTaken += 1;
                  else totals.dinnerFlatNonVegTaken += 1;
                }
              }
            }
          }
        });
        return totals;
      }, initialTotals);
    });
  }, [subscriptions, foodMenu, dayConfig, freeMealEnabled, kidsEnabled]);

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
    return subscriptions.reduce((sum, sub) => sum + (sub.peopleCount || 0) + (kidsEnabled ? (sub.kidsCount || 0) : 0) + (guestsEnabled ? (sub.guestsCount || 0) : 0), 0);
  }, [subscriptions, kidsEnabled, guestsEnabled]);

  const coreValue = useMemo(() => ({
    loading, firebaseError, refreshAllData,
    subscriptions, foodMenu, dayConfig, seasonName, seasonEnabled, paymentConfig,
    freeMealEnabled, mobileEnabled, foodPriceEnabled,
    kidsEnabled, guestsEnabled, vendorKidsMealChargingEnabled, whatsappCountryCode, quickCheckoutAutoCloseMs, soundEnabled, nonAdminCheckoutEnabled, cheatCodeEnabled, vendorName, vendorAddress, vendorSettledCost, remoteAppVersion, androidAppLocation, iosAppLocation, kitchenMetrics,
    dashboardData, collections, totalPeople,
    upsertSubscription, deleteSubscription, updateConfig, updateMenu,
    updateFreeMealCount, updateMealMenu, updateSubscriptionStatus, updateMealAbsent,
    checkInPassAtomic, getByPasscode,
    getAuthConfig, updateFreeMealCountDebounced
  }), [
    loading, firebaseError, refreshAllData,
    subscriptions, foodMenu, dayConfig, seasonName, seasonEnabled, paymentConfig,
    freeMealEnabled, mobileEnabled, foodPriceEnabled,
    kidsEnabled, guestsEnabled, vendorKidsMealChargingEnabled, whatsappCountryCode, quickCheckoutAutoCloseMs, soundEnabled, nonAdminCheckoutEnabled, cheatCodeEnabled, vendorName, vendorAddress, vendorSettledCost, remoteAppVersion, androidAppLocation, iosAppLocation, kitchenMetrics,
    dashboardData, collections, totalPeople,
    upsertSubscription, deleteSubscription, updateConfig, updateMenu,
    updateFreeMealCount, updateMealMenu, updateSubscriptionStatus, updateMealAbsent,
    checkInPassAtomic, getByPasscode,
    getAuthConfig, updateFreeMealCountDebounced
  ]);

  const logsValue = useMemo(() => ({
    activityLogs, addActivityLog, getActivityLogs, fetchMoreLogs
  }), [activityLogs, addActivityLog, getActivityLogs, fetchMoreLogs]);

  const notesValue = useMemo(() => ({
    notes, upsertNote, deleteNote
  }), [notes, upsertNote, deleteNote]);

  const foodPackagesValue = useMemo(() => ({
    foodPackages, upsertFoodPackage, deleteFoodPackage
  }), [foodPackages, upsertFoodPackage, deleteFoodPackage]);

  const catererFinanceValue = useMemo(() => ({
    catererTransactions, upsertCatererTransaction, deleteCatererTransaction
  }), [catererTransactions, upsertCatererTransaction, deleteCatererTransaction]);

  return (
    <CoreDatabaseContext.Provider value={coreValue}>
      <NotesContext.Provider value={notesValue}>
        <FoodPackagesContext.Provider value={foodPackagesValue}>
          <CatererFinanceContext.Provider value={catererFinanceValue}>
            <ActivityLogsContext.Provider value={logsValue}>
              {children}
            </ActivityLogsContext.Provider>
          </CatererFinanceContext.Provider>
        </FoodPackagesContext.Provider>
      </NotesContext.Provider>
    </CoreDatabaseContext.Provider>
  );
}

export function useCoreDatabase(): CoreDatabaseContextType {
  const context = useContext(CoreDatabaseContext);
  if (!context) throw new Error("useCoreDatabase must be used within DatabaseProvider");
  return context;
}

export function useActivityLogs(): ActivityLogsContextType {
  const context = useContext(ActivityLogsContext);
  if (!context) throw new Error("useActivityLogs must be used within DatabaseProvider");
  return context;
}

export function useNotes(): NotesContextType {
  const context = useContext(NotesContext);
  if (!context) throw new Error("useNotes must be used within DatabaseProvider");
  return context;
}

export function useFoodPackages(): FoodPackagesContextType {
  const context = useContext(FoodPackagesContext);
  if (!context) throw new Error("useFoodPackages must be used within DatabaseProvider");
  return context;
}

export function useCatererFinance(): CatererFinanceContextType {
  const context = useContext(CatererFinanceContext);
  if (!context) throw new Error("useCatererFinance must be used within DatabaseProvider");
  return context;
}

export function useDatabase(): DatabaseContextType {
  const core = useContext(CoreDatabaseContext);
  const notesCtx = useContext(NotesContext);
  const foodPackagesCtx = useContext(FoodPackagesContext);
  const catererFinanceCtx = useContext(CatererFinanceContext);
  const logsCtx = useContext(ActivityLogsContext);

  if (!core || !notesCtx || !foodPackagesCtx || !catererFinanceCtx || !logsCtx) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }

  return useMemo(() => ({
    ...core,
    ...notesCtx,
    ...foodPackagesCtx,
    ...catererFinanceCtx,
    ...logsCtx,
  }), [core, notesCtx, foodPackagesCtx, catererFinanceCtx, logsCtx]);
}
