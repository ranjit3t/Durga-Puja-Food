/**
 * Shared Application Constants and Logic Helpers
 */
import { FoodMenu, ConfigDay, AppConfig, MealType, DietType, DietaryOption, PaymentMode } from "./domain";
import { UI_TEXT } from "./strings";
import { MealAllocation } from "./domain";
import { Subscription } from "./types";

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

/**
 * Returns localized label for a meal type.
 */
export const getMealLabel = (meal: MealType) => {
  switch (meal) {
    case MealType.BREAKFAST: return UI_TEXT.breakfast;
    case MealType.LUNCH: return UI_TEXT.lunch;
    case MealType.DINNER: return UI_TEXT.dinner;
    default: return String(meal);
  }
};

/**
 * Returns localized label for a dietary option.
 */
export const getDietaryOptionLabel = (option: DietaryOption) => {
  switch (option) {
    case DietaryOption.VEG: return UI_TEXT.veg;
    case DietaryOption.NON_VEG: return UI_TEXT.nonVeg;
    case DietaryOption.NONE: return UI_TEXT.none;
    default: return String(option);
  }
};

export const paymentOptions: PaymentMode[] = [PaymentMode.UPI, PaymentMode.CASH, PaymentMode.BANK_TRANSFER];

/**
 * Returns an empty meal allocation for all days.
 */
export const emptyMeals = (config: ConfigDay[]) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => [day, { [DietType.VEG]: 0, [DietType.NON_VEG]: 0, kidsVeg: 0, kidsNonVeg: 0 }])
  ) as Record<string, MealAllocation>;

/**
 * Derives individual meal choices (Veg/Non-veg/None) based on allocation counts.
 */
export const mealChoicesFromMeals = (
  subscription: Subscription,
  config: ConfigDay[],
  kidsEnabled: boolean
) => {
  const { meals, peopleCount, kidsCount = 0 } = subscription;
  const count = peopleCount + kidsCount;
  return Object.fromEntries(
    getActiveDays(config).map((day) => {
      const allocation = meals[day] || { [DietType.VEG]: 0, [DietType.NON_VEG]: 0, kidsVeg: 0, kidsNonVeg: 0 };
      const choices = Array.from({ length: count }, (_, index) => {
        const isKid = kidsEnabled && index >= peopleCount;
        if (!isKid) {
          // Adult logic
          if (index < (allocation[DietType.VEG] || 0)) return DietaryOption.VEG;
          if (index < (allocation[DietType.VEG] || 0) + (allocation[DietType.NON_VEG] || 0)) return DietaryOption.NON_VEG;
          return DietaryOption.NONE;
        } else {
          // Kids logic
          const kidIndex = index - peopleCount;
          if (kidIndex < (allocation.kidsVeg || 0)) return DietaryOption.VEG;
          if (kidIndex < (allocation.kidsVeg || 0) + (allocation.kidsNonVeg || 0)) return DietaryOption.NON_VEG;
          return DietaryOption.NONE;
        }
      });
      return [day, choices];
    })
  ) as Subscription["mealByPerson"];
};

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
  config: ConfigDay[],
  adultCount: number,
  kidsEnabled: boolean
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => {
      const slots = mealSlots[day] || [];
      const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

      let vegCount = 0;
      let nonVegCount = 0;
      let kidsVegCount = 0;
      let kidsNonVegCount = 0;

      slots.forEach((s, index) => {
        const isKid = kidsEnabled && index >= adultCount;

        meals.forEach((m) => {
          if (!isMealEnabled(day, m, config)) return;

          if (s[m] === DietaryOption.VEG && isDietaryEnabled(day, m, DietType.VEG, config)) {
            if (isKid) kidsVegCount++;
            else vegCount++;
          } else if (s[m] === DietaryOption.NON_VEG && isDietaryEnabled(day, m, DietType.NON_VEG, config)) {
            if (isKid) kidsNonVegCount++;
            else nonVegCount++;
          }
        });
      });

      return [
        day,
        {
          [DietType.VEG]: vegCount,
          [DietType.NON_VEG]: nonVegCount,
          kidsVeg: kidsVegCount,
          kidsNonVeg: kidsNonVegCount,
        },
      ];
    })
  ) as Subscription["meals"];

/**
 * Resizes the meal slots array when headcount changes.
 */
export const resizeMealSlots = (
  mealSlots: Subscription["mealSlots"],
  oldAdultCount: number,
  newAdultCount: number,
  oldKidsCount: number,
  newKidsCount: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => {
      const oldS = mealSlots[day] || [];
      const oldAdults = oldS.slice(0, oldAdultCount);
      const oldKids = oldS.slice(oldAdultCount, oldAdultCount + oldKidsCount);

      const emptySlot = {
        [MealType.BREAKFAST]: DietaryOption.NONE,
        [MealType.LUNCH]: DietaryOption.NONE,
        [MealType.DINNER]: DietaryOption.NONE,
        breakfastParcel: false,
        lunchParcel: false,
        dinnerParcel: false,
      };

      const newAdults = Array.from({ length: newAdultCount }, (_, i) => oldAdults[i] ?? { ...emptySlot });
      const newKids = Array.from({ length: newKidsCount }, (_, i) => oldKids[i] ?? { ...emptySlot });

      return [day, [...newAdults, ...newKids]];
    })
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
        breakfastParcel: false,
        lunchParcel: false,
        dinnerParcel: false,
      })),
    ])
  ) as Subscription["takenByPerson"];

export const emptyFoodMenu = (config: ConfigDay[]): FoodMenu => {
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
export const mealSummary = (subscription: Subscription, config: ConfigDay[], kidsEnabled: boolean) =>
  getActiveDays(config)
    .filter((day) => {
      const m = subscription?.meals?.[day];
      const v = m?.[DietType.VEG] || 0;
      const nv = m?.[DietType.NON_VEG] || 0;
      const kv = m?.kidsVeg || 0;
      const knv = m?.kidsNonVeg || 0;
      return v + nv + kv + knv > 0;
    })
    .map((day) => {
      const m = subscription?.meals?.[day];
      const v = m?.[DietType.VEG] || 0;
      const nv = m?.[DietType.NON_VEG] || 0;
      const kv = m?.kidsVeg || 0;
      const knv = m?.kidsNonVeg || 0;

      const parts = [];

      if (isDietaryEnabledForDay(day, DietType.VEG, config)) {
        if (kidsEnabled) {
           if (v > 0) parts.push(`${v}${UI_TEXT.adultsAbbr}${UI_TEXT.space}${UI_TEXT.veg}`);
           if (kv > 0) parts.push(`${kv}${UI_TEXT.kidsAbbr}${UI_TEXT.space}${UI_TEXT.veg}`);
        } else {
           if (v + kv > 0) parts.push(`${v + kv}${UI_TEXT.space}${UI_TEXT.veg}`);
        }
      }
      if (isDietaryEnabledForDay(day, DietType.NON_VEG, config)) {
        if (kidsEnabled) {
          if (nv > 0) parts.push(`${nv}${UI_TEXT.adultsAbbr}${UI_TEXT.space}${UI_TEXT.nonVeg}`);
          if (knv > 0) parts.push(`${knv}${UI_TEXT.kidsAbbr}${UI_TEXT.space}${UI_TEXT.nonVeg}`);
        } else {
          if (nv + knv > 0) parts.push(`${nv + knv}${UI_TEXT.space}${UI_TEXT.nonVeg}`);
        }
      }

      return `${getDayAbbr(day, config)}${UI_TEXT.space}${parts.join(UI_TEXT.slash)}`;
    })
    .join("  ");

/**
 * Resizes 'taken' tracking array.
 */
export const resizeTaken = (
  takenByPerson: Subscription["takenByPerson"],
  oldAdultCount: number,
  newAdultCount: number,
  oldKidsCount: number,
  newKidsCount: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => {
      const oldT = takenByPerson[day] || [];
      const oldAdults = oldT.slice(0, oldAdultCount);
      const oldKids = oldT.slice(oldAdultCount, oldAdultCount + oldKidsCount);

      const emptyTakenState = {
        [MealType.BREAKFAST]: false,
        [MealType.LUNCH]: false,
        [MealType.DINNER]: false,
        breakfastParcel: false,
        lunchParcel: false,
        dinnerParcel: false,
      };

      const newAdults = Array.from({ length: newAdultCount }, (_, i) => oldAdults[i] ?? { ...emptyTakenState });
      const newKids = Array.from({ length: newKidsCount }, (_, i) => oldKids[i] ?? { ...emptyTakenState });

      return [day, [...newAdults, ...newKids]];
    })
  ) as Subscription["takenByPerson"];

/**
 * Ensures meal counts do not exceed people count.
 */
export const capMeals = (
  meals: Subscription["meals"],
  adultCount: number,
  kidsCount: number,
  config: ConfigDay[]
) =>
  Object.fromEntries(
    getActiveDays(config).map((day) => {
      const m = meals[day] || { [DietType.VEG]: 0, [DietType.NON_VEG]: 0, kidsVeg: 0, kidsNonVeg: 0 };

      const v = Math.min(m[DietType.VEG] || 0, adultCount);
      const nv = Math.min(m[DietType.NON_VEG] || 0, adultCount - v);

      const kv = Math.min(m.kidsVeg || 0, kidsCount);
      const knv = Math.min(m.kidsNonVeg || 0, kidsCount - kv);

      return [day, { [DietType.VEG]: v, [DietType.NON_VEG]: nv, kidsVeg: kv, kidsNonVeg: knv }];
    })
  ) as Subscription["meals"];

export const getMemberLegend = (index: number, adultCount: number, kidsEnabled: boolean) => {
  if (!kidsEnabled) return `${UI_TEXT.personAbbr}${index + 1}`;
  if (index < adultCount) return `${UI_TEXT.adultsAbbr}${index + 1}`;
  return `${UI_TEXT.kidsAbbr}${index - adultCount + 1}`;
};
