import React from "react";
import { View, Text } from "react-native";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { MealMetricProps } from "./MealMetricGrid";
import { useCoreDatabase } from "../../context/DatabaseContext";
import { isSpecialMeal } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

/**
 * A compact bar chart component for visualizing meal demand vs collections.
 */
export function MealBarChart(props: MealMetricProps) {
  const { theme } = useAppTheme();
  const {
    total, veg, nonVeg, parcel, parcelTaken, totalVegTaken, totalNonVegTaken,
    freeMealVeg, freeMealNonVeg, freeMealVegTaken, freeMealNonVegTaken, kidsEnabled, guestsEnabled, freeMealEnabled, isBothEnabled,
    kidsTotal, kidsTaken, kidsVegTaken, kidsNonVegTaken,
    guestsTotal = 0, guestsTaken = 0, guestsVegTaken = 0, guestsNonVegTaken = 0,
    totalMealTaken
  } = props;

  const chartHeight = 160;
  const barContainerHeight = chartHeight - 40;

  const hasKids = kidsEnabled;
  const hasGuests = guestsEnabled;

  const dataValues = [
    total, veg, nonVeg, parcel,
    totalVegTaken, totalNonVegTaken,
    freeMealVeg + freeMealNonVeg,
    freeMealVegTaken + freeMealNonVegTaken,
    kidsTotal,
    kidsTaken,
    guestsTotal,
    guestsTaken
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

  const freeMealTotal = freeMealVeg + freeMealNonVeg;
  const freeMealTaken = freeMealVegTaken + freeMealNonVegTaken;
  const adultsTotal = total - kidsTotal - guestsTotal - freeMealTotal;
  const adultsTaken = totalMealTaken - kidsTaken - guestsTaken - freeMealTaken;

  const { dayConfig } = useCoreDatabase();
  const isSpecial = isSpecialMeal(props.day, props.type, dayConfig);

  return (
    <View style={{ paddingVertical: 10 }}>
      {isSpecial && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.specialMealBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.specialMealBorder, borderStyle: "dashed", alignSelf: "flex-start", marginBottom: 8 }}>
          <Ionicons name="star" size={12} color={theme.colors.specialMealBorder} />
          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.specialMealText }}>
            {UI_TEXT.specialMealBadge}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', height: chartHeight, alignItems: 'flex-end', gap: 8 }}>
        {isBothEnabled ? (
          <>
            <Bar label={(kidsEnabled || guestsEnabled) ? `${UI_TEXT.adultsAbbr}${UI_TEXT.space}${UI_TEXT.veg}` : UI_TEXT.veg} value={veg} color={theme.colors.veg} secondaryValue={totalVegTaken - kidsVegTaken - guestsVegTaken - freeMealVegTaken} />
            <Bar label={(kidsEnabled || guestsEnabled) ? `${UI_TEXT.adultsAbbr}${UI_TEXT.space}${UI_TEXT.nonVeg}` : UI_TEXT.nonVeg} value={nonVeg} color={theme.colors.nonVeg} secondaryValue={totalNonVegTaken - kidsNonVegTaken - guestsNonVegTaken - freeMealNonVegTaken} />
            {hasKids && (
               <Bar label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} secondaryValue={kidsTaken} />
            )}
            {hasGuests && (
               <Bar label={guestsTotal === 1 ? UI_TEXT.guest : UI_TEXT.guests} value={guestsTotal} color={theme.colors.primary} secondaryValue={guestsTaken} />
            )}
          </>
        ) : (
          <>
            <Bar label={(hasKids || hasGuests) ? (adultsTotal === 1 ? UI_TEXT.adult : UI_TEXT.adults) : UI_TEXT.total} value={adultsTotal} color={theme.colors.veg} secondaryValue={adultsTaken} />
            {hasKids && (
               <Bar label={kidsTotal === 1 ? UI_TEXT.kid : UI_TEXT.kids} value={kidsTotal} color={theme.colors.primary} secondaryValue={kidsTaken} />
            )}
            {hasGuests && (
               <Bar label={guestsTotal === 1 ? UI_TEXT.guest : UI_TEXT.guests} value={guestsTotal} color={theme.colors.primary} secondaryValue={guestsTaken} />
            )}
          </>
        )}

        {freeMealEnabled && (freeMealTotal > 0) && (
          <Bar
            label={UI_TEXT.freeMeals}
            value={freeMealTotal}
            color={(theme.colors as any).info || theme.colors.secondary}
            secondaryValue={freeMealTaken}
          />
        )}

        {((props.isParcelEnabled ?? true) && parcel > 0) && (
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
         {isSpecial && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <Ionicons name="star" size={12} color={theme.colors.specialMealBorder} />
               <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.specialMealText }}>{UI_TEXT.specialMealTag}</Text>
            </View>
         )}
      </View>
    </View>
  );
}
