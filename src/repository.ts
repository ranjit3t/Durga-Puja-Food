/**
 * Firebase Repository Layer
 * Handles data persistence, retrieval, and schema normalization.
 */
import { get, ref, remove, set, update } from "firebase/database";
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
  DietaryOption
} from "./domain";
import { ConfigDay, AppConfig } from "./types";
import { UI_TEXT } from "./strings";

// --- Repository Interface ---

export interface SubscriptionRepository {
  list(): Promise<SubscriptionRecord[]>;
  getByFlatId(flatId: string): Promise<SubscriptionRecord | undefined>;
  upsert(record: SubscriptionRecord): Promise<SubscriptionRecord>;
  remove(flatId: string): Promise<void>;
  getMenu(): Promise<FoodMenu>;
  updateMenu(menu: FoodMenu): Promise<void>;
  updateMealMenu(dayId: string, mealKey: MealType, menu: MealMenu): Promise<void>;
  updateGuestCount(dayId: string, mealKey: MealType, field: string, value: number): Promise<void>;
  getConfig(): Promise<AppConfig>;
  updateConfig(config: AppConfig): Promise<void>;
  updateSubscriptionStatus(flatId: string, dayId: string, personIndex: number, slot: MealType, taken: boolean): Promise<void>;
  getAuthConfig(): Promise<any>;
}

const subscriptionsPath = "subscriptions";
const menuPath = "menu";
const configPath = "config";
const authConfigPath = "auth_config";

// --- Helper Functions ---

/**
 * Strips 'undefined' values from an object recursively.
 * Necessary because Firebase set() rejects undefined.
 */
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj
      .map(cleanUndefined)
      .filter((v) => v !== undefined && v !== null);
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc: any, key) => {
      const val = obj[key];
      if (val !== undefined && val !== null) {
        acc[key] = cleanUndefined(val);
      }
      return acc;
    }, {});
  }
  return obj;
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
function normalizeRecord(
  value: Record<string, unknown>,
  eventDays: string[]
): SubscriptionRecord {
  const peopleCount = Number(value.peopleCount) || 0;
  const block = String(value.block || "");
  const flat = String(value.flat || "");
  const id = String(value.id || "");
  const mobile = value.mobile ? Number(value.mobile) : undefined;
  const transactionId = value.transactionId ? String(value.transactionId) : undefined;

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
  const mealByPerson = eventDays.reduce((result, day) => {
    const current = (
      value.mealByPerson as Record<string, MealChoice[]> | undefined
    )?.[day];

    if (current && Array.isArray(current)) {
      result[day] = current.map(c => (c === "Non-veg" ? "Non-Veg" : c));
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

      result[day] = Array.from({ length: peopleCount }, (_, index) => {
        if (index < vegCount) return DietaryOption.VEG;
        if (index < vegCount + nonVegCount) return DietaryOption.NON_VEG;
        return DietaryOption.NONE;
      });
    }
    return result;
  }, {} as Record<EventDay, MealChoice[]>);

  // 5. Slot Matrix Initialization (mealSlots)
  const mealSlots = eventDays.reduce((result, day) => {
    const current = (value.mealSlots as Record<string, any[]> | undefined)?.[
      day
    ];
    result[day] =
      current && Array.isArray(current)
        ? current.map((s) => {
            // Migration: handle boolean to MealChoice conversion
            let b = typeof s?.breakfast === "boolean" ? (s.breakfast ? mealByPerson[day][0] || DietaryOption.VEG : DietaryOption.NONE) : s?.breakfast || DietaryOption.NONE;
            let l = typeof s?.lunch === "boolean" ? (s.lunch ? mealByPerson[day][0] || DietaryOption.VEG : DietaryOption.NONE) : s?.lunch || DietaryOption.NONE;
            let d = typeof s?.dinner === "boolean" ? (s.dinner ? mealByPerson[day][0] || DietaryOption.VEG : DietaryOption.NONE) : s?.dinner || DietaryOption.NONE;

            // Standardize "Non-veg" -> "Non-Veg"
            if (b === "Non-veg") b = DietaryOption.NON_VEG;
            if (l === "Non-veg") l = DietaryOption.NON_VEG;
            if (d === "Non-veg") d = DietaryOption.NON_VEG;

            return {
              [MealType.BREAKFAST]: b as MealChoice,
              [MealType.LUNCH]: l as MealChoice,
              [MealType.DINNER]: d as MealChoice,
              breakfastParcel: Boolean(s?.breakfastParcel),
              lunchParcel: Boolean(s?.lunchParcel),
              dinnerParcel: Boolean(s?.dinnerParcel),
            };
          })
        : mealByPerson[day].map((choice) => ({
            [MealType.BREAKFAST]: choice !== DietaryOption.NONE ? choice : DietaryOption.NONE,
            [MealType.LUNCH]: choice !== DietaryOption.NONE ? choice : DietaryOption.NONE,
            [MealType.DINNER]: choice !== DietaryOption.NONE ? choice : DietaryOption.NONE,
            breakfastParcel: false,
            lunchParcel: false,
            dinnerParcel: false,
          }));
    return result;
  }, {} as Record<EventDay, MealSlot[]>);

  // 5. Taken Status Normalization
  const legacyTaken = (value.taken ?? {}) as Record<string, boolean>;
  const takenByPerson = eventDays.reduce((result, day) => {
    const current = (
      value.takenByPerson as Record<string, TakenState[]> | undefined
    )?.[day];
    result[day] =
      current && Array.isArray(current)
        ? current.map((t) => ({
            [MealType.BREAKFAST]: Boolean(t?.breakfast),
            [MealType.LUNCH]: Boolean(t?.lunch),
            [MealType.DINNER]: Boolean(t?.dinner),
          }))
        : Array.from({ length: peopleCount }, () => {
            const isTaken = Boolean(legacyTaken[day]);
            return { [MealType.BREAKFAST]: isTaken, [MealType.LUNCH]: isTaken, [MealType.DINNER]: isTaken };
          });
    return result;
  }, {} as Record<EventDay, TakenState[]>);

  // 6. Aggregate Stats Generation (meals) & mealByPerson finalization
  const finalMealByPerson: Record<EventDay, MealChoice[]> = {};
  const normalizedMeals = eventDays.reduce((result, day) => {
    const slots = mealSlots[day] || [];
    let dVegCount = 0;
    let dNonVegCount = 0;

    const choices = slots.map((s) => {
      if (
        s[MealType.BREAKFAST] === DietaryOption.NON_VEG ||
        s[MealType.LUNCH] === DietaryOption.NON_VEG ||
        s[MealType.DINNER] === DietaryOption.NON_VEG
      )
        return DietaryOption.NON_VEG;
      if (s[MealType.BREAKFAST] === DietaryOption.VEG || s[MealType.LUNCH] === DietaryOption.VEG || s[MealType.DINNER] === DietaryOption.VEG)
        return DietaryOption.VEG;
      return DietaryOption.NONE;
    });

    choices.forEach((choice) => {
      if (choice === DietaryOption.NON_VEG) {
        dNonVegCount++;
      } else if (choice === DietaryOption.VEG) {
        dVegCount++;
      }
    });

    finalMealByPerson[day] = choices;
    result[day] = {
      [DietType.VEG]: dVegCount,
      [DietType.NON_VEG]: dNonVegCount,
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
    amount: String(storedAmount),
    meals: normalizedMeals,
    mealByPerson: finalMealByPerson,
    mealSlots,
    payments,
    takenByPerson,
    paymentMode,
    transactionId,
  } as SubscriptionRecord;
}

// --- Implementation ---

export const firebaseRepositoryConfigured = firebaseConfigured;

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
      // Handle config being an object-ified array at the root
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
      if (!services) return {}; // Will be merged with emptyMenu in App
      const eventDays = await getActiveDays(services);
      const snapshot = await get(ref(services.db, menuPath));
      return snapshot.exists()
        ? (snapshot.val() as FoodMenu)
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
    async getConfig() {
      const services = await ensureFirebaseAuth();
      if (!services) return { seasonName: "", days: [], payment: { enabled: true, options: { upi: true, cash: true, bankTransfer: true } }, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true };
      const snapshot = await get(ref(services.db, configPath));
      const val = snapshot.val();

      const defaultPayment = { enabled: true, options: { upi: true, cash: true, bankTransfer: true } };

      if (snapshot.exists() && val) {
        if (Array.isArray(val)) {
          return { seasonName: "", days: val as ConfigDay[], payment: defaultPayment, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true };
        }

        const days = Array.isArray(val.days)
          ? val.days
          : (val.days ? Object.values(val.days) : []);

        // If days are still empty but val has numeric keys, it might be object-ified array
        let finalDays = days as ConfigDay[];
        if (finalDays.length === 0 && !val.days) {
          finalDays = Object.values(val).filter(v => v && typeof v === 'object' && (v as any).id) as ConfigDay[];
        }

        return {
          seasonName: val.seasonName || "",
          days: finalDays,
          payment: val.payment || defaultPayment,
          guestEnabled: val.guestEnabled !== false,
          mobileEnabled: val.mobileEnabled !== false,
          foodPriceEnabled: val.foodPriceEnabled || false,
          seasonEnabled: val.seasonEnabled !== false,
          whatsappCountryCode: val.whatsappCountryCode || "91",
        };
      }
      return { seasonName: "", days: [], payment: defaultPayment, guestEnabled: true, mobileEnabled: true, foodPriceEnabled: false, seasonEnabled: true };
    },
    async updateConfig(config) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, configPath), cleanUndefined(config));
    },
    async updateSubscriptionStatus(flatId, dayId, personIndex, slot, taken) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, `${subscriptionsPath}/${flatId}/takenByPerson/${dayId}/${personIndex}/${slot}`), taken);
    },
    async getAuthConfig() {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const snapshot = await get(ref(services.db, authConfigPath));
      return snapshot.exists() ? snapshot.val() : undefined;
    },
  };
}
