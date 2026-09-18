import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { isDietaryEnabled } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../types";

interface KidsMealItem {
  id: string;
  block: string;
  flat: string;
  veg: number;
  nonVeg: number;
  vegTaken: number;
  nonVegTaken: number;
  total: number;
}

export function KidsReport({
  data,
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
}: {
  data: KidsMealItem[];
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
              key={item.id}
              onPress={() => onSelectFlat(item.id)}
              style={({ pressed }) => [
                styles.dashboardCard,
                { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={styles.dashboardCardTop}>
                <View>
                  <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}{UI_TEXT.hyphen}{item.flat}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 }}>
                    {item.total} {item.total === 1 ? UI_TEXT.kid : UI_TEXT.kids}
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
