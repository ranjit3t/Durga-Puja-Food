import React from "react";
import { View } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { Metric } from "../common/Metric";
import { isParcelEnabled } from "../../constants";
import { ConfigDay, MealType } from "../../types";

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
  config: ConfigDay[];
  kidsEnabled: boolean;
  guestEnabled: boolean;
  isBothEnabled: boolean;
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
    day, type, total, veg, nonVeg, parcel, parcelTaken,
    totalVegTaken, totalNonVegTaken, guestVeg, guestNonVeg,
    guestVegTaken, guestNonVegTaken, totalMealTaken,
    kidsTotal, kidsTaken, kidsVeg, kidsNonVeg, kidsVegTaken, kidsNonVegTaken,
    config, guestEnabled, kidsEnabled, isBothEnabled, labels
  } = props;

  const hasKids = kidsEnabled;
  const guestTotal = guestVeg + guestNonVeg;

  return (
    <View style={styles.metricGrid}>
      {/* 1. Top Summary Row: Primary Identifiers */}
      <Metric icon="people-outline" label={UI_TEXT.plannedTotal} value={total} />
      {hasKids && (
        <Metric icon="happy-outline" label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} />
      )}
      {guestEnabled && guestTotal > 0 && (
        <Metric icon="people-circle-outline" label={UI_TEXT.guestTotal} value={guestTotal} color={theme.colors.secondary} />
      )}

      {/* 2. Veg Group: Demand and Collection */}
      {isBothEnabled && (veg > 0 || totalVegTaken > 0) && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 4, opacity: 0.5 }} />
          <Metric icon="leaf-outline" label={labels.veg} value={veg} color={theme.colors.veg} />
          <Metric icon="checkmark-done-outline" label={labels.vegTaken} value={totalVegTaken - kidsVegTaken - (guestEnabled ? guestVegTaken : 0)} color={theme.colors.veg} />
          {hasKids && kidsVeg > 0 && (
            <Metric icon="happy-outline" label={UI_TEXT.kidsVegTaken} value={kidsVegTaken} color={theme.colors.veg} />
          )}
        </>
      )}

      {/* 3. Non-Veg Group: Demand and Collection */}
      {isBothEnabled && (nonVeg > 0 || totalNonVegTaken > 0) && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 4, opacity: 0.5 }} />
          <Metric icon="flame-outline" label={labels.nonVeg} value={nonVeg} color={theme.colors.nonVeg} />
          <Metric icon="checkmark-done-outline" label={labels.nonVegTaken} value={totalNonVegTaken - kidsNonVegTaken - (guestEnabled ? guestNonVegTaken : 0)} color={theme.colors.nonVeg} />
          {hasKids && kidsNonVeg > 0 && (
            <Metric icon="happy-outline" label={UI_TEXT.kidsNonVegTaken} value={kidsNonVegTaken} color={theme.colors.nonVeg} />
          )}
        </>
      )}

      {/* 4. Single-Diet Mode Fallback (If not Both Enabled) */}
      {!isBothEnabled && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 4, opacity: 0.5 }} />
          <Metric
            icon={veg > 0 ? "leaf-outline" : "flame-outline"}
            label={kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}
            value={veg + nonVeg}
            color={theme.colors.primary}
          />
          <Metric
            icon="checkmark-done-outline"
            label={`${kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}${UI_TEXT.space}${UI_TEXT.taken}`}
            value={totalMealTaken - kidsTaken - (guestEnabled ? (guestVegTaken + guestNonVegTaken) : 0)}
            color={theme.colors.veg}
          />
          {hasKids && (
             <Metric icon="happy-outline" label={UI_TEXT.kidsTaken} value={kidsTaken} color={theme.colors.primary} />
          )}
        </>
      )}

      {/* 5. Supplemental Data: Parcels and Guests */}
      {(parcel > 0 || (guestEnabled && guestTotal > 0)) && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 4, opacity: 0.5 }} />

          {parcel > 0 && (
            <>
              <Metric icon="cube-outline" label={labels.parcel} value={parcel} />
              <Metric icon="checkmark-circle-outline" label={UI_TEXT.parcelTaken} value={parcelTaken} color={theme.colors.primary} />
            </>
          )}

          {guestEnabled && guestTotal > 0 && (
            <Metric icon="checkbox-outline" label={UI_TEXT.guestTaken} value={guestVegTaken + guestNonVegTaken} color={theme.colors.secondary} />
          )}
        </>
      )}

      {/* 6. Grand Total Footer */}
      <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />
      <Metric icon="checkmark-done-outline" label={UI_TEXT.totalServed} value={totalMealTaken} color={theme.colors.veg} />
    </View>
  );
}
