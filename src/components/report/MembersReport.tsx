import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { isDietaryEnabled } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../domain";

export interface MemberMealReportItem {
  id: string;
  block: string;
  flat: string;
  categoryLabel?: string;
  isFreeMeal?: boolean;
  veg: number;
  nonVeg: number;
  vegTaken: number;
  nonVegTaken: number;
  vegParcel: number;
  nonVegParcel: number;
  vegParcelTaken: number;
  nonVegParcelTaken: number;
  total: number;
}

export function MembersReport({
  data,
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
}: {
  data: MemberMealReportItem[];
  selectedDayId: string;
  selectedMealType: MealType;
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noRecords}</Text>
      ) : (
        data.map((item, index) => {
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.VEG, dayConfig);
          const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.NON_VEG, dayConfig);

          return (
            <Pressable
              key={`${item.id}-${item.categoryLabel || index}`}
              onPress={() => !item.isFreeMeal && onSelectFlat(item.id)}
              disabled={item.isFreeMeal}
              accessible={true}
              accessibilityRole={item.isFreeMeal ? "none" : "button"}
              accessibilityLabel={`${item.block ? `${item.block}-${item.flat}` : item.flat}, ${item.total} ${UI_TEXT.people}`}
              accessibilityHint={item.isFreeMeal ? undefined : UI_TEXT.viewPassHint}
              style={({ pressed }) => [
                styles.dashboardCard,
                { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                !item.isFreeMeal && pressed && { opacity: 0.7 }
              ]}
            >
              <View style={styles.dashboardCardTop}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>
                      {item.block ? `${item.block}${UI_TEXT.hyphen}${item.flat}` : item.flat}
                    </Text>
                    {item.categoryLabel && (
                      <View style={{ backgroundColor: colorScheme.accent + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: colorScheme.accent }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: colorScheme.accent }}>
                          {item.categoryLabel}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>
                    {item.total} {item.total === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                   <View style={{ gap: 4 }}>
                      {vegEnabled && item.veg > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                           <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.veg}{UI_TEXT.colon}</Text>
                           <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.veg }}>{item.vegTaken}{UI_TEXT.slash}{item.veg}</Text>
                        </View>
                      )}
                      {nonVegEnabled && item.nonVeg > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                           <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.nonVeg}{UI_TEXT.colon}</Text>
                           <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.nonVeg }}>{item.nonVegTaken}{UI_TEXT.slash}{item.nonVeg}</Text>
                        </View>
                      )}
                      {(item.vegParcel + item.nonVegParcel) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                           <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.primary }}>{UI_TEXT.parcelAbbr}{UI_TEXT.colon}</Text>
                           <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.primary }}>{item.vegParcelTaken + item.nonVegParcelTaken}{UI_TEXT.slash}{item.vegParcel + item.nonVegParcel}</Text>
                        </View>
                      )}
                   </View>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
