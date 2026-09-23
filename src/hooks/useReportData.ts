import { useMemo, useCallback } from "react";
import {
  Subscription,
  FoodMenu,
  ConfigDay,
  MealType,
  DietType,
  DietaryOption,
  PaymentMode,
  PaymentEntry,
  TakenState,
  ReportType
} from "../types";
import {
  getActiveDays,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isMealCurrent
} from "../constants";

export function useReportData(
  subscriptions: Subscription[],
  foodMenu: FoodMenu,
  dayConfig: ConfigDay[],
  guestEnabled: boolean,
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
        guestVeg: 0,
        guestNonVeg: 0,
        guestVegTaken: 0,
        guestNonVegTaken: 0,
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

            const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (!isDietaryEnabled(day, type, diet, dayConfig)) return;

            const isVeg = choice === DietaryOption.VEG;
            const hasTaken = taken[idx]?.[type] || taken[idx]?.[`${type}Parcel` as keyof typeof s];

            if (isVeg) {
              if (isKid) totals.kidsVeg += 1;
              else totals.veg += 1;
              if (hasTaken) {
                if (isKid) totals.kidsVegTaken += 1;
                else totals.vegTaken += 1;
              }
            } else {
              if (isKid) totals.kidsNonVeg += 1;
              else totals.nonVeg += 1;
              if (hasTaken) {
                if (isKid) totals.kidsNonVegTaken += 1;
                else totals.nonVegTaken += 1;
              }
            }

            if (isParcelEnabled(day, type, dayConfig) && s[`${type}Parcel` as keyof typeof s]) {
              const parcelTakenKey = `${type}Parcel` as keyof TakenState;
              const isP_Taken = !!taken[idx]?.[parcelTakenKey];

              if (isVeg) {
                if (isKid) {
                  totals.kidsVegParcel += 1;
                  if (isP_Taken) totals.kidsVegParcelTaken += 1;
                } else {
                  totals.vegParcel += 1;
                  if (isP_Taken) totals.vegParcelTaken += 1;
                }
              } else {
                if (isKid) {
                  totals.kidsNonVegParcel += 1;
                  if (isP_Taken) totals.kidsNonVegParcelTaken += 1;
                } else {
                  totals.nonVegParcel += 1;
                  if (isP_Taken) totals.nonVegParcelTaken += 1;
                }
              }
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
  }, [subscriptions, foodMenu, dayConfig, guestEnabled, sortedActiveDays, kidsEnabled, activeReportType]);

  // 2. Meal-Wise Report Calculation (Lazy targeted if activeReportType is MEAL, PARCEL, or SINGLE)
  const mealWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.MEAL && activeReportType !== ReportType.PARCEL && activeReportType !== ReportType.SINGLE) {
      return [];
    }
    return sortedActiveDays.map((day) => {
      const meals = {
        [MealType.BREAKFAST]: {
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
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
        [MealType.LUNCH]: {
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
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
        [MealType.DINNER]: {
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
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];
        const adultCount = sub.peopleCount;

        slots.forEach((s, idx) => {
          const t = taken[idx];
          if (!s) return;
          const isKid = kidsEnabled && idx >= adultCount;

          [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mKey) => {
            const choice = s[mKey];
            if (choice === DietaryOption.NONE) return;
            if (!isMealEnabled(day, mKey, dayConfig)) return;

            const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
            if (!isDietaryEnabled(day, mKey, diet, dayConfig)) return;

            const isVeg = choice === DietaryOption.VEG;
            const isTaken = t?.[mKey] || t?.[`${mKey}Parcel` as keyof typeof s];

            if (isVeg) {
              if (isKid) meals[mKey].kidsVeg += 1;
              else meals[mKey].veg += 1;
              if (isTaken) {
                if (isKid) meals[mKey].kidsVegTaken += 1;
                else meals[mKey].vegTaken += 1;
              }
            } else {
              if (isKid) meals[mKey].kidsNonVeg += 1;
              else meals[mKey].nonVeg += 1;
              if (isTaken) {
                if (isKid) meals[mKey].kidsNonVegTaken += 1;
                else meals[mKey].nonVegTaken += 1;
              }
            }
            if (
              isParcelEnabled(day, mKey, dayConfig) &&
              s[`${mKey}Parcel` as keyof typeof s]
            ) {
              const parcelTakenKey = `${mKey}Parcel` as keyof TakenState;
              const isP_Taken = !!t?.[parcelTakenKey];

              if (isVeg) {
                if (isKid) {
                  meals[mKey].kidsVegParcel += 1;
                  if (isP_Taken) meals[mKey].kidsVegParcelTaken += 1;
                } else {
                  meals[mKey].vegParcel += 1;
                  if (isP_Taken) meals[mKey].vegParcelTaken += 1;
                }
              } else {
                if (isKid) {
                  meals[mKey].kidsNonVegParcel += 1;
                  if (isP_Taken) meals[mKey].kidsNonVegParcelTaken += 1;
                } else {
                  meals[mKey].nonVegParcel += 1;
                  if (isP_Taken) meals[mKey].nonVegParcelTaken += 1;
                }
              }
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
  }, [subscriptions, foodMenu, dayConfig, guestEnabled, sortedActiveDays, kidsEnabled, activeReportType]);

  // 3. Flat-Wise Report Calculation (Lazy targeted if activeReportType is FLAT)
  const flatWiseData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.FLAT) {
      return [];
    }
    return subscriptions
      .map((sub) => {
        const dayStats = activeDays
          .map((day) => {
            const slots = sub.mealSlots[day] || [];
            const taken = sub.takenByPerson[day] || [];

            const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
              .filter((m) => isMealEnabled(day, m, dayConfig))
              .map((m) => {
                let veg = 0, nonVeg = 0, kidsVeg = 0, kidsNonVeg = 0;
                let vegTaken = 0, nonVegTaken = 0, kidsVegTaken = 0, kidsNonVegTaken = 0;
                let vegParcel = 0, nonVegParcel = 0, kidsVegParcel = 0, kidsNonVegParcel = 0;
                let vegParcelTaken = 0, nonVegParcelTaken = 0, kidsVegParcelTaken = 0, kidsNonVegParcelTaken = 0;

                const adultCount = sub.peopleCount;
                slots.forEach((s, idx) => {
                  const choice = s[m];
                  if (choice === DietaryOption.NONE) return;
                  if (!isMealEnabled(day, m, dayConfig)) return;

                  const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
                  if (!isDietaryEnabled(day, m, diet, dayConfig)) return;

                  const t = taken[idx];
                  const isTaken = !!t?.[m] || !!t?.[`${m}Parcel` as keyof typeof s];
                  const isParcel = isParcelEnabled(day, m, dayConfig) && !!s[`${m}Parcel` as keyof typeof s];
                  const isPTaken = isParcel && !!t?.[`${m}Parcel` as keyof TakenState];
                  const isKid = kidsEnabled && idx >= adultCount;

                  if (choice === DietaryOption.VEG) {
                    if (isKid) {
                      kidsVeg++;
                      if (isTaken) kidsVegTaken++;
                      if (isParcel) {
                        kidsVegParcel++;
                        if (isPTaken) kidsVegParcelTaken++;
                      }
                    } else {
                      veg++;
                      if (isTaken) vegTaken++;
                      if (isParcel) {
                        vegParcel++;
                        if (isPTaken) vegParcelTaken++;
                      }
                    }
                  } else {
                    if (isKid) {
                      kidsNonVeg++;
                      if (isTaken) kidsNonVegTaken++;
                      if (isParcel) {
                        kidsNonVegParcel++;
                        if (isPTaken) kidsNonVegParcelTaken++;
                      }
                    } else {
                      nonVeg++;
                      if (isTaken) nonVegTaken++;
                      if (isParcel) {
                        nonVegParcel++;
                        if (isPTaken) nonVegParcelTaken++;
                      }
                    }
                  }
                });

                return {
                  type: m, veg, nonVeg, kidsVeg, kidsNonVeg,
                  vegTaken, nonVegTaken, kidsVegTaken, kidsNonVegTaken,
                  vegParcel, nonVegParcel, kidsVegParcel, kidsNonVegParcel,
                  vegParcelTaken, nonVegParcelTaken, kidsVegParcelTaken, kidsNonVegParcelTaken
                };
              })
              .filter((m) => m.veg + m.nonVeg + m.kidsVeg + m.kidsNonVeg > 0);

            return { day, meals };
          })
          .filter((d) => d.meals.length > 0);

        return {
          id: sub.id,
          flat: sub.flat,
          block: sub.block,
          people: sub.peopleCount,
          kids: sub.kidsCount || 0,
          amount: sub.amount,
          dayStats,
        };
      })
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, activeDays, kidsEnabled, activeReportType]);

  // 4. Payment Report Calculation (Lazy targeted if activeReportType is PAYMENT)
  const paymentData = useMemo(() => {
    if (activeReportType && activeReportType !== ReportType.PAYMENT) {
      return { summary: [], details: [], totalFood: 0, totalParcel: 0 };
    }
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

        let subFood = 0;
        let subParcel = 0;

        Object.keys(sub.mealSlots || {}).forEach((dayId) => {
          const dayConf = dayConfig.find((d) => d.id === dayId);
          if (!dayConf || !dayConf.enabled) return;
          const dayMenu = foodMenu[dayId];
          const slots = sub.mealSlots[dayId] || [];

          slots.forEach((personSlot, idx) => {
            const isKid = kidsEnabled && idx >= sub.peopleCount;

            if (personSlot[MealType.BREAKFAST] === DietaryOption.VEG) {
              subFood += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsVegPrice : dayMenu?.[MealType.BREAKFAST]?.vegPrice) || dayConf[MealType.BREAKFAST]?.vegPrice || 0);
              if (personSlot.breakfastParcel) subParcel += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsVegParcelPrice : dayMenu?.[MealType.BREAKFAST]?.vegParcelPrice) || dayConf[MealType.BREAKFAST]?.vegParcelPrice || 0);
            } else if (personSlot[MealType.BREAKFAST] === DietaryOption.NON_VEG) {
              subFood += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsNonVegPrice : dayMenu?.[MealType.BREAKFAST]?.nonVegPrice) || dayConf[MealType.BREAKFAST]?.nonVegPrice || 0);
              if (personSlot.breakfastParcel) subParcel += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsNonVegParcelPrice : dayMenu?.[MealType.BREAKFAST]?.vegParcelPrice) || dayConf[MealType.BREAKFAST]?.nonVegParcelPrice || 0);
            }

            if (personSlot[MealType.LUNCH] === DietaryOption.VEG) {
              subFood += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsVegPrice : dayMenu?.[MealType.LUNCH]?.vegPrice) || dayConf[MealType.LUNCH]?.vegPrice || 0);
              if (personSlot.lunchParcel) subParcel += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsVegParcelPrice : dayMenu?.[MealType.LUNCH]?.vegParcelPrice) || dayConf[MealType.LUNCH]?.vegParcelPrice || 0);
            } else if (personSlot[MealType.LUNCH] === DietaryOption.NON_VEG) {
              subFood += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsNonVegPrice : dayMenu?.[MealType.LUNCH]?.nonVegPrice) || dayConf[MealType.LUNCH]?.nonVegPrice || 0);
              if (personSlot.lunchParcel) subParcel += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsNonVegParcelPrice : dayMenu?.[MealType.LUNCH]?.nonVegParcelPrice) || dayConf[MealType.LUNCH]?.nonVegParcelPrice || 0);
            }

            if (personSlot[MealType.DINNER] === DietaryOption.VEG) {
              subFood += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsVegPrice : dayMenu?.[MealType.DINNER]?.vegPrice) || dayConf[MealType.DINNER]?.vegPrice || 0);
              if (personSlot.dinnerParcel) subParcel += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsVegParcelPrice : dayMenu?.[MealType.DINNER]?.vegParcelPrice) || dayConf[MealType.DINNER]?.vegParcelPrice || 0);
            } else if (personSlot[MealType.DINNER] === DietaryOption.NON_VEG) {
              subFood += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsNonVegPrice : dayMenu?.[MealType.DINNER]?.nonVegPrice) || dayConf[MealType.DINNER]?.nonVegPrice || 0);
              if (personSlot.dinnerParcel) subParcel += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsNonVegParcelPrice : dayMenu?.[MealType.DINNER]?.nonVegParcelPrice) || dayConf[MealType.DINNER]?.nonVegParcelPrice || 0);
            }
          });
        });

        const subTotal = parseFloat(sub.amount) || 0;
        if (subTotal > 0) {
           const subParcelValue = subParcel;
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
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));

    const summaryList = [];
    if (paymentConfig?.options?.upi) summaryList.push({ mode: PaymentMode.UPI, ...summary[PaymentMode.UPI] });
    if (paymentConfig?.options?.cash) summaryList.push({ mode: PaymentMode.CASH, ...summary[PaymentMode.CASH] });
    if (paymentConfig?.options?.bankTransfer) summaryList.push({ mode: PaymentMode.BANK_TRANSFER, ...summary[PaymentMode.BANK_TRANSFER] });

    return { summary: summaryList, details, totalFood, totalParcel };
  }, [subscriptions, paymentConfig, dayConfig, foodMenu, kidsEnabled, activeReportType]);

  const getNotTakenData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
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
              if (!taken[idx]?.[selectedMealType] && !taken[idx]?.[`${selectedMealType}Parcel` as keyof typeof s]) {
                if (choice === DietaryOption.VEG) vegNotTaken++;
                else nonVegNotTaken++;
              }
            }
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

  const getKidsMealData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    if (!kidsEnabled) return [];
    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];
        const adultCount = sub.peopleCount;

        let veg = 0, nonVeg = 0, vegTaken = 0, nonVegTaken = 0;
        let vegParcel = 0, nonVegParcel = 0, vegParcelTaken = 0, nonVegParcelTaken = 0;

        slots.forEach((s, idx) => {
          const isKid = idx >= adultCount;
          if (!isKid) return;

          const choice = s[selectedMealType];
          if (choice === DietaryOption.NONE) return;
          if (!isMealEnabled(selectedDayId, selectedMealType, dayConfig)) return;

          const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
          if (!isDietaryEnabled(selectedDayId, selectedMealType, diet, dayConfig)) return;

          const t = taken[idx];
          const hasTaken = t?.[selectedMealType] || t?.[`${selectedMealType}Parcel` as keyof typeof s];
          const isParcel = isParcelEnabled(selectedDayId, selectedMealType, dayConfig) && !!s[`${selectedMealType}Parcel` as keyof typeof s];
          const isPTaken = isParcel && !!t?.[`${selectedMealType}Parcel` as keyof TakenState];

          if (choice === DietaryOption.VEG) {
            veg++;
            if (hasTaken) vegTaken++;
            if (isParcel) {
              vegParcel++;
              if (isPTaken) vegParcelTaken++;
            }
          } else {
            nonVeg++;
            if (hasTaken) nonVegTaken++;
            if (isParcel) {
              nonVegParcel++;
              if (isPTaken) nonVegParcelTaken++;
            }
          }
        });

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          veg,
          nonVeg,
          vegTaken,
          nonVegTaken,
          vegParcel,
          nonVegParcel,
          vegParcelTaken,
          nonVegParcelTaken,
          total: veg + nonVeg
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions, dayConfig, kidsEnabled]);

  const getMissedParcelData = useCallback((selectedDayId: string, selectedMealType: MealType) => {
    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];

        let missed = 0;
        slots.forEach((s, idx) => {
          const parcelKey = `${selectedMealType}Parcel` as keyof typeof s;
          const isParcelTaken = !!taken[idx]?.[parcelKey as keyof TakenState];
          const isFoodTaken = !!taken[idx]?.[selectedMealType];

          if (s[parcelKey] && isFoodTaken && !isParcelTaken) {
            missed++;
          }
        });

        return {
          id: sub.id, block: sub.block, flat: sub.flat, mobile: sub.mobile,
          count: missed,
          kids: sub.kidsCount || 0
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' }) || (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [subscriptions]);

  return {
    sortedActiveDays,
    activeDays,
    dayWiseData,
    mealWiseData,
    flatWiseData,
    paymentData,
    getNotTakenData,
    getKidsMealData,
    getMissedParcelData,
  };
}
