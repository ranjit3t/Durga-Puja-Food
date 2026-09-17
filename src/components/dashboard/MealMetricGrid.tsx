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
  config: ConfigDay[];
  guestEnabled: boolean;
  isBothEnabled: boolean;
  labels: {
    veg: string;
    nonVeg: string;
    parcel: string;
    parcelTaken: string;
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
    config, guestEnabled, isBothEnabled, labels
  } = props;

  return (
    <View style={styles.metricGrid}>
      <Metric icon="people-outline" label={UI_TEXT.total} value={total} />

      {guestEnabled && (
        <>
          <Metric
            icon="people-circle-outline"
            label={UI_TEXT.guestTotal}
            value={guestVeg + guestNonVeg}
          />
          <Metric
            icon="checkbox-outline"
            label={UI_TEXT.guestTaken}
            value={guestVegTaken + guestNonVegTaken}
            color={theme.colors.veg}
          />
        </>
      )}

      {isBothEnabled && (
        <>
          <Metric icon="leaf-outline" label={labels.veg} value={veg} color={theme.colors.veg} />
          <Metric icon="flame-outline" label={labels.nonVeg} value={nonVeg} color={theme.colors.nonVeg} />
        </>
      )}

      {isParcelEnabled(day, type, config) && (
        <>
          <Metric icon="cube-outline" label={labels.parcel} value={parcel} />
          <Metric
            icon="checkmark-circle-outline"
            label={labels.parcelTaken}
            value={parcelTaken}
            color={theme.colors.primary}
          />
        </>
      )}

      {isBothEnabled && (
        <>
          <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />

          <Metric
            icon="checkmark-done-outline"
            label={labels.vegTaken}
            value={totalVegTaken}
            color={theme.colors.veg}
          />
          <Metric
            icon="checkmark-done-outline"
            label={labels.nonVegTaken}
            value={totalNonVegTaken}
            color={theme.colors.nonVeg}
          />

          {guestEnabled && (
            <>
              <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />
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
        </>
      )}

      <Metric
        icon="checkmark-done-outline"
        label={UI_TEXT.total + " " + UI_TEXT.taken}
        value={totalMealTaken}
        color={theme.colors.veg}
      />
    </View>
  );
}
