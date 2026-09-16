/**
 * Shared Application Constants and Logic Helpers
 */
import { Day, Subscription, FoodMenu, ConfigDay, AppConfig, MealType, DietType, DietaryOption, PaymentMode } from "./types";
import { UI_TEXT } from "./strings";
import { MealAllocation } from "./domain";

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
  meal: MealType,
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return dayConfig[meal]?.enabled || false;
};

/**
 * Checks if a specific meal slot (breakfast/lunch/dinner) is marked as DONE for a day.
 */
export const isMealDone = (
  dayId: string,
  meal: MealType,
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return dayConfig[meal]?.done || false;
};

/**
 * Checks if a specific meal slot is marked as CURRENT.
 */
export const isMealCurrent = (
  dayId: string,
  meal: MealType,
  config: ConfigDay[]
) => {
  const dayConfig = (config || []).find((d) => d.id === dayId);
  if (!dayConfig || !dayConfig.enabled) return false;
  return dayConfig[meal]?.current || false;
};

/**
 * Checks if all enabled meals across all active days are marked as DONE.
 */
export const isSeasonDone = (config: ConfigDay[]) => {
  const activeDays = (config || []).filter((d) => d && d.enabled);
  if (activeDays.length === 0) return true;

  return activeDays.every((day) => {
    const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
    return meals.every((mKey) => {
      const m = day[mKey];
      return !m.enabled || m.done;
    });
  });
};

/**
 * Returns sorted meal keys, putting the "Current" meal first if it exists.
 */
export const getSortedMealKeys = (dayId: string, config: ConfigDay[]) => {
  const keys: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
  return [...keys].sort((a, b) => {
    const aCurrent = isMealCurrent(dayId, a, config);
    const bCurrent = isMealCurrent(dayId, b, config);
    if (aCurrent && !bCurrent) return -1;
    if (!aCurrent && bCurrent) return 1;
    return 0;
  });
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
  meal: MealType,
  diet: DietType,
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
  diet: DietType,
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
  meal: MealType,
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
  if (!config.payment || !config.payment.enabled) return [PaymentMode.UPI, PaymentMode.CASH];
  const methods: PaymentMode[] = [];
  if (config.payment.options.upi) methods.push(PaymentMode.UPI);
  if (config.payment.options.cash) methods.push(PaymentMode.CASH);
  if (config.payment.options.bankTransfer) methods.push(PaymentMode.BANK_TRANSFER);
  return methods;
};

/**
 * Returns localized label for a payment mode.
 */
export const getPaymentModeLabel = (mode: PaymentMode) => {
  switch (mode) {
    case PaymentMode.UPI: return UI_TEXT.upi;
    case PaymentMode.CASH: return UI_TEXT.cash;
    case PaymentMode.BANK_TRANSFER: return UI_TEXT.bankTransfer;
    default: return String(mode);
  }
};

export const paymentOptions: PaymentMode[] = [PaymentMode.UPI, PaymentMode.CASH, PaymentMode.BANK_TRANSFER];

/**
 * Returns an empty meal allocation for all days.
 */
export const emptyMeals = (config: ConfigDay[]) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [day, { [DietType.VEG]: 0, [DietType.NON_VEG]: 0 }])
  ) as Record<string, MealAllocation>;

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
        index < meals[day]?.[DietType.VEG]
          ? DietaryOption.VEG
          : index < (meals[day]?.[DietType.VEG] || 0) + (meals[day]?.[DietType.NON_VEG] || 0)
          ? DietaryOption.NON_VEG
          : DietaryOption.NONE
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
          [MealType.BREAKFAST]: DietaryOption.NONE,
          [MealType.LUNCH]: DietaryOption.NONE,
          [MealType.DINNER]: DietaryOption.NONE,
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
      const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

      const vegCount = slots.filter((s) =>
        meals.some(
          (m) =>
            s[m] === DietaryOption.VEG &&
            isDietaryEnabled(day, m, DietType.VEG, config)
        )
      ).length;

      const nonVegCount = slots.filter((s) =>
        meals.some(
          (m) =>
            s[m] === DietaryOption.NON_VEG &&
            isDietaryEnabled(day, m, DietType.NON_VEG, config)
        )
      ).length;

      return [
        day,
        {
          [DietType.VEG]: vegCount,
          [DietType.NON_VEG]: nonVegCount,
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
        (_, index) => mealByPerson[day]?.[index] ?? DietaryOption.NONE
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
          [MealType.BREAKFAST]: s?.breakfast || DietaryOption.NONE,
          [MealType.LUNCH]: s?.lunch || DietaryOption.NONE,
          [MealType.DINNER]: s?.dinner || DietaryOption.NONE,
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
        [MealType.BREAKFAST]: false,
        [MealType.LUNCH]: false,
        [MealType.DINNER]: false,
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
        [MealType.BREAKFAST]: emptyMeal(),
        [MealType.LUNCH]: emptyMeal(),
        [MealType.DINNER]: emptyMeal(),
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
      const v = subscription?.meals?.[day]?.[DietType.VEG] || 0;
      const nv = subscription?.meals?.[day]?.[DietType.NON_VEG] || 0;
      return v + nv > 0;
    })
    .map((day) => {
      const v = subscription?.meals?.[day]?.[DietType.VEG] || 0;
      const nv = subscription?.meals?.[day]?.[DietType.NON_VEG] || 0;

      const parts = [];
      if (isDietaryEnabledForDay(day, DietType.VEG, config) && v > 0) parts.push(`${v} ${UI_TEXT.veg}`);
      if (isDietaryEnabledForDay(day, DietType.NON_VEG, config) && nv > 0) parts.push(`${nv} ${UI_TEXT.nonVeg}`);

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
          [MealType.BREAKFAST]: Boolean(t?.breakfast),
          [MealType.LUNCH]: Boolean(t?.lunch),
          [MealType.DINNER]: Boolean(t?.dinner),
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
      const m = meals[day] || { [DietType.VEG]: 0, [DietType.NON_VEG]: 0 };
      const total = m[DietType.VEG] + m[DietType.NON_VEG];
      if (total <= count) return [day, m];
      const veg = Math.min(m[DietType.VEG], count);
      return [day, { [DietType.VEG]: veg, [DietType.NON_VEG]: Math.max(0, count - veg) }];
    })
  ) as Subscription["meals"];
