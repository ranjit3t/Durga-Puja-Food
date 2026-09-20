import React from "react";
import { View, Text } from "react-native";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { MealMetricProps } from "./MealMetricGrid";

/**
 * A compact bar chart component for visualizing meal demand vs collections.
 */
export function MealBarChart(props: MealMetricProps) {
  const { theme } = useAppTheme();
  const {
    total, veg, nonVeg, parcel, parcelTaken, totalVegTaken, totalNonVegTaken,
    guestVeg, guestNonVeg, guestVegTaken, guestNonVegTaken, kidsEnabled, guestEnabled, isBothEnabled,
    kidsTotal, kidsTaken, kidsVeg, kidsNonVeg, kidsVegTaken, kidsNonVegTaken, totalMealTaken
  } = props;

  const chartHeight = 160;
  const barContainerHeight = chartHeight - 40;

  const hasKids = kidsEnabled;

  const dataValues = [
    total, veg, nonVeg, parcel,
    totalVegTaken, totalNonVegTaken,
    guestVeg + guestNonVeg,
    guestVegTaken + guestNonVegTaken,
    kidsTotal,
    kidsTaken
  ];
  const maxVal = Math.max(...dataValues, 1);

  const Bar = ({ label, value, color, secondaryValue }: { label: string, value: number, color: string, secondaryValue?: number }) => {
    const height = (value / maxVal) * (barContainerHeight - 20);
    const secHeight = secondaryValue !== undefined ? (secondaryValue / maxVal) * (barContainerHeight - 20) : 0;

    return (
      <View style={{ alignItems: 'center', flex: 1 }}>
        <View style={{ height: barContainerHeight, width: '100%', alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
          {secondaryValue !== undefined ? (
             <>
               <View style={{ width: 10, height: Math.max(height, 2), backgroundColor: color + "30", borderRadius: 4, position: 'relative' }}>
                  <Text style={{ position: 'absolute', top: -16, width: 40, left: -15, textAlign: 'center', fontSize: 8, fontWeight: '800', color: theme.colors.textSecondary }}>{value}</Text>
               </View>
               <View style={{ width: 10, height: Math.max(secHeight, 2), backgroundColor: color, borderRadius: 4, position: 'relative' }}>
                  <Text style={{ position: 'absolute', top: -16, width: 40, left: -15, textAlign: 'center', fontSize: 8, fontWeight: '900', color: color }}>{secondaryValue}</Text>
               </View>
             </>
          ) : (
            <View style={{ width: 16, height: Math.max(height, 2), backgroundColor: color, borderRadius: 4, position: 'relative' }}>
               <Text style={{ position: 'absolute', top: -16, width: 40, left: -12, textAlign: 'center', fontSize: 9, fontWeight: '900', color: color }}>{value}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 8, fontWeight: '700', color: theme.colors.textMuted, marginTop: 8, textAlign: 'center' }}>
          {(label || "").toUpperCase()}
        </Text>
      </View>
    );
  };

  const guestTotal = guestVeg + guestNonVeg;
  const guestTaken = guestVegTaken + guestNonVegTaken;
  const adultsTotal = total - kidsTotal - guestTotal;
  const adultsTaken = totalMealTaken - kidsTaken - guestTaken;

  return (
    <View style={{ paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', height: chartHeight, alignItems: 'flex-end', gap: 8 }}>
        {isBothEnabled ? (
          <>
            <Bar label={kidsEnabled ? `${UI_TEXT.adultsAbbr}${UI_TEXT.space}${UI_TEXT.veg}` : UI_TEXT.veg} value={veg} color={theme.colors.veg} secondaryValue={totalVegTaken - kidsVegTaken - guestVegTaken} />
            <Bar label={kidsEnabled ? `${UI_TEXT.adultsAbbr}${UI_TEXT.space}${UI_TEXT.nonVeg}` : UI_TEXT.nonVeg} value={nonVeg} color={theme.colors.nonVeg} secondaryValue={totalNonVegTaken - kidsNonVegTaken - guestNonVegTaken} />
            {hasKids && (
               <Bar label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} secondaryValue={kidsTaken} />
            )}
          </>
        ) : (
          <>
            <Bar label={hasKids ? (adultsTotal === 1 ? UI_TEXT.adult : UI_TEXT.adults) : UI_TEXT.total} value={adultsTotal} color={theme.colors.veg} secondaryValue={adultsTaken} />
            {hasKids && (
               <Bar label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} secondaryValue={kidsTaken} />
            )}
          </>
        )}

        {guestEnabled && (guestTotal > 0) && (
          <Bar
            label={UI_TEXT.guest}
            value={guestTotal}
            color={(theme.colors as any).info || theme.colors.secondary}
            secondaryValue={guestTaken}
          />
        )}

        {parcel > 0 && (
          <Bar
            label={UI_TEXT.parcels}
            value={parcel}
            color={theme.colors.secondary}
            secondaryValue={parcelTaken}
          />
        )}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.textMuted + "30" }} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary }}>{UI_TEXT.planned}</Text>
         </View>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.textMuted }} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary }}>{UI_TEXT.taken}</Text>
         </View>
      </View>
    </View>
  );
}
