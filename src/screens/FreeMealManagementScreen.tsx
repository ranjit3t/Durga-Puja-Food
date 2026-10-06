import React, { memo } from "react";
import { View, Text, ScrollView, StatusBar, Pressable, Platform, Share, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { getDayLabel, isMealEnabled, isMealDone, getSortedMealKeys, isDietaryEnabled, isMealCurrent, getMealLabel, isMealInFuture, getMealVarieties, getMealFreeMealCounts, isSpecialMeal } from "../constants";
import { MealMenu, ConfigDay, MealType, DietType, AppThemeMode, ActivityModule, ActivityAction, AppScreen, UserRole, FreeMealCheckoutSource } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { CounterInput } from "../components/common/CounterInput";
import { QuickFreeMealModal } from "../components/common/QuickFreeMealModal";
import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";

interface FreeMealCardProps {
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

const FreeMealCard = memo(({ dayId, type, menu, config, disabled, isAdmin, onUpdate, anyCurrentMealEnabled }: FreeMealCardProps) => {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const isUltraNarrow = width < 360;

  const dayConf = config.find((d) => d.id === dayId);
  const mConf = dayConf ? dayConf[type] : undefined;
  const varieties = getMealVarieties(mConf);

  const isDone = isMealDone(dayId, type, config);
  const isCurrent = isMealCurrent(dayId, type, config);
  const isFuture = isMealInFuture(dayId, type, config);

  const mealLabel = getMealLabel(type);
  const icon = type === MealType.BREAKFAST ? "sunny-outline" : type === MealType.LUNCH ? "restaurant-outline" : "moon-outline";

  const isMealEditableForAdmin = isAdmin && (!anyCurrentMealEnabled ? !isDone : (isCurrent || isFuture));

  const getFreeMealCount = (vId: string, kind: "planned" | "served"): number => {
    if (kind === "planned") {
      if (vId === "veg_default") return menu.freeMealVeg || 0;
      if (vId === "nonVeg_default") return menu.freeMealNonVeg || 0;
      return menu.freeMealCounts?.[vId] || 0;
    } else {
      if (vId === "veg_default") return menu.freeMealVegTaken || 0;
      if (vId === "nonVeg_default") return menu.freeMealNonVegTaken || 0;
      return menu.freeMealTakenCounts?.[vId] || 0;
    }
  };

  let vegTotalPlanned = 0, vegTotalServed = 0;
  let nonVegTotalPlanned = 0, nonVegTotalServed = 0;

  varieties.forEach((v) => {
    const p = getFreeMealCount(v.id, "planned");
    const s = getFreeMealCount(v.id, "served");
    if (v.type === DietType.VEG) {
      vegTotalPlanned += p;
      vegTotalServed += s;
    } else {
      nonVegTotalPlanned += p;
      nonVegTotalServed += s;
    }
  });

  const overallTotalPlanned = vegTotalPlanned + nonVegTotalPlanned;
  const overallTotalServed = vegTotalServed + nonVegTotalServed;
  const isSpecial = isSpecialMeal(dayId, type, config);

  return (
    <View style={[
      styles.dashboardMealSection,
      { marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
      isSpecial && { backgroundColor: theme.colors.specialMealBg, borderColor: theme.colors.specialMealBorder, borderWidth: 2, borderStyle: "dashed" },
      isCurrent && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: theme.colors.primary + "08" },
      isDone && { opacity: 0.6 }
    ]}>
      <View style={[styles.mealDisplayHeader, { marginBottom: 16, justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={icon} size={22} color={isCurrent ? theme.colors.primary : isSpecial ? theme.colors.specialMealText : theme.colors.textSecondary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: "wrap" }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18, color: isCurrent ? theme.colors.primary : isSpecial ? theme.colors.specialMealText : theme.colors.textPrimary }]}>{mealLabel}</Text>
            {isSpecial && (
               <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={10} color={theme.colors.white} />
                  <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
               </View>
            )}
            {isCurrent && (
               <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
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
        {/* Render Granular Sub-Category Entry Cards */}
        {varieties.map((v) => {
          if (!isDietaryEnabled(dayId, type, v.type, config)) return null;

          const pCount = getFreeMealCount(v.id, "planned");
          const sCount = getFreeMealCount(v.id, "served");
          const vColor = v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);

          const plannedField = v.id === "veg_default" ? "freeMealVeg" : v.id === "nonVeg_default" ? "freeMealNonVeg" : `fmc_${v.id}`;
          const servedField = v.id === "veg_default" ? "freeMealVegTaken" : v.id === "nonVeg_default" ? "freeMealNonVegTaken" : `fmt_${v.id}`;

          return (
            <View
              key={v.id}
              style={{
                gap: 10,
                padding: 12,
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: vColor + "40",
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: vColor }} />
                  <Ionicons name={v.type === DietType.VEG ? "leaf" : "flame"} size={14} color={vColor} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: 0.5 }}>
                    {v.name.toUpperCase()}
                  </Text>
                  <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' }}>
                      {v.type}
                    </Text>
                  </View>
                </View>
              </View>

              {isDone ? (
                <View style={{ flexDirection: isUltraNarrow ? "column" : "row", gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.planned.toUpperCase()}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 2 }}>{pCount}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.served.toUpperCase()}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.veg, marginTop: 2 }}>{sCount}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: isUltraNarrow ? "column" : "row", gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <CounterInput
                      label={UI_TEXT.planned}
                      value={pCount}
                      min={sCount}
                      onChange={(val) => onUpdate(dayId, type, plannedField, val)}
                      disabled={disabled || !isMealEditableForAdmin}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <CounterInput
                      label={UI_TEXT.served}
                      value={sCount}
                      max={pCount}
                      onChange={(val) => onUpdate(dayId, type, servedField, val)}
                      disabled={disabled || isDone || isFuture}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Global Summary Totals Row */}
        <View style={{ width: '100%', gap: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {UI_TEXT.globalCategoryTotals}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {vegTotalPlanned > 0 && (
              <View style={{ flex: 1, backgroundColor: theme.colors.successLight, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.veg }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.veg }}>{UI_TEXT.vegGlobal}</Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 2 }}>
                  {vegTotalPlanned} P | {vegTotalServed} S
                </Text>
              </View>
            )}
            {nonVegTotalPlanned > 0 && (
              <View style={{ flex: 1, backgroundColor: theme.colors.errorLight, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.nonVeg }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.nonVeg }}>{UI_TEXT.nonVegGlobal}</Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 2 }}>
                  {nonVegTotalPlanned} P | {nonVegTotalServed} S
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.overallPlanned}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 2 }}>{overallTotalPlanned}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.overallServed}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.veg, marginTop: 2 }}>{overallTotalServed}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

export function FreeMealManagementScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, seasonEnabled, updateFreeMealCountDebounced
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { goBack, navigate, isQuickFreeMealMode, setIsQuickFreeMealMode } = useAppNavigation();
  const { showAlert: showGlobalAlert } = useUI();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const currentMealInfo = React.useMemo(() => {
    for (const d of dayConfig.filter(d => d.enabled)) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(d.id, mType, dayConfig) && isMealEnabled(d.id, mType, dayConfig)) {
          return {
            dayId: d.id,
            mealType: mType,
            dayLabel: getDayLabel(d.id, dayConfig),
            mealLabel: getMealLabel(mType),
          };
        }
      }
    }
    return null;
  }, [dayConfig]);

  const [modalVisible, setModalVisible] = React.useState(false);
  const alertShownRef = React.useRef(false);

  React.useEffect(() => {
    if (isQuickFreeMealMode) {
      if (currentMealInfo) {
        setModalVisible(true);
        alertShownRef.current = false;
      } else if (!alertShownRef.current) {
        alertShownRef.current = true;
        setModalVisible(false);
        setIsQuickFreeMealMode(false);
        showGlobalAlert(UI_TEXT.currentMealClosedTitle, UI_TEXT.currentMealClosed, [
          {
            text: UI_TEXT.ok,
            onPress: () => {
              navigate(AppScreen.HOME);
            }
          }
        ]);
      }
    } else {
      alertShownRef.current = false;
    }
  }, [isQuickFreeMealMode, currentMealInfo, setIsQuickFreeMealMode, showGlobalAlert, navigate]);

  const handleCloseModal = React.useCallback(() => {
    setModalVisible(false);
    setIsQuickFreeMealMode(false);
  }, [setIsQuickFreeMealMode]);

  const activeDays = React.useMemo(() => {
    const active = dayConfig.filter((d) => d.enabled).map((d) => d.id);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;

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
    updateFreeMealCountDebounced(day, type, field, value, FreeMealCheckoutSource.FREE_MEAL_SCREEN);
  }, [updateFreeMealCountDebounced]);

  const handleExportExcel = React.useCallback(async () => {
    if (activeDays.length === 0) return;

    const headers: string[] = [
      UI_TEXT.dayNameColumn,
      UI_TEXT.mealTypeColumn,
      UI_TEXT.vegPlannedColumn,
      UI_TEXT.vegServedColumn,
      UI_TEXT.vegPendingColumn,
      UI_TEXT.nonVegPlannedColumn,
      UI_TEXT.nonVegServedColumn,
      UI_TEXT.nonVegPendingColumn,
      UI_TEXT.totalfreeMealPlannedColumn,
      UI_TEXT.totalfreeMealServedColumn,
      UI_TEXT.totalfreeMealPendingColumn,
    ];

    const escapeCell = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let grandVegPlanned = 0;
    let grandVegServed = 0;
    let grandNonVegPlanned = 0;
    let grandNonVegServed = 0;

    const rows: string[][] = [];

    activeDays.forEach((dayId) => {
      const dayLabel = getDayLabel(dayId, dayConfig);
      const dayMenu = foodMenu[dayId] || {};

      getSortedMealKeys(dayId, dayConfig)
        .filter((mKey) => isMealEnabled(dayId, mKey, dayConfig))
        .forEach((mKey) => {
          const mealMenu: MealMenu = dayMenu[mKey] || { veg: [], nonVeg: [] };
          const mealLabel = getMealLabel(mKey);

          const dayConf = dayConfig.find((d) => d.id === dayId);
          const mConf = dayConf ? dayConf[mKey] : undefined;
          const varieties = getMealVarieties(mConf, dayConf?.vegOnly);
          const fmCounts = getMealFreeMealCounts(mealMenu, varieties);

          const vegPlanned = fmCounts.freeMealVeg;
          const vegServed = fmCounts.freeMealVegTaken;
          const vegPending = Math.max(0, vegPlanned - vegServed);

          const nonVegPlanned = fmCounts.freeMealNonVeg;
          const nonVegServed = fmCounts.freeMealNonVegTaken;
          const nonVegPending = Math.max(0, nonVegPlanned - nonVegServed);

          const totalPlanned = vegPlanned + nonVegPlanned;
          const totalServed = vegServed + nonVegServed;
          const totalPending = vegPending + nonVegPending;

          grandVegPlanned += vegPlanned;
          grandVegServed += vegServed;
          grandNonVegPlanned += nonVegPlanned;
          grandNonVegServed += nonVegServed;

          rows.push([
            dayLabel,
            mealLabel,
            String(vegPlanned),
            String(vegServed),
            String(vegPending),
            String(nonVegPlanned),
            String(nonVegServed),
            String(nonVegPending),
            String(totalPlanned),
            String(totalServed),
            String(totalPending),
          ]);
        });
    });

    const grandVegPending = Math.max(0, grandVegPlanned - grandVegServed);
    const grandNonVegPending = Math.max(0, grandNonVegPlanned - grandNonVegServed);
    const grandTotalPlanned = grandVegPlanned + grandNonVegPlanned;
    const grandTotalServed = grandVegServed + grandNonVegServed;
    const grandTotalPending = grandVegPending + grandNonVegPending;

    rows.push([
      UI_TEXT.grandTotal,
      UI_TEXT.allMeals,
      String(grandVegPlanned),
      String(grandVegServed),
      String(grandVegPending),
      String(grandNonVegPlanned),
      String(grandNonVegServed),
      String(grandNonVegPending),
      String(grandTotalPlanned),
      String(grandTotalServed),
      String(grandTotalPending),
    ]);

    const csvLines = [
      headers.map(escapeCell).join(","),
      ...rows.map((r) => r.map(escapeCell).join(",")),
    ];
    const csvContent = csvLines.join("\n");

    const fileName = UI_TEXT.exportfreeMealFileName.replace("{date}", new Date().toISOString().slice(0, 10));

    addActivityLog({
      module: ActivityModule.FREE_MEAL,
      action: Platform.OS === "web" ? ActivityAction.DOWNLOAD : ActivityAction.SHARE,
      description: UI_TEXT.logExportfreeMeal,
    });

    try {
      if (Platform.OS === "web") {
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csvContent,
          title: fileName,
        });
      }
    } catch (err) {
      console.error("Free Meal export error:", err);
    }
  }, [activeDays, dayConfig, foodMenu, addActivityLog]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.title}>{UI_TEXT.freeMealManagement}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
          </View>
          {activeDays.length >= 1 && (
            <Pressable
              onPress={handleExportExcel}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  elevation: 2,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  alignSelf: 'flex-start',
                },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Ionicons
                name={Platform.OS === 'web' ? "download-outline" : "share-outline"}
                size={18}
                color={theme.colors.white}
              />
              <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 13 }}>
                {UI_TEXT.exportExcel}
              </Text>
            </Pressable>
          )}
        </View>
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
                  <FreeMealCard
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

      <QuickFreeMealModal
        visible={modalVisible}
        currentMealInfo={currentMealInfo}
        onClose={handleCloseModal}
      />
    </View>
  );
}
