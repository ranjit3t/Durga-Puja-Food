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
  normalizeChoice,
  normalizeSlot,
  toBool,
  ActivityLog,
  PaymentMode,
  Note,
  KitchenMetrics,
  AppVersionInfo,
  ChatMessage,
  UserPresence,
  ChatUser,
  MessageStatus
} from "./domain";
import { ConfigDay, AppConfig } from "./types";
import { generatePasscode, getDietTypeForChoice } from "./constants";

// --- Repository Interface ---

export interface SubscriptionRepository {
  list(): Promise<SubscriptionRecord[]>;
  getByFlatId(flatId: string): Promise<SubscriptionRecord | undefined>;
  getByPasscode(passcode: string): Promise<SubscriptionRecord | undefined>;
  upsert(record: SubscriptionRecord): Promise<SubscriptionRecord>;
  remove(flatId: string): Promise<void>;
  getMenu(): Promise<FoodMenu>;
  updateMenu(menu: FoodMenu): Promise<void>;
  updateMealMenu(dayId: string, mealKey: MealType, menu: MealMenu): Promise<void>;
  updateGuestCount(dayId: string, mealKey: MealType, field: string, value: number): Promise<void>;
  updateGuestCounts(dayId: string, mealKey: MealType, data: Record<string, any>): Promise<void>;
  getConfig(): Promise<AppConfig>;
  updateConfig(config: AppConfig): Promise<void>;
  updateSubscriptionStatus(flatId: string, dayId: string, personIndex: number, slot: string, taken: boolean, timeStr?: string): Promise<void>;
  checkInPassAtomic(flatId: string, updatesMap: Record<string, boolean>, metricsIncrements?: Record<string, number>): Promise<void>;
  getAuthConfig(): Promise<any>;
  addActivityLog(log: Omit<ActivityLog, "id">): Promise<void>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getNotes(): Promise<Note[]>;
  upsertNote(note: Note): Promise<Note>;
  removeNote(id: string): Promise<void>;
  getAppVersion(): Promise<AppVersionInfo | null>;
  updateAppVersion(version: string): Promise<void>;
  getMetrics(): Promise<KitchenMetrics | null>;
  // Real-time Delta Listeners
  onSubscriptionsDelta(
    onAdded: (record: SubscriptionRecord) => void,
    onChanged: (record: SubscriptionRecord) => void,
    onRemoved: (id: string) => void,
    activeDays: string[]
  ): () => void;
  onNotesDelta(
    onAdded: (note: Note) => void,
    onChanged: (note: Note) => void,
    onRemoved: (id: string) => void
  ): () => void;
  onLogsDelta(onAdded: (log: ActivityLog) => void): () => void;
  onMenuChange(callback: (menu: FoodMenu) => void): () => void;
  onConfigChange(callback: (config: AppConfig) => void): () => void;
  onMetricsChange(callback: (metrics: KitchenMetrics | null) => void): () => void;
  onAppVersionChange(callback: (info: AppVersionInfo | null) => void): () => void;

  // Chat & Presence Methods
  updateUserPresence(username: string, displayName: string, role: string): Promise<() => void>;
  onAllPresenceChange(callback: (presences: Record<string, UserPresence>) => void): () => void;
  sendChatMessage(chatId: string, msg: Omit<ChatMessage, "id" | "timestamp" | "status">): Promise<void>;
  onChatMessagesChange(chatId: string, callback: (messages: ChatMessage[]) => void): () => void;
  onAllChatsSummaryChange(currentUsername: string, callback: (unreadMap: Record<string, number>, lastMsgMap: Record<string, ChatMessage>) => void): () => void;
  setTypingStatus(chatId: string, username: string, isTyping: boolean): Promise<void>;
  onTypingStatusChange(chatId: string, callback: (typingMap: Record<string, boolean>) => void): () => void;
  markChatMessagesAsRead(chatId: string, currentUsername: string): Promise<void>;
}

const subscriptionsPath = "subscriptions";
const menuPath = "menu";
const configPath = "config";
const authConfigPath = "auth_config";
const logsPath = "logs";
const notesPath = "notes";
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
      .filter((v) => v !== undefined && v !== null);
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
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0,
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
  const totalPeople = peopleCount + kidsCount;
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
  let payments = (value.payments as PaymentEntry[] | undefined) || [];
  if (payments.length === 0 && storedAmount && storedAmount !== "0") {
    payments = [
      {
        amount: String(storedAmount),
        mode: paymentMode,
        transactionId: transactionId,
      },
    ];
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
            breakfastTime: t?.breakfastTime ? String(t.breakfastTime) : undefined,
            lunchTime: t?.lunchTime ? String(t.lunchTime) : undefined,
            dinnerTime: t?.dinnerTime ? String(t.dinnerTime) : undefined,
            breakfastParcelTime: t?.breakfastParcelTime ? String(t.breakfastParcelTime) : undefined,
            lunchParcelTime: t?.lunchParcelTime ? String(t.lunchParcelTime) : undefined,
            dinnerParcelTime: t?.dinnerParcelTime ? String(t.dinnerParcelTime) : undefined,
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

    slots.forEach((s, index) => {
      const isKid = index >= peopleCount;
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mKey) => {
        const choice = s[mKey];
        const diet = getDietTypeForChoice(choice);
        if (diet === DietType.VEG) {
          if (isKid) kidsVegCount++;
          else dVegCount++;
        } else if (diet === DietType.NON_VEG) {
          if (isKid) kidsNonVegCount++;
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
    };
    return result;
  }, {} as Record<EventDay, MealAllocation>);

  return {
    ...value,
    id,
    block,
    flat,
    mobile,
    peopleCount,
    kidsCount,
    amount: String(storedAmount),
    meals: normalizedMeals,
    mealByPerson: finalMealByPerson,
    mealSlots,
    payments,
    takenByPerson,
    paymentMode,
    transactionId,
    passcode,
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

export function createFirebaseRepository(): SubscriptionRepository {
  /**
   * Helper to get active day IDs from database config.
   */
  async function getActiveDays(services: any): Promise<string[]> {
    const snapshot = await get(ref(services.db, configPath));
    const val = snapshot.val();
    if (!snapshot.exists() || !val) return [];

    let days: ConfigDay[] = [];
    if (Array.isArray(val)) {
      days = val;
    } else if (val.days) {
      days = Array.isArray(val.days) ? val.days : Object.values(val.days);
    } else {
      days = Object.values(val);
    }

    return (days || [])
      .filter((d) => d && typeof d === 'object' && d.id && d.enabled)
      .map((d) => d.id);
  }

  return {
    async list() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const eventDays = await getActiveDays(services);
      const snapshot = await get(ref(services.db, subscriptionsPath));
      const records = snapshot.val() as Record<string, SubscriptionRecord> | null;
      return records
        ? Object.values(records).map((record) =>
            normalizeRecord(record as Record<string, unknown>, eventDays)
          )
        : [];
    },
    async getByFlatId(flatId) {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const eventDays = await getActiveDays(services);
      const snapshot = await get(
        ref(services.db, `${subscriptionsPath}/${flatId}`)
      );
      return snapshot.exists()
        ? normalizeRecord(snapshot.val() as Record<string, unknown>, eventDays)
        : undefined;
    },
    async getByPasscode(passcode) {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const eventDays = await getActiveDays(services);
      const passcodeQuery = query(
        ref(services.db, subscriptionsPath),
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
      const cleaned = cleanUndefined(record);
      await set(ref(services.db, `${subscriptionsPath}/${record.id}`), cleaned);
      return record;
    },
    async remove(flatId) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await remove(ref(services.db, `${subscriptionsPath}/${flatId}`));
    },
    async getMenu() {
      const services = await ensureFirebaseAuth();
      if (!services) return {};
      const eventDays = await getActiveDays(services);
      const snapshot = await get(ref(services.db, menuPath));
      return snapshot.exists()
        ? cleanCircularFields(snapshot.val() as FoodMenu)
        : emptyMenu(eventDays);
    },
    async updateMenu(menu) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, menuPath), cleanUndefined(menu));
    },
    async updateMealMenu(dayId, mealKey, menu) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, `${menuPath}/${dayId}/${mealKey}`), cleanUndefined(menu));
    },
    async updateGuestCount(dayId, mealKey, field, value) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, `${menuPath}/${dayId}/${mealKey}/${field}`), value);
    },
    async updateGuestCounts(dayId, mealKey, data) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await update(ref(services.db, `${menuPath}/${dayId}/${mealKey}`), cleanUndefined(data));
    },
    async getConfig() {
      const services = await ensureFirebaseAuth();
      if (!services) return { seasonName: "", days: [], payment: { enabled: true, options: { upi: true, cash: true, bankTransfer: true } }, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true, kidsEnabled: false };
      const snapshot = await get(ref(services.db, configPath));
      const val = snapshot.val();

      const defaultPayment = { enabled: true, options: { upi: true, cash: true, bankTransfer: true } };

      if (snapshot.exists() && val) {
        if (Array.isArray(val)) {
          return { seasonName: "", days: normalizeDayConfig(val), payment: defaultPayment, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true, kidsEnabled: false };
        }

        const days = Array.isArray(val.days)
          ? val.days
          : (val.days ? Object.values(val.days) : []);

        let finalDays = days as ConfigDay[];
        if (finalDays.length === 0 && !val.days) {
          finalDays = Object.values(val).filter(v => v && typeof v === 'object' && (v as any).id) as ConfigDay[];
        }

        return {
          seasonName: val.seasonName || "",
          days: normalizeDayConfig(finalDays),
          payment: val.payment || defaultPayment,
          guestEnabled: val.guestEnabled !== false,
          mobileEnabled: val.mobileEnabled !== false,
          foodPriceEnabled: val.foodPriceEnabled || false,
          seasonEnabled: val.seasonEnabled !== false,
          kidsEnabled: val.kidsEnabled || false,
          whatsappCountryCode: val.whatsappCountryCode || "91",
          quickCheckoutAutoCloseMs: val.quickCheckoutAutoCloseMs ?? 3000,
          soundEnabled: val.soundEnabled !== undefined ? Boolean(val.soundEnabled) : true,
        };
      }
      return { seasonName: "", days: [], payment: defaultPayment, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true, kidsEnabled: false, soundEnabled: true };
    },
    async updateConfig(config) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, configPath), cleanUndefined(config));
    },
    async updateSubscriptionStatus(flatId, dayId, personIndex, slot, taken, timeStr) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const updates: Record<string, any> = {};
      updates[`${subscriptionsPath}/${flatId}/takenByPerson/${dayId}/${personIndex}/${slot}`] = taken;
      updates[`${subscriptionsPath}/${flatId}/takenByPerson/${dayId}/${personIndex}/${slot}Time`] = taken ? (timeStr || "") : null;
      await update(ref(services.db), updates);
    },
    async checkInPassAtomic(flatId, updatesMap, metricsIncrements) {
      const services = await ensureFirebaseAuth();
      if (!services) return;

      const multiPathUpdates: Record<string, any> = {};

      Object.entries(updatesMap).forEach(([slotPath, val]) => {
        multiPathUpdates[`${subscriptionsPath}/${flatId}/takenByPerson/${slotPath}`] = val;
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
      return snapshot.exists() ? snapshot.val() : undefined;
    },
    async addActivityLog(log) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      const newLogRef = push(ref(services.db, logsPath));
      await set(newLogRef, cleanUndefined({ ...log, id: newLogRef.key }));
    },
    async getActivityLogs(limitCount = 50) {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const logsRef = query(ref(services.db, logsPath), limitToLast(limitCount));
      const snapshot = await get(logsRef);
      const data = snapshot.val() as Record<string, ActivityLog> | null;
      if (!data) return [];
      return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    },
    async getNotes() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const snapshot = await get(ref(services.db, notesPath));
      const data = snapshot.val() as Record<string, Note> | null;
      if (!data) return [];
      return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    },
    async upsertNote(note) {
      const services = await ensureFirebaseAuth();
      if (!services) return note;
      let targetId = note.id;
      if (!targetId) {
        const newRef = push(ref(services.db, notesPath));
        targetId = newRef.key as string;
      }
      const data = cleanUndefined({ ...note, id: targetId });
      await set(ref(services.db, `${notesPath}/${targetId}`), data);
      return { ...note, id: targetId };
    },
    async removeNote(id) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await remove(ref(services.db, `${notesPath}/${id}`));
    },
    async getAppVersion() {
      const services = await ensureFirebaseAuth();
      if (!services) return null;
      const [verSnap, androidSnap, iosSnap] = await Promise.all([
        get(ref(services.db, appVersionPath)),
        get(ref(services.db, "androidAppLocation")),
        get(ref(services.db, "iosAppLocation")),
      ]);
      const version = verSnap.exists() ? String(verSnap.val()) : null;
      if (!version) return null;
      return {
        version,
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

    onSubscriptionsDelta(onAdded, onChanged, onRemoved, activeDays) {
      let unsubAdded: (() => void) | null = null;
      let unsubChanged: (() => void) | null = null;
      let unsubRemoved: (() => void) | null = null;

      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const subsRef = ref(services.db, subscriptionsPath);

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

    onNotesDelta(onAdded, onChanged, onRemoved) {
      let unsubAdded: (() => void) | null = null;
      let unsubChanged: (() => void) | null = null;
      let unsubRemoved: (() => void) | null = null;

      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const nRef = ref(services.db, notesPath);

        unsubAdded = onChildAdded(nRef, (snapshot) => {
          if (snapshot.exists()) {
            onAdded(snapshot.val() as Note);
          }
        });

        unsubChanged = onChildChanged(nRef, (snapshot) => {
          if (snapshot.exists()) {
            onChanged(snapshot.val() as Note);
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

    onLogsDelta(onAdded) {
      let unsubAdded: (() => void) | null = null;

      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const logsQuery = query(ref(services.db, logsPath), limitToLast(50));

        unsubAdded = onChildAdded(logsQuery, (snapshot) => {
          if (snapshot.exists()) {
            onAdded(snapshot.val() as ActivityLog);
          }
        });
      }).catch(err => console.error("Logs listener error:", err));

      return () => {
        if (unsubAdded) unsubAdded();
      };
    },

    onMenuChange(callback) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsub = onValue(ref(services.db, menuPath), (snapshot) => {
          callback(snapshot.exists() ? cleanCircularFields(snapshot.val() as FoodMenu) : {});
        });
      }).catch(err => console.error("Menu listener error:", err));

      return () => {
        if (unsub) unsub();
      };
    },

    onConfigChange(callback) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsub = onValue(ref(services.db, configPath), (snapshot) => {
          if (!snapshot.exists()) return;
          const val = snapshot.val();
          const defaultPayment = { enabled: true, options: { upi: true, cash: true, bankTransfer: true } };
          if (Array.isArray(val)) {
            callback({ seasonName: "", days: normalizeDayConfig(val), payment: defaultPayment, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true, kidsEnabled: false });
          } else {
            const days = Array.isArray(val.days) ? val.days : (val.days ? Object.values(val.days) : []);
            let finalDays = days as ConfigDay[];
            if (finalDays.length === 0 && !val.days) {
              finalDays = Object.values(val).filter(v => v && typeof v === 'object' && (v as any).id) as ConfigDay[];
            }
            callback({
              seasonName: val.seasonName || "",
              days: normalizeDayConfig(finalDays),
              payment: val.payment || defaultPayment,
              guestEnabled: val.guestEnabled !== false,
              mobileEnabled: val.mobileEnabled !== false,
              foodPriceEnabled: val.foodPriceEnabled || false,
              seasonEnabled: val.seasonEnabled !== false,
              kidsEnabled: val.kidsEnabled || false,
              whatsappCountryCode: val.whatsappCountryCode || "91",
              quickCheckoutAutoCloseMs: val.quickCheckoutAutoCloseMs ?? 3000,
            });
          }
        });
      }).catch(err => console.error("Config listener error:", err));

      return () => {
        if (unsub) unsub();
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
      let unsubAndroid: (() => void) | null = null;
      let unsubIos: (() => void) | null = null;

      let version: string | null = null;
      let androidAppLocation: string | undefined = undefined;
      let iosAppLocation: string | undefined = undefined;

      const notify = () => {
        if (version) {
          callback({ version, androidAppLocation, iosAppLocation });
        } else {
          callback(null);
        }
      };

      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        unsubVersion = onValue(ref(services.db, appVersionPath), (snapshot) => {
          version = snapshot.exists() ? String(snapshot.val()) : null;
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
      const messageData = {
        ...msg,
        id: newMsgRef.key as string,
        chatId,
        timestamp: serverTimestamp(),
        localTimestamp: now,
        status: "sent",
      };
      await set(newMsgRef, cleanUndefined(messageData));
    },

    onChatMessagesChange(chatId, callback) {
      let unsub: (() => void) | null = null;
      ensureFirebaseAuth().then((services) => {
        if (!services?.db) return;
        const chatMsgsRef = ref(services.db, `${chatsPath}/${chatId}/messages`);
        unsub = onValue(chatMsgsRef, (snapshot) => {
          if (!snapshot.exists()) {
            callback([]);
            return;
          }
          const data = snapshot.val() as Record<string, ChatMessage>;
          const getMsgTime = (m: any) => {
            if (typeof m.timestamp === "number" && m.timestamp > 0) return m.timestamp;
            return m.localTimestamp || 0;
          };
          const list = Object.values(data).sort((a, b) => {
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
            const chatsData = snapshot.val() as Record<string, { messages?: Record<string, ChatMessage> }>;
            const getMsgTime = (m: any) => {
              if (typeof m.timestamp === "number" && m.timestamp > 0) return m.timestamp;
              return m.localTimestamp || 0;
            };
            Object.entries(chatsData).forEach(([cId, cData]) => {
              if (cId.includes(cleanUser) && cData.messages) {
                const msgs = Object.values(cData.messages).sort((a, b) => {
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
  };
}
