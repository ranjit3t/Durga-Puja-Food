import { useState, useMemo, useCallback } from "react";
import {
  SubscriptionRecord,
  FoodMenu,
  ConfigDay,
  MealType,
  DietType,
  DietaryOption,
  PaymentMode,
  ReportType,
  FoodPackage,
  TakenState,
  toBool,
} from "../domain";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isKidsParcelEnabled,
  getDietTypeForChoice,
  getMealVarieties,
  getMealFreeMealCounts,
  isGuestsParcelEnabled,
} from "../constants";
import { getAmountDiscrepancyData, calculatePersonMealAndParcelCost, calculateDetailedPaymentReportData } from "../utils/paymentUtils";

export function useReportData(
  subscriptions: SubscriptionRecord[],
  foodMenu: FoodMenu,
  dayConfig: ConfigDay[],
  freeMealEnabled: boolean,
  paymentConfig: any,
  kidsEnabled: boolean,
  guestsEnabled: boolean = false,
  activeReportType?: ReportType,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = []
) {
  const activeDays = useMemo(() => getActiveDays(dayConfig), [dayConfig]);

  const sortedActiveDays = useMemo(() => {
    return [...activeDays].sort((a, b) => {
      const orderA = (dayConfig.find((d) => d.id === a) as any)?.order ?? 999;
      const orderB = (dayConfig.find((d) => d.id === b) as any)?.order ?? 999;
      return orderA - orderB;
    });
  }, [activeDays, dayConfig]);

  // 1. Day-Wise Report Calculation (Lazy targeted if activeReportType is DAY)
  const dayWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.DAY) return [];
    return sortedActiveDays.map((day) => {
      const totals = {
        veg: 0,
        nonVeg: 0,
        kidsVeg: 0,
        kidsNonVeg: 0,
        guestsVeg: 0,
        guestsNonVeg: 0,
        vegTaken: 0,
        nonVegTaken: 0,
        kidsVegTaken: 0,
        kidsNonVegTaken: 0,
        guestsVegTaken: 0,
        guestsNonVegTaken: 0,
        vegParcel: 0,
        nonVegParcel: 0,
        kidsVegParcel: 0,
        kidsNonVegParcel: 0,
        guestsVegParcel: 0,
        guestsNonVegParcel: 0,
        vegParcelTaken: 0,
        nonVegParcelTaken: 0,
        kidsVegParcelTaken: 0,
        kidsNonVegParcelTaken: 0,
        guestsVegParcelTaken: 0,
        guestsNonVegParcelTaken: 0,
        freeMealVeg: 0,
        freeMealNonVeg: 0,
        freeMealVegTaken: 0,
        freeMealNonVegTaken: 0,
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];
        const adultCount = sub.peopleCount || 0;
        const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
        const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

        slots.forEach((s: any, idx: number) => {
          if (!s) return;
          const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
          const isGuest = guestsEnabled && idx >= adultCount + kCount;

          [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
            if (!isMealEnabled(day, mType, dayConfig)) return;

            const choice = s[mType];
            if (choice === DietaryOption.NONE) return;

            const dayConf = (dayConfig || []).find(d => d.id === day);
            const mConf = dayConf ? dayConf[mType] : undefined;
            const diet = getDietTypeForChoice(choice, getMealVarieties(mConf));
            if (!diet || !isDietaryEnabled(day, mType, diet, dayConfig)) return;

            const tState = taken[idx] || {};
            const isTaken = !!tState[mType];
            const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
            const isParcelAllowed = isParcelOpted && (isGuest
              ? isGuestsParcelEnabled(day, mType, dayConfig, guestsEnabled)
              : isKid
              ? isKidsParcelEnabled(day, mType, dayConfig, kidsEnabled)
              : isParcelEnabled(day, mType, dayConfig));
            const isParcelTaken = !!tState[`${mType}Parcel` as keyof TakenState];

            if (diet === DietType.VEG) {
              if (isGuest) {
                totals.guestsVeg++;
                if (isTaken) totals.guestsVegTaken++;
                if (isParcelAllowed) {
                  totals.guestsVegParcel++;
                  if (isParcelTaken) totals.guestsVegParcelTaken++;
                }
              } else if (isKid) {
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
              if (isGuest) {
                totals.guestsNonVeg++;
                if (isTaken) totals.guestsNonVegTaken++;
                if (isParcelAllowed) {
                  totals.guestsNonVegParcel++;
                  if (isParcelTaken) totals.guestsNonVegParcelTaken++;
                }
              } else if (isKid) {
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
  }, [sortedActiveDays, subscriptions, foodMenu, dayConfig, kidsEnabled, guestsEnabled, activeReportType]);

  // 2. Meal-Wise Report Calculation (Lazy targeted if activeReportType is MEAL)
  const mealWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.MEAL && activeReportType !== ReportType.PARCEL && activeReportType !== ReportType.FREE_MEAL && activeReportType !== ReportType.DAY) return [];
    return sortedActiveDays.map((dayId) => {
      const mealsObj: any = {};

      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
        const stats = {
          veg: 0,
          nonVeg: 0,
          kidsVeg: 0,
          kidsNonVeg: 0,
          guestsVeg: 0,
          guestsNonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          kidsVegTaken: 0,
          kidsNonVegTaken: 0,
          guestsVegTaken: 0,
          guestsNonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          kidsVegParcel: 0,
          kidsNonVegParcel: 0,
          guestsVegParcel: 0,
          guestsNonVegParcel: 0,
          vegParcelTaken: 0,
          nonVegParcelTaken: 0,
          kidsVegParcelTaken: 0,
          kidsNonVegParcelTaken: 0,
          guestsVegParcelTaken: 0,
          guestsNonVegParcelTaken: 0,
          freeMealVeg: 0,
          freeMealNonVeg: 0,
          freeMealVegTaken: 0,
          freeMealNonVegTaken: 0,
        };

        if (isMealEnabled(dayId, mType, dayConfig)) {
          subscriptions.forEach((sub) => {
            const slots = sub.mealSlots[dayId] || [];
            const taken = sub.takenByPerson[dayId] || [];
            const adultCount = sub.peopleCount || 0;
            const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
            const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

            slots.forEach((s: any, idx: number) => {
              if (!s) return;
              const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
              const isGuest = guestsEnabled && idx >= adultCount + kCount;

              const choice = s[mType];
              if (choice === DietaryOption.NONE) return;

              const dayConf = (dayConfig || []).find(d => d.id === dayId);
              const mConf = dayConf ? dayConf[mType] : undefined;
              const diet = getDietTypeForChoice(choice, getMealVarieties(mConf));
              if (!diet || !isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

              const tState = taken[idx] || {};
              const isTaken = !!tState[mType];
              const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
              const isParcelAllowed = isParcelOpted && (isGuest
                ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
                : isKid
                ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
                : isParcelEnabled(dayId, mType, dayConfig));
              const isParcelTaken = !!tState[`${mType}Parcel` as keyof TakenState];

              if (diet === DietType.VEG) {
                if (isGuest) {
                  stats.guestsVeg++;
                  if (isTaken) stats.guestsVegTaken++;
                  if (isParcelAllowed) {
                    stats.guestsVegParcel++;
                    if (isParcelTaken) stats.guestsVegParcelTaken++;
                  }
                } else if (isKid) {
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
                if (isGuest) {
                  stats.guestsNonVeg++;
                  if (isTaken) stats.guestsNonVegTaken++;
                  if (isParcelAllowed) {
                    stats.guestsNonVegParcel++;
                    if (isParcelTaken) stats.guestsNonVegParcelTaken++;
                  }
                } else if (isKid) {
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

          const fmCounts = getMealFreeMealCounts(foodMenu[dayId]?.[mType], getMealVarieties(dayConfig.find(d => d.id === dayId)?.[mType]));
          stats.freeMealVeg += fmCounts.freeMealVeg;
          stats.freeMealNonVeg += fmCounts.freeMealNonVeg;
        }

        mealsObj[mType] = stats;
      });

      return { day: dayId, meals: mealsObj as Record<MealType, any> };
    });
  }, [sortedActiveDays, subscriptions, foodMenu, dayConfig, kidsEnabled, guestsEnabled, activeReportType]);

  // 3. Flat-Wise Report Calculation (Lazy targeted if activeReportType is FLAT)
  const flatWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.FLAT) return [];
    return subscriptions
      .map((sub) => {
        const dayStats: any[] = [];

        activeDays.forEach((dayId) => {
          const slots = sub.mealSlots[dayId] || [];
          const taken = sub.takenByPerson[dayId] || [];
          const adultCount = sub.peopleCount || 0;
          const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
          const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

          const meals: any[] = [];

          [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
            if (!isMealEnabled(dayId, mType, dayConfig)) return;

            const mealStat: any = {
              type: mType,
              veg: 0,
              nonVeg: 0,
              kidsVeg: 0,
              kidsNonVeg: 0,
              guestsVeg: 0,
              guestsNonVeg: 0,
              vegTaken: 0,
              nonVegTaken: 0,
              kidsVegTaken: 0,
              kidsNonVegTaken: 0,
              guestsVegTaken: 0,
              guestsNonVegTaken: 0,
              vegParcel: 0,
              nonVegParcel: 0,
              kidsVegParcel: 0,
              kidsNonVegParcel: 0,
              guestsVegParcel: 0,
              guestsNonVegParcel: 0,
              vegParcelTaken: 0,
              nonVegParcelTaken: 0,
              kidsVegParcelTaken: 0,
              kidsNonVegParcelTaken: 0,
              guestsVegParcelTaken: 0,
              guestsNonVegParcelTaken: 0,
            };

            slots.forEach((s: any, idx: number) => {
              if (!s) return;
              const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
              const isGuest = guestsEnabled && idx >= adultCount + kCount;
              const choice = s[mType];
              if (choice === DietaryOption.NONE) return;

              const dayConf = (dayConfig || []).find(d => d.id === dayId);
              const mConf = dayConf ? dayConf[mType] : undefined;
              const diet = getDietTypeForChoice(choice, getMealVarieties(mConf));
              if (!diet || !isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

              const tState = taken[idx] || {};
              const isTaken = !!tState[mType];
              const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
              const isParcelAllowed = isParcelOpted && (isGuest
                ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
                : isKid
                ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
                : isParcelEnabled(dayId, mType, dayConfig));
              const isParcelTaken = !!tState[`${mType}Parcel` as keyof TakenState];

              if (diet === DietType.VEG) {
                if (isGuest) {
                  mealStat.guestsVeg++;
                  if (isTaken) mealStat.guestsVegTaken++;
                  if (isParcelAllowed) {
                    mealStat.guestsVegParcel++;
                    if (isParcelTaken) mealStat.guestsVegParcelTaken++;
                  }
                } else if (isKid) {
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
                if (isGuest) {
                  mealStat.guestsNonVeg++;
                  if (isTaken) mealStat.guestsNonVegTaken++;
                  if (isParcelAllowed) {
                    mealStat.guestsNonVegParcel++;
                    if (isParcelTaken) mealStat.guestsNonVegParcelTaken++;
                  }
                } else if (isKid) {
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
          guests: sub.guestsCount || 0,
          amount: sub.amount || "0",
          dayStats,
        };
      })
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [activeDays, subscriptions, dayConfig, kidsEnabled, guestsEnabled, activeReportType]);

  // 4. Payment Summary Report Calculation (Lazy targeted if activeReportType is PAYMENT)
  const paymentData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.PAYMENT) {
      return { summary: [], details: [], totalFood: 0, totalAdultFood: 0, totalKidsFood: 0, totalGuestsFood: 0, totalParcel: 0, totalAdultParcel: 0, totalKidsParcel: 0, totalGuestsParcel: 0, discrepancies: [] };
    }
    const summary: Record<string, { count: number; total: number }> = {
      [PaymentMode.UPI]: { count: 0, total: 0 },
      [PaymentMode.CASH]: { count: 0, total: 0 },
      [PaymentMode.BANK_TRANSFER]: { count: 0, total: 0 },
    };

    let totalFood = 0;
    let totalAdultFood = 0;
    let totalKidsFood = 0;
    let totalGuestsFood = 0;
    let totalParcel = 0;
    let totalAdultParcel = 0;
    let totalKidsParcel = 0;
    let totalGuestsParcel = 0;

    const details = subscriptions
      .map((sub) => {
        const pList = sub.payments && sub.payments.length > 0
          ? sub.payments
          : [{ amount: sub.amount || "0", mode: sub.paymentMode || PaymentMode.CASH, transactionId: sub.transactionId }];

        pList.forEach((p: any) => {
          const amt = parseFloat(p.amount) || 0;
          const mode = p.mode || PaymentMode.CASH;
          if (summary[mode]) {
            summary[mode].count++;
            summary[mode].total += amt;
          }
        });

        let subAdultFood = 0;
        let subKidsFood = 0;
        let subGuestsFood = 0;
        let subAdultParcel = 0;
        let subKidsParcel = 0;
        let subGuestsParcel = 0;
        let subParcel = 0;

        const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
        const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;
        const totalPeople = (sub.peopleCount || 0) + kCount + gCount;

        for (let i = 0; i < totalPeople; i++) {
          const isKid = kidsEnabled && i >= sub.peopleCount && i < sub.peopleCount + kCount;
          const isGuest = guestsEnabled && i >= sub.peopleCount + kCount;
          const personPkg = (sub.appliedPackages as any)?.[i] || (sub.appliedPackages as any)?.[String(i)] || (sub.isPackageApplied && i === 0 ? (sub.appliedPackages as any)?.[0] || (sub.appliedPackages as any)?.[ "0" ] : undefined);

          const cost = calculatePersonMealAndParcelCost(
            i,
            sub.mealSlots || {},
            isKid,
            foodMenu,
            dayConfig,
            kidsEnabled,
            isGuest,
            guestsEnabled
          );

          if (isGuest) {
            subGuestsFood += cost.totalMealPrice;
            subGuestsParcel += cost.totalParcelPrice;
          } else if (isKid) {
            subKidsFood += cost.totalMealPrice;
            subKidsParcel += cost.totalParcelPrice;
          } else {
            subAdultFood += cost.totalMealPrice;
            subAdultParcel += cost.totalParcelPrice;
          }
          subParcel += cost.totalParcelPrice;
        }

        const subTotal = parseFloat(sub.amount) || 0;
        if (subTotal > 0) {
           const subParcelValue = subParcel;
           const attributedParcel = Math.min(subTotal, subParcelValue);
           const remainingAfterParcel = subTotal - attributedParcel;
           const calcMealTotal = subAdultFood + subKidsFood + subGuestsFood;

           let attributedAdultFood = 0;
           let attributedKidsFood = 0;
           let attributedGuestsFood = 0;

           if (calcMealTotal > 0) {
             const adultRatio = subAdultFood / calcMealTotal;
             const kidsRatio = subKidsFood / calcMealTotal;
             const guestsRatio = subGuestsFood / calcMealTotal;
             attributedAdultFood = remainingAfterParcel * adultRatio;
             attributedKidsFood = remainingAfterParcel * kidsRatio;
             attributedGuestsFood = remainingAfterParcel * guestsRatio;
           } else {
             attributedAdultFood = remainingAfterParcel;
           }

           let attributedAdultParcel = 0;
           let attributedKidsParcel = 0;
           let attributedGuestsParcel = 0;
           const calcParcelTotal = subAdultParcel + subKidsParcel + subGuestsParcel;

           if (calcParcelTotal > 0) {
             const adultParcelRatio = subAdultParcel / calcParcelTotal;
             const kidsParcelRatio = subKidsParcel / calcParcelTotal;
             const guestsParcelRatio = subGuestsParcel / calcParcelTotal;
             attributedAdultParcel = attributedParcel * adultParcelRatio;
             attributedKidsParcel = attributedParcel * kidsParcelRatio;
             attributedGuestsParcel = attributedParcel * guestsParcelRatio;
           } else {
             attributedAdultParcel = attributedParcel;
           }

           totalFood += attributedAdultFood + attributedKidsFood + attributedGuestsFood;
           totalAdultFood += attributedAdultFood;
           totalKidsFood += attributedKidsFood;
           totalGuestsFood += attributedGuestsFood;
           totalParcel += attributedAdultParcel + attributedKidsParcel + attributedGuestsParcel;
           totalAdultParcel += attributedAdultParcel;
           totalKidsParcel += attributedKidsParcel;
           totalGuestsParcel += attributedGuestsParcel;
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

    const discrepancies = getAmountDiscrepancyData(subscriptions, foodMenu, dayConfig, kidsEnabled, guestsEnabled, foodPackages);

    const detailedPayment = calculateDetailedPaymentReportData(
      subscriptions,
      foodMenu,
      dayConfig,
      kidsEnabled,
      guestsEnabled,
      foodPackages
    );

    return {
      summary: summaryList,
      details,
      totalFood,
      totalAdultFood,
      totalKidsFood,
      totalGuestsFood,
      totalParcel,
      totalAdultParcel,
      totalKidsParcel,
      totalGuestsParcel,
      discrepancies,
      ...detailedPayment,
    };
  }, [subscriptions, paymentConfig, dayConfig, foodMenu, kidsEnabled, guestsEnabled, activeReportType, foodPackages]);

  const getNotTakenData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];

        let vegNotTaken = 0, nonVegNotTaken = 0;

        slots.forEach((s: any, idx: number) => {
          if (!s) return;
          const choice = s[selectedMealType];
          if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return;
          if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

          const diet = getDietTypeForChoice(choice, varieties);
          if (!diet || !isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) return;

          const tState = taken[idx] || {};
          const isTaken = !!tState[selectedMealType];

          if (!isTaken) {
            if (diet === DietType.VEG) vegNotTaken++;
            else if (diet === DietType.NON_VEG) nonVegNotTaken++;
          }
        });

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          mobile: sub.mobile,
          vegNotTaken,
          nonVegNotTaken,
          count: vegNotTaken + nonVegNotTaken,
          veg: vegNotTaken,
          nonVeg: nonVegNotTaken,
          kids: sub.kidsCount || 0,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig]);

  const getMembersMealData = useCallback((selectedDayId: string, selectedMealType: MealType, personCategory: "all" | "adult" | "kids" | "guests" = "all") => {
    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    const list: any[] = [];

    subscriptions.forEach((sub) => {
      const slots = sub.mealSlots[selectedDayId] || [];
      const taken = sub.takenByPerson[selectedDayId] || [];
      const adultCount = sub.peopleCount || 0;
      const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
      const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

      let veg = 0, nonVeg = 0;
      let vegTaken = 0, nonVegTaken = 0;
      let vegParcel = 0, nonVegParcel = 0;
      let vegParcelTaken = 0, nonVegParcelTaken = 0;

      slots.forEach((s: any, idx: number) => {
        if (!s) return;
        const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
        const isGuest = guestsEnabled && idx >= adultCount + kCount;

        if (personCategory === "adult" && (isKid || isGuest)) return;
        if (personCategory === "kids" && !isKid) return;
        if (personCategory === "guests" && !isGuest) return;

        const choice = s[selectedMealType];
        if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return;
        if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

        const diet = getDietTypeForChoice(choice, varieties);
        if (!diet || !isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) return;

        const tState = taken[idx] || {};
        const isTaken = !!tState[selectedMealType];
        const isParcelOpted = toBool(s[`${selectedMealType}Parcel` as keyof typeof s]);
        const isParcelAllowed = isParcelOpted && (isGuest
          ? isGuestsParcelEnabled(selectedDayId, selectedMealType, dayConfig, guestsEnabled)
          : isKid
          ? isKidsParcelEnabled(selectedDayId, selectedMealType, dayConfig, kidsEnabled)
          : isParcelEnabled(selectedDayId, selectedMealType, dayConfig));
        const isParcelTaken = !!tState[`${selectedMealType}Parcel` as keyof TakenState];

        if (diet === DietType.VEG) {
          veg++;
          if (isTaken) vegTaken++;
          if (isParcelAllowed) {
            vegParcel++;
            if (isParcelTaken) vegParcelTaken++;
          }
        } else if (diet === DietType.NON_VEG) {
          nonVeg++;
          if (isTaken) nonVegTaken++;
          if (isParcelAllowed) {
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
          categoryLabel: personCategory === "guests" ? UI_TEXT.guests : (personCategory === "kids" ? UI_TEXT.kids : (personCategory === "adult" ? UI_TEXT.adults : undefined)),
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
  }, [subscriptions, dayConfig, kidsEnabled, guestsEnabled]);

  const getMissedParcelData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];
        const adultCount = sub.peopleCount || 0;
        const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
        const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

        let count = 0;

        slots.forEach((s: any, idx: number) => {
          if (!s) return;
          const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
          const isGuest = guestsEnabled && idx >= adultCount + kCount;

          const choice = s[selectedMealType];
          if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return;
          if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

          const isParcelOpted = toBool(s[`${selectedMealType}Parcel` as keyof typeof s]);
          const isParcelAllowed = isParcelOpted && (isGuest
            ? isGuestsParcelEnabled(selectedDayId, selectedMealType, dayConfig, guestsEnabled)
            : isKid
            ? isKidsParcelEnabled(selectedDayId, selectedMealType, dayConfig, kidsEnabled)
            : isParcelEnabled(selectedDayId, selectedMealType, dayConfig));

          if (isParcelAllowed) {
            const tState = taken[idx] || {};
            const isMealTaken = !!tState[selectedMealType];
            const isParcelTaken = !!tState[`${selectedMealType}Parcel` as keyof TakenState];

            if (isMealTaken && !isParcelTaken) {
              count++;
            }
          }
        });

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          mobile: sub.mobile,
          count,
          kids: sub.kidsCount || 0,
          guests: sub.guestsCount || 0,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled, guestsEnabled]);

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
