import React, { memo } from "react";
import { View, Text, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { getDayLabel, isMealEnabled, isMealDone, getSortedMealKeys, isDietaryEnabled, isMealCurrent, getMealLabel, isMealInFuture } from "../constants";
import { MealMenu, ConfigDay, MealType, DietType, AppThemeMode, ActivityModule, ActivityAction, AppScreen, UserRole } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { CounterInput } from "../components/common/CounterInput";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";

interface GuestMealCardProps {
  dayId: string;
  type: MealType;
  menu: MealMenu;
  config: ConfigDay[];
  disabled: boolean;
  isAdmin: boolean;
  onUpdate: (
    day: string,
    type: MealType,
    field: string,
    value: number
  ) => void;
  anyCurrentMealEnabled: boolean;
}

const GuestMealCard = memo(({ dayId, type, menu, config, disabled, isAdmin, onUpdate, anyCurrentMealEnabled }: GuestMealCardProps) => {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const isVegEnabled = isDietaryEnabled(dayId, type, DietType.VEG, config);
  const isNonVegEnabled = isDietaryEnabled(dayId, type, DietType.NON_VEG, config);
  const isDone = isMealDone(dayId, type, config);
  const isCurrent = isMealCurrent(dayId, type, config);
  const isFuture = isMealInFuture(dayId, type, config);
  const showDetailed = isVegEnabled && isNonVegEnabled;

  const mealLabel = getMealLabel(type);
  const icon = type === MealType.BREAKFAST ? "sunny-outline" : type === MealType.LUNCH ? "restaurant-outline" : "moon-outline";

  const guestVeg = menu.guestVeg || 0;
  const guestNonVeg = menu.guestNonVeg || 0;
  const guestVegTaken = menu.guestVegTaken || 0;
  const guestNonVegTaken = menu.guestNonVegTaken || 0;

  // Administrative editability rules:
  // 1. Planning Mode (No Current Meal): Edit any meal not marked as Done.
  // 2. Live Mode (Current Meal exists): Edit the Current meal or any Future meal.
  // For Admin, we always allow editing unless it's a past completed meal.
  const isMealEditableForAdmin = isAdmin && (!anyCurrentMealEnabled ? !isDone : (isCurrent || isFuture));

  const guestTotal = showDetailed ? (guestVeg + guestNonVeg) : (isVegEnabled ? guestVeg : guestNonVeg);
  const guestTaken = showDetailed ? (guestVegTaken + guestNonVegTaken) : (isVegEnabled ? guestVegTaken : guestNonVegTaken);

  return (
    <View style={[
      styles.dashboardMealSection,
      { marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
      isCurrent && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: theme.colors.primary + "08" },
      isDone && { opacity: 0.6 }
    ]}>
      <View style={[styles.mealDisplayHeader, { marginBottom: 16, justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={icon} size={22} color={isCurrent ? theme.colors.primary : theme.colors.textSecondary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18, color: isCurrent ? theme.colors.primary : theme.colors.textPrimary }]}>{mealLabel}</Text>
            {isCurrent && (
               <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
               </View>
            )}
            {!showDetailed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isVegEnabled ? theme.colors.successLight : theme.colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: isVegEnabled ? theme.colors.veg : theme.colors.nonVeg }}>
                <Ionicons name={isVegEnabled ? "leaf" : "flame"} size={10} color={isVegEnabled ? theme.colors.veg : theme.colors.nonVeg} />
                <Text style={{ color: isVegEnabled ? theme.colors.veg : theme.colors.nonVeg, fontSize: 10, fontWeight: "800" }}>
                  {(isVegEnabled ? UI_TEXT.vegOnly : UI_TEXT.nonVegOnly).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
        {isDone && (
          <View style={[styles.pill, { backgroundColor: theme.colors.successLight }]}>
             <Text style={[styles.pillText, { color: theme.colors.success, fontSize: 10 }]}>{UI_TEXT.mealDoneLabel.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 14 }}>
        {showDetailed ? (
          <>
            {/* 1. VEG GROUP */}
            <View style={{ gap: 10, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.veg + "35" }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="leaf" size={14} color={theme.colors.veg} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.veg, letterSpacing: 0.5 }}>
                  {UI_TEXT.veg.toUpperCase()}
                </Text>
              </View>
              <View style={{ gap: 10 }}>
                <CounterInput
                  label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.planned}`}
                  value={guestVeg}
                  min={guestVegTaken}
                  onChange={(val) => onUpdate(dayId, type, "guestVeg", val)}
                  disabled={disabled || !isMealEditableForAdmin}
                />
                <CounterInput
                  label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.served}`}
                  value={guestVegTaken}
                  max={guestVeg}
                  onChange={(val) => onUpdate(dayId, type, "guestVegTaken", val)}
                  disabled={disabled || isDone || isFuture}
                />
              </View>
            </View>

            {/* 2. NON-VEG GROUP */}
            <View style={{ gap: 10, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.nonVeg + "35" }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flame" size={14} color={theme.colors.nonVeg} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.nonVeg, letterSpacing: 0.5 }}>
                  {UI_TEXT.nonVeg.toUpperCase()}
                </Text>
              </View>
              <View style={{ gap: 10 }}>
                <CounterInput
                  label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.planned}`}
                  value={guestNonVeg}
                  min={guestNonVegTaken}
                  onChange={(val) => onUpdate(dayId, type, "guestNonVeg", val)}
                  disabled={disabled || !isMealEditableForAdmin}
                />
                <CounterInput
                  label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.served}`}
                  value={guestNonVegTaken}
                  max={guestNonVeg}
                  onChange={(val) => onUpdate(dayId, type, "guestNonVegTaken", val)}
                  disabled={disabled || isDone || isFuture}
                />
              </View>
            </View>

            {/* 3. TOTAL SUMMARY ROW */}
            <View style={{ width: '100%', flexDirection: 'row', gap: 12, marginTop: 2 }}>
              <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.plannedTotal.toUpperCase()}</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 4 }}>{guestTotal}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.totalServed.toUpperCase()}</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.veg, marginTop: 4 }}>{guestTaken}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={{ gap: 10 }}>
            <CounterInput
              label={UI_TEXT.plannedTotal}
              value={guestTotal}
              min={guestTaken}
              onChange={(val) => onUpdate(dayId, type, isVegEnabled ? "guestVeg" : "guestNonVeg", val)}
              disabled={disabled || !isMealEditableForAdmin}
            />
            <CounterInput
              label={UI_TEXT.totalServed}
              value={guestTaken}
              min={0}
              max={guestTotal}
              onChange={(val) => onUpdate(dayId, type, isVegEnabled ? "guestVegTaken" : "guestNonVegTaken", val)}
              disabled={disabled || isDone || isFuture}
            />
          </View>
        )}
      </View>
    </View>
  );
});

export function GuestManagementScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, seasonEnabled, updateGuestCountDebounced
  } = useDatabase();
  const { goBack, navigate } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const activeDays = React.useMemo(() => {
    const active = dayConfig.filter((d) => d.enabled).map((d) => d.id);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;

      // Maintain original order for other days
      const aIdx = dayConfig.findIndex(d => d.id === a);
      const bIdx = dayConfig.findIndex(d => d.id === b);
      return aIdx - bIdx;
    });
  }, [dayConfig]);

  const isAdmin = userRole === UserRole.ADMIN;
  const anyCurrentMealEnabled = React.useMemo(() => {
    return dayConfig.some(d => d.enabled && [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(d.id, m, dayConfig)));
  }, [dayConfig]);

  const handleUpdate = React.useCallback((
    day: string,
    type: MealType,
    field: string,
    value: number
  ) => {
    updateGuestCountDebounced(day, type, field, value);
  }, [updateGuestCountDebounced]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.guestManagement}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {activeDays.map((day, index) => {
          const dayMenu = foodMenu[day] || {};
          const colorScheme = theme.cardColors[index % theme.cardColors.length];

          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, marginBottom: 16 }]}>{getDayLabel(day, dayConfig)}</Text>

              {getSortedMealKeys(day, dayConfig)
                .filter((mKey) => isMealEnabled(day, mKey, dayConfig))
                .map((mKey) => (
                  <GuestMealCard
                    key={mKey}
                    dayId={day}
                    type={mKey}
                    menu={dayMenu[mKey] || { veg: [], nonVeg: [] }}
                    config={dayConfig}
                    onUpdate={handleUpdate}
                    disabled={!seasonEnabled}
                    isAdmin={isAdmin}
                    anyCurrentMealEnabled={anyCurrentMealEnabled}
                  />
                ))}
            </View>
          );
        })}

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
