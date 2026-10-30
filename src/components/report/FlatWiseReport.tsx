import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel } from "../../constants";
import { AppThemeMode, ConfigDay, MealType } from "../../domain";

interface FlatDayMeal {
  type: MealType;
  veg: number;
  nonVeg: number;
  kidsVeg: number;
  kidsNonVeg: number;
  guestsVeg?: number;
  guestsNonVeg?: number;
  vegTaken: number;
  nonVegTaken: number;
  kidsVegTaken: number;
  kidsNonVegTaken: number;
  guestsVegTaken?: number;
  guestsNonVegTaken?: number;
  vegParcel: number;
  nonVegParcel: number;
  kidsVegParcel: number;
  kidsNonVegParcel: number;
  guestsVegParcel?: number;
  guestsNonVegParcel?: number;
  vegParcelTaken: number;
  nonVegParcelTaken: number;
  kidsVegParcelTaken: number;
  kidsNonVegParcelTaken: number;
  guestsVegParcelTaken?: number;
  guestsNonVegParcelTaken?: number;
}

interface FlatDayStat {
  day: string;
  meals: FlatDayMeal[];
}

interface FlatWiseItem {
  id: string;
  flat: string;
  block: string;
  people: number;
  kids: number;
  guests?: number;
  amount: string;
  dayStats: FlatDayStat[];
}

export function FlatWiseReport({
  data,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
  guestsEnabled,
}: {
  data: FlatWiseItem[];
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const summaryTotals = useMemo(() => {
    let totalPasses = data.length;
    let totalMembers = 0;
    let totalAmount = 0;

    data.forEach((item) => {
      totalMembers += (item.people + item.kids + (item.guests || 0));
      const cleanAmt = parseFloat(item.amount.replace(/[^0-9.]/g, "")) || 0;
      totalAmount += cleanAmt;
    });

    return { totalPasses, totalMembers, totalAmount };
  }, [data]);

  return (
    <View style={{ gap: 16 }}>
      {/* Red Summary Card for Pass / Flat-Wise Report */}
      {data.length > 0 && (
        <View
          style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`${UI_TEXT.flatWiseReport}: ${summaryTotals.totalPasses} passes, ${summaryTotals.totalMembers} members`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="home-outline" size={20} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
              {UI_TEXT.flatWiseReport}
            </Text>
          </View>

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
            {/* Total Passes Block */}
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.totalPassesLabel} ({summaryTotals.totalPasses})
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: "900" }}>
                {summaryTotals.totalPasses} {summaryTotals.totalPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural} ({summaryTotals.totalMembers} {UI_TEXT.people})
              </Text>
            </View>

            {/* Total Collection Block */}
            <View style={{ gap: 3, paddingBottom: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.totalCollection}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 16, fontWeight: "900" }}>
                {summaryTotals.totalAmount.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {data.map((item, index) => {
        const colorScheme = theme.cardColors[index % theme.cardColors.length];
        return (
          <Pressable key={item.id} onPress={() => onSelectFlat(item.id)} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }]}>
              <View>
                 <Text style={[styles.flatLabel, { color: colorScheme.accent }]}>{UI_TEXT.block} {item.block}</Text>
                 <Text style={[styles.dashboardDay, { fontSize: 24, color: theme.colors.textPrimary }]}>{UI_TEXT.flatUpper} {item.flat}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                 <Text style={{ color: colorScheme.accent, fontSize: 20, fontWeight: "900" }}>{item.amount}</Text>
                 <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 12, marginTop: 4 }}>
                   {kidsEnabled || guestsEnabled ? (
                     (() => {
                       const parts = [];
                       parts.push(`${item.people}${UI_TEXT.adultAbbrLabel}`);
                       if (kidsEnabled && item.kids) parts.push(`${item.kids}${UI_TEXT.kidsAbbrLabel}`);
                       if (guestsEnabled && (item.guests || 0)) parts.push(`${item.guests || 0}${UI_TEXT.guestAbbrLabel}`);
                       return parts.join(UI_TEXT.plus);
                     })()
                   ) : (
                     `${item.people + item.kids + (item.guests || 0)}${item.people + item.kids + (item.guests || 0) === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}`
                   )}
                 </Text>
              </View>
            </View>
            {item.dayStats.map((ds) => (
              <View key={ds.day} style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: "800", fontSize: 14, color: colorScheme.accent, marginBottom: 8 }}>{getDayLabel(ds.day, dayConfig)}</Text>
                <View style={{ gap: 8 }}>
                  {ds.meals.map((m) => (
                    <View key={m.type} style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderRadius: 12, padding: 10, gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                         <Text style={{ fontSize: 13, fontWeight: "800" }}>{getMealLabel(m.type)}</Text>
                         <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                             {kidsEnabled || guestsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${UI_TEXT.space}` : ""}
                             {m.vegTaken}{UI_TEXT.slash}{m.veg}{UI_TEXT.vegAbbr}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{m.nonVegTaken}{UI_TEXT.slash}{m.nonVeg}{UI_TEXT.nonVegAbbr}
                           </Text>
                           {(m.vegParcel + m.nonVegParcel) > 0 && (
                             <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.primary, marginTop: 2 }}>
                               {UI_TEXT.parcelAbbr}{UI_TEXT.colon}{UI_TEXT.space}{m.vegParcelTaken + m.nonVegParcelTaken}{UI_TEXT.slash}{m.vegParcel + m.nonVegParcel}
                             </Text>
                           )}
                         </View>
                      </View>
                      {kidsEnabled && (
                        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                           <View style={{ alignItems: 'flex-end' }}>
                             <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textMuted }}>{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon}{UI_TEXT.space}{m.kidsVegTaken}{UI_TEXT.slash}{m.kidsVeg}{UI_TEXT.vegAbbr}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{m.kidsNonVegTaken}{UI_TEXT.slash}{m.kidsNonVeg}{UI_TEXT.nonVegAbbr}</Text>
                             {(m.kidsVegParcel + m.kidsNonVegParcel) > 0 && (
                               <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.primary, opacity: 0.8, marginTop: 2 }}>
                                 {UI_TEXT.parcelAbbr}{UI_TEXT.colon}{UI_TEXT.space}{m.kidsVegParcelTaken + m.kidsNonVegParcelTaken}{UI_TEXT.slash}{m.kidsVegParcel + m.kidsNonVegParcel}
                               </Text>
                             )}
                           </View>
                        </View>
                      )}
                      {guestsEnabled && (
                        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                           <View style={{ alignItems: 'flex-end' }}>
                             <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textMuted }}>{UI_TEXT.guestAbbrLabel}{UI_TEXT.colon}{UI_TEXT.space}{m.guestsVegTaken || 0}{UI_TEXT.slash}{m.guestsVeg || 0}{UI_TEXT.vegAbbr}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{m.guestsNonVegTaken || 0}{UI_TEXT.slash}{m.guestsNonVeg || 0}{UI_TEXT.nonVegAbbr}</Text>
                             {((m.guestsVegParcel || 0) + (m.guestsNonVegParcel || 0)) > 0 && (
                               <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.primary, opacity: 0.8, marginTop: 2 }}>
                                 {UI_TEXT.parcelAbbr}{UI_TEXT.colon}{UI_TEXT.space}{(m.guestsVegParcelTaken || 0) + (m.guestsNonVegParcelTaken || 0)}{UI_TEXT.slash}{(m.guestsVegParcel || 0) + (m.guestsNonVegParcel || 0)}
                               </Text>
                             )}
                           </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}
