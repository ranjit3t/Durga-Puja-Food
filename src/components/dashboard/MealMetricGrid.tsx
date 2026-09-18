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
  const adultsTotal = total - kidsTotal - guestTotal;

  return (
    <View style={styles.metricGrid}>
      <Metric icon="people-outline" label={UI_TEXT.total} value={total} />

      {hasKids && (
        <Metric icon="happy-outline" label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} />
      )}

      {guestEnabled && guestTotal > 0 && (
        <Metric
          icon="people-circle-outline"
          label={UI_TEXT.guestTotal}
          value={guestTotal}
        />
      )}

      {/* Demand Breakdown Section */}
      <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />

      {/* Adults Section */}
      {isBothEnabled ? (
        <>
          <Metric icon="leaf-outline" label={labels.veg} value={veg} color={theme.colors.veg} />
          <Metric icon="flame-outline" label={labels.nonVeg} value={nonVeg} color={theme.colors.nonVeg} />
        </>
      ) : (
        <Metric icon="leaf-outline" label={kidsEnabled ? (adultsTotal === 1 ? UI_TEXT.adult : UI_TEXT.adults) : labels.veg} value={adultsTotal} color={theme.colors.veg} />
      )}

      {/* Kids Section */}
      {hasKids && (
        <>
          {isBothEnabled ? (
            <>
              <Metric icon="happy-outline" label={kidsVeg === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsVeg} color={theme.colors.veg} />
              <Metric icon="happy-outline" label={kidsNonVeg === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsNonVeg} color={theme.colors.nonVeg} />
            </>
          ) : (
            <Metric icon="happy-outline" label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} />
          )}
        </>
      )}

      {/* Parcel Section */}
      {isParcelEnabled(day, type, config) && parcel > 0 && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
          <Metric icon="cube-outline" label={labels.parcel} value={parcel} />
          <Metric
            icon="checkmark-circle-outline"
            label={labels.parcelTaken}
            value={parcelTaken}
            color={theme.colors.primary}
          />
        </>
      )}

      {/* Collection Breakdown Section */}
      <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />

      {/* Adult/Resident Collection */}
      {isBothEnabled ? (
        <>
          <Metric
            icon="checkmark-done-outline"
            label={labels.vegTaken}
            value={totalVegTaken - kidsVegTaken}
            color={theme.colors.veg}
          />
          <Metric
            icon="checkmark-done-outline"
            label={labels.nonVegTaken}
            value={totalNonVegTaken - kidsNonVegTaken}
            color={theme.colors.nonVeg}
          />
        </>
      ) : (
        <Metric
          icon="checkmark-done-outline"
          label={`${kidsEnabled ? (totalMealTaken - kidsTaken - (guestEnabled ? (guestVegTaken + guestNonVegTaken) : 0) === 1 ? UI_TEXT.adult : UI_TEXT.adults) : UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.taken}`}
          value={totalMealTaken - kidsTaken - (guestEnabled ? (guestVegTaken + guestNonVegTaken) : 0)}
          color={theme.colors.veg}
        />
      )}

      {/* Kids Collection */}
      {hasKids && (
        <>
          {isBothEnabled ? (
            <>
              <Metric
                icon="checkbox-outline"
                label={kidsVegTaken === 1 ? UI_TEXT.kidVegTaken : labels.kidsVegTaken}
                value={kidsVegTaken}
                color={theme.colors.veg}
              />
              <Metric
                icon="checkbox-outline"
                label={kidsNonVegTaken === 1 ? UI_TEXT.kidNonVegTaken : labels.kidsNonVegTaken}
                value={kidsNonVegTaken}
                color={theme.colors.nonVeg}
              />
            </>
          ) : null}
          <Metric
            icon="checkmark-done-outline"
            label={`${kidsTaken === 1 ? UI_TEXT.kid : UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.taken}`}
            value={kidsTaken}
            color={theme.colors.primary}
          />
        </>
      )}

      {/* Guest Collection */}
      {guestEnabled && guestTotal > 0 && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
          {isBothEnabled && (
            <>
              <Metric
                icon="leaf-outline"
                label={labels.guestVeg}
                value={guestVeg}
                color={theme.colors.veg}
              />
              <Metric
                icon="flame-outline"
                label={labels.guestNonVeg}
                value={guestNonVeg}
                color={theme.colors.nonVeg}
              />

              <Metric
                icon="checkbox-outline"
                label={labels.guestVegTaken}
                value={guestVegTaken}
              />
              <Metric
                icon="checkbox-outline"
                label={labels.guestNonVegTaken}
                value={guestNonVegTaken}
              />
            </>
          )}
          <Metric
            icon="checkbox-outline"
            label={UI_TEXT.guestTaken}
            value={guestVegTaken + guestNonVegTaken}
            color={theme.colors.veg}
          />
        </>
      )}

      <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
      <Metric
        icon="checkmark-done-outline"
        label={`${UI_TEXT.total}${UI_TEXT.space}${UI_TEXT.taken}`}
        value={totalMealTaken}
        color={theme.colors.veg}
      />
    </View>
  );
}
