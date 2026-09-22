import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { Metric } from "../common/Metric";
import { MealType } from "../../domain";
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
    total, veg, nonVeg, parcel, parcelTaken,
    totalVegTaken, totalNonVegTaken, guestVeg, guestNonVeg,
    guestVegTaken, guestNonVegTaken, totalMealTaken,
    kidsTotal, kidsTaken, kidsVeg, kidsNonVeg, kidsVegTaken, kidsNonVegTaken,
    guestEnabled, kidsEnabled, isParcelEnabled, isBothEnabled, labels
  } = props;

  const guestTotal = guestVeg + guestNonVeg;
  const guestTakenTotal = guestVegTaken + guestNonVegTaken;

  // Calculate adult specific taken counts
  const adultVegTaken = Math.max(0, totalVegTaken - kidsVegTaken - (guestEnabled ? guestVegTaken : 0));
  const adultNonVegTaken = Math.max(0, totalNonVegTaken - kidsNonVegTaken - (guestEnabled ? guestNonVegTaken : 0));
  const adultTotalTaken = adultVegTaken + adultNonVegTaken;
  const adultTotalPlanned = veg + nonVeg;

  const showKids = kidsEnabled && kidsTotal > 0;
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
      {/* 1. TOP SUMMARY ROW: Total Planned & Total Served */}
      <View style={styles.metricGrid}>
        <Metric
          icon="clipboard-outline"
          label={UI_TEXT.plannedTotal}
          value={total}
          color={theme.colors.primary}
        />
        <Metric
          icon="checkmark-done-circle-outline"
          label={UI_TEXT.totalServed}
          value={totalMealTaken}
          color={theme.colors.veg}
        />
      </View>

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
              <Metric icon="leaf-outline" label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.planned}`} value={veg} color={theme.colors.veg} />
              <Metric icon="checkmark-done-outline" label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.served}`} value={adultVegTaken} color={theme.colors.veg} />
              <Metric icon="flame-outline" label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.planned}`} value={nonVeg} color={theme.colors.nonVeg} />
              <Metric icon="checkmark-done-outline" label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.served}`} value={adultNonVegTaken} color={theme.colors.nonVeg} />
            </>
          ) : (
            <>
              <Metric
                icon={veg > 0 ? "leaf-outline" : "flame-outline"}
                label={`${kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}${UI_TEXT.space}${UI_TEXT.planned}`}
                value={adultTotalPlanned}
                color={theme.colors.primary}
              />
              <Metric
                icon="checkmark-done-outline"
                label={`${kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}${UI_TEXT.space}${UI_TEXT.served}`}
                value={adultTotalTaken}
                color={theme.colors.veg}
              />
            </>
          )}
        </View>
      </View>

      {/* 3. KIDS SECTION (Only if kidsEnabled & kidsTotal > 0) */}
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
                <Metric icon="leaf-outline" label={`${UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.planned}`} value={kidsVeg} color={theme.colors.veg} />
                <Metric icon="happy-outline" label={`${UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.served}`} value={kidsVegTaken} color={theme.colors.veg} />
                <Metric icon="flame-outline" label={`${UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.planned}`} value={kidsNonVeg} color={theme.colors.nonVeg} />
                <Metric icon="happy-outline" label={`${UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.served}`} value={kidsNonVegTaken} color={theme.colors.nonVeg} />
              </>
            ) : (
              <>
                <Metric icon="happy-outline" label={`${UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.planned}`} value={kidsTotal} color={theme.colors.primary} />
                <Metric icon="checkmark-done-outline" label={`${UI_TEXT.kids}${UI_TEXT.space}${UI_TEXT.served}`} value={kidsTaken} color={theme.colors.veg} />
              </>
            )}
          </View>
        </View>
      )}

      {/* 4. GUESTS SECTION (Only if guestEnabled & guestTotal > 0) */}
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
                <Metric icon="leaf-outline" label={`${UI_TEXT.guests}${UI_TEXT.space}${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.planned}`} value={guestVeg} color={theme.colors.veg} />
                <Metric icon="checkmark-done-outline" label={`${UI_TEXT.guests}${UI_TEXT.space}${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.served}`} value={guestVegTaken} color={theme.colors.veg} />
                <Metric icon="flame-outline" label={`${UI_TEXT.guests}${UI_TEXT.space}${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.planned}`} value={guestNonVeg} color={theme.colors.nonVeg} />
                <Metric icon="checkmark-done-outline" label={`${UI_TEXT.guests}${UI_TEXT.space}${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.served}`} value={guestNonVegTaken} color={theme.colors.nonVeg} />
              </>
            ) : (
              <>
                <Metric icon="people-circle-outline" label={`${UI_TEXT.guests}${UI_TEXT.space}${UI_TEXT.planned}`} value={guestTotal} color={theme.colors.secondary} />
                <Metric icon="checkmark-done-outline" label={`${UI_TEXT.guests}${UI_TEXT.space}${UI_TEXT.served}`} value={guestTakenTotal} color={theme.colors.veg} />
              </>
            )}
          </View>
        </View>
      )}

      {/* 5. TAKEAWAY PARCELS SECTION (Only if isParcelEnabled & parcel/parcelTaken > 0) */}
      {showParcels && (
        <View style={{ gap: 4 }}>
          <SectionHeader
            icon="cube-outline"
            title={UI_TEXT.parcels}
            color={theme.colors.primary}
          />
          <View style={styles.metricGrid}>
            <Metric icon="cube-outline" label={`${UI_TEXT.parcels}${UI_TEXT.space}${UI_TEXT.planned}`} value={parcel} color={theme.colors.primary} />
            <Metric icon="checkmark-circle-outline" label={`${UI_TEXT.parcels}${UI_TEXT.space}${UI_TEXT.served}`} value={parcelTaken} color={theme.colors.veg} />
          </View>
        </View>
      )}
    </View>
  );
}
