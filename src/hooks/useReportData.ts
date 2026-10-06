import { useMemo, useCallback } from "react";
import { UI_TEXT } from "../strings";
import {
  Subscription,
  FoodMenu,
  ConfigDay,
  MealType,
  DietType,
  DietaryOption,
  PaymentMode,
  TakenState,
  ReportType,
  MealSlot,
  toBool,
  normalizeChoice,
} from "../types";
import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isKidsParcelEnabled,
  isMealCurrent,
  getDietTypeForChoice,
  getMealVarieties,
  getMealFreeMealCounts,
  getVarietyForChoice,
} from "../constants";
import { getAmountDiscrepancyData, resolvePrice, DiscrepancyItem } from "../utils/paymentUtils";

export function useReportData(
  subscriptions: Subscription[],
  foodMenu: FoodMenu,
  dayConfig: ConfigDay[],
  freeMealEnabled: boolean,
  paymentConfig: any,
  kidsEnabled: boolean,
  activeReportType?: ReportType
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

  // 1. Day-Wise Report Calculation (Lazy targeted if activeReportType is DAY or PARCEL)
  const dayWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.DAY && activeReportType !== ReportType.PARCEL) {
      return [];
    }
    return sortedActiveDays.map((day) => {
      const totals = {
        veg: 0,
        nonVeg: 0,
        kidsVeg: 0,
        kidsNonVeg: 0,
        vegTaken: 0,
        nonVegTaken: 0,
        kidsVegTaken: 0,
        kidsNonVegTaken: 0,
        vegParcel: 0,
        nonVegParcel: 0,
        kidsVegParcel: 0,
        kidsNonVegParcel: 0,
        vegParcelTaken: 0,
        nonVegParcelTaken: 0,
        kidsVegParcelTaken: 0,
        kidsNonVegParcelTaken: 0,
        freeMealVeg: 0,
        freeMealNonVeg: 0,
        freeMealVegTaken: 0,
        freeMealNonVegTaken: 0,
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];
        const adultCount = sub.peopleCount;

        slots.forEach((s, idx) => {
          if (!s) return;
          const isKid = kidsEnabled && idx >= adultCount;

          const meals = [
            { choice: s[MealType.BREAKFAST], type: MealType.BREAKFAST },
            { choice: s[MealType.LUNCH], type: MealType.LUNCH },
            { choice: s[MealType.DINNER], type: MealType.DINNER },
          ] as const;

          meals.forEach(({ choice, type }) => {
            if (choice === DietaryOption.NONE) return;
            if (!isMealEnabled(day, type, dayConfig)) return;

            const dayConf = (dayConfig || []).find(d => d.id === day);
            const mConf = dayConf ? dayConf[type] : undefined;
            const diet = getDietTypeForChoice(choice, getMealVarieties(mConf));
            if (!diet || !isDietaryEnabled(day, type, diet, dayConfig)) return;

            const tState = taken[idx] || {};
            const isTaken = !!tState[type];
            const isParcelOpted = toBool(s[`${type}Parcel` as keyof typeof s]);
            const isParcelAllowed = isParcelOpted && (isKid ? isKidsParcelEnabled(day, type, dayConfig, kidsEnabled) : isParcelEnabled(day, type, dayConfig));
            const isParcelTaken = !!tState[`${type}Parcel` as keyof TakenState];

            if (diet === DietType.VEG) {
              if (isKid) {
                totals.kidsVeg++;
                if (isTaken) totals.kidsVegTaken++;
                if (isParcelAllowed) {
                  totals.kidsVegParcel++;
                  if (isParcelTaken) totals.kidsVegParcelTaken++;
                }
              } else {
                totals.veg++;
                if (isTaken) totals.vegTaken++;
                if (isParcelAllowed) {
                  totals.vegParcel++;
                  if (isParcelTaken) totals.vegParcelTaken++;
                }
              }
            } else if (diet === DietType.NON_VEG) {
              if (isKid) {
                totals.kidsNonVeg++;
                if (isTaken) totals.kidsNonVegTaken++;
                if (isParcelAllowed) {
                  totals.kidsNonVegParcel++;
                  if (isParcelTaken) totals.kidsNonVegParcelTaken++;
                }
              } else {
                totals.nonVeg++;
                if (isTaken) totals.nonVegTaken++;
                if (isParcelAllowed) {
                  totals.nonVegParcel++;
                  if (isParcelTaken) totals.nonVegParcelTaken++;
                }
              }
            }
          });
        });

        const fmCounts = getMealFreeMealCounts(foodMenu[day]?.[MealType.BREAKFAST], getMealVarieties(dayConfig.find(d => d.id === day)?.[MealType.BREAKFAST]));
        totals.freeMealVeg += fmCounts.freeMealVeg;
        totals.freeMealNonVeg += fmCounts.freeMealNonVeg;
      });

      return { dayId: day, totals };
    });
  }, [sortedActiveDays, subscriptions, foodMenu, dayConfig, kidsEnabled, activeReportType]);

  // 2. Meal-Wise Report Calculation (Lazy targeted if activeReportType is MEAL)
  const mealWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.MEAL && activeReportType !== ReportType.PARCEL && activeReportType !== ReportType.SINGLE && activeReportType !== ReportType.DAY) {
      return [];
    }
    return sortedActiveDays.map((dayId) => {
      const dayConf = (dayConfig || []).find(d => d.id === dayId);
      const mealsObj: Partial<Record<MealType, any>> = {};

      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
        const stats = {
          veg: 0,
          nonVeg: 0,
          kidsVeg: 0,
          kidsNonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          kidsVegTaken: 0,
          kidsNonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          kidsVegParcel: 0,
          kidsNonVegParcel: 0,
          vegParcelTaken: 0,
          nonVegParcelTaken: 0,
          kidsVegParcelTaken: 0,
          kidsNonVegParcelTaken: 0,
          freeMealVeg: 0,
          freeMealNonVeg: 0,
          freeMealVegTaken: 0,
          freeMealNonVegTaken: 0,
        };

        if (isMealEnabled(dayId, mType, dayConfig)) {
          subscriptions.forEach((sub) => {
            const slots = sub.mealSlots[dayId] || [];
            const taken = sub.takenByPerson[dayId] || [];
            const adultCount = sub.peopleCount;

            slots.forEach((s, idx) => {
              if (!s) return;
              const isKid = kidsEnabled && idx >= adultCount;
              const choice = s[mType];
              if (choice === DietaryOption.NONE) return;

              const mConf = dayConf ? dayConf[mType] : undefined;
              const diet = getDietTypeForChoice(choice, getMealVarieties(mConf));
              if (!diet || !isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

              const tState = taken[idx] || {};
              const isTaken = !!tState[mType];
              const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
              const isParcelAllowed = isParcelOpted && (isKid ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled) : isParcelEnabled(dayId, mType, dayConfig));
              const isParcelTaken = !!tState[`${mType}Parcel` as keyof TakenState];

              if (diet === DietType.VEG) {
                if (isKid) {
                  stats.kidsVeg++;
                  if (isTaken) stats.kidsVegTaken++;
                  if (isParcelAllowed) {
                    stats.kidsVegParcel++;
                    if (isParcelTaken) stats.kidsVegParcelTaken++;
                  }
                } else {
                  stats.veg++;
                  if (isTaken) stats.vegTaken++;
                  if (isParcelAllowed) {
                    stats.vegParcel++;
                    if (isParcelTaken) stats.vegParcelTaken++;
                  }
                }
              } else if (diet === DietType.NON_VEG) {
                if (isKid) {
                  stats.kidsNonVeg++;
                  if (isTaken) stats.kidsNonVegTaken++;
                  if (isParcelAllowed) {
                    stats.kidsNonVegParcel++;
                    if (isParcelTaken) stats.kidsNonVegParcelTaken++;
                  }
                } else {
                  stats.nonVeg++;
                  if (isTaken) stats.nonVegTaken++;
                  if (isParcelAllowed) {
                    stats.nonVegParcel++;
                    if (isParcelTaken) stats.nonVegParcelTaken++;
                  }
                }
              }
            });
          });

          const fmCounts = getMealFreeMealCounts(foodMenu[dayId]?.[mType], getMealVarieties(dayConf?.[mType]));
          stats.freeMealVeg += fmCounts.freeMealVeg;
          stats.freeMealNonVeg += fmCounts.freeMealNonVeg;
        }

        mealsObj[mType] = stats;
      });

      return { day: dayId, meals: mealsObj as Record<MealType, any> };
    });
  }, [sortedActiveDays, subscriptions, foodMenu, dayConfig, kidsEnabled, activeReportType]);

  // 3. Flat-Wise Report Calculation (Lazy targeted if activeReportType is FLAT)
  const flatWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.FLAT) return [];
    return subscriptions
      .map((sub) => {
        const dayStats: any[] = [];

        activeDays.forEach((dayId) => {
          const slots = sub.mealSlots[dayId] || [];
          const taken = sub.takenByPerson[dayId] || [];
          const adultCount = sub.peopleCount;

          const meals: any[] = [];

          [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
            if (!isMealEnabled(dayId, mType, dayConfig)) return;

            const mealStat: any = {
              type: mType,
              veg: 0,
              nonVeg: 0,
              kidsVeg: 0,
              kidsNonVeg: 0,
              vegTaken: 0,
              nonVegTaken: 0,
              kidsVegTaken: 0,
              kidsNonVegTaken: 0,
              vegParcel: 0,
              nonVegParcel: 0,
              kidsVegParcel: 0,
              kidsNonVegParcel: 0,
              vegParcelTaken: 0,
              nonVegParcelTaken: 0,
              kidsVegParcelTaken: 0,
              kidsNonVegParcelTaken: 0,
            };

            slots.forEach((s, idx) => {
              if (!s) return;
              const isKid = kidsEnabled && idx >= adultCount;
              const choice = s[mType];
              if (choice === DietaryOption.NONE) return;

              const dayConf = (dayConfig || []).find(d => d.id === dayId);
              const mConf = dayConf ? dayConf[mType] : undefined;
              const diet = getDietTypeForChoice(choice, getMealVarieties(mConf));
              if (!diet || !isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

              const tState = taken[idx] || {};
              const isTaken = !!tState[mType];
              const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
              const isParcelAllowed = isParcelOpted && (isKid ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled) : isParcelEnabled(dayId, mType, dayConfig));
              const isParcelTaken = !!tState[`${mType}Parcel` as keyof TakenState];

              if (diet === DietType.VEG) {
                if (isKid) {
                  mealStat.kidsVeg++;
                  if (isTaken) mealStat.kidsVegTaken++;
                  if (isParcelAllowed) {
                    mealStat.kidsVegParcel++;
                    if (isParcelTaken) mealStat.kidsVegParcelTaken++;
                  }
                } else {
                  mealStat.veg++;
                  if (isTaken) mealStat.vegTaken++;
                  if (isParcelAllowed) {
                    mealStat.vegParcel++;
                    if (isParcelTaken) mealStat.vegParcelTaken++;
                  }
                }
              } else if (diet === DietType.NON_VEG) {
                if (isKid) {
                  mealStat.kidsNonVeg++;
                  if (isTaken) mealStat.kidsNonVegTaken++;
                  if (isParcelAllowed) {
                    mealStat.kidsNonVegParcel++;
                    if (isParcelTaken) mealStat.kidsNonVegParcelTaken++;
                  }
                } else {
                  mealStat.nonVeg++;
                  if (isTaken) mealStat.nonVegTaken++;
                  if (isParcelAllowed) {
                    mealStat.nonVegParcel++;
                    if (isParcelTaken) mealStat.nonVegParcelTaken++;
                  }
                }
              }
            });

            meals.push(mealStat);
          });

          dayStats.push({ day: dayId, meals });
        });

        return {
          id: sub.id,
          flat: sub.flat,
          block: sub.block,
          people: sub.peopleCount || 0,
          kids: sub.kidsCount || 0,
          amount: sub.amount || "0",
          dayStats,
        };
      })
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, activeDays, dayConfig, kidsEnabled, activeReportType]);

  const getMissedParcelData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];

        let missedParcels = 0;

        slots.forEach((s, idx) => {
          const isKid = kidsEnabled && idx >= sub.peopleCount;
          const isParcelAllowed = isKid
            ? isKidsParcelEnabled(selectedDayId, selectedMealType, dayConfig, kidsEnabled)
            : isParcelEnabled(selectedDayId, selectedMealType, dayConfig);

          if (!isParcelAllowed) return;

          const choice = s[selectedMealType];
          if (choice !== DietaryOption.NONE && s[`${selectedMealType}Parcel` as keyof typeof s]) {
            const t = taken[idx] || {};
            const isFoodTaken = !!t[selectedMealType];
            const isParcelTaken = !!t[`${selectedMealType}Parcel` as keyof TakenState];

            if (isFoodTaken && !isParcelTaken) {
              missedParcels++;
            }
          }
        });

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          mobile: sub.mobile,
          count: missedParcels,
          kids: sub.kidsCount || 0,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled]);

  // 4. Payment Summary Report Calculation (Lazy targeted if activeReportType is PAYMENT)
  const paymentData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.PAYMENT) {
      return { summary: [], details: [], totalFood: 0, totalAdultFood: 0, totalKidsFood: 0, totalParcel: 0, discrepancies: [] };
    }
    const summary: Record<PaymentMode, { count: number; total: number }> = {
      [PaymentMode.UPI]: { count: 0, total: 0 },
      [PaymentMode.CASH]: { count: 0, total: 0 },
      [PaymentMode.BANK_TRANSFER]: { count: 0, total: 0 },
    };

    let totalFood = 0;
    let totalAdultFood = 0;
    let totalKidsFood = 0;
    let totalParcel = 0;
    let totalAdultParcel = 0;
    let totalKidsParcel = 0;

    const details = subscriptions
      .map((sub) => {
        const pList = sub.payments && sub.payments.length > 0
          ? sub.payments
          : [{ amount: sub.amount || "0", mode: sub.paymentMode || PaymentMode.CASH, transactionId: sub.transactionId }];

        pList.forEach((p) => {
          const amt = parseFloat(p.amount) || 0;
          const mode = p.mode || PaymentMode.CASH;
          if (summary[mode]) {
            summary[mode].count++;
            summary[mode].total += amt;
          }
        });

        // Calculate expected breakdown for food vs parcel
        let subAdultFood = 0;
        let subKidsFood = 0;
        let subAdultParcel = 0;
        let subKidsParcel = 0;
        let subParcel = 0;
        const dayIds = Object.keys(sub.mealSlots || {});

        dayIds.forEach((dayId) => {
          const dayConf = dayConfig.find((d) => d.id === dayId);
          if (!dayConf || !dayConf.enabled) return;
          const dayMenu = foodMenu?.[dayId];
          const slots = sub.mealSlots[dayId] || [];

          slots.forEach((personSlot, index) => {
            const isKid = kidsEnabled && index >= sub.peopleCount;
            const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

            mealTypes.forEach((mType) => {
              if (!isMealEnabled(dayId, mType, dayConfig)) return;
              const mealConf = dayConf[mType];
              const varieties = getMealVarieties(mealConf);

              const choice = normalizeChoice(personSlot[mType]);
              if (choice === DietaryOption.NONE) return;

              const diet = getDietTypeForChoice(choice, varieties);
              if (!diet || !isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

              const variety = getVarietyForChoice(choice, varieties);
              const isParcel = toBool(personSlot[`${mType}Parcel` as keyof MealSlot]);
              const isParcelAllowed = isParcel && (isKid
                ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
                : isParcelEnabled(dayId, mType, dayConfig));

              let foodPrice = 0;
              let parcelPrice = 0;

              if (variety?.id === "veg_default") {
                foodPrice = resolvePrice(
                  isKid,
                  dayMenu?.[mType]?.kidsVegPrice,
                  dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice,
                  mealConf.vegPrice
                );

                if (isParcelAllowed) {
                  parcelPrice = resolvePrice(
                    isKid,
                    dayMenu?.[mType]?.kidsVegParcelPrice,
                    dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice,
                    mealConf.vegParcelPrice
                  );
                }
              } else if (variety?.id === "nonVeg_default") {
                foodPrice = resolvePrice(
                  isKid,
                  dayMenu?.[mType]?.kidsNonVegPrice,
                  dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice,
                  mealConf.nonVegPrice
                );

                if (isParcelAllowed) {
                  parcelPrice = resolvePrice(
                    isKid,
                    dayMenu?.[mType]?.kidsNonVegParcelPrice,
                    dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice,
                    mealConf.nonVegParcelPrice
                  );
                }
              } else if (variety) {
                const varMenu = dayMenu?.[mType]?.varieties?.[variety.id];
                const isVeg = variety.type === DietType.VEG;
                const defaultAdultMeal = isVeg ? (dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice) : (dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice);
                const defaultKidsMeal = isVeg ? dayMenu?.[mType]?.kidsVegPrice : dayMenu?.[mType]?.kidsNonVegPrice;
                const defaultAdultParcel = isVeg ? (dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice) : (dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice);
                const defaultKidsParcel = isVeg ? dayMenu?.[mType]?.kidsVegParcelPrice : dayMenu?.[mType]?.kidsNonVegParcelPrice;

                const adultMealPrice = (varMenu?.adultPrice !== undefined && varMenu?.adultPrice !== "") ? varMenu.adultPrice : defaultAdultMeal;
                const kidsMealPrice = (varMenu?.kidsPrice !== undefined && varMenu?.kidsPrice !== "") ? varMenu.kidsPrice : defaultKidsMeal;
                const adultParcelPrice = (varMenu?.parcelPrice !== undefined && varMenu?.parcelPrice !== "") ? varMenu.parcelPrice : defaultAdultParcel;
                const kidsParcelPrice = (varMenu?.kidsParcelPrice !== undefined && varMenu?.kidsParcelPrice !== "") ? varMenu.kidsParcelPrice : defaultKidsParcel;

                foodPrice = resolvePrice(isKid, kidsMealPrice, adultMealPrice, undefined);

                if (isParcelAllowed) {
                  parcelPrice = resolvePrice(isKid, kidsParcelPrice, adultParcelPrice, undefined);
                }
              } else {
                const isVeg = diet === DietType.VEG;
                const adultMealPrice = isVeg ? (dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice) : (dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice);
                const kidsMealPrice = isVeg ? dayMenu?.[mType]?.kidsVegPrice : dayMenu?.[mType]?.kidsNonVegPrice;
                const adultParcelPrice = isVeg ? (dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice) : (dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice);
                const kidsParcelPrice = isVeg ? dayMenu?.[mType]?.kidsVegParcelPrice : dayMenu?.[mType]?.kidsNonVegParcelPrice;

                foodPrice = resolvePrice(isKid, kidsMealPrice, adultMealPrice, undefined);

                if (isParcelAllowed) {
                  parcelPrice = resolvePrice(isKid, kidsParcelPrice, adultParcelPrice, undefined);
                }
              }

              if (isKid) {
                subKidsFood += foodPrice;
                if (isParcelAllowed) subKidsParcel += parcelPrice;
              } else {
                subAdultFood += foodPrice;
                if (isParcelAllowed) subAdultParcel += parcelPrice;
              }
              subParcel += parcelPrice;
            });
          });
        });

        const subTotal = parseFloat(sub.amount) || 0;
        if (subTotal > 0) {
           const subParcelValue = subParcel;
           const attributedParcel = Math.min(subTotal, subParcelValue);
           const remainingAfterParcel = subTotal - attributedParcel;
           const calcMealTotal = subAdultFood + subKidsFood;

           let attributedAdultFood = 0;
           let attributedKidsFood = 0;

           if (calcMealTotal > 0) {
             const adultRatio = subAdultFood / calcMealTotal;
             const kidsRatio = subKidsFood / calcMealTotal;
             attributedAdultFood = remainingAfterParcel * adultRatio;
             attributedKidsFood = remainingAfterParcel * kidsRatio;
           } else {
             attributedAdultFood = remainingAfterParcel;
           }

           let attributedAdultParcel = 0;
           let attributedKidsParcel = 0;
           const calcParcelTotal = subAdultParcel + subKidsParcel;

           if (calcParcelTotal > 0) {
             const adultParcelRatio = subAdultParcel / calcParcelTotal;
             const kidsParcelRatio = subKidsParcel / calcParcelTotal;
             attributedAdultParcel = attributedParcel * adultParcelRatio;
             attributedKidsParcel = attributedParcel * kidsParcelRatio;
           } else {
             attributedAdultParcel = attributedParcel;
           }

           totalFood += (subAdultFood + subKidsFood);
           totalAdultFood += attributedAdultFood;
           totalKidsFood += attributedKidsFood;
           totalParcel += attributedParcel;
           totalAdultParcel += attributedAdultParcel;
           totalKidsParcel += attributedKidsParcel;
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
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));

    const summaryList = [];
    if (paymentConfig?.options?.upi) summaryList.push({ mode: PaymentMode.UPI, ...summary[PaymentMode.UPI] });
    if (paymentConfig?.options?.cash) summaryList.push({ mode: PaymentMode.CASH, ...summary[PaymentMode.CASH] });
    if (paymentConfig?.options?.bankTransfer) summaryList.push({ mode: PaymentMode.BANK_TRANSFER, ...summary[PaymentMode.BANK_TRANSFER] });

    const discrepancies = getAmountDiscrepancyData(subscriptions, foodMenu, dayConfig, kidsEnabled);

    return { summary: summaryList, details, totalFood, totalAdultFood, totalKidsFood, totalParcel, totalAdultParcel, totalKidsParcel, discrepancies };
  }, [subscriptions, paymentConfig, dayConfig, foodMenu, kidsEnabled, activeReportType]);

  const getNotTakenData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];

        let vegNotTaken = 0, nonVegNotTaken = 0;

        slots.forEach((s, idx) => {
          if (!s) return;
          const choice = s[selectedMealType];
          if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return;
          if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

          const diet = getDietTypeForChoice(choice, varieties);
          if (!diet || !isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) return;

          const tState = taken[idx] || {};
          const isTaken = !!tState[selectedMealType] || !!tState[`{selectedMealType}Parcel` as keyof TakenState];

          if (!isTaken) {
            if (diet === DietType.VEG) vegNotTaken++;
            else if (diet === DietType.NON_VEG) nonVegNotTaken++;
          }
        });

        return {
          id: sub.id, block: sub.block, flat: sub.flat, mobile: sub.mobile,
          veg: vegNotTaken, nonVeg: nonVegNotTaken, count: vegNotTaken + nonVegNotTaken,
          kids: sub.kidsCount || 0
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig]);

  const getMembersMealData = useCallback((selectedDayId: string, selectedMealType: MealType, personCategory: "all" | "adult" | "kids" = "all") => {
    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    const list: any[] = [];

    subscriptions.forEach((sub) => {
      const slots = sub.mealSlots[selectedDayId] || [];
      const taken = sub.takenByPerson[selectedDayId] || [];
      const adultCount = sub.peopleCount || 0;

      let veg = 0, nonVeg = 0, vegTaken = 0, nonVegTaken = 0;
      let vegParcel = 0, nonVegParcel = 0, vegParcelTaken = 0, nonVegParcelTaken = 0;

      slots.forEach((s, idx) => {
        if (!s) return;
        const isKid = kidsEnabled && idx >= adultCount;

        if (personCategory === "adult" && isKid) return;
        if (personCategory === "kids" && !isKid) return;

        const choice = s[selectedMealType];
        if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return;
        if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

        const diet = getDietTypeForChoice(choice, varieties);
        if (!diet || !isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) return;

        const tState = taken[idx] || {};
        const isTaken = !!tState[selectedMealType];
        const isParcel = toBool(s[`${selectedMealType}Parcel` as keyof MealSlot]);
        const isParcelTaken = !!tState[`${selectedMealType}Parcel` as keyof TakenState];

        if (diet === DietType.VEG) {
          veg++;
          if (isTaken) vegTaken++;
          if (isParcel) {
            vegParcel++;
            if (isParcelTaken) vegParcelTaken++;
          }
        } else if (diet === DietType.NON_VEG) {
          nonVeg++;
          if (isTaken) nonVegTaken++;
          if (isParcel) {
            nonVegParcel++;
            if (isParcelTaken) nonVegParcelTaken++;
          }
        }
      });

      if (veg + nonVeg > 0) {
        list.push({
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          categoryLabel: personCategory === "kids" ? UI_TEXT.kids : (personCategory === "adult" ? UI_TEXT.adults : undefined),
          veg,
          nonVeg,
          vegTaken,
          nonVegTaken,
          vegParcel,
          nonVegParcel,
          vegParcelTaken,
          nonVegParcelTaken,
          total: veg + nonVeg
        });
      }
    });

    return list.sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled]);

  const packagePassesData = useMemo(() => {
    return subscriptions.filter(
      (sub) => sub.isPackageApplied || (sub.appliedPackages && Object.keys(sub.appliedPackages).length > 0)
    );
  }, [subscriptions]);

  return {
    activeDays,
    dayWiseData,
    mealWiseData,
    flatWiseData,
    paymentData,
    getNotTakenData,
    getMembersMealData,
    getKidsMealData: getMembersMealData,
    getMissedParcelData,
    packagePassesData,
  };
}
