import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { isDietaryEnabled } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../types";

interface PendingItem {
  id: string;
  block: string;
  flat: string;
  veg: number;
  nonVeg: number;
  count: number;
}

export function PendingReport({
  data,
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
}: {
  data: PendingItem[];
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
        <Text style={styles.emptyState}>{UI_TEXT.noMealsSelected}</Text>
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
                <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}-{item.flat}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amount, { color: colorScheme.accent, fontWeight: '900' }]}>
                    {item.count} {item.count === 1 ? UI_TEXT.personNotTaken : UI_TEXT.personsNotTaken}
                  </Text>
                  <Text style={[styles.helper, { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }]}>
                    (
                    {vegEnabled && item.veg > 0 && <Text style={{ color: theme.colors.veg }}>{item.veg} {UI_TEXT.veg}</Text>}
                    {vegEnabled && item.veg > 0 && nonVegEnabled && item.nonVeg > 0 && <Text>, </Text>}
                    {nonVegEnabled && item.nonVeg > 0 && <Text style={{ color: theme.colors.nonVeg }}>{item.nonVeg} {UI_TEXT.nonVeg}</Text>}
                    )
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
