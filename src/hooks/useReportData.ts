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
  isSlotMissedParcel,
  getDayLabel,
  getMealLabel,
  isMealSlotAbsent,
  getVarietyForChoice,
  formatTimestamp,
} from "../constants";
import { getAmountDiscrepancyData, calculatePersonMealAndParcelCost, calculateDetailedPaymentReportData, resolvePrice, resolveGuestPrice } from "../utils/paymentUtils";

const parseRawTime = (rawTime: any): number | null => {
  if (!rawTime) return null;
  if (typeof rawTime === "number") return rawTime;
  const pNum = Number(rawTime);
  if (!isNaN(pNum) && pNum > 0) return pNum;

  const str = String(rawTime).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();

  // Handle formats like "12 Oct, 1:15 PM" which Hermes fails to parse natively on Android
  const fullMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (fullMatch) {
    const dayNum = parseInt(fullMatch[1], 10);
    const monthStr = fullMatch[2].toLowerCase();
    let hours = parseInt(fullMatch[3], 10);
    const minutes = parseInt(fullMatch[4], 10);
    const seconds = fullMatch[5] ? parseInt(fullMatch[5], 10) : 0;
    const ampm = fullMatch[6] ? fullMatch[6].toUpperCase() : null;

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const monthIndex = monthMap[monthStr.substring(0, 3)] ?? new Date().getMonth();

    const targetDate = new Date();
    targetDate.setMonth(monthIndex);
    targetDate.setDate(dayNum);
    targetDate.setHours(hours, minutes, seconds, 0);
    return targetDate.getTime();
  }

  // Fallback if only time is present
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    const today = new Date();
    today.setHours(hours, minutes, seconds, 0);
    return today.getTime();
  }

  return null;
};

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

        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
          if (!isMealEnabled(day, mType, dayConfig)) return;
          const fmCounts = getMealFreeMealCounts(foodMenu[day]?.[mType], getMealVarieties(dayConfig.find(d => d.id === day)?.[mType]));
          totals.freeMealVeg += fmCounts.freeMealVeg;
          totals.freeMealNonVeg += fmCounts.freeMealNonVeg;
          totals.freeMealVegTaken += fmCounts.freeMealVegTaken + fmCounts.freeMealVegParcelTaken;
          totals.freeMealNonVegTaken += fmCounts.freeMealNonVegTaken + fmCounts.freeMealNonVegParcelTaken;
          (totals as any).freeMealVegParcelTaken = ((totals as any).freeMealVegParcelTaken || 0) + fmCounts.freeMealVegParcelTaken;
          (totals as any).freeMealNonVegParcelTaken = ((totals as any).freeMealNonVegParcelTaken || 0) + fmCounts.freeMealNonVegParcelTaken;
        });
      });

      return { dayId: day, totals };
    });
  }, [sortedActiveDays, subscriptions, foodMenu, dayConfig, kidsEnabled, guestsEnabled, activeReportType]);

  // 2. Meal-Wise Report Calculation (Lazy targeted if activeReportType is MEAL)
  const mealWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.MEAL && activeReportType !== ReportType.PARCEL && activeReportType !== ReportType.VENDOR_PRICE && activeReportType !== ReportType.DAY) return [];
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
              const isAbsent = isMealSlotAbsent(tState, mType);
              const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
              const isParcelAllowed = isParcelOpted && (isGuest
                ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
                : isKid
                ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
                : isParcelEnabled(dayId, mType, dayConfig));

              if (isAbsent) {
                if (isGuest) stats.guestsVegTaken = stats.guestsVegTaken; // noop, count absent separately if needed
                return; // Absent meals/parcels are excluded from planned & served counts
              }

              const isTaken = !!tState[mType];
              const isParcelTaken = !isAbsent && !!tState[`${mType}Parcel` as keyof TakenState];

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
          stats.freeMealVegTaken += fmCounts.freeMealVegTaken + fmCounts.freeMealVegParcelTaken;
          stats.freeMealNonVegTaken += fmCounts.freeMealNonVegTaken + fmCounts.freeMealNonVegParcelTaken;
          (stats as any).freeMealVegParcelTaken = fmCounts.freeMealVegParcelTaken;
          (stats as any).freeMealNonVegParcelTaken = fmCounts.freeMealNonVegParcelTaken;
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
    const summary: Record<string, { count: number; total: number; passesCount: number }> = {
      [PaymentMode.UPI]: { count: 0, total: 0, passesCount: 0 },
      [PaymentMode.CASH]: { count: 0, total: 0, passesCount: 0 },
      [PaymentMode.BANK_TRANSFER]: { count: 0, total: 0, passesCount: 0 },
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

        const usedModesInPass = new Set<string>();

        pList.forEach((p: any) => {
          const amt = parseFloat(p.amount) || 0;
          const mode = p.mode || PaymentMode.CASH;
          if (!summary[mode]) {
            summary[mode] = { count: 0, total: 0, passesCount: 0 };
          }
          summary[mode].count++;
          summary[mode].total += amt;
          if (amt > 0) {
            usedModesInPass.add(mode);
          }
        });

        usedModesInPass.forEach((m) => {
          if (summary[m]) {
            summary[m].passesCount++;
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
        const adultCount = sub.peopleCount || 0;
        const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
        const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

        let vegNotTaken = 0, nonVegNotTaken = 0;
        let adultsNotTaken = 0, kidsNotTaken = 0, guestsNotTaken = 0;
        let totalSubscribed = 0;
        let totalTaken = 0;

        slots.forEach((s: any, idx: number) => {
          if (!s) return;
          const choice = s[selectedMealType];
          if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return;
          if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

          const diet = getDietTypeForChoice(choice, varieties);
          if (!diet || !isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) return;

          totalSubscribed++;
          const tState = taken[idx] || {};
          const isTaken = !!tState[selectedMealType];

          if (isTaken) {
            totalTaken++;
          } else {
            if (diet === DietType.VEG) vegNotTaken++;
            else if (diet === DietType.NON_VEG) nonVegNotTaken++;

            const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
            const isGuest = guestsEnabled && idx >= adultCount + kCount;

            if (isGuest) {
              guestsNotTaken++;
            } else if (isKid) {
              kidsNotTaken++;
            } else {
              adultsNotTaken++;
            }
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
          adults: adultsNotTaken,
          kids: kidsNotTaken,
          guests: guestsNotTaken,
          totalSubscribed,
          totalTaken,
          isFullyMissed: totalTaken === 0,
          isPartial: totalTaken > 0 && totalTaken < totalSubscribed,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled, guestsEnabled, foodMenu]);

  const getMembersMealData = useCallback((selectedDayId: string, selectedMealType: MealType, personCategory: "all" | "adult" | "kids" | "guests" | "freeMeal" = "all") => {
    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    const list: any[] = [];

    if (personCategory === "freeMeal" && freeMealEnabled) {
      const mealMenu = foodMenu[selectedDayId]?.[selectedMealType];
      const fmCounts = getMealFreeMealCounts(mealMenu, varieties, selectedDayId, selectedMealType, dayConfig);

      const fVeg = fmCounts.freeMealVeg;
      const fNonVeg = fmCounts.freeMealNonVeg;
      const fVegTaken = fmCounts.freeMealVegTaken;
      const fNonVegTaken = fmCounts.freeMealNonVegTaken;
      const fVegParcel = fmCounts.freeMealVegParcelTaken;
      const fNonVegParcel = fmCounts.freeMealNonVegParcelTaken;
      const fTotal = fVeg + fNonVeg;

      if (fTotal > 0 || fVegTaken > 0 || fNonVegTaken > 0) {
        list.push({
          id: "free_meal_summary",
          block: "",
          flat: UI_TEXT.freeMeals,
          categoryLabel: UI_TEXT.freeMeal,
          isFreeMeal: true,
          veg: fVeg,
          nonVeg: fNonVeg,
          vegTaken: fVegTaken,
          nonVegTaken: fNonVegTaken,
          vegParcel: fVegParcel,
          nonVegParcel: fNonVegParcel,
          vegParcelTaken: fVegParcel,
          nonVegParcelTaken: fNonVegParcel,
          total: fTotal,
        });
      }
      return list;
    }

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

    if (personCategory === "all" && freeMealEnabled) {
      const mealMenu = foodMenu[selectedDayId]?.[selectedMealType];
      const fmCounts = getMealFreeMealCounts(mealMenu, varieties, selectedDayId, selectedMealType, dayConfig);

      const fVeg = fmCounts.freeMealVeg;
      const fNonVeg = fmCounts.freeMealNonVeg;
      const fVegTaken = fmCounts.freeMealVegTaken;
      const fNonVegTaken = fmCounts.freeMealNonVegTaken;
      const fVegParcel = fmCounts.freeMealVegParcelTaken;
      const fNonVegParcel = fmCounts.freeMealNonVegParcelTaken;
      const fTotal = fVeg + fNonVeg;

      if (fTotal > 0 || fVegTaken > 0 || fNonVegTaken > 0) {
        list.push({
          id: "free_meal_summary",
          block: "",
          flat: UI_TEXT.freeMeals,
          categoryLabel: UI_TEXT.freeMeal,
          isFreeMeal: true,
          veg: fVeg,
          nonVeg: fNonVeg,
          vegTaken: fVegTaken,
          nonVegTaken: fNonVegTaken,
          vegParcel: fVegParcel,
          nonVegParcel: fNonVegParcel,
          vegParcelTaken: fVegParcel,
          nonVegParcelTaken: fNonVegParcel,
          total: fTotal,
        });
      }
    }

    return list.sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled, guestsEnabled, freeMealEnabled, foodMenu]);

  const getMissedParcelData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];
        const adultCount = sub.peopleCount || 0;
        const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
        const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

        let count = 0;
        let vegCount = 0;
        let nonVegCount = 0;
        let savedParcelCost = 0;

        slots.forEach((s: any, idx: number) => {
          if (isSlotMissedParcel(s, taken[idx], selectedDayId, selectedMealType, idx, adultCount, kCount, gCount, dayConfig, kidsEnabled, guestsEnabled)) {
            count++;
            const choice = s[selectedMealType];
            const diet = getDietTypeForChoice(choice, varieties);
            const isVeg = diet === DietType.VEG;
            if (isVeg) {
              vegCount++;
            } else if (diet === DietType.NON_VEG) {
              nonVegCount++;
            }

            const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
            const isGuest = guestsEnabled && idx >= adultCount + kCount;

            let pPrice = 0;
            if (isVeg) {
              const adultP = foodMenu?.[selectedDayId]?.[selectedMealType]?.vegParcelPrice ?? mConf?.vegParcelPrice;
              const kidsP = foodMenu?.[selectedDayId]?.[selectedMealType]?.kidsVegParcelPrice;
              const guestsP = foodMenu?.[selectedDayId]?.[selectedMealType]?.guestsVegParcelPrice;
              pPrice = isGuest
                ? resolveGuestPrice(guestsP, adultP, undefined)
                : resolvePrice(isKid, kidsP, adultP, undefined);
            } else {
              const adultP = foodMenu?.[selectedDayId]?.[selectedMealType]?.nonVegParcelPrice ?? mConf?.nonVegParcelPrice;
              const kidsP = foodMenu?.[selectedDayId]?.[selectedMealType]?.kidsNonVegParcelPrice;
              const guestsP = foodMenu?.[selectedDayId]?.[selectedMealType]?.guestsNonVegParcelPrice;
              pPrice = isGuest
                ? resolveGuestPrice(guestsP, adultP, undefined)
                : resolvePrice(isKid, kidsP, adultP, undefined);
            }
            savedParcelCost += (Number(pPrice) || 0);
          }
        });

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          mobile: sub.mobile,
          count,
          vegCount,
          nonVegCount,
          savedParcelCost,
          kids: sub.kidsCount || 0,
          guests: sub.guestsCount || 0,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled, guestsEnabled, foodMenu]);

  const getCheckoutReportData = useCallback((selectedDayId: string, selectedMealType: MealType, selectedCheckoutUser?: string) => {
    if (!selectedDayId || !selectedMealType) {
      let missedCount = 0;
      let partialCount = 0;
      let completeCount = 0;
      let earliestTime: number | null = null;
      let latestTime: number | null = null;
      let adultsCheckedOut = 0;
      let kidsCheckedOut = 0;
      let guestsCheckedOut = 0;
      let dineInCheckedOut = 0;
      let parcelsCheckedOut = 0;
      const userCheckoutCounts: Record<string, number> = {};

      const list = subscriptions.map((sub) => {
        let totalSlots = 0;
        let totalTakenSlots = 0;
        const passCheckouts: any[] = [];

        activeDays.forEach((dayId) => {
          const dayConf = (dayConfig || []).find(d => d.id === dayId);
          if (!dayConf || !dayConf.enabled) return;
          const slots = sub.mealSlots?.[dayId] || [];
          const taken = sub.takenByPerson?.[dayId] || [];
          const adultCount = sub.peopleCount || 0;
          const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
          const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;
          const totalPeople = adultCount + kCount + gCount;

          for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
            if (!isMealEnabled(dayId, mType, dayConfig)) continue;
            const mConf = dayConf[mType];
            const varieties = getMealVarieties(mConf);

            for (let idx = 0; idx < totalPeople; idx++) {
              const s = slots[idx];
              if (!s) continue;
              const choice = s[mType];
              const diet = getDietTypeForChoice(choice, varieties);
              if (!diet || choice === DietaryOption.NONE || !isDietaryEnabled(dayId, mType, diet, dayConfig)) continue;

              const tState = taken[idx] || {};
              const isAbsent = isMealSlotAbsent(tState as TakenState, mType);

              let actualServiceType: string | undefined;
              let timeDisplay = "-";
              let numericTime: number | null = null;
              let isTaken = false;
              let userStr: string | undefined;

              const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
              const isGuest = guestsEnabled && idx >= adultCount + kCount;
              const category = isGuest ? UI_TEXT.guest : isKid ? UI_TEXT.kid : UI_TEXT.adult;
              const memberNum = isGuest ? idx - adultCount - kCount + 1 : isKid ? idx - adultCount + 1 : idx + 1;
              const label = `${getDayLabel(dayId, dayConfig)} ${getMealLabel(mType)} • ${category} ${memberNum}`;

              if (isAbsent) {
                actualServiceType = UI_TEXT.absent;
                const rawAbsTime = tState[`${mType}AbsentTime` as keyof TakenState];
                const rawAbsUser = tState[`${mType}AbsentUser` as keyof TakenState];
                timeDisplay = rawAbsTime ? (typeof rawAbsTime === "number" ? formatTimestamp(rawAbsTime) : String(rawAbsTime)) : UI_TEXT.absent;
                userStr = rawAbsUser && typeof rawAbsUser === "string" && !/^\d{10,}$/.test(rawAbsUser.trim()) ? rawAbsUser.trim() : undefined;
              } else {
                totalSlots++;
                const isParcelAllowed = !!(s as any)[`${mType}Parcel`];
                const isParcelTaken = !!tState[`${mType}Parcel` as keyof TakenState];
                const isDineInTaken = !!tState[mType];
                const rawTime = tState[`${mType}Time` as keyof TakenState] || tState[`${mType}ParcelTime` as keyof TakenState];
                const rawUser = isParcelTaken
                  ? (tState[`${mType}ParcelUser` as keyof TakenState] || tState[`${mType}User` as keyof TakenState])
                  : (tState[`${mType}User` as keyof TakenState] || tState[`${mType}ParcelUser` as keyof TakenState]);
                userStr = rawUser && typeof rawUser === "string" && !/^\d{10,}$/.test(rawUser.trim()) ? rawUser.trim() : undefined;

                const isTakenRaw = isDineInTaken || isParcelTaken;
                const userMatch = !selectedCheckoutUser || (userStr && userStr.toLowerCase().trim() === selectedCheckoutUser.toLowerCase().trim());
                isTaken = Boolean(isTakenRaw && userMatch);

                actualServiceType = isParcelTaken
                  ? UI_TEXT.parcel
                  : isDineInTaken
                  ? (isParcelAllowed ? UI_TEXT.optedDineIn : UI_TEXT.dineIn)
                  : undefined;

                if (isTaken) {
                  totalTakenSlots++;
                  if (isParcelTaken) parcelsCheckedOut++;
                  else dineInCheckedOut++;
                  if (isGuest) guestsCheckedOut++;
                  else if (isKid) kidsCheckedOut++;
                  else adultsCheckedOut++;

                  const finalUser = userStr || "admin";
                  userCheckoutCounts[finalUser] = (userCheckoutCounts[finalUser] || 0) + 1;

                  if (rawTime && typeof rawTime !== "boolean") {
                    timeDisplay = String(rawTime);
                    numericTime = parseRawTime(rawTime);
                    if (numericTime !== null) {
                      if (earliestTime === null || numericTime < earliestTime) earliestTime = numericTime;
                      if (latestTime === null || numericTime > latestTime) latestTime = numericTime;
                    }
                  }
                }
              }

              if (!selectedCheckoutUser || isTaken || isAbsent) {
                passCheckouts.push({
                  label,
                  isTaken,
                  isAbsent,
                  actualServiceType,
                  timeDisplay,
                  numericTime,
                  userName: userStr,
                });
              }
            }
          }
        });

        if (totalSlots === 0) return null;
        if (selectedCheckoutUser && totalTakenSlots === 0) return null;

        const isMissed = totalTakenSlots === 0;
        const isComplete = totalTakenSlots >= totalSlots;

        if (isMissed) missedCount++;
        else if (isComplete) completeCount++;
        else partialCount++;

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          mobile: sub.mobile,
          isMissed,
          isComplete,
          takenCount: totalTakenSlots,
          subscribedCount: totalSlots,
          memberCheckouts: passCheckouts,
        };
      }).filter(Boolean) as any[];

      return {
        passes: list.sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' })),
        summary: {
          totalPassesForMeal: subscriptions.length,
          missedCount,
          partialCount,
          completeCount,
          earliestTime,
          latestTime,
          adultsCheckedOut,
          kidsCheckedOut,
          guestsCheckedOut,
          dineInCheckedOut,
          parcelsCheckedOut,
          totalMembersCheckedOut: adultsCheckedOut + kidsCheckedOut + guestsCheckedOut,
          userCheckoutCounts,
        }
      };
    }

    const dayConf = (dayConfig || []).find(d => d.id === selectedDayId);
    const mConf = dayConf ? dayConf[selectedMealType] : undefined;
    const varieties = getMealVarieties(mConf);

    let totalSubscribedPasses = 0;
    let missedCount = 0;
    let partialCount = 0;
    let completeCount = 0;
    let earliestTime: number | null = null;
    let latestTime: number | null = null;

    let adultsCheckedOut = 0;
    let kidsCheckedOut = 0;
    let guestsCheckedOut = 0;
    let dineInCheckedOut = 0;
    let parcelsCheckedOut = 0;

    const list = subscriptions.map((sub) => {
      const slots = sub.mealSlots[selectedDayId] || [];
      const taken = sub.takenByPerson[selectedDayId] || [];
      const adultCount = sub.peopleCount || 0;
      const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
      const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;
      const totalPeople = adultCount + kCount + gCount;

      let subscribedCount = 0;
      let takenCount = 0;
      const memberCheckouts: { label: string; isTaken: boolean; isAbsent?: boolean; actualServiceType?: string; timeDisplay: string; numericTime?: number | null; userName?: string }[] = [];

      for (let idx = 0; idx < totalPeople; idx++) {
        const s = slots[idx];
        if (!s) continue;
        const choice = s[selectedMealType];
        const diet = getDietTypeForChoice(choice, varieties);
        if (!diet || choice === DietaryOption.NONE || !isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) continue;

        const tState = taken[idx] || {};
        const isAbsent = isMealSlotAbsent(tState as TakenState, selectedMealType);

        let actualServiceType: string | undefined;
        let timeDisplay = "-";
        let numericTime: number | null = null;
        let isTaken = false;
        let userStr: string | undefined;

        const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
        const isGuest = guestsEnabled && idx >= adultCount + kCount;
        const category = isGuest ? UI_TEXT.guest : isKid ? UI_TEXT.kid : UI_TEXT.adult;
        const memberNum = isGuest ? idx - adultCount - kCount + 1 : isKid ? idx - adultCount + 1 : idx + 1;
        const label = `${category} ${memberNum}`;

        if (isAbsent) {
          actualServiceType = UI_TEXT.absent;
          const rawAbsTime = tState[`${selectedMealType}AbsentTime` as keyof TakenState];
          const rawAbsUser = tState[`${selectedMealType}AbsentUser` as keyof TakenState];
          timeDisplay = rawAbsTime ? (typeof rawAbsTime === "number" ? formatTimestamp(rawAbsTime) : String(rawAbsTime)) : UI_TEXT.absent;
          userStr = rawAbsUser && typeof rawAbsUser === "string" && !/^\d{10,}$/.test(rawAbsUser.trim()) ? rawAbsUser.trim() : undefined;
        } else {
          subscribedCount++;
          const isParcelAllowed = !!(s as any)[`${selectedMealType}Parcel`];
          const isParcelTaken = !!tState[`${selectedMealType}Parcel` as keyof TakenState];
          const isDineInTaken = !!tState[selectedMealType];
          const rawTime = tState[`${selectedMealType}Time` as keyof TakenState] || tState[`${selectedMealType}ParcelTime` as keyof TakenState];
          const rawUser = isParcelTaken
            ? (tState[`${selectedMealType}ParcelUser` as keyof TakenState] || tState[`${selectedMealType}User` as keyof TakenState])
            : (tState[`${selectedMealType}User` as keyof TakenState] || tState[`${selectedMealType}ParcelUser` as keyof TakenState]);
          userStr = rawUser && typeof rawUser === "string" && !/^\d{10,}$/.test(rawUser.trim()) ? rawUser.trim() : undefined;

          const isTakenRaw = isDineInTaken || isParcelTaken;
          const userMatch = !selectedCheckoutUser || (userStr && userStr.toLowerCase().trim() === selectedCheckoutUser.toLowerCase().trim());
          isTaken = Boolean(isTakenRaw && userMatch);

          actualServiceType = isParcelTaken
            ? UI_TEXT.parcel
            : isDineInTaken
            ? (isParcelAllowed ? UI_TEXT.optedDineIn : UI_TEXT.dineIn)
            : undefined;

          if (isTaken) {
            takenCount++;
            if (isGuest) guestsCheckedOut++;
            else if (isKid) kidsCheckedOut++;
            else adultsCheckedOut++;

            if (isParcelTaken) {
              parcelsCheckedOut++;
            } else {
              dineInCheckedOut++;
            }

            if (rawTime) {
              timeDisplay = String(rawTime);
              numericTime = parseRawTime(rawTime);
            } else {
              timeDisplay = "Checked In";
            }

            if (numericTime !== null) {
              if (earliestTime === null || numericTime < earliestTime) earliestTime = numericTime;
              if (latestTime === null || numericTime > latestTime) latestTime = numericTime;
            }
          }
        }

        if (!selectedCheckoutUser || isTaken || isAbsent) {
          memberCheckouts.push({
            label,
            isTaken,
            isAbsent,
            actualServiceType,
            timeDisplay,
            numericTime,
            userName: userStr,
          });
        }
      }

      if (subscribedCount === 0) return null;
      if (selectedCheckoutUser && takenCount === 0) return null;
      totalSubscribedPasses++;

      const isMissed = takenCount === 0;
      const isComplete = takenCount >= subscribedCount;

      if (isMissed) missedCount++;
      else if (isComplete) completeCount++;
      else partialCount++;

      return {
        id: sub.id,
        block: sub.block,
        flat: sub.flat,
        mobile: sub.mobile,
        isMissed,
        isComplete,
        takenCount,
        subscribedCount,
        memberCheckouts,
      };
    }).filter(Boolean) as any[];

    return {
      passes: list.sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' })),
      summary: {
        totalPassesForMeal: totalSubscribedPasses,
        missedCount,
        partialCount,
        completeCount,
        earliestTime,
        latestTime,
        adultsCheckedOut,
        kidsCheckedOut,
        guestsCheckedOut,
        dineInCheckedOut,
        parcelsCheckedOut,
        totalMembersCheckedOut: adultsCheckedOut + kidsCheckedOut + guestsCheckedOut,
      },
    };
  }, [subscriptions, dayConfig, kidsEnabled, guestsEnabled]);

  const packagePassesData = useMemo(() => {
    return subscriptions.filter(
      (sub) => sub.isPackageApplied || (sub.appliedPackages && Object.keys(sub.appliedPackages).length > 0)
    );
  }, [subscriptions]);

  const absentReportData = useMemo(() => {
    let totalAbsentMeals = 0;
    let totalAbsentParcels = 0;
    let absentAdults = 0;
    let absentKids = 0;
    let absentGuests = 0;

    const dayBreakdowns = sortedActiveDays.map((dayId) => {
      const dayLabel = getDayLabel(dayId, dayConfig);
      const meals: any[] = [];

      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
        if (!isMealEnabled(dayId, mType, dayConfig)) return;

        const mLabel = getMealLabel(mType);
        let mAdults = 0;
        let mKids = 0;
        let mGuests = 0;
        let mMeals = 0;
        let mParcels = 0;
        const passes: any[] = [];

        subscriptions.forEach((sub) => {
          const slots = sub.mealSlots[dayId] || [];
          const takenList = sub.takenByPerson[dayId] || [];
          const adultCount = sub.peopleCount || 0;
          const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
          const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;

          slots.forEach((s: any, idx: number) => {
            if (!s) return;
            const choice = s[mType];
            if (!choice || choice === DietaryOption.NONE) return;

            const tState = takenList[idx] || {};
            if (!isMealSlotAbsent(tState, mType)) return;

            const isKid = kidsEnabled && idx >= adultCount && idx < adultCount + kCount;
            const isGuest = guestsEnabled && idx >= adultCount + kCount;

            if (isGuest) { mGuests++; absentGuests++; }
            else if (isKid) { mKids++; absentKids++; }
            else { mAdults++; absentAdults++; }

            mMeals++;
            totalAbsentMeals++;

            const isParcelOpted = toBool(s[`${mType}Parcel` as keyof typeof s]);
            const isParcelAllowed = isParcelOpted && (isGuest
              ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
              : isKid
              ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
              : isParcelEnabled(dayId, mType, dayConfig));

            if (isParcelAllowed) {
              mParcels++;
              totalAbsentParcels++;
            }

            const memberRole = isGuest ? `Guest ${idx - adultCount - kCount + 1}` : isKid ? `Kid ${idx - adultCount + 1}` : `Adult ${idx + 1}`;
            const dayConf = (dayConfig || []).find(d => d.id === dayId);
            const mConf = dayConf ? dayConf[mType] : undefined;
            const varieties = getMealVarieties(mConf);
            const variety = getVarietyForChoice(choice, varieties);
            const varietyName = variety?.name || (choice === DietaryOption.NON_VEG ? UI_TEXT.nonVeg : UI_TEXT.veg);

            const absentTime = tState[`${mType}AbsentTime` as keyof TakenState] || undefined;
            const absentUser = tState[`${mType}AbsentUser` as keyof TakenState] || undefined;

            passes.push({
              passId: sub.id,
              block: sub.block,
              flat: sub.flat,
              memberRole,
              memberIndex: idx,
              mealType: mType,
              varietyName,
              hasParcel: isParcelAllowed,
              absentTime,
              absentUser,
            });
          });
        });

        if (mMeals > 0) {
          meals.push({
            mealType: mType,
            mealLabel: mLabel,
            mAdults,
            mKids,
            mGuests,
            mMeals,
            mParcels,
            passes,
          });
        }
      });

      return {
        dayId,
        dayLabel,
        meals,
      };
    }).filter(d => d.meals.length > 0);

    return {
      totalAbsentMeals,
      totalAbsentParcels,
      absentAdults,
      absentKids,
      absentGuests,
      dayBreakdowns,
    };
  }, [sortedActiveDays, subscriptions, dayConfig, kidsEnabled, guestsEnabled]);

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
    getCheckoutReportData,
    packagePassesData,
    absentReportData,
  };
}
