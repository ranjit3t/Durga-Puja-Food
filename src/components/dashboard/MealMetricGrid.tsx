import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { Metric } from "../common/Metric";
import { MealType, DietaryOption, DietaryVariety, DietType } from "../../domain";
import { toBool } from "../../domain";
import { useCoreDatabase } from "../../context/DatabaseContext";
import { getMealVarieties } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

export interface MealMetricProps {
  day: string;
  type: MealType;
  total: number;
  veg: number;
  nonVeg: number;
  parcel: number;
  parcelTaken: number;
  totalVegTaken: number;
  totalNonVegTaken: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
  totalMealTaken: number;
  kidsTotal: number;
  kidsTaken: number;
  kidsVeg: number;
  kidsNonVeg: number;
  kidsVegTaken: number;
  kidsNonVegTaken: number;
  kidsEnabled: boolean;
  guestEnabled: boolean;
  isParcelEnabled?: boolean;
  isBothEnabled: boolean;
  showPlannedOnly?: boolean;
  varieties?: DietaryVariety[];
  labels: {
    veg: string;
    nonVeg: string;
    kidsTotal: string;
    kidsTaken: string;
    kidsVeg: string;
    kidsNonVeg: string;
    kidsVegTaken: string;
    kidsNonVegTaken: string;
    vegTaken: string;
    nonVegTaken: string;
    guestVeg: string;
    guestNonVeg: string;
    guestVegTaken: string;
    guestNonVegTaken: string;
  };
}

export function MealMetricGrid(props: MealMetricProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const {
    day, type,
    total, veg, nonVeg, parcel, parcelTaken,
    totalVegTaken, totalNonVegTaken, guestVeg, guestNonVeg,
    guestVegTaken, guestNonVegTaken, totalMealTaken,
    kidsTotal, kidsTaken, kidsVeg, kidsNonVeg, kidsVegTaken, kidsNonVegTaken,
    guestEnabled, kidsEnabled, isParcelEnabled, isBothEnabled,
    showPlannedOnly = false
  } = props;

  const { subscriptions, foodMenu, dayConfig } = useCoreDatabase();
  const dayConf = (dayConfig || []).find((d) => d.id === day);
  const mConf = dayConf ? dayConf[type] : undefined;
  const varieties = props.varieties || getMealVarieties(mConf, dayConf?.vegOnly);
  const vegVarieties = varieties.filter((v) => v.type === DietType.VEG);
  const nonVegVarieties = varieties.filter((v) => v.type === DietType.NON_VEG);
  const showSubCategorization = vegVarieties.length > 1 || nonVegVarieties.length > 1;

  const vegVariety = vegVarieties[0];
  const nonVegVariety = nonVegVarieties[0];
  const vegLabel = vegVariety?.name || UI_TEXT.veg;
  const nonVegLabel = nonVegVariety?.name || UI_TEXT.nonVeg;

  const guestTotal = guestVeg + guestNonVeg;
  const guestTakenTotal = guestVegTaken + guestNonVegTaken;

  // Calculate adult specific taken counts
  const adultVegTaken = Math.max(0, totalVegTaken - kidsVegTaken - (guestEnabled ? guestVegTaken : 0));
  const adultNonVegTaken = Math.max(0, totalNonVegTaken - kidsNonVegTaken - (guestEnabled ? guestNonVegTaken : 0));
  const adultTotalTaken = adultVegTaken + adultNonVegTaken;
  const adultTotalPlanned = veg + nonVeg;

  const showKids = kidsEnabled;
  const showGuests = guestEnabled && guestTotal > 0;
  const showParcels = (isParcelEnabled ?? true) && (parcel > 0 || parcelTaken > 0);

  const SectionHeader = ({ icon, title, color }: { icon: keyof typeof Ionicons.glyphMap; title: string; color?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 2 }}>
      <Ionicons name={icon} size={14} color={color || theme.colors.textSecondary} />
      <Text style={{ fontSize: 11, fontWeight: '800', color: color || theme.colors.textSecondary, letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border, opacity: 0.5 }} />
    </View>
  );

  return (
    <View style={{ gap: 10 }}>
      {/* 1. TOP SUMMARY ROW */}
      <View style={styles.metricGrid}>
        <Metric
          icon="clipboard-outline"
          label={UI_TEXT.plannedTotal}
          value={total}
          color={theme.colors.primary}
        />
        {!showPlannedOnly && (
          <Metric
            icon="checkmark-done-circle-outline"
            label={UI_TEXT.totalServed}
            value={totalMealTaken}
            color={theme.colors.veg}
          />
        )}
      </View>

      {showSubCategorization ? (
        <View style={{ gap: 10 }}>
          <SectionHeader icon="restaurant-outline" title={UI_TEXT.subCategoryBreakdown} color={theme.colors.primary} />
          {varieties.map((v) => {
            let adultP = 0, kidsP = 0, adultS = 0, kidsS = 0, guestP = 0, guestS = 0;
            subscriptions.forEach((sub) => {
              const slots = sub.mealSlots?.[day] || [];
              const taken = sub.takenByPerson?.[day] || [];
              const adultCount = sub.peopleCount || 0;
              slots.forEach((sSlot, idx) => {
                const choice = sSlot[type];
                if (choice === DietaryOption.NONE) return;
                const isKid = kidsEnabled && idx >= adultCount;
                const isMatch =
                  choice === v.id ||
                  ((v.id === "veg_default" || v.isDefault) && v.type === DietType.VEG && (choice === DietaryOption.VEG || choice === "veg")) ||
                  ((v.id === "nonVeg_default" || v.isDefault) && v.type === DietType.NON_VEG && (choice === DietaryOption.NON_VEG || choice === "nonVeg"));

                if (isMatch) {
                  const isTaken = toBool(taken[idx]?.[type]);
                  if (isKid) {
                    kidsP++;
                    if (isTaken) kidsS++;
                  } else {
                    adultP++;
                    if (isTaken) adultS++;
                  }
                }
              });
            });

            const mealMenu = foodMenu?.[day]?.[type];
            if (mealMenu) {
              if (v.id === "veg_default") {
                guestP = mealMenu.guestVeg || 0;
                guestS = mealMenu.guestVegTaken || 0;
              } else if (v.id === "nonVeg_default") {
                guestP = mealMenu.guestNonVeg || 0;
                guestS = mealMenu.guestNonVegTaken || 0;
              } else {
                guestP = mealMenu.guestCounts?.[v.id] || 0;
                guestS = mealMenu.guestTakenCounts?.[v.id] || 0;
              }
            }

            const totalV = adultP + kidsP + guestP;
            const totalS = adultS + kidsS + guestS;
            const vColor = v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);

            if (totalV === 0 && totalS === 0 && !showPlannedOnly) return null;

            return (
              <View key={v.id} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: vColor + "66", gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: vColor }} />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.textPrimary, flex: 1 }} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>{v.type}</Text>
                  </View>
                </View>

                <View style={styles.metricGrid}>
                  <Metric icon="clipboard-outline" label={UI_TEXT.planned} value={totalV} color={vColor} />
                  {!showPlannedOnly && (
                    <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={totalS} color={vColor} />
                  )}
                  {kidsEnabled ? (
                    <>
                      <Metric icon="person-outline" label={UI_TEXT.adults} value={adultP} color={theme.colors.textSecondary} />
                      <Metric icon="happy-outline" label={UI_TEXT.kids} value={kidsP} color={theme.colors.primary} />
                    </>
                  ) : (
                    <Metric icon="person-outline" label={UI_TEXT.members} value={adultP} color={theme.colors.textSecondary} />
                  )}
                  {guestEnabled && guestP > 0 ? (
                    <Metric icon="people-circle-outline" label={UI_TEXT.guests} value={guestP} color={theme.colors.secondary} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <>
          {/* 2. ADULTS / PRIMARY MEMBERS SECTION */}
          <View style={{ gap: 4 }}>
            <SectionHeader
              icon="person-outline"
              title={kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}
              color={theme.colors.textSecondary}
            />
            <View style={styles.metricGrid}>
              {isBothEnabled ? (
                <>
                  <Metric icon="leaf-outline" label={vegLabel} value={veg} color={theme.colors.veg} />
                  {!showPlannedOnly && (
                    <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={adultVegTaken} color={theme.colors.veg} />
                  )}
                  <Metric icon="flame-outline" label={nonVegLabel} value={nonVeg} color={theme.colors.nonVeg} />
                  {!showPlannedOnly && (
                    <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={adultNonVegTaken} color={theme.colors.nonVeg} />
                  )}
                </>
              ) : (
                <>
                  <Metric
                    icon={veg > 0 ? "leaf-outline" : "flame-outline"}
                    label={showPlannedOnly ? UI_TEXT.total : `${kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}${UI_TEXT.space}${UI_TEXT.planned}`}
                    value={adultTotalPlanned}
                    color={theme.colors.primary}
                  />
                  {!showPlannedOnly && (
                    <Metric
                      icon="checkmark-done-outline"
                      label={UI_TEXT.served}
                      value={adultTotalTaken}
                      color={theme.colors.veg}
                    />
                  )}
                </>
              )}
            </View>
          </View>

          {/* 3. KIDS SECTION */}
          {showKids && (
            <View style={{ gap: 4 }}>
              <SectionHeader
                icon="happy-outline"
                title={UI_TEXT.kids}
                color={theme.colors.primary}
              />
              <View style={styles.metricGrid}>
                {isBothEnabled ? (
                  <>
                    <Metric icon="leaf-outline" label={vegLabel} value={kidsVeg} color={theme.colors.veg} />
                    {!showPlannedOnly && (
                      <Metric icon="happy-outline" label={UI_TEXT.served} value={kidsVegTaken} color={theme.colors.veg} />
                    )}
                    <Metric icon="flame-outline" label={nonVegLabel} value={kidsNonVeg} color={theme.colors.nonVeg} />
                    {!showPlannedOnly && (
                      <Metric icon="happy-outline" label={UI_TEXT.served} value={kidsNonVegTaken} color={theme.colors.nonVeg} />
                    )}
                  </>
                ) : (
                  <>
                    <Metric icon="happy-outline" label={showPlannedOnly ? UI_TEXT.total : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} />
                    {!showPlannedOnly && (
                      <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={kidsTaken} color={theme.colors.veg} />
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* 4. GUESTS SECTION */}
          {showGuests && (
            <View style={{ gap: 4 }}>
              <SectionHeader
                icon="people-circle-outline"
                title={UI_TEXT.guests}
                color={theme.colors.secondary}
              />
              <View style={styles.metricGrid}>
                {isBothEnabled ? (
                  <>
                    <Metric icon="leaf-outline" label={vegLabel} value={guestVeg} color={theme.colors.veg} />
                    {!showPlannedOnly && (
                      <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={guestVegTaken} color={theme.colors.veg} />
                    )}
                    <Metric icon="flame-outline" label={nonVegLabel} value={guestNonVeg} color={theme.colors.nonVeg} />
                    {!showPlannedOnly && (
                      <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={guestNonVegTaken} color={theme.colors.nonVeg} />
                    )}
                  </>
                ) : (
                  <>
                    <Metric icon="people-circle-outline" label={showPlannedOnly ? UI_TEXT.total : UI_TEXT.guests} value={guestTotal} color={theme.colors.secondary} />
                    {!showPlannedOnly && (
                      <Metric icon="checkmark-done-outline" label={UI_TEXT.served} value={guestTakenTotal} color={theme.colors.veg} />
                    )}
                  </>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {/* 5. TAKEAWAY PARCELS SECTION */}
      {showParcels && (
        <View style={{ gap: 4 }}>
          <SectionHeader
            icon="cube-outline"
            title={UI_TEXT.parcels}
            color={theme.colors.primary}
          />
          <View style={styles.metricGrid}>
            <Metric icon="cube-outline" label={showPlannedOnly ? UI_TEXT.total : `${UI_TEXT.parcels}${UI_TEXT.space}${UI_TEXT.planned}`} value={parcel} color={theme.colors.primary} />
            {!showPlannedOnly && (
              <Metric icon="checkmark-circle-outline" label={UI_TEXT.served} value={parcelTaken} color={theme.colors.veg} />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
