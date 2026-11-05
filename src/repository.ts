/**
 * Firebase Repository Layer
 * Handles data persistence, retrieval, and schema normalization.
 */
import {
  get,
  ref,
  remove,
  set,
  update,
  push,
  query,
  limitToLast,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  orderByChild,
  equalTo,
  increment,
  onDisconnect,
  serverTimestamp
} from "firebase/database";
import { ensureFirebaseAuth, firebaseConfigured } from "./firebase";
import { encryptChatMessage, decryptChatMessage } from "./utils/chatEncryption";
import { withServerTimeout } from "./utils/asyncUtils";
import {
  SubscriptionRecord,
  FoodMenu,
  MealMenu,
  EventDay,
  MealChoice,
  MealSlot,
  TakenState,
  PaymentEntry,
  MealAllocation,
  MealType,
  DietType,
  DietaryOption,
  normalizeSlot,
  toBool,
  ActivityLog,
  PaymentMode,
  Note,
  KitchenMetrics,
  AppVersionInfo,
  ChatMessage,
  UserPresence,
  FoodPackage,
  CatererTransaction,
  SeasonConfig,
  UserRole,
} from "./domain";
import { ConfigDay, AppConfig } from "./types";
import { blockOptions, generatePasscode, generateUniquePasscode, getDietTypeForChoice, getMealVarieties } from "./constants";

// --- Repository Interface ---

export interface SubscriptionRepository {
  setTenantId(tenantId: string): void;
  list(tenantId?: string): Promise<SubscriptionRecord[]>;
  getByFlatId(flatId: string, tenantId?: string): Promise<SubscriptionRecord | undefined>;
  getByPasscode(passcode: string, tenantId?: string): Promise<SubscriptionRecord | undefined>;
  upsert(record: SubscriptionRecord, tenantId?: string): Promise<SubscriptionRecord>;
  remove(flatId: string, tenantId?: string): Promise<void>;
  getMenu(tenantId?: string): Promise<FoodMenu>;
  updateMenu(menu: FoodMenu, tenantId?: string): Promise<void>;
  updateMealMenu(dayId: string, mealKey: MealType, menu: MealMenu, tenantId?: string): Promise<void>;
  updateFreeMealCount(dayId: string, mealKey: MealType, field: string, value: number, tenantId?: string): Promise<void>;
  updateFreeMealCounts(dayId: string, mealKey: MealType, data: Record<string, any>, tenantId?: string): Promise<void>;
  getConfig(tenantId?: string): Promise<AppConfig>;
  updateConfig(config: AppConfig, tenantIdOverride?: string): Promise<void>;
  updateSubscriptionStatus(flatId: string, dayId: string, personIndex: number, slot: string, taken: boolean, timeStr?: string, userStr?: string, tenantId?: string): Promise<void>;
  checkInPassAtomic(flatId: string, updatesMap: Record<string, boolean>, metricsIncrements?: Record<string, number>, tenantId?: string): Promise<void>;
  getAuthConfig(): Promise<any>;
  updateAuthConfig(config: any): Promise<void>;
  addActivityLog(log: Omit<ActivityLog, "id">, tenantId?: string, isSuperAdmin?: boolean): Promise<void>;
  getActivityLogs(limit?: number, tenantId?: string, isSuperAdmin?: boolean): Promise<ActivityLog[]>;
  getNotes(tenantId?: string): Promise<Note[]>;
  upsertNote(note: Note, tenantId?: string): Promise<Note>;
  removeNote(id: string, tenantId?: string): Promise<void>;
  getFoodPackages(tenantId?: string): Promise<FoodPackage[]>;
  upsertFoodPackage(pkg: FoodPackage, tenantId?: string): Promise<FoodPackage>;
  removeFoodPackage(id: string, tenantId?: string): Promise<void>;
  getCatererTransactions(tenantId?: string): Promise<CatererTransaction[]>;
  upsertCatererTransaction(tx: CatererTransaction, tenantId?: string): Promise<CatererTransaction>;
  removeCatererTransaction(id: string, tenantId?: string): Promise<void>;
  getAppVersion(): Promise<AppVersionInfo | null>;
  updateAppVersion(version: string): Promise<void>;
  listTenants(): Promise<Record<string, { name?: string; tenantName?: string; enabled?: boolean }>>;
  createTenant(tenantId: string, tenantName: string): Promise<void>;
  updateTenantName(tenantId: string, tenantName: string): Promise<void>;
  setTenantStatus(tenantId: string, enabled: boolean): Promise<void>;
  onTenantsChange(callback: (tenants: Record<string, any>) => void): () => void;
  updateAppVersionInfo(info: { androidAppLocation?: string; iosAppLocation?: string; version?: string; deprecatedVersion?: string }): Promise<void>;
  onTenantStatusChange(tenantId: string, callback: (status: { exists: boolean; enabled: boolean }) => void): () => void;
  hasAnyPassesAcrossSeasons(tenantId?: string): Promise<boolean>;
  getMetrics(): Promise<KitchenMetrics | null>;
  // Real-time Delta Listeners
  onSubscriptionsDelta(
    onAdded: (record: SubscriptionRecord) => void,
    onChanged: (record: SubscriptionRecord) => void,
    onRemoved: (id: string) => void,
    activeDays: string[],
    tenantId?: string
  ): () => void;
  onNotesDelta(
    onAdded: (note: Note) => void,
    onChanged: (note: Note) => void,
    onRemoved: (id: string) => void,
    tenantId?: string
  ): () => void;
  onFoodPackagesDelta(
    onAdded: (pkg: FoodPackage) => void,
    onChanged: (pkg: FoodPackage) => void,
    onRemoved: (id: string) => void,
    tenantId?: string
  ): () => void;
  onCatererTransactionsDelta(
    onAdded: (tx: CatererTransaction) => void,
    onChanged: (tx: CatererTransaction) => void,
    onRemoved: (id: string) => void,
    tenantId?: string
  ): () => void;
  onLogsDelta(onAdded: (log: ActivityLog) => void, tenantId?: string, isSuperAdmin?: boolean): () => void;
  onMenuChange(callback: (menu: FoodMenu) => void, tenantId?: string): () => void;
  onConfigChange(callback: (config: AppConfig) => void, tenantId?: string): () => void;
  onAuthConfigChange(callback: (config: any) => void): () => void;
  onMetricsChange(callback: (metrics: KitchenMetrics | null) => void): () => void;
  onAppVersionChange(callback: (info: AppVersionInfo | null) => void): () => void;

  // Chat & Presence Methods
  updateUserPresence(username: string, displayName: string, role: string): Promise<() => void>;
  onAllPresenceChange(callback: (presences: Record<string, UserPresence>) => void): () => void;
  sendChatMessage(chatId: string, msg: Omit<ChatMessage, "id" | "timestamp" | "status">): Promise<void>;
  onChatMessagesChange(chatId: string, currentUsername: string, callback: (messages: ChatMessage[]) => void): () => void;
  onAllChatsSummaryChange(currentUsername: string, callback: (unreadMap: Record<string, number>, lastMsgMap: Record<string, ChatMessage>) => void): () => void;
  setTypingStatus(chatId: string, username: string, isTyping: boolean): Promise<void>;
  onTypingStatusChange(chatId: string, callback: (typingMap: Record<string, boolean>) => void): () => void;
  markChatMessagesAsRead(chatId: string, currentUsername: string): Promise<void>;
  clearChatForUser(chatId: string, username: string): Promise<void>;
}

const subscriptionsPath = "subscriptions";
const menuPath = "menu";
const configPath = "config";
const authConfigPath = "auth_config";
const logsPath = "logs";
const notesPath = "notes";
const foodPackagesPath = "food_packages";
const catererFinancePath = "caterer_finance";
const appVersionPath = "appVersion";
const metricsPath = "metrics";
const presencePath = "presence";
const chatsPath = "chats";

// --- Helper Functions ---

/**
 * Strips 'undefined' values from an object recursively.
 * Necessary because Firebase set() rejects undefined.
 */
function cleanUndefined(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (typeof obj === "function") return undefined;
  if (obj instanceof Date) return obj.toISOString();

  if (Array.isArray(obj)) {
    return obj
      .map(v => cleanUndefined(v, seen))
      .filter((v) => v !== undefined);
  }

  if (seen.has(obj)) return undefined;

  if (obj.$$typeof || (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array')) {
    if (Object.prototype.toString.call(obj) !== '[object Object]') {
      return undefined;
    }
  }

  seen.add(obj);

  return Object.keys(obj).reduce((acc: any, key) => {
    const val = obj[key];
    if (val !== undefined && val !== null && typeof val !== 'function') {
      const cleaned = cleanUndefined(val, seen);
      if (cleaned !== undefined) {
        acc[key] = cleaned;
      }
    }
    return acc;
  }, {});
}

/**
 * Creates an empty menu structure.
 */
function emptyMenu(eventDays: string[]): FoodMenu {
  const emptyMeal = () => ({
    veg: [],
    nonVeg: [],
    freeMealVeg: 0,
    freeMealNonVeg: 0,
    freeMealTaken: 0,
    freeMealVegTaken: 0,
    freeMealNonVegTaken: 0,
    kidsVeg: 0,
    kidsNonVeg: 0,
    kidsVegTaken: 0,
    kidsNonVegTaken: 0,
  });
  return eventDays.reduce((acc, day) => {
    acc[day] = {
      [MealType.BREAKFAST]: emptyMeal(),
      [MealType.LUNCH]: emptyMeal(),
      [MealType.DINNER]: emptyMeal(),
    };
    return acc;
  }, {} as FoodMenu);
}

/**
 * Normalizes a raw database record into the current SubscriptionRecord format.
 * Handles legacy fields and data migrations (e.g. from global counts to individual choices).
 */
export function normalizeRecord(
  value: Record<string, unknown>,
  eventDays: string[]
): SubscriptionRecord {
  const peopleCount = Number(value.peopleCount) || 0;
  const kidsCount = Number(value.kidsCount) || 0;
  const guestsCount = Number(value.guestsCount) || 0;
  const totalPeople = peopleCount + kidsCount + guestsCount;
  const block = String(value.block || "");
  const flat = String(value.flat || "");
  const id = String(value.id || "");
  const mobile = value.mobile ? Number(value.mobile) : undefined;
  const transactionId = value.transactionId ? String(value.transactionId) : undefined;
  const passcode = value.passcode ? String(value.passcode) : (id ? generatePasscode(id) : undefined);

  // Extract all day keys present in incoming value object + eventDays
  const rawMealSlots = (value.mealSlots as Record<string, any[]>) || {};
  const rawTakenByPerson = (value.takenByPerson as Record<string, any[]>) || {};
  const rawMealByPerson = (value.mealByPerson as Record<string, any[]>) || {};
  const rawMeals = (value.meals as Record<string, any>) || {};
  const rawDays = (value.days as Record<string, any>) || {};

  const recordDayKeys = new Set<string>([
    ...(eventDays || []),
    ...Object.keys(rawMealSlots),
    ...Object.keys(rawTakenByPerson),
    ...Object.keys(rawMealByPerson),
    ...Object.keys(rawMeals),
    ...Object.keys(rawDays)
  ]);
  const allDays = Array.from(recordDayKeys).filter(Boolean);

  // 1. Amount Normalization
  const storedAmount =
    value.amount ?? value.paymentAmount ?? value.payment_amount ?? "";
  const paymentMode = (value.paymentMode as any) || PaymentMode.UPI;

  // 2. Payments Normalization (Multiple Payments Support)
  const rawPayments = value.payments;
  let payments: PaymentEntry[] = [];
  if (Array.isArray(rawPayments)) {
    payments = rawPayments;
  } else if (rawPayments && typeof rawPayments === "object") {
    payments = Object.values(rawPayments);
  }

  const defaultPaymentTime = Number(value.createdAt) || Number(value.timestamp) || Date.now();

  if (payments.length === 0 && storedAmount && storedAmount !== "0" && parseFloat(String(storedAmount)) > 0) {
    payments = [
      {
        amount: String(storedAmount),
        mode: paymentMode,
        transactionId: transactionId,
        paymentTime: defaultPaymentTime,
      },
    ];
  } else {
    payments = payments.map((p: any) => {
      const amtNum = parseFloat(String(p.amount ?? "0"));
      return {
        ...p,
        amount: p.amount !== undefined ? String(p.amount) : "0",
        mode: p.mode || paymentMode,
        paymentTime: amtNum > 0 && p.paymentTime && !isNaN(Number(p.paymentTime)) && Number(p.paymentTime) > 0
          ? Number(p.paymentTime)
          : undefined,
      };
    });
  }

  // 3. Legacy Day/Type Detection
  const legacyDays = (value.days ?? {}) as Record<string, boolean>;
  const rawLegacyMeal = String(value.mealType || "");
  const legacyMeal = (rawLegacyMeal === "Non-veg" || rawLegacyMeal === "Non-Veg") ? "nonVeg" : "veg";

  // 4. Choice Matrix Initialization (mealByPerson)
  const mealByPerson = allDays.reduce((result, day) => {
    const current = (
      value.mealByPerson as Record<string, MealChoice[]> | undefined
    )?.[day];

    if (current && Array.isArray(current)) {
      result[day] = current.map(c => (c as string === "Non-veg" ? DietaryOption.NON_VEG : c));
    } else {
      const allocation = (
        value.meals as Record<string, MealAllocation> | undefined
      )?.[day];

      const vegCount =
        allocation?.[DietType.VEG] ??
        (legacyDays[day] && legacyMeal === DietType.VEG ? peopleCount : 0);
      const nonVegCount =
        allocation?.[DietType.NON_VEG] ??
        (legacyDays[day] && legacyMeal === DietType.NON_VEG ? peopleCount : 0);

      result[day] = Array.from({ length: totalPeople }, (_, index) => {
        if (index < vegCount) return DietaryOption.VEG;
        if (index < vegCount + nonVegCount) return DietaryOption.NON_VEG;
        return DietaryOption.NONE;
      });
    }
    return result;
  }, {} as Record<EventDay, MealChoice[]>);

  // 5. Slot Matrix Initialization (mealSlots)
  const mealSlots = allDays.reduce((result, day) => {
    const current = (value.mealSlots as Record<string, any[]> | undefined)?.[
      day
    ];
    result[day] =
      current && Array.isArray(current)
        ? current.map((s) => normalizeSlot(s))
        : (mealByPerson[day] || []).map((choice) => normalizeSlot({
            breakfast: choice,
            lunch: choice,
            dinner: choice,
            breakfastParcel: false,
            lunchParcel: false,
            dinnerParcel: false,
          }));
    return result;
  }, {} as Record<EventDay, MealSlot[]>);

  // 5. Taken Status Normalization
  const legacyTaken = (value.taken ?? {}) as Record<string, boolean>;
  const takenByPerson = allDays.reduce((result, day) => {
    const current = (
      value.takenByPerson as Record<string, TakenState[]> | undefined
    )?.[day];
    result[day] =
      current && Array.isArray(current)
        ? current.map((t) => ({
            [MealType.BREAKFAST]: toBool(t?.breakfast),
            [MealType.LUNCH]: toBool(t?.lunch),
            [MealType.DINNER]: toBool(t?.dinner),
            breakfastParcel: toBool(t?.breakfastParcel),
            lunchParcel: toBool(t?.lunchParcel),
            dinnerParcel: toBool(t?.dinnerParcel),
            breakfastAbsent: toBool(t?.breakfastAbsent),
            lunchAbsent: toBool(t?.lunchAbsent),
            dinnerAbsent: toBool(t?.dinnerAbsent),
            breakfastTime: t?.breakfastTime ? String(t.breakfastTime) : undefined,
            lunchTime: t?.lunchTime ? String(t.lunchTime) : undefined,
            dinnerTime: t?.dinnerTime ? String(t.dinnerTime) : undefined,
            breakfastParcelTime: t?.breakfastParcelTime ? String(t.breakfastParcelTime) : undefined,
            lunchParcelTime: t?.lunchParcelTime ? String(t.lunchParcelTime) : undefined,
            dinnerParcelTime: t?.dinnerParcelTime ? String(t.dinnerParcelTime) : undefined,
            breakfastAbsentTime: t?.breakfastAbsentTime ? String(t.breakfastAbsentTime) : undefined,
            lunchAbsentTime: t?.lunchAbsentTime ? String(t.lunchAbsentTime) : undefined,
            dinnerAbsentTime: t?.dinnerAbsentTime ? String(t.dinnerAbsentTime) : undefined,
            breakfastUser: t?.breakfastUser ? String(t.breakfastUser) : undefined,
            lunchUser: t?.lunchUser ? String(t.lunchUser) : undefined,
            dinnerUser: t?.dinnerUser ? String(t.dinnerUser) : undefined,
            breakfastParcelUser: t?.breakfastParcelUser ? String(t.breakfastParcelUser) : undefined,
            lunchParcelUser: t?.lunchParcelUser ? String(t.lunchParcelUser) : undefined,
            dinnerParcelUser: t?.dinnerParcelUser ? String(t.dinnerParcelUser) : undefined,
            breakfastAbsentUser: t?.breakfastAbsentUser ? String(t.breakfastAbsentUser) : undefined,
            lunchAbsentUser: t?.lunchAbsentUser ? String(t.lunchAbsentUser) : undefined,
            dinnerAbsentUser: t?.dinnerAbsentUser ? String(t.dinnerAbsentUser) : undefined,
          }))
        : Array.from({ length: totalPeople }, () => {
            const isTaken = Boolean(legacyTaken[day]);
            return {
              [MealType.BREAKFAST]: isTaken,
              [MealType.LUNCH]: isTaken,
              [MealType.DINNER]: isTaken,
              breakfastParcel: false,
              lunchParcel: false,
              dinnerParcel: false,
              breakfastAbsent: false,
              lunchAbsent: false,
              dinnerAbsent: false,
            };
          });
    return result;
  }, {} as Record<EventDay, TakenState[]>);

  // 6. Aggregate Stats Generation (meals) & mealByPerson finalization
  const finalMealByPerson: Record<EventDay, MealChoice[]> = {};
  const normalizedMeals = allDays.reduce((result, day) => {
    const slots = mealSlots[day] || [];
    let dVegCount = 0;
    let dNonVegCount = 0;
    let kidsVegCount = 0;
    let kidsNonVegCount = 0;
    let guestsVegCount = 0;
    let guestsNonVegCount = 0;

    slots.forEach((s, index) => {
      const isKid = index >= peopleCount && index < peopleCount + kidsCount;
      const isGuest = index >= peopleCount + kidsCount;
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mKey) => {
        const choice = s[mKey];
        const diet = getDietTypeForChoice(choice);
        if (diet === DietType.VEG) {
          if (isGuest) guestsVegCount++;
          else if (isKid) kidsVegCount++;
          else dVegCount++;
        } else if (diet === DietType.NON_VEG) {
          if (isGuest) guestsNonVegCount++;
          else if (isKid) kidsNonVegCount++;
          else dNonVegCount++;
        }
      });
    });

    finalMealByPerson[day] = slots.map((s) => {
      const bDiet = getDietTypeForChoice(s[MealType.BREAKFAST]);
      const lDiet = getDietTypeForChoice(s[MealType.LUNCH]);
      const dDiet = getDietTypeForChoice(s[MealType.DINNER]);

      if (
        bDiet === DietType.NON_VEG ||
        lDiet === DietType.NON_VEG ||
        dDiet === DietType.NON_VEG
      )
        return DietaryOption.NON_VEG;
      if (
        bDiet === DietType.VEG ||
        lDiet === DietType.VEG ||
        dDiet === DietType.VEG
      )
        return DietaryOption.VEG;
      return DietaryOption.NONE;
    });

    result[day] = {
      [DietType.VEG]: dVegCount,
      [DietType.NON_VEG]: dNonVegCount,
      kidsVeg: kidsVegCount,
      kidsNonVeg: kidsNonVegCount,
      guestsVeg: guestsVegCount,
      guestsNonVeg: guestsNonVegCount,
    };
    return result;
  }, {} as Record<EventDay, MealAllocation>);

  const now = Date.now();
  let createdAt = Number(value.createdAt) || Number(value.timestamp) || now;
  let updatedAt = Number(value.updatedAt) || createdAt || now;

  if (createdAt > updatedAt) {
    createdAt = updatedAt;
  }

  return {
    ...value,
    id,
    block,
    flat,
    mobile,
    peopleCount,
    kidsCount,
    guestsCount,
    amount: String(storedAmount),
    meals: normalizedMeals,
    mealByPerson: finalMealByPerson,
    mealSlots,
    payments,
    takenByPerson,
    paymentMode,
    transactionId,
    passcode,
    createdAt,
    updatedAt,
  } as SubscriptionRecord;
}

// --- Implementation ---

export const firebaseRepositoryConfigured = firebaseConfigured;

function cleanCircularFields(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanCircularFields);
  }
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val === "[Circular]" || val === "[circular]") {
      if (key === "veg" || key === "nonVeg" || key === "enabled" || key === "current" || key === "done" || key === "parcel") {
        cleaned[key] = true;
      } else {
        cleaned[key] = undefined;
      }
    } else {
      cleaned[key] = cleanCircularFields(val);
    }
  });
  return cleaned;
}

function normalizeDayConfig(days: any[]): ConfigDay[] {
  if (!Array.isArray(days)) return [];
  return days.map((d) => {
    if (!d || typeof d !== "object") return d;
    const cleanDay = { ...d };
    [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mKey) => {
      if (cleanDay[mKey]) {
        const m = cleanDay[mKey];
        let vars = m.varieties;
        if (vars) {
          if (!Array.isArray(vars) && typeof vars === "object") {
            vars = Object.values(vars).filter((v) => v && typeof v === "object" && (v as any).id);
          }
        }
        cleanDay[mKey] = {
          ...m,
          varieties: Array.isArray(vars) ? vars : undefined,
        };
      }
    });
    return cleanDay as ConfigDay;
  });
}

export function getSeasonPath(collection: string, seasonCode: string = "", tenantId?: string): string {
  const code = (seasonCode || "").trim();
  const tCode = (tenantId || "").trim();
  const base = code ? `seasons_data/${code}/${collection}` : collection;
  if (tCode) {
    return `tenants/${tCode}/${base}`;
  }
  return base;
}

function normalizeSeasonItem(val: any): SeasonConfig {
  const defaultPayment = { enabled: true, maxPayments: 10, options: { upi: true, cash: true, bankTransfer: true } };
  const days = Array.isArray(val?.days) ? val.days : (val?.days ? Object.values(val.days) : []);
  const seasonCode = (val?.seasonCode || val?.activeSeasonCode || val?.id || "").trim();

  const isCompleted = val?.seasonCompleted === true;
  const isEnabled = isCompleted ? false : (val?.seasonEnabled !== false);

  return {
    id: seasonCode,
    seasonName: val?.seasonName || "",
    seasonCode,
    seasonEnabled: isEnabled,
    seasonCompleted: isCompleted,
    days: normalizeDayConfig(days),
    payment: val?.payment || defaultPayment,
    freeMealEnabled: val?.freeMealEnabled !== false,
    mobileEnabled: val?.mobileEnabled !== false,
    foodPriceEnabled: val?.foodPriceEnabled || false,
    kidsEnabled: val?.kidsEnabled || false,
    guestsEnabled: val?.guestsEnabled || false,
    vendorKidsMealChargingEnabled: val?.vendorKidsMealChargingEnabled !== false,
    whatsappCountryCode: val?.whatsappCountryCode || "91",
    quickCheckoutAutoCloseMs: val?.quickCheckoutAutoCloseMs ?? 3000,
    soundEnabled: val?.soundEnabled !== undefined ? Boolean(val.soundEnabled) : true,
    vendorName: val?.vendorName || "",
    vendorAddress: val?.vendorAddress || "",
    vendorSettledCost: val?.vendorSettledCost || "",
    nonAdminCheckoutEnabled: val?.nonAdminCheckoutEnabled !== false,
    cheatCodeEnabled: val?.cheatCodeEnabled === true,
    passcodeDigitCount: val?.passcodeDigitCount !== undefined ? Number(val.passcodeDigitCount) : 4,
    footerText: val?.footerText || "",
  };
}

function normalizeConfig(val: any): AppConfig {
  const defaultPayment = { enabled: true, maxPayments: 10, options: { upi: true, cash: true, bankTransfer: true } };
  if (!val) {
    const defaultSeason = normalizeSeasonItem({ seasonName: "", seasonCode: "" });
    return {
      activeSeasonCode: "",
      seasons: [defaultSeason],
      ...defaultSeason,
      identity1Enabled: true,
      identity1Name: "Block No",
      identity1Options: blockOptions,
      identity2Enabled: true,
      identity2Name: "Flat No",
    };
  }

  if (Array.isArray(val)) {
    const defaultSeason = normalizeSeasonItem({ seasonName: "", seasonCode: "", days: val });
    return {
      activeSeasonCode: "",
      seasons: [defaultSeason],
      ...defaultSeason,
      identity1Enabled: true,
      identity1Name: "Block No",
      identity1Options: blockOptions,
      identity2Enabled: true,
      identity2Name: "Flat No",
    };
  }

  let seasonsList: SeasonConfig[] = [];
  if (val.seasons) {
    const rawSeasons = Array.isArray(val.seasons) ? val.seasons : Object.values(val.seasons);
    seasonsList = rawSeasons.map((s: any) => normalizeSeasonItem(s));
  }

  if (seasonsList.length === 0) {
    seasonsList = [normalizeSeasonItem(val)];
  }

  let activeCode = val.activeSeasonCode || seasonsList.find(s => s.seasonEnabled)?.seasonCode || seasonsList[0]?.seasonCode || "";
  let activeSeason = seasonsList.find(s => s.seasonCode === activeCode) || seasonsList[0] || normalizeSeasonItem({});

  return {
    activeSeasonCode: activeSeason.seasonCode,
    seasons: seasonsList,
    ...activeSeason,
    identity1Enabled: val.identity1Enabled !== false,
    identity1Name: val.identity1Name || "Block No",
    identity1Options: Array.isArray(val.identity1Options) && val.identity1Options.length > 0 ? val.identity1Options : blockOptions,
    identity2Enabled: val.identity2Enabled !== false,
    identity2Name: val.identity2Name || "Flat No",
  };
}

export function createFirebaseRepository(): SubscriptionRepository {
  let activeTenantId = "";

  async function getActiveTenantId(services: any, tenantIdOverride?: string): Promise<string> {
    const candidate = (tenantIdOverride || activeTenantId || "").trim();
    if (candidate) {
      activeTenantId = candidate;
      return candidate;
    }
    return "";
  }

  /**
   * Helper to get active day IDs from database config.
   */
  async function getActiveDays(services: any): Promise<string[]> {
    const configVal = await baseRepo.getConfig();
    let days = configVal.days || [];
    return (days || [])
      .filter((d) => d && typeof d === 'object' && d.id && d.enabled)
      .map((d) => d.id);
  }

  async function resolveSeasonDataPath(services: any, collection: string, seasonCodeOverride?: string, tenantIdOverride?: string): Promise<string> {
    const tCode = await getActiveTenantId(services, tenantIdOverride);
    if (!tCode) {
      return "";
    }
    if (collection === "notes" || collection === "logs") {
      return `tenants/${tCode}/${collection}`;
    }
    if (collection === "config") {
      return `tenants/${tCode}/config`;
    }

    let code = seasonCodeOverride;
    if (!code) {
      const configSnap = await get(ref(services.db, `tenants/${tCode}/${configPath}`));
      if (configSnap.exists()) {
        const configVal = normalizeConfig(configSnap.val());
        code = configVal.seasonCode || configVal.activeSeasonCode || "";
      }
    }

    return getSeasonPath(collection, code || "", tCode);
  }

  const baseRepo: SubscriptionRepository = {
    setTenantId(tenantId: string) {
      activeTenantId = (tenantId || "").trim();
    },
    async list() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const eventDays = await getActiveDays(services);
      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      if (!subsPath || !subsPath.trim()) return [];
      const snapshot = await get(ref(services.db, subsPath));
      const records = snapshot.val() as Record<string, SubscriptionRecord> | null;
      if (!records) return [];

      const configVal = await baseRepo.getConfig();
      const seasonCode = configVal.seasonCode || configVal.activeSeasonCode || "";
      const tCode = await getActiveTenantId(services);

      const updates: Record<string, any> = {};
      const result: SubscriptionRecord[] = [];

      Object.values(records).forEach((rawRecord) => {
        const norm = normalizeRecord(rawRecord as Record<string, unknown>, eventDays);
        if (!rawRecord.passcode && norm.passcode) {
          updates[`${subsPath}/${norm.id}/passcode`] = norm.passcode;
        }
        result.push(norm);
      });

      if (Object.keys(updates).length > 0) {
        try {
          await update(ref(services.db), updates);
        } catch {
          // ignore
        }
      }

      return result;
    },
    async getByFlatId(flatId) {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const eventDays = await getActiveDays(services);
      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      if (!subsPath || !subsPath.trim()) return undefined;
      const snapshot = await get(
        ref(services.db, `${subsPath}/${flatId}`)
      );
      if (!snapshot.exists()) return undefined;
      const raw = snapshot.val() as Record<string, unknown>;
      const norm = normalizeRecord(raw, eventDays);
      if (!raw.passcode && norm.passcode) {
        try {
          await set(ref(services.db, `${subsPath}/${flatId}/passcode`), norm.passcode);
        } catch {
          // ignore
        }
      }
      return norm;
    },
    async getByPasscode(passcode) {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const eventDays = await getActiveDays(services);
      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      if (!subsPath || !subsPath.trim()) return undefined;
      const passcodeQuery = query(
        ref(services.db, subsPath),
        orderByChild("passcode"),
        equalTo(passcode)
      );
      const snapshot = await get(passcodeQuery);
      if (!snapshot.exists()) return undefined;
      const val = snapshot.val();
      const firstRecord = Object.values(val)[0] as Record<string, unknown>;
      return normalizeRecord(firstRecord, eventDays);
    },
    async upsert(record) {
      const services = await ensureFirebaseAuth();
      if (!services) return record;

      if (!record.passcode) {
        const configVal = await baseRepo.getConfig();
        const seasonCode = configVal.seasonCode || configVal.activeSeasonCode || "";
        const tCode = await getActiveTenantId(services);
        record.passcode = generateUniquePasscode([], record.id, record.id, tCode, seasonCode, configVal.passcodeDigitCount || 4);
      }

      const cleaned = cleanUndefined(record);
      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      if (!subsPath || !subsPath.trim()) return record;
      await set(ref(services.db, `${subsPath}/${record.id}`), cleaned);
      return record;
    },
    async remove(flatId) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      await remove(ref(services.db, `${subsPath}/${flatId}`));
    },
    async getMenu() {
      const services = await ensureFirebaseAuth();
      if (!services) return {};
      const eventDays = await getActiveDays(services);
      const mPath = await resolveSeasonDataPath(services, menuPath);
      const snapshot = await get(ref(services.db, mPath));
      return snapshot.exists()
        ? cleanCircularFields(snapshot.val() as FoodMenu)
        : emptyMenu(eventDays);
    },
    async updateMenu(menu) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const mPath = await resolveSeasonDataPath(services, menuPath);
      await set(ref(services.db, mPath), cleanUndefined(menu));
    },
    async updateMealMenu(dayId, mealKey, menu) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const mPath = await resolveSeasonDataPath(services, menuPath);
      await set(ref(services.db, `${mPath}/${dayId}/${mealKey}`), cleanUndefined(menu));
    },
    async updateFreeMealCount(dayId, mealKey, field, value) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const mPath = await resolveSeasonDataPath(services, menuPath);
      await set(ref(services.db, `${mPath}/${dayId}/${mealKey}/${field}`), value);
    },
    async updateFreeMealCounts(dayId, mealKey, data) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const mPath = await resolveSeasonDataPath(services, menuPath);
      await update(ref(services.db, `${mPath}/${dayId}/${mealKey}`), cleanUndefined(data));
    },
    async getConfig(tenantIdOverride) {
      const services = await ensureFirebaseAuth();
      if (!services) return normalizeConfig(null);
      const tCode = await getActiveTenantId(services, tenantIdOverride);

      let tenantSnap = tCode ? await get(ref(services.db, `tenants/${tCode}/config`)) : null;
      if (!tenantSnap || !tenantSnap.exists()) {
        tenantSnap = await get(ref(services.db, configPath));
      }

      if (tenantSnap && tenantSnap.exists()) {
        const tenantVal = tenantSnap.val();
        const activeCode = tenantVal.activeSeasonCode || tenantVal.seasonCode || "";

        let seasonsList: SeasonConfig[] = [];
        try {
          const seasonsDataSnap = await get(ref(services.db, `tenants/${tCode}/seasons_data`));
          if (seasonsDataSnap.exists()) {
            const seasonsDataVal = seasonsDataSnap.val();
            if (seasonsDataVal && typeof seasonsDataVal === "object") {
              Object.keys(seasonsDataVal).forEach((sCode) => {
                const sConfig = seasonsDataVal[sCode]?.config;
                if (sConfig) {
                  seasonsList.push(normalizeSeasonItem({ ...sConfig, seasonCode: sCode }));
                }
              });
            }
          }
        } catch {
          // ignore
        }

        if (seasonsList.length === 0) {
          seasonsList = [normalizeSeasonItem({ ...tenantVal, seasonCode: activeCode })];
        }

        const seasonConfigPath = tCode && activeCode ? `tenants/${tCode}/seasons_data/${activeCode}/config` : (activeCode ? `seasons_data/${activeCode}/config` : "");

        let seasonVal = {};
        if (seasonConfigPath) {
          const seasonConfigSnap = await get(ref(services.db, seasonConfigPath));
          if (seasonConfigSnap.exists()) {
            seasonVal = seasonConfigSnap.val();
          }
        }

        return normalizeConfig({
          activeSeasonCode: activeCode,
          seasonCode: activeCode,
          tenantId: tCode,
          seasons: seasonsList,
          identity1Enabled: tenantVal.identity1Enabled !== false,
          identity1Name: tenantVal.identity1Name || "Block No",
          identity1Options: tenantVal.identity1Options || blockOptions,
          identity2Enabled: tenantVal.identity2Enabled !== false,
          identity2Name: tenantVal.identity2Name || "Flat No",
          ...seasonVal,
        });
      }

      return normalizeConfig(null);
    },
    async updateConfig(config, tenantIdOverride) {
      const services = await ensureFirebaseAuth();
      if (!services) return;

      const activeCode = config.activeSeasonCode || config.seasonCode || "";
      const tenantId = await getActiveTenantId(services, tenantIdOverride || config.tenantId);
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }
      if (!activeCode) {
        throw new Error("Active season code is required");
      }

      const isCompleted = config.seasonCompleted === true;
      const isEnabled = isCompleted ? false : (config.seasonEnabled !== false);

      const tenantCommonConfig = {
        tenantId,
        activeSeasonCode: activeCode,
        identity1Enabled: config.identity1Enabled !== false,
        identity1Name: config.identity1Name || "Block No",
        identity1Options: config.identity1Options || blockOptions,
        identity2Enabled: config.identity2Enabled !== false,
        identity2Name: config.identity2Name || "Flat No",
      };

      const seasonSpecificConfig = {
        seasonCode: activeCode,
        seasonName: config.seasonName || "",
        seasonEnabled: isEnabled,
        seasonCompleted: isCompleted,
        days: config.days || [],
        payment: config.payment,
        freeMealEnabled: config.freeMealEnabled,
        mobileEnabled: config.mobileEnabled,
        foodPriceEnabled: config.foodPriceEnabled,
        kidsEnabled: config.kidsEnabled,
        guestsEnabled: config.guestsEnabled,
        vendorKidsMealChargingEnabled: config.vendorKidsMealChargingEnabled,
        whatsappCountryCode: config.whatsappCountryCode,
        quickCheckoutAutoCloseMs: config.quickCheckoutAutoCloseMs,
        soundEnabled: config.soundEnabled,
        vendorName: config.vendorName,
        vendorAddress: config.vendorAddress,
        vendorSettledCost: config.vendorSettledCost,
        nonAdminCheckoutEnabled: config.nonAdminCheckoutEnabled,
        cheatCodeEnabled: config.cheatCodeEnabled,
        passcodeDigitCount: config.passcodeDigitCount !== undefined ? Number(config.passcodeDigitCount) : 4,
        footerText: config.footerText || "",
      };

      const updates: Record<string, any> = {};
      updates[`tenants/${tenantId}/config`] = cleanUndefined(tenantCommonConfig);
      updates[`tenants/${tenantId}/seasons_data/${activeCode}/config`] = cleanUndefined(seasonSpecificConfig);

      if (config.seasons && config.seasons.length > 0) {
        config.seasons.forEach((s) => {
          if (s && s.seasonCode) {
            const isMatch = s.seasonCode === activeCode;
            const updatedS = {
              ...s,
              seasonEnabled: isMatch ? isEnabled : false,
              seasonCompleted: isMatch ? isCompleted : true,
            };
            if (isMatch) {
              Object.assign(updatedS, seasonSpecificConfig);
            }
            updates[`tenants/${tenantId}/seasons_data/${s.seasonCode}/config`] = cleanUndefined(updatedS);
          }
        });
      }

      await update(ref(services.db), updates);
    },
    async updateSubscriptionStatus(flatId, dayId, personIndex, slot, taken, timeStr, userStr) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      const updates: Record<string, any> = {};
      updates[`${subsPath}/${flatId}/takenByPerson/${dayId}/${personIndex}/${slot}`] = taken;
      updates[`${subsPath}/${flatId}/takenByPerson/${dayId}/${personIndex}/${slot}Time`] = taken ? (timeStr || "") : null;
      updates[`${subsPath}/${flatId}/takenByPerson/${dayId}/${personIndex}/${slot}User`] = taken ? (userStr || "") : null;
      await update(ref(services.db), updates);
    },
    async checkInPassAtomic(flatId, updatesMap, metricsIncrements) {
      const services = await ensureFirebaseAuth();
      if (!services) return;

      const subsPath = await resolveSeasonDataPath(services, subscriptionsPath);
      const multiPathUpdates: Record<string, any> = {};

      Object.entries(updatesMap).forEach(([slotPath, val]) => {
        multiPathUpdates[`${subsPath}/${flatId}/takenByPerson/${slotPath}`] = val;
      });

      if (metricsIncrements) {
        Object.entries(metricsIncrements).forEach(([metricPath, incVal]) => {
          multiPathUpdates[`${metricsPath}/${metricPath}`] = increment(incVal);
        });
      }

      await update(ref(services.db), multiPathUpdates);
    },
    async getAuthConfig() {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const snapshot = await get(ref(services.db, authConfigPath));
      if (!snapshot.exists()) return undefined;
      const data = snapshot.val();
      if (data && Array.isArray(data.users)) {
        let updated = false;
        data.users = data.users.map((u: any) => {
          if (u && typeof u === 'object' && u.encrypted === undefined) {
            updated = true;
            return { ...u, encrypted: false };
          }
          return u;
        });
        if (updated) {
          await set(ref(services.db, authConfigPath), cleanUndefined(data));
        }
      }
      return data;
    },
    async updateAuthConfig(config) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, authConfigPath), cleanUndefined(config));
    },
    async addActivityLog(log, tenantId, isSuperAdmin) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const cleanLog = cleanUndefined(log);
      let lPath = "logs";
      if (!isSuperAdmin) {
        if (!tenantId) return;
        lPath = await resolveSeasonDataPath(services, logsPath, tenantId);
        if (!lPath || !lPath.trim()) return;
      }
      const newLogRef = push(ref(services.db, lPath));
      await set(newLogRef, { ...cleanLog, id: newLogRef.key });
    },
    async getActivityLogs(limitCount = 50, tenantId, isSuperAdmin) {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      let lPath = "logs";
      if (!isSuperAdmin) {
        if (!tenantId) return [];
        lPath = await resolveSeasonDataPath(services, logsPath, tenantId);
        if (!lPath || !lPath.trim()) return [];
      }
      const logsRef = limitCount > 0 ? query(ref(services.db, lPath), limitToLast(limitCount)) : ref(services.db, lPath);
      const snapshot = await get(logsRef);
      const data = snapshot.val() as Record<string, ActivityLog> | null;
      if (!data) return [];
      return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    },
    async getNotes() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const nPath = await resolveSeasonDataPath(services, notesPath);
      const snapshot = await get(ref(services.db, nPath));
      const data = snapshot.val() as Record<string, Note> | null;
      if (!data) return [];
      return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    },
    async upsertNote(note) {
      const services = await ensureFirebaseAuth();
      if (!services) return note;
      let targetId = note.id;
      const nPath = await resolveSeasonDataPath(services, notesPath);
      if (!targetId) {
        const newRef = push(ref(services.db, nPath));
        targetId = newRef.key as string;
      }
      const data = cleanUndefined({ ...note, id: targetId });
      await set(ref(services.db, `${nPath}/${targetId}`), data);
      return { ...note, id: targetId };
    },
    async removeNote(id) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const nPath = await resolveSeasonDataPath(services, notesPath);
      await remove(ref(services.db, `${nPath}/${id}`));
    },
    async getFoodPackages() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const pkgPath = await resolveSeasonDataPath(services, foodPackagesPath);
      const snapshot = await get(ref(services.db, pkgPath));
      const data = snapshot.val() as Record<string, FoodPackage> | null;
      if (!data) return [];
      return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    },
    async upsertFoodPackage(pkg) {
      const services = await ensureFirebaseAuth();
      if (!services) return pkg;
      let targetId = pkg.id;
      const pkgPath = await resolveSeasonDataPath(services, foodPackagesPath);
      if (!targetId) {
        const newRef = push(ref(services.db, pkgPath));
        targetId = newRef.key as string;
      }
      const data = cleanUndefined({ ...pkg, id: targetId });
      await set(ref(services.db, `${pkgPath}/${targetId}`), data);
      return { ...pkg, id: targetId };
    },
    async removeFoodPackage(id) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const pkgPath = await resolveSeasonDataPath(services, foodPackagesPath);
      await remove(ref(services.db, `${pkgPath}/${id}`));
    },
    async getCatererTransactions() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const cPath = await resolveSeasonDataPath(services, catererFinancePath);
      const snapshot = await get(ref(services.db, cPath));
      const data = snapshot.val() as Record<string, CatererTransaction> | null;
      if (!data) return [];
      return Object.values(data).sort((a, b) => b.date - a.date);
    },
    async upsertCatererTransaction(tx) {
      const services = await ensureFirebaseAuth();
      if (!services) return tx;
      let targetId = tx.id;
      const cPath = await resolveSeasonDataPath(services, catererFinancePath);
      if (!targetId) {
        const newRef = push(ref(services.db, cPath));
        targetId = newRef.key as string;
      }
      const data = cleanUndefined({ ...tx, id: targetId });
      await set(ref(services.db, `${cPath}/${targetId}`), data);
      return { ...tx, id: targetId };
    },
    async removeCatererTransaction(id, tenantId) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const cPath = await resolveSeasonDataPath(services, catererFinancePath, tenantId);
      await remove(ref(services.db, `${cPath}/${id}`));
    },
    async getAppVersion() {
      const services = await ensureFirebaseAuth();
      if (!services) return null;
      const [verSnap, depSnap, androidSnap, iosSnap] = await Promise.all([
        get(ref(services.db, appVersionPath)),
        get(ref(services.db, "deprecatedVersion")),
        get(ref(services.db, "androidAppLocation")),
        get(ref(services.db, "iosAppLocation")),
      ]);

      const versionVal = verSnap.exists() ? verSnap.val() : null;
      const depVal = depSnap.exists() ? depSnap.val() : null;

      let versionStr = "";
      if (typeof versionVal === "string") {
        versionStr = versionVal;
      } else if (versionVal && typeof versionVal === "object") {
        versionStr = versionVal.version || "";
      }

      let deprecatedStr = "";
      if (typeof depVal === "string") {
        deprecatedStr = depVal;
      } else if (depVal && typeof depVal === "object") {
        deprecatedStr = depVal.version || depVal.deprecatedVersion || "";
      } else if (versionVal && typeof versionVal === "object" && versionVal.deprecatedVersion) {
        deprecatedStr = versionVal.deprecatedVersion;
      }

      if (!versionStr && !deprecatedStr) return null;

      return {
        version: versionStr,
        deprecatedVersion: deprecatedStr || undefined,
        androidAppLocation: androidSnap.exists() && typeof androidSnap.val() === "string" ? String(androidSnap.val()).trim() : undefined,
        iosAppLocation: iosSnap.exists() && typeof iosSnap.val() === "string" ? String(iosSnap.val()).trim() : undefined,
      };
    },
    async updateAppVersion(version) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, appVersionPath), version);
    },
    async getMetrics() {
      const services = await ensureFirebaseAuth();
      if (!services) return null;
      const snapshot = await get(ref(services.db, metricsPath));
      return snapshot.exists() ? (snapshot.val() as KitchenMetrics) : null;
    },

    // --- Real-time WebSocket Delta Listeners ---

    onSubscriptionsDelta(onAdded, onChanged, onRemoved, activeDays, tenantId) {
      let unsubAdded: (() => void) | null = null;
      let unsubChanged: (() => void) | null = null;
      let unsubRemoved: (() => void) | null = null;

      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        const subsPath = await resolveSeasonDataPath(services, subscriptionsPath, tenantId);
        if (!subsPath) return;
        const subsRef = ref(services.db, subsPath);

        unsubAdded = onChildAdded(subsRef, (snapshot) => {
          if (snapshot.exists()) {
            onAdded(normalizeRecord(snapshot.val() as Record<string, unknown>, activeDays));
          }
        });

        unsubChanged = onChildChanged(subsRef, (snapshot) => {
          if (snapshot.exists()) {
            onChanged(normalizeRecord(snapshot.val() as Record<string, unknown>, activeDays));
          }
        });

        unsubRemoved = onChildRemoved(subsRef, (snapshot) => {
          if (snapshot.key) {
            onRemoved(snapshot.key);
          }
        });
      }).catch(err => console.error("Subscriptions listener error:", err));

      return () => {
        if (unsubAdded) unsubAdded();
        if (unsubChanged) unsubChanged();
        if (unsubRemoved) unsubRemoved();
      };
    },

    onNotesDelta(onAdded, onChanged, onRemoved, tenantId) {
      let unsubAdded: (() => void) | null = null;
      let unsubChanged: (() => void) | null = null;
      let unsubRemoved: (() => void) | null = null;

      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        const nPath = await resolveSeasonDataPath(services, notesPath, tenantId);
        if (!nPath) return;
        const nRef = ref(services.db, nPath);

        unsubAdded = onChildAdded(nRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const note = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onAdded(note as Note);
          }
        });

        unsubChanged = onChildChanged(nRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const note = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onChanged(note as Note);
          }
        });

        unsubRemoved = onChildRemoved(nRef, (snapshot) => {
          if (snapshot.key) {
            onRemoved(snapshot.key);
          }
        });
      }).catch(err => console.error("Notes listener error:", err));

      return () => {
        if (unsubAdded) unsubAdded();
        if (unsubChanged) unsubChanged();
        if (unsubRemoved) unsubRemoved();
      };
    },

    onFoodPackagesDelta(onAdded, onChanged, onRemoved, tenantId) {
      let unsubAdded: (() => void) | null = null;
      let unsubChanged: (() => void) | null = null;
      let unsubRemoved: (() => void) | null = null;

      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        const pkgPath = await resolveSeasonDataPath(services, foodPackagesPath, tenantId);
        if (!pkgPath) return;
        const pkgRef = ref(services.db, pkgPath);

        unsubAdded = onChildAdded(pkgRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const pkg = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onAdded(pkg as FoodPackage);
          }
        });

        unsubChanged = onChildChanged(pkgRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const pkg = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onChanged(pkg as FoodPackage);
          }
        });

        unsubRemoved = onChildRemoved(pkgRef, (snapshot) => {
          if (snapshot.key) {
            onRemoved(snapshot.key);
          }
        });
      }).catch(err => console.error("Food packages listener error:", err));

      return () => {
        if (unsubAdded) unsubAdded();
        if (unsubChanged) unsubChanged();
        if (unsubRemoved) unsubRemoved();
      };
    },

    onCatererTransactionsDelta(onAdded, onChanged, onRemoved, tenantId) {
      let unsubAdded: (() => void) | null = null;
      let unsubChanged: (() => void) | null = null;
      let unsubRemoved: (() => void) | null = null;

      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        const cPath = await resolveSeasonDataPath(services, catererFinancePath, tenantId);
        if (!cPath) return;
        const cRef = ref(services.db, cPath);

        unsubAdded = onChildAdded(cRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const tx = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onAdded(tx as CatererTransaction);
          }
        });

        unsubChanged = onChildChanged(cRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const tx = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onChanged(tx as CatererTransaction);
          }
        });

        unsubRemoved = onChildRemoved(cRef, (snapshot) => {
          if (snapshot.key) {
            onRemoved(snapshot.key);
          }
        });
      }).catch(err => console.error("Caterer finance listener error:", err));

      return () => {
        if (unsubAdded) unsubAdded();
        if (unsubChanged) unsubChanged();
        if (unsubRemoved) unsubRemoved();
      };
    },

    onLogsDelta(onAdded, tenantId, isSuperAdmin) {
      let unsubAdded: (() => void) | null = null;

      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        let lPath = "logs";
        if (!isSuperAdmin) {
          if (!tenantId) return;
          lPath = await resolveSeasonDataPath(services, logsPath, tenantId);
          if (!lPath || !lPath.trim()) return;
        }
        const logsQuery = query(ref(services.db, lPath), limitToLast(50));

        unsubAdded = onChildAdded(logsQuery, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const log = (typeof val === "object" && val !== null) ? { ...val, id: val.id || snapshot.key } : val;
            onAdded(log as ActivityLog);
          }
        });
      }).catch(err => console.error("Logs listener error:", err));

      return () => {
        if (unsubAdded) unsubAdded();
      };
    },

    onMenuChange(callback, tenantId) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        const mPath = await resolveSeasonDataPath(services, menuPath, tenantId);
        if (!mPath) return;
        unsub = onValue(ref(services.db, mPath), (snapshot) => {
          callback(snapshot.exists() ? cleanCircularFields(snapshot.val() as FoodMenu) : {});
        });
      }).catch(err => console.error("Menu listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    onAuthConfigChange(callback: (config: any) => void) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsub = onValue(ref(services.db, authConfigPath), (snapshot) => {
          callback(snapshot.exists() ? snapshot.val() : undefined);
        });
      }).catch(err => console.error("Auth config listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    onTenantsChange(callback: (tenants: Record<string, any>) => void) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsub = onValue(ref(services.db, "tenants"), (snapshot) => {
          callback(snapshot.exists() ? (snapshot.val() || {}) : {});
        });
      }).catch(err => console.error("Tenants listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    onConfigChange(callback, tenantId) {
      let unsub1: (() => void) | null = null;
      let unsub2: (() => void) | null = null;

      ensureFirebaseAuth().then(async (services) => {
        if (!services?.db) return;
        const tCode = await getActiveTenantId(services, tenantId);
        if (!tCode) return;

        const handleUpdate = () => {
          baseRepo.getConfig(tCode).then(cfg => callback(cfg)).catch(() => {});
        };

        unsub1 = onValue(ref(services.db, `tenants/${tCode}/config`), handleUpdate);

        try {
          const currentCfg = await baseRepo.getConfig(tCode);
          const seasonCode = currentCfg.seasonCode || currentCfg.activeSeasonCode || "";
          if (seasonCode) {
            unsub2 = onValue(ref(services.db, `tenants/${tCode}/seasons_data/${seasonCode}/config`), handleUpdate);
          }
        } catch {
          // ignore
        }
      }).catch(err => console.error("Config listener error:", err));

      return () => {
        if (unsub1) unsub1();
        if (unsub2) unsub2();
      };
    },

    onMetricsChange(callback) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsub = onValue(ref(services.db, metricsPath), (snapshot) => {
          callback(snapshot.exists() ? (snapshot.val() as KitchenMetrics) : null);
        });
      }).catch(err => console.error("Metrics listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    onAppVersionChange(callback) {
      let unsubVersion: (() => void) | null = null;
      let unsubDep: (() => void) | null = null;
      let unsubAndroid: (() => void) | null = null;
      let unsubIos: (() => void) | null = null;

      let latestVersionVal: any = null;
      let latestDepVal: any = null;
      let androidAppLocation: string | undefined = undefined;
      let iosAppLocation: string | undefined = undefined;

      const notify = () => {
        let versionStr = "";
        let finalAndroidLoc = androidAppLocation;
        let finalIosLoc = iosAppLocation;

        if (typeof latestVersionVal === "string") {
          versionStr = latestVersionVal;
        } else if (latestVersionVal && typeof latestVersionVal === "object") {
          versionStr = latestVersionVal.version || "";
          if (latestVersionVal.androidAppLocation) finalAndroidLoc = latestVersionVal.androidAppLocation;
          if (latestVersionVal.iosAppLocation) finalIosLoc = latestVersionVal.iosAppLocation;
        }

        let deprecatedStr = "";
        if (typeof latestDepVal === "string") {
          deprecatedStr = latestDepVal;
        } else if (latestDepVal && typeof latestDepVal === "object") {
          deprecatedStr = latestDepVal.version || latestDepVal.deprecatedVersion || "";
        } else if (latestVersionVal && typeof latestVersionVal === "object" && latestVersionVal.deprecatedVersion) {
          deprecatedStr = latestVersionVal.deprecatedVersion;
        }

        if (versionStr || deprecatedStr) {
          callback({
            version: versionStr,
            deprecatedVersion: deprecatedStr || undefined,
            androidAppLocation: finalAndroidLoc,
            iosAppLocation: finalIosLoc,
          });
        } else {
          callback(null);
        }
      };

      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsubVersion = onValue(ref(services.db, appVersionPath), (snapshot) => {
          latestVersionVal = snapshot.exists() ? snapshot.val() : null;
          notify();
        });
        unsubDep = onValue(ref(services.db, "deprecatedVersion"), (snapshot) => {
          latestDepVal = snapshot.exists() ? snapshot.val() : null;
          notify();
        });
        unsubAndroid = onValue(ref(services.db, "androidAppLocation"), (snapshot) => {
          androidAppLocation = snapshot.exists() && typeof snapshot.val() === "string" ? String(snapshot.val()).trim() : undefined;
          notify();
        });
        unsubIos = onValue(ref(services.db, "iosAppLocation"), (snapshot) => {
          iosAppLocation = snapshot.exists() && typeof snapshot.val() === "string" ? String(snapshot.val()).trim() : undefined;
          notify();
        });
      }).catch(err => console.error("App version listener error:", err));

      return () => {
        if (unsubVersion) unsubVersion();
        if (unsubDep) unsubDep();
        if (unsubAndroid) unsubAndroid();
        if (unsubIos) unsubIos();
      };
    },

    // --- Realtime Chat & Presence Implementation ---

    async updateUserPresence(username, displayName, role) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) return () => {};
      const services = await ensureFirebaseAuth();
      if (!services?.db) return () => {};

      const userPresenceRef = ref(services.db, `${presencePath}/${cleanUsername}`);
      const connectedRef = ref(services.db, ".info/connected");

      let unsubConnected: (() => void) | null = null;

      unsubConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          const presenceData = {
            username: cleanUsername,
            displayName,
            role,
            online: true,
            lastSeen: Date.now(),
          };
          onDisconnect(userPresenceRef).update({
            online: false,
            lastSeen: serverTimestamp(),
          });
          update(userPresenceRef, presenceData).catch(err => console.error("Presence update error:", err));
        }
      });

      return () => {
        if (unsubConnected) unsubConnected();
        update(userPresenceRef, { online: false, lastSeen: Date.now() }).catch(() => {});
      };
    },

    onAllPresenceChange(callback) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsub = onValue(ref(services.db, presencePath), (snapshot) => {
          if (!snapshot.exists()) {
            callback({});
            return;
          }
          const val = snapshot.val() as Record<string, UserPresence>;
          callback(val || {});
        });
      }).catch(err => console.error("All presence listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    async sendChatMessage(chatId, msg) {
      const services = await ensureFirebaseAuth();
      if (!services?.db) return;
      const msgsRef = ref(services.db, `${chatsPath}/${chatId}/messages`);
      const newMsgRef = push(msgsRef);
      const now = Date.now();
      const encryptedText = encryptChatMessage(msg.text, msg.sender, msg.recipient);
      const messageData = {
        ...msg,
        text: encryptedText,
        id: newMsgRef.key as string,
        chatId,
        timestamp: serverTimestamp(),
        localTimestamp: now,
        status: "sent",
      };
      await set(newMsgRef, cleanUndefined(messageData));
    },

    onChatMessagesChange(chatId, currentUsername, callback) {
      let unsub: (() => void) | null = null;
      const cleanUser = currentUsername ? currentUsername.trim().toLowerCase() : "";
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const chatRef = ref(services.db, `${chatsPath}/${chatId}`);
        unsub = onValue(chatRef, (snapshot) => {
          if (!snapshot.exists()) {
            callback([]);
            return;
          }
          const chatVal = snapshot.val() || {};
          const messagesData = (chatVal.messages || {}) as Record<string, ChatMessage>;
          const clearedAtData = (chatVal.clearedAt || {}) as Record<string, number>;
          const userClearedAt = cleanUser ? (clearedAtData[cleanUser] || 0) : 0;

          const getMsgTime = (m: any) => {
            if (typeof m.timestamp === "number" && m.timestamp > 0) return m.timestamp;
            return m.localTimestamp || 0;
          };

          const list = Object.values(messagesData)
            .filter((m) => getMsgTime(m) > userClearedAt)
            .map((m) => ({
              ...m,
              text: decryptChatMessage(m.text, m.sender, m.recipient),
            }))
            .sort((a, b) => {
              const timeA = getMsgTime(a);
              const timeB = getMsgTime(b);
              if (timeA !== timeB) return timeA - timeB;
              return (a.id || "").localeCompare(b.id || "");
            });

          callback(list);
        });
      }).catch(err => console.error("Chat messages listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    onAllChatsSummaryChange(currentUsername, callback) {
      let unsub: (() => void) | null = null;
      const cleanUser = currentUsername.trim().toLowerCase();
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const allChatsRef = ref(services.db, chatsPath);
        unsub = onValue(allChatsRef, (snapshot) => {
          const unreadMap: Record<string, number> = {};
          const lastMsgMap: Record<string, ChatMessage> = {};

          if (snapshot.exists()) {
            const chatsData = snapshot.val() as Record<string, { messages?: Record<string, ChatMessage>; clearedAt?: Record<string, number> }>;
            const getMsgTime = (m: any) => {
              if (typeof m.timestamp === "number" && m.timestamp > 0) return m.timestamp;
              return m.localTimestamp || 0;
            };
            Object.entries(chatsData).forEach(([cId, cData]) => {
              if (cId.includes(cleanUser) && cData.messages) {
                const userClearedAt = cData.clearedAt?.[cleanUser] || 0;
                const msgs = Object.values(cData.messages)
                  .filter((m) => getMsgTime(m) > userClearedAt)
                  .map((m) => ({
                    ...m,
                    text: decryptChatMessage(m.text, m.sender, m.recipient),
                  }))
                  .sort((a, b) => {
                    const timeA = getMsgTime(a);
                    const timeB = getMsgTime(b);
                    if (timeA !== timeB) return timeA - timeB;
                    return (a.id || "").localeCompare(b.id || "");
                  });

                if (msgs.length > 0) {
                  const lastMsg = msgs[msgs.length - 1];
                  const otherUser = lastMsg.sender.toLowerCase() === cleanUser ? lastMsg.recipient.toLowerCase() : lastMsg.sender.toLowerCase();
                  lastMsgMap[otherUser] = lastMsg;

                  const unreadCount = msgs.filter(m => m.recipient.toLowerCase() === cleanUser && m.status !== "read").length;
                  unreadMap[otherUser] = unreadCount;
                }
              }
            });
          }
          callback(unreadMap, lastMsgMap);
        });
      }).catch(err => console.error("All chats summary listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    async setTypingStatus(chatId, username, isTyping) {
      const services = await ensureFirebaseAuth();
      if (!services?.db) return;
      const cleanUser = username.trim().toLowerCase();
      const typingRef = ref(services.db, `${chatsPath}/${chatId}/typing/${cleanUser}`);
      if (isTyping) {
        onDisconnect(typingRef).remove();
        await set(typingRef, true);
      } else {
        await remove(typingRef);
      }
    },

    onTypingStatusChange(chatId, callback) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const typingRef = ref(services.db, `${chatsPath}/${chatId}/typing`);
        unsub = onValue(typingRef, (snapshot) => {
          if (!snapshot.exists()) {
            callback({});
            return;
          }
          callback(snapshot.val() as Record<string, boolean>);
        });
      }).catch(err => console.error("Typing status listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    async markChatMessagesAsRead(chatId, currentUsername) {
      const services = await ensureFirebaseAuth();
      if (!services?.db) return;
      const cleanUser = currentUsername.trim().toLowerCase();
      const chatMsgsRef = ref(services.db, `${chatsPath}/${chatId}/messages`);
      const snapshot = await get(chatMsgsRef);

      if (snapshot.exists()) {
        const msgs = snapshot.val() as Record<string, ChatMessage>;
        const updates: Record<string, any> = {};
        const now = Date.now();

        Object.entries(msgs).forEach(([msgId, msg]) => {
          if (msg.recipient && msg.recipient.toLowerCase() === cleanUser && msg.status !== "read") {
            updates[`${chatsPath}/${chatId}/messages/${msgId}/status`] = "read";
            updates[`${chatsPath}/${chatId}/messages/${msgId}/readAt`] = now;
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(services.db), updates);
        }
      }
    },
    async clearChatForUser(chatId, username) {
      const services = await ensureFirebaseAuth();
      if (!services?.db) return;
      const cleanUser = username.trim().toLowerCase();
      await set(ref(services.db, `${chatsPath}/${chatId}/clearedAt/${cleanUser}`), Date.now());
    },
    async listTenants() {
      const services = await ensureFirebaseAuth();
      if (!services) return {};
      const snap = await get(ref(services.db, "tenants"));
      return snap.exists() ? (snap.val() || {}) : {};
    },
    async createTenant(tenantId: string, tenantName: string) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const tId = tenantId.trim().toLowerCase();
      const tName = tenantName.trim();
      if (!tId || !tName) throw new Error("Tenant ID and Name are required");

      const existingSnap = await get(ref(services.db, `tenants/${tId}`));
      if (existingSnap.exists()) {
        throw new Error("Tenant ID already exists. Tenant ID cannot be re-used.");
      }

      const updates: Record<string, any> = {};
      updates[`tenants/${tId}/name`] = tName;
      updates[`tenants/${tId}/enabled`] = true;
      updates[`tenants/${tId}/config/tenantId`] = tId;
      updates[`tenants/${tId}/config/seasonName`] = `${tName} Festival`;
      updates[`tenants/${tId}/config/activeSeasonCode`] = "DP2026";
      updates[`tenants/${tId}/seasons_data/DP2026/config/seasonName`] = `${tName} Festival 2026`;
      updates[`tenants/${tId}/seasons_data/DP2026/config/seasonCode`] = "DP2026";
      updates[`tenants/${tId}/seasons_data/DP2026/config/seasonEnabled`] = true;
      updates[`tenants/${tId}/seasons_data/DP2026/config/seasonCompleted`] = false;

      await update(ref(services.db), updates);
    },
    async updateTenantName(tenantId: string, tenantName: string) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, `tenants/${tenantId}/name`), tenantName.trim());
    },
    async setTenantStatus(tenantId: string, enabled: boolean) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const updates: Record<string, any> = {};
      updates[`tenants/${tenantId}/enabled`] = enabled;

      if (!enabled) {
        const authCfg = await baseRepo.getAuthConfig();
        if (authCfg && Array.isArray(authCfg.users)) {
          const updatedUsers = authCfg.users.map((u: any) => {
            if (u && u.tenantId === tenantId && u.role?.toLowerCase() !== UserRole.SUPER_ADMIN) {
              return { ...u, disabled: true };
            }
            return u;
          });
          updates[`${authConfigPath}/users`] = updatedUsers;
        }
      }

      await update(ref(services.db), updates);
    },
    async updateAppVersionInfo(info) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const updates: Record<string, any> = {};
      if (info.version !== undefined) updates[appVersionPath] = info.version;
      if (info.deprecatedVersion !== undefined) updates["deprecatedVersion"] = info.deprecatedVersion;
      if (info.androidAppLocation !== undefined) updates["androidAppLocation"] = info.androidAppLocation;
      if (info.iosAppLocation !== undefined) updates["iosAppLocation"] = info.iosAppLocation;
      await update(ref(services.db), updates);
    },
    onTenantStatusChange(tenantId: string, callback: (status: { exists: boolean; enabled: boolean }) => void) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db || !tenantId) return;
        unsub = onValue(ref(services.db, `tenants/${tenantId}`), (snapshot) => {
          if (!snapshot.exists()) {
            callback({ exists: false, enabled: false });
          } else {
            const val = snapshot.val();
            callback({ exists: true, enabled: val?.enabled !== false });
          }
        });
      }).catch(() => {});
      return () => {
        if (unsub) unsub();
      };
    },
    async hasAnyPassesAcrossSeasons(tenantId) {
      const services = await ensureFirebaseAuth();
      if (!services) return false;
      const tCode = await getActiveTenantId(services, tenantId);
      if (!tCode) return false;

      const seasonsSnap = await get(ref(services.db, `tenants/${tCode}/seasons_data`));
      if (!seasonsSnap.exists()) return false;

      const seasonsVal = seasonsSnap.val();
      for (const sCode of Object.keys(seasonsVal)) {
        const subsSnap = await get(ref(services.db, `tenants/${tCode}/seasons_data/${sCode}/subscriptions`));
        if (subsSnap.exists() && Object.keys(subsSnap.val() || {}).length > 0) {
          return true;
        }
      }
      return false;
    },
  };

  return wrapRepositoryWithTimeout(baseRepo);
}

function wrapRepositoryWithTimeout(repo: SubscriptionRepository): SubscriptionRepository {
  const wrapped: any = {};
  for (const key of Object.keys(repo) as (keyof SubscriptionRepository)[]) {
    const fn = (repo as any)[key];
    if (typeof fn === "function") {
      if (key.startsWith("on") || key === "updateUserPresence") {
        wrapped[key] = fn.bind(repo);
      } else {
        wrapped[key] = (...args: any[]) => {
          return withServerTimeout(Promise.resolve().then(() => fn.apply(repo, args)));
        };
      }
    } else {
      wrapped[key] = fn;
    }
  }
  return wrapped as SubscriptionRepository;
}
