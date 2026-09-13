/**
 * Shared Application Constants and Logic Helpers
 */
import { Day, Subscription, FoodMenu, ConfigDay, AppConfig } from "./types";
import { UI_TEXT } from "./strings";

/**
 * Returns the enabled days from the config.
 */
export const getActiveDays = (config: ConfigDay[]) =>
  (config || []).filter((d) => d && d.enabled).map((d) => d.id);

/**
 * Returns the configured label for a given day ID.
 */
export const getDayLabel = (dayId: string, config: ConfigDay[]) =>
  (config || []).find((d) => d.id === dayId)?.label || dayId;

/**
 * Returns the configured abbreviation for a given day ID.
 */
export const getDayAbbr = (dayId: string, config: ConfigDay[]) =>
  (config || []).find((d) => d.id === dayId)?.abbr || dayId.slice(0, 3);

/**
 * Checks if a specific meal slot (breakfast/lunch/dinner) is enabled for a day.
 * Returns false if the day itself is disabled in config.
 */
export const isMealEnabled = (
  dayId: string,
  meal: "breakfast" | "lunch" | "dinner",
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return dayConfig[meal]?.enabled || false;
};

/**
 * Checks if a day is configured as Veg Only.
 */
export const isVegOnlyDay = (dayId: string, config: ConfigDay[]) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  return dayConfig?.vegOnly || false;
};

/**
 * Checks if a specific dietary option (veg/nonVeg) is enabled for a day.
 * Returns false if the day itself is disabled in config.
 */
export const isDietaryEnabled = (
  dayId: string,
  meal: "breakfast" | "lunch" | "dinner",
  diet: "veg" | "nonVeg",
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return (dayConfig[meal]?.enabled && dayConfig[meal]?.[diet]) || false;
};

/**
 * Checks if a specific dietary option (veg/nonVeg) is enabled for ANY meal on a given day.
 */
export const isDietaryEnabledForDay = (
  dayId: string,
  diet: "veg" | "nonVeg",
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return (
    dayConfig.breakfast?.[diet] ||
    dayConfig.lunch?.[diet] ||
    dayConfig.dinner?.[diet] ||
    false
  );
};

/**
 * Checks if a specific parcel option (breakfast/lunch/dinner) is enabled for a day.
 * Returns false if the day itself or the corresponding meal is disabled in config.
 */
export const isParcelEnabled = (
  dayId: string,
  meal: "breakfast" | "lunch" | "dinner",
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return (dayConfig[meal]?.enabled && dayConfig[meal]?.parcel) || false;
};

export const blockOptions = Array.from({ length: 25 }, (_, index) =>
  String(index + 1)
);

/**
 * Checks if payment is enabled globally.
 */
export const isPaymentEnabled = (config: AppConfig) => {
  if (!config.payment) return true;
  return config.payment.enabled;
};

/**
 * Returns list of enabled payment methods.
 */
export const getEnabledPaymentMethods = (config: AppConfig) => {
  if (!config.payment || !config.payment.enabled) return ["UPI", "Cash"];
  const methods: string[] = [];
  if (config.payment.options.upi) methods.push(UI_TEXT.upi);
  if (config.payment.options.cash) methods.push(UI_TEXT.cash);
  if (config.payment.options.bankTransfer) methods.push(UI_TEXT.bankTransfer);
  return methods;
};

export const paymentOptions: Subscription["paymentMode"][] = [UI_TEXT.upi, UI_TEXT.cash];

/**
 * Returns an empty meal allocation for all days.
 */
export const emptyMeals = (config: ConfigDay[]) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [day, { veg: 0, nonVeg: 0 }])
  ) as Record<string, { veg: number; nonVeg: number }>;

/**
 * Derives individual meal choices (Veg/Non-veg/None) based on allocation counts.
 */
export const mealChoicesFromMeals = (
  meals: Subscription["meals"],
  count: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      Array.from({ length: count }, (_, index) =>
        index < meals[day]?.veg
          ? "Veg"
          : index < (meals[day]?.veg || 0) + (meals[day]?.nonVeg || 0)
          ? "Non-veg"
          : "None"
      ),
    ])
  ) as Subscription["mealByPerson"];

/**
 * Initializes meal slots (Breakfast/Lunch/Dinner) with 'None' choice.
 */
export const mealSlotsFromChoices = (
  mealByPerson: Subscription["mealByPerson"],
  count: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      Array.from({ length: count }, () => {
        return {
          breakfast: "None",
          lunch: "None",
          dinner: "None",
          breakfastParcel: false,
          lunchParcel: false,
          dinnerParcel: false,
        };
      }),
    ])
  ) as Subscription["mealSlots"];

/**
 * Aggregates individual choices back into counts per day.
 * A person is counted as Veg if they have at least one Veg meal enabled and selected, and same for Non-veg.
 */
export const mealsFromChoices = (
  mealSlots: Subscription["mealSlots"],
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => {
      const slots = mealSlots[day] || [];
      const meals = ["breakfast", "lunch", "dinner"] as const;

      const vegCount = slots.filter((s) =>
        meals.some(
          (m) =>
            s[m] === "Veg" &&
            isDietaryEnabled(day, m, "veg", config)
        )
      ).length;

      const nonVegCount = slots.filter((s) =>
        meals.some(
          (m) =>
            s[m] === "Non-veg" &&
            isDietaryEnabled(day, m, "nonVeg", config)
        )
      ).length;

      return [
        day,
        {
          veg: vegCount,
          nonVeg: nonVegCount,
        },
      ];
    })
  ) as Subscription["meals"];

/**
 * Resizes the meal choices array when headcount changes, preserving existing data.
 */
export const resizeMealChoices = (
  mealByPerson: Subscription["mealByPerson"],
  count: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      Array.from(
        { length: count },
        (_, index) => mealByPerson[day]?.[index] ?? "None"
      ),
    ])
  ) as Subscription["mealByPerson"];

/**
 * Resizes the meal slots array when headcount changes.
 */
export const resizeMealSlots = (
  mealSlots: Subscription["mealSlots"],
  count: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      Array.from({ length: count }, (_, index) => {
        const s = mealSlots[day]?.[index];
        return {
          breakfast: s?.breakfast || "None",
          lunch: s?.lunch || "None",
          dinner: s?.dinner || "None",
          breakfastParcel: Boolean(s?.breakfastParcel),
          lunchParcel: Boolean(s?.lunchParcel),
          dinnerParcel: Boolean(s?.dinnerParcel),
        };
      }),
    ])
  ) as Subscription["mealSlots"];

/**
 * Generates an empty 'taken' status tracking matrix.
 */
export const emptyTaken = (count: number, config: ConfigDay[]) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      Array.from({ length: count }, () => ({
        breakfast: false,
        lunch: false,
        dinner: false,
      })),
    ])
  ) as Subscription["takenByPerson"];

/**
 * Generates an empty menu structure for the festival feast.
 */
export const emptyFoodMenu = (config: ConfigDay[]): FoodMenu => {
  const emptyMeal = () => ({
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0,
  });
  return Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      {
        breakfast: emptyMeal(),
        lunch: emptyMeal(),
        dinner: emptyMeal(),
      },
    ])
  ) as FoodMenu;
};

export const qrValueFor = (id: string) =>
  `https://durga-puja-food.app/flat/${encodeURIComponent(id)}`;

/**
 * Returns a short summary of meal counts across days for the subscription list.
 */
export const mealSummary = (subscription: Subscription, config: ConfigDay[]) =>
  getActiveDays(config)
    .filter((day) => {
      const v = subscription?.meals?.[day]?.veg || 0;
      const nv = subscription?.meals?.[day]?.nonVeg || 0;
      return v + nv > 0;
    })
    .map((day) => {
      const v = subscription?.meals?.[day]?.veg || 0;
      const nv = subscription?.meals?.[day]?.nonVeg || 0;

      const parts = [];
      if (isDietaryEnabledForDay(day, "veg", config) && v > 0) parts.push(`${v} ${UI_TEXT.veg}`);
      if (isDietaryEnabledForDay(day, "nonVeg", config) && nv > 0) parts.push(`${nv} ${UI_TEXT.nonVeg}`);

      return `${getDayAbbr(day, config)} ${parts.join("/")}`;
    })
    .join("  ");

/**
 * Resizes 'taken' tracking array.
 */
export const resizeTaken = (
  takenByPerson: Subscription["takenByPerson"],
  count: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [
      day,
      Array.from({ length: count }, (_, index) => {
        const t = takenByPerson[day]?.[index];
        return {
          breakfast: Boolean(t?.breakfast),
          lunch: Boolean(t?.lunch),
          dinner: Boolean(t?.dinner),
        };
      }),
    ])
  ) as Subscription["takenByPerson"];

/**
 * Ensures meal counts do not exceed people count.
 */
export const capMeals = (
  meals: Subscription["meals"],
  count: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => {
      const m = meals[day] || { veg: 0, nonVeg: 0 };
      const total = m.veg + m.nonVeg;
      if (total <= count) return [day, m];
      const veg = Math.min(m.veg, count);
      return [day, { veg, nonVeg: Math.max(0, count - veg) }];
    })
  ) as Subscription["meals"];
