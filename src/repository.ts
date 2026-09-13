/**
 * Firebase Repository Layer
 * Handles data persistence, retrieval, and schema normalization.
 */
import { get, ref, remove, set } from "firebase/database";
import { ensureFirebaseAuth, firebaseConfigured } from "./firebase";
import { ConfigDay, AppConfig } from "./types";

// --- Domain Types ---

export type PujaDay = string;
export type PaymentMode = "UPI" | "Cash" | "Bank transfer";

export type MealAllocation = { veg: number; nonVeg: number };
export type MealChoice = "Veg" | "Non-veg" | "None";

export type MealSlot = {
  breakfast: MealChoice;
  lunch: MealChoice;
  dinner: MealChoice;
  breakfastParcel: boolean;
  lunchParcel: boolean;
  dinnerParcel: boolean;
};

export type TakenState = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

export type MealMenu = {
  veg: string[];
  nonVeg: string[];
  guestVeg?: number;
  guestNonVeg?: number;
  guestTaken?: number;
  guestVegTaken?: number;
  guestNonVegTaken?: number;
};

export type DayMenu = {
  breakfast: MealMenu;
  lunch: MealMenu;
  dinner: MealMenu;
};

export type FoodMenu = Record<PujaDay, DayMenu>;

export type SubscriptionRecord = {
  id: string;
  block: string;
  flat: string;
  peopleCount: number;
  meals: Record<PujaDay, MealAllocation>;
  mealByPerson: Record<PujaDay, MealChoice[]>;
  mealSlots: Record<PujaDay, MealSlot[]>;
  amount: string;
  paymentMode: PaymentMode;
  takenByPerson: Record<PujaDay, TakenState[]>;
};

// --- Repository Interface ---

export interface SubscriptionRepository {
  list(): Promise<SubscriptionRecord[]>;
  getByFlatId(flatId: string): Promise<SubscriptionRecord | undefined>;
  upsert(record: SubscriptionRecord): Promise<SubscriptionRecord>;
  remove(flatId: string): Promise<void>;
  getMenu(): Promise<FoodMenu>;
  updateMenu(menu: FoodMenu): Promise<void>;
  getConfig(): Promise<AppConfig>;
  updateConfig(config: AppConfig): Promise<void>;
  getAuthConfig(): Promise<any>;
}

const subscriptionsPath = "subscriptions";
const menuPath = "menu";
const configPath = "config";
const authConfigPath = "auth_config";

// --- Helper Functions ---

/**
 * Creates an empty menu structure.
 */
function emptyMenu(pujaDays: string[]): FoodMenu {
  const emptyMeal = () => ({
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0,
  });
  return pujaDays.reduce((acc, day) => {
    acc[day] = {
      breakfast: emptyMeal(),
      lunch: emptyMeal(),
      dinner: emptyMeal(),
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
  pujaDays: string[]
): SubscriptionRecord {
  const peopleCount = Number(value.peopleCount) || 0;
  const block = String(value.block || "");
  const flat = String(value.flat || "");
  const id = String(value.id || "");

  // 1. Amount Normalization
  const storedAmount =
    value.amount ?? value.paymentAmount ?? value.payment_amount ?? "";

  // 2. Legacy Day/Type Detection
  const legacyDays = (value.days ?? {}) as Record<string, boolean>;
  const legacyMeal = value.mealType === "Non-veg" ? "nonVeg" : "veg";

  // 3. Choice Matrix Initialization (mealByPerson)
  const mealByPerson = pujaDays.reduce((result, day) => {
    const current = (
      value.mealByPerson as Record<string, MealChoice[]> | undefined
    )?.[day];

    if (current && Array.isArray(current)) {
      result[day] = current;
    } else {
      const allocation = (
        value.meals as Record<string, MealAllocation> | undefined
      )?.[day];

      const vegCount =
        allocation?.veg ??
        (legacyDays[day] && legacyMeal === "veg" ? peopleCount : 0);
      const nonVegCount =
        allocation?.nonVeg ??
        (legacyDays[day] && legacyMeal === "nonVeg" ? peopleCount : 0);

      result[day] = Array.from({ length: peopleCount }, (_, index) => {
        if (index < vegCount) return "Veg";
        if (index < vegCount + nonVegCount) return "Non-veg";
        return "None";
      });
    }
    return result;
  }, {} as Record<PujaDay, MealChoice[]>);

  // 4. Slot Matrix Initialization (mealSlots)
  const mealSlots = pujaDays.reduce((result, day) => {
    const current = (value.mealSlots as Record<string, any[]> | undefined)?.[
      day
    ];
    result[day] =
      current && Array.isArray(current)
        ? current.map((s) => {
            // Migration: handle boolean to MealChoice conversion
            const b = typeof s?.breakfast === "boolean" ? (s.breakfast ? mealByPerson[day][0] || "Veg" : "None") : s?.breakfast || "None";
            const l = typeof s?.lunch === "boolean" ? (s.lunch ? mealByPerson[day][0] || "Veg" : "None") : s?.lunch || "None";
            const d = typeof s?.dinner === "boolean" ? (s.dinner ? mealByPerson[day][0] || "Veg" : "None") : s?.dinner || "None";

            return {
              breakfast: b as MealChoice,
              lunch: l as MealChoice,
              dinner: d as MealChoice,
              breakfastParcel: Boolean(s?.breakfastParcel),
              lunchParcel: Boolean(s?.lunchParcel),
              dinnerParcel: Boolean(s?.dinnerParcel),
            };
          })
        : mealByPerson[day].map((choice) => ({
            breakfast: choice !== "None" ? choice : "None",
            lunch: choice !== "None" ? choice : "None",
            dinner: choice !== "None" ? choice : "None",
            breakfastParcel: false,
            lunchParcel: false,
            dinnerParcel: false,
          }));
    return result;
  }, {} as Record<PujaDay, MealSlot[]>);

  // 5. Taken Status Normalization
  const legacyTaken = (value.taken ?? {}) as Record<string, boolean>;
  const takenByPerson = pujaDays.reduce((result, day) => {
    const current = (
      value.takenByPerson as Record<string, TakenState[]> | undefined
    )?.[day];
    result[day] =
      current && Array.isArray(current)
        ? current.map((t) => ({
            breakfast: Boolean(t?.breakfast),
            lunch: Boolean(t?.lunch),
            dinner: Boolean(t?.dinner),
          }))
        : Array.from({ length: peopleCount }, () => {
            const isTaken = Boolean(legacyTaken[day]);
            return { breakfast: isTaken, lunch: isTaken, dinner: isTaken };
          });
    return result;
  }, {} as Record<PujaDay, TakenState[]>);

  // 6. Aggregate Stats Generation (meals) & mealByPerson finalization
  const finalMealByPerson: Record<PujaDay, MealChoice[]> = {};
  const normalizedMeals = pujaDays.reduce((result, day) => {
    const slots = mealSlots[day] || [];
    const choices = slots.map((s) => {
      if (
        s.breakfast === "Non-veg" ||
        s.lunch === "Non-veg" ||
        s.dinner === "Non-veg"
      )
        return "Non-veg";
      if (s.breakfast === "Veg" || s.lunch === "Veg" || s.dinner === "Veg")
        return "Veg";
      return "None";
    });
    finalMealByPerson[day] = choices;
    result[day] = {
      veg: choices.filter((choice) => choice === "Veg").length,
      nonVeg: choices.filter((choice) => choice === "Non-veg").length,
    };
    return result;
  }, {} as Record<PujaDay, MealAllocation>);

  return {
    ...value,
    id,
    block,
    flat,
    peopleCount,
    amount: String(storedAmount),
    meals: normalizedMeals,
    mealByPerson: finalMealByPerson,
    mealSlots,
    takenByPerson,
    paymentMode: (value.paymentMode as any) || "UPI",
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
    let days: ConfigDay[] = [];
    if (snapshot.exists()) {
      if (Array.isArray(val)) {
        days = val;
      } else if (val && Array.isArray(val.days)) {
        days = val.days;
      }
    }
    return days.filter((d) => d && d.enabled).map((d) => d.id);
  }

  return {
    async list() {
      const services = await ensureFirebaseAuth();
      if (!services) return [];
      const pujaDays = await getActiveDays(services);
      const snapshot = await get(ref(services.db, subscriptionsPath));
      const records = snapshot.val() as Record<string, SubscriptionRecord> | null;
      return records
        ? Object.values(records).map((record) =>
            normalizeRecord(record as Record<string, unknown>, pujaDays)
          )
        : [];
    },
    async getByFlatId(flatId) {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const pujaDays = await getActiveDays(services);
      const snapshot = await get(
        ref(services.db, `${subscriptionsPath}/${flatId}`)
      );
      return snapshot.exists()
        ? normalizeRecord(snapshot.val() as Record<string, unknown>, pujaDays)
        : undefined;
    },
    async upsert(record) {
      const services = await ensureFirebaseAuth();
      if (!services) return record;
      await set(ref(services.db, `${subscriptionsPath}/${record.id}`), record);
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
      const pujaDays = await getActiveDays(services);
      const snapshot = await get(ref(services.db, menuPath));
      return snapshot.exists()
        ? (snapshot.val() as FoodMenu)
        : emptyMenu(pujaDays);
    },
    async updateMenu(menu) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, menuPath), menu);
    },
    async getConfig() {
      const services = await ensureFirebaseAuth();
      if (!services) return { seasonName: "", days: [], payment: { enabled: true, options: { upi: true, cash: true, bankTransfer: true } } };
      const snapshot = await get(ref(services.db, configPath));
      const val = snapshot.val();

      const defaultPayment = { enabled: true, options: { upi: true, cash: true, bankTransfer: true } };

      if (snapshot.exists()) {
        if (Array.isArray(val)) {
          return { seasonName: "", days: val as ConfigDay[], payment: defaultPayment };
        }
        return {
          seasonName: val.seasonName || "",
          days: Array.isArray(val.days) ? (val.days as ConfigDay[]) : [],
          payment: val.payment || defaultPayment,
        };
      }
      return { seasonName: "", days: [], payment: defaultPayment };
    },
    async updateConfig(config) {
      const services = await ensureFirebaseAuth();
      if (!services) return;
      await set(ref(services.db, configPath), config);
    },
    async getAuthConfig() {
      const services = await ensureFirebaseAuth();
      if (!services) return undefined;
      const snapshot = await get(ref(services.db, authConfigPath));
      return snapshot.exists() ? snapshot.val() : undefined;
    },
  };
}
