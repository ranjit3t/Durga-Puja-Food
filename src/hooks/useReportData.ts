import { useMemo } from "react";
import {
  Subscription,
  FoodMenu,
  ConfigDay,
  MealType,
  DietType,
  DietaryOption,
  PaymentMode,
  PaymentEntry
} from "../types";
import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isMealCurrent,
  getSortedMealKeys,
  isDietaryEnabledForDay
} from "../constants";
import { UI_TEXT } from "../strings";

export function useReportData(
  subscriptions: Subscription[],
  foodMenu: FoodMenu,
  dayConfig: ConfigDay[],
  guestEnabled: boolean,
  paymentConfig: any
) {
  const sortedActiveDays = useMemo(() => {
    const active = getActiveDays(dayConfig);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));

      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;

      return 0;
    });
  }, [dayConfig]);

  const activeDays = useMemo(() => getActiveDays(dayConfig), [dayConfig]);

  const dayWiseData = useMemo(() => {
    return sortedActiveDays.map((day) => {
      const totals = {
        veg: 0,
        nonVeg: 0,
        vegTaken: 0,
        nonVegTaken: 0,
        vegParcel: 0,
        nonVegParcel: 0,
        guestVeg: 0,
        guestNonVeg: 0,
        guestVegTaken: 0,
        guestNonVegTaken: 0,
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];

        slots.forEach((s, idx) => {
          if (!s) return;

          const meals = [
            { choice: s[MealType.BREAKFAST], type: MealType.BREAKFAST },
            { choice: s[MealType.LUNCH], type: MealType.LUNCH },
            { choice: s[MealType.DINNER], type: MealType.DINNER },
          ] as const;

          meals.forEach(({ choice, type }) => {
            if (choice === DietaryOption.NONE) return;
            if (!isMealEnabled(day, type, dayConfig)) return;

            const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (!isDietaryEnabled(day, type, diet, dayConfig)) return;

            const isVeg = choice === DietaryOption.VEG;
            const hasTaken = taken[idx]?.[type];

            if (isVeg) {
              totals.veg += 1;
              if (hasTaken) totals.vegTaken += 1;
            } else {
              totals.nonVeg += 1;
              if (hasTaken) totals.nonVegTaken += 1;
            }

            if (isParcelEnabled(day, type, dayConfig) && s[`${type}Parcel` as keyof typeof s]) {
              if (isVeg) totals.vegParcel += 1;
              else totals.nonVegParcel += 1;
            }
          });
        });
      });

      const dayMenu = foodMenu[day];
      if (guestEnabled && dayMenu) {
        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((m) => {
          const gm = dayMenu[m];
          if (gm) {
            totals.guestVeg += gm.guestVeg || 0;
            totals.guestNonVeg += gm.guestNonVeg || 0;
            totals.guestVegTaken += gm.guestVegTaken || 0;
            totals.guestNonVegTaken += gm.guestNonVegTaken || 0;
          }
        });
      }

      return { day, ...totals };
    });
  }, [subscriptions, foodMenu, dayConfig, guestEnabled, sortedActiveDays]);

  const mealWiseData = useMemo(() => {
    return sortedActiveDays.map((day) => {
      const meals = {
        [MealType.BREAKFAST]: {
          veg: 0,
          nonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
        [MealType.LUNCH]: {
          veg: 0,
          nonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
        [MealType.DINNER]: {
          veg: 0,
          nonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];

        slots.forEach((s, idx) => {
          const t = taken[idx];
          if (!s) return;

          [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mKey) => {
            const choice = s[mKey];
            if (choice === DietaryOption.NONE) return;
            if (!isMealEnabled(day, mKey, dayConfig)) return;

            const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (!isDietaryEnabled(day, mKey, diet, dayConfig)) return;

            const isVeg = choice === DietaryOption.VEG;
            if (isVeg) {
              meals[mKey].veg += 1;
              if (t?.[mKey]) meals[mKey].vegTaken += 1;
            } else {
              meals[mKey].nonVeg += 1;
              if (t?.[mKey]) meals[mKey].nonVegTaken += 1;
            }
            if (
              isParcelEnabled(day, mKey, dayConfig) &&
              s[`${mKey}Parcel` as keyof typeof s]
            ) {
              if (isVeg) meals[mKey].vegParcel += 1;
              else meals[mKey].nonVegParcel += 1;
            }
          });
        });
      });

      const dayMenu = foodMenu[day];
      if (guestEnabled && dayMenu) {
        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((m) => {
          const gm = dayMenu[m];
          if (gm) {
            meals[m].guestVeg += gm.guestVeg || 0;
            meals[m].guestNonVeg += gm.guestNonVeg || 0;
            meals[m].guestVegTaken += gm.guestVegTaken || 0;
            meals[m].guestNonVegTaken += gm.guestNonVegTaken || 0;
          }
        });
      }

      return { day, meals };
    });
  }, [subscriptions, foodMenu, dayConfig, guestEnabled, sortedActiveDays]);

  const flatWiseData = useMemo(() => {
    return subscriptions
      .map((sub) => {
        const dayStats = activeDays
          .map((day) => {
            const slots = sub.mealSlots[day] || [];
            const taken = sub.takenByPerson[day] || [];

            const meals = getSortedMealKeys(day, dayConfig)
              .filter((m) => isMealEnabled(day, m, dayConfig))
              .map((m) => {
                let veg = 0, nonVeg = 0, vegTaken = 0, nonVegTaken = 0, vegParcel = 0, nonVegParcel = 0;

                slots.forEach((s, idx) => {
                  const choice = s[m];
                  if (choice === DietaryOption.NONE) return;
                  if (!isMealEnabled(day, m, dayConfig)) return;

                  const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
                  if (!isDietaryEnabled(day, m, diet, dayConfig)) return;

                  const t = taken[idx];
                  const isTaken = !!t?.[m];
                  const isParcel = isParcelEnabled(day, m, dayConfig) && !!s[`${m}Parcel` as keyof typeof s];

                  if (choice === DietaryOption.VEG) {
                    veg++;
                    if (isTaken) vegTaken++;
                    if (isParcel) vegParcel++;
                  } else {
                    nonVeg++;
                    if (isTaken) nonVegTaken++;
                    if (isParcel) nonVegParcel++;
                  }
                });

                return { type: m, veg, nonVeg, vegTaken, nonVegTaken, vegParcel, nonVegParcel };
              })
              .filter((m) => m.veg + m.nonVeg > 0);

            return { day, meals };
          })
          .filter((d) => d.meals.length > 0);

        return {
          id: sub.id,
          flat: sub.flat,
          block: sub.block,
          people: sub.peopleCount,
          amount: sub.amount,
          dayStats,
        };
      })
      .sort((a, b) => a.block.localeCompare(b.block, undefined, { numeric: true }) || a.flat.localeCompare(b.flat, undefined, { numeric: true }));
  }, [subscriptions, dayConfig, activeDays]);

  const paymentData = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {
      [PaymentMode.UPI]: { count: 0, total: 0 },
      [PaymentMode.CASH]: { count: 0, total: 0 },
      [PaymentMode.BANK_TRANSFER]: { count: 0, total: 0 },
    };

    let totalFood = 0;
    let totalParcel = 0;

    const details = subscriptions
      .map((sub) => {
        const pList = (sub.payments && sub.payments.length > 0)
          ? sub.payments
          : [{ amount: sub.amount, mode: sub.paymentMode, transactionId: sub.transactionId }];

        pList.forEach((p) => {
          const mode = p.mode || PaymentMode.CASH;
          if (summary[mode]) {
            summary[mode].count += 1;
            summary[mode].total += parseFloat(p.amount) || 0;
          }
        });

        // Calculate expected breakdown for this subscription
        let subFood = 0;
        let subParcel = 0;

        Object.keys(sub.mealSlots || {}).forEach((dayId) => {
          const dayConf = dayConfig.find((d) => d.id === dayId);
          if (!dayConf || !dayConf.enabled) return;
          const dayMenu = foodMenu[dayId];
          const slots = sub.mealSlots[dayId] || [];

          slots.forEach((personSlot) => {
            // Breakfast
            if (personSlot[MealType.BREAKFAST] === DietaryOption.VEG) {
              subFood += Number(dayMenu?.[MealType.BREAKFAST]?.vegPrice || dayConf[MealType.BREAKFAST]?.vegPrice || 0);
              if (personSlot.breakfastParcel) subParcel += Number(dayMenu?.[MealType.BREAKFAST]?.vegParcelPrice || dayConf[MealType.BREAKFAST]?.vegParcelPrice || 0);
            } else if (personSlot[MealType.BREAKFAST] === DietaryOption.NON_VEG) {
              subFood += Number(dayMenu?.[MealType.BREAKFAST]?.nonVegPrice || dayConf[MealType.BREAKFAST]?.nonVegPrice || 0);
              if (personSlot.breakfastParcel) subParcel += Number(dayMenu?.[MealType.BREAKFAST]?.nonVegParcelPrice || dayConf[MealType.BREAKFAST]?.nonVegParcelPrice || 0);
            }

            // Lunch
            if (personSlot[MealType.LUNCH] === DietaryOption.VEG) {
              subFood += Number(dayMenu?.[MealType.LUNCH]?.vegPrice || dayConf[MealType.LUNCH]?.vegPrice || 0);
              if (personSlot.lunchParcel) subParcel += Number(dayMenu?.[MealType.LUNCH]?.vegParcelPrice || dayConf[MealType.LUNCH]?.vegParcelPrice || 0);
            } else if (personSlot[MealType.LUNCH] === DietaryOption.NON_VEG) {
              subFood += Number(dayMenu?.[MealType.LUNCH]?.nonVegPrice || dayConf[MealType.LUNCH]?.nonVegPrice || 0);
              if (personSlot.lunchParcel) subParcel += Number(dayMenu?.[MealType.LUNCH]?.nonVegParcelPrice || dayConf[MealType.LUNCH]?.nonVegParcelPrice || 0);
            }

            // Dinner
            if (personSlot[MealType.DINNER] === DietaryOption.VEG) {
              subFood += Number(dayMenu?.[MealType.DINNER]?.vegPrice || dayConf[MealType.DINNER]?.vegPrice || 0);
              if (personSlot.dinnerParcel) subParcel += Number(dayMenu?.[MealType.DINNER]?.vegParcelPrice || dayConf[MealType.DINNER]?.vegParcelPrice || 0);
            } else if (personSlot[MealType.DINNER] === DietaryOption.NON_VEG) {
              subFood += Number(dayMenu?.[MealType.DINNER]?.nonVegPrice || dayConf[MealType.DINNER]?.nonVegPrice || 0);
              if (personSlot.dinnerParcel) subParcel += Number(dayMenu?.[MealType.DINNER]?.nonVegParcelPrice || dayConf[MealType.DINNER]?.nonVegParcelPrice || 0);
            }
          });
        });

        // New Logic: Parcel price is hard truth.
        // Food price = Total Paid - Calculated Parcel Price.
        const subTotal = parseFloat(sub.amount) || 0;
        if (subTotal > 0) {
           const subParcelValue = subParcel;
           // If they paid less than the parcel price, we attribute all to parcel
           const attributedParcel = Math.min(subTotal, subParcelValue);
           const attributedFood = subTotal - attributedParcel;

           totalFood += attributedFood;
           totalParcel += attributedParcel;
        }

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          peopleCount: sub.peopleCount || 0,
          total: subTotal,
          payments: pList,
        };
      })
      .filter(s => s.total > 0)
      .sort((a, b) => a.block.localeCompare(b.block, undefined, { numeric: true }) || a.flat.localeCompare(b.flat, undefined, { numeric: true }));

    const summaryList = [];
    if (paymentConfig.options.upi) summaryList.push({ mode: PaymentMode.UPI, ...summary[PaymentMode.UPI] });
    if (paymentConfig.options.cash) summaryList.push({ mode: PaymentMode.CASH, ...summary[PaymentMode.CASH] });
    if (paymentConfig.options.bankTransfer) summaryList.push({ mode: PaymentMode.BANK_TRANSFER, ...summary[PaymentMode.BANK_TRANSFER] });

    return { summary: summaryList, details, totalFood, totalParcel };
  }, [subscriptions, paymentConfig, dayConfig, foodMenu]);

  const getNotTakenData = (selectedDayId: string, selectedMealType: MealType) => {
    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];

        let vegNotTaken = 0, nonVegNotTaken = 0;

        slots.forEach((s, idx) => {
          const choice = s[selectedMealType];
          if (choice !== DietaryOption.NONE && isMealEnabled(selectedDayId, selectedMealType, dayConfig)) {
            const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) {
              if (!taken[idx]?.[selectedMealType]) {
                if (choice === DietaryOption.VEG) vegNotTaken++;
                else nonVegNotTaken++;
              }
            }
          }
        });

        return {
          id: sub.id, block: sub.block, flat: sub.flat,
          veg: vegNotTaken, nonVeg: nonVegNotTaken, count: vegNotTaken + nonVegNotTaken,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => a.block.localeCompare(b.block, undefined, { numeric: true }) || a.flat.localeCompare(b.flat, undefined, { numeric: true }));
  };

  return {
    sortedActiveDays,
    activeDays,
    dayWiseData,
    mealWiseData,
    flatWiseData,
    paymentData,
    getNotTakenData
  };
}
