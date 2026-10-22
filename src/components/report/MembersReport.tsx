import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  freeMealEnabled,
}: {
  data: MemberMealReportItem[];
  selectedDayId: string;
  selectedMealType: MealType;
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  freeMealEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const passItems = data.filter(item => !item.isFreeMeal);
  const totalPasses = passItems.length;
  const totalPeopleCount = data.reduce((acc, item) => acc + (item.total || 0), 0);
  const totalVegPlanned = data.reduce((acc, item) => acc + (item.veg || 0), 0);
  const totalVegTaken = data.reduce((acc, item) => acc + (item.vegTaken || 0), 0);
  const totalNonVegPlanned = data.reduce((acc, item) => acc + (item.nonVeg || 0), 0);
  const totalNonVegTaken = data.reduce((acc, item) => acc + (item.nonVegTaken || 0), 0);
  const totalParcelPlanned = data.reduce(
    (acc, item) => acc + (item.vegParcel || 0) + (item.nonVegParcel || 0),
    0
  );
  const totalParcelTaken = data.reduce(
    (acc, item) => acc + (item.vegParcelTaken || 0) + (item.nonVegParcelTaken || 0),
    0
  );

  const isFreeMealOnly = data.length === 1 && data[0].isFreeMeal;

  return (
    <View style={{ gap: 16 }}>
      {data.length > 0 && (
        <View
          style={[
            styles.card,
            { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }
          ]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`${isFreeMealOnly ? UI_TEXT.freeMeals : UI_TEXT.members}: ${totalPeopleCount} total`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons
              name={isFreeMealOnly ? "people-circle-outline" : "people-outline"}
              size={20}
              color={theme.colors.white}
            />
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
              {isFreeMealOnly ? UI_TEXT.freeMeals : UI_TEXT.members}
            </Text>
          </View>

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
            <View style={{
              gap: 3,
              marginBottom: 4,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.white + "20",
              paddingBottom: 8
            }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.totalSubscribed}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 16, fontWeight: "900" }}>
                {isFreeMealOnly ? (
                  `${totalPeopleCount} ${totalPeopleCount === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates} (${UI_TEXT.freeMeals})`
                ) : totalPasses > 0 ? (
                  `${totalPeopleCount} ${totalPeopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix} (${totalPasses} ${totalPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}${freeMealEnabled ? " + Free Meals" : ""})`
                ) : (
                  `${totalPeopleCount} ${totalPeopleCount === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates}`
                )}
              </Text>
            </View>

            <View style={{ gap: 3, paddingBottom: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.subCategoryBreakdown}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.veg}: {totalVegTaken} / {totalVegPlanned}
                </Text>
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.nonVeg}: {totalNonVegTaken} / {totalNonVegPlanned}
                </Text>
                {totalParcelPlanned > 0 && (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.parcels}: {totalParcelTaken} / {totalParcelPlanned}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noRecords}</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((item, index) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];
            const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.VEG, dayConfig);
            const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.NON_VEG, dayConfig);

            const displayTitle = item.isFreeMeal
              ? UI_TEXT.freeMeals
              : (item.block ? item.block + UI_TEXT.hyphen + item.flat : item.flat);

            const a11yLabel = item.isFreeMeal
              ? `${UI_TEXT.freeMeals}, ${item.total} plates`
              : `${displayTitle}, ${item.total} ${UI_TEXT.people}`;

            return (
              <Pressable
                key={`${item.id}-${item.categoryLabel || index}`}
                onPress={() => !item.isFreeMeal && onSelectFlat(item.id)}
                disabled={item.isFreeMeal}
                accessible={true}
                accessibilityRole={item.isFreeMeal ? "none" : "button"}
                accessibilityLabel={a11yLabel}
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
                        {displayTitle}
                      </Text>
                      {item.categoryLabel && (
                        <View style={{
                          backgroundColor: colorScheme.accent + "20",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colorScheme.accent
                        }}>
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
                             <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary }}>
                               {UI_TEXT.veg}{UI_TEXT.colon}
                             </Text>
                             <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.veg }}>
                               {item.vegTaken}{UI_TEXT.slash}{item.veg}
                             </Text>
                          </View>
                        )}
                        {nonVegEnabled && item.nonVeg > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                             <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary }}>
                               {UI_TEXT.nonVeg}{UI_TEXT.colon}
                             </Text>
                             <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.nonVeg }}>
                               {item.nonVegTaken}{UI_TEXT.slash}{item.nonVeg}
                             </Text>
                          </View>
                        )}
                        {(item.vegParcel + item.nonVegParcel) > 0 && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            justifyContent: 'flex-end',
                            marginTop: 2
                          }}>
                             <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.primary }}>
                               {UI_TEXT.parcelAbbr}{UI_TEXT.colon}
                             </Text>
                             <Text style={{ fontSize: 13, fontWeight: '900', color: theme.colors.primary }}>
                               {item.vegParcelTaken + item.nonVegParcelTaken}{UI_TEXT.slash}{item.vegParcel + item.nonVegParcel}
                             </Text>
                          </View>
                        )}
                     </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
